import express from "express";
import cors from "cors";
import session from "express-session";
import { seedIfEmpty } from "./db/seed.js";
import { PgSessionStore } from "./db/sessionStore.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { listingsRouter } from "./routes/listings.js";
import { applicationsRouter } from "./routes/applications.js";
import { referenceRouter } from "./routes/reference.js";
import { companyRouter } from "./routes/company.js";
import { messagesRouter } from "./routes/messages.js";
import { notificationsRouter } from "./routes/notifications.js";
import { autofillRouter } from "./routes/autofill.js";
import { requireApplicant, requireCompany, requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// origin: true (reflect any request's Origin back) is fine on localhost —
// there's no one else to reflect. On a real domain it would let any
// website make credentialed requests and ride along on a logged-in user's
// session cookie, so production needs an explicit allowlist instead. Set
// CORS_ORIGIN to a comma-separated list of allowed origins for a real
// deployment (e.g. "https://internez.eu,https://www.internez.eu").
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
// Raised from the default 100kb so base64-encoded profile documents (ID
// photo, transcript, etc.) can ride along in the same JSON PUT as the rest
// of the profile — see MAX_DOCUMENT_BYTES in routes/profile.ts.
app.use(express.json({ limit: "20mb" }));

// Sessions persist to Postgres (see db/sessionStore.ts) so logins survive a
// server restart. The secret has a fixed dev fallback rather than a random
// one precisely so that stays true — a per-boot random secret would make
// every previously-issued cookie's signature invalid on the next restart,
// even though the session data itself is still sitting in the database.
// Set SESSION_SECRET for a real deployment.
app.use(
  session({
    store: new PgSessionStore(),
    secret: process.env.SESSION_SECRET ?? "internez-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Frontend and backend will live on sibling subdomains of the same
      // registrable domain (internez.eu / api.internez.eu) — that's
      // "same-site" for cookie purposes even though it's cross-origin, so
      // sameSite: "lax" already covers it; no need to loosen to "none".
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/reference", referenceRouter);
app.use("/api/profile", requireApplicant, profileRouter);
app.use("/api/listings", requireApplicant, listingsRouter);
app.use("/api/applications", requireApplicant, applicationsRouter);
app.use("/api/company", requireCompany, companyRouter);
app.use("/api/messages", requireAuth, messagesRouter);
app.use("/api/notifications", requireAuth, notificationsRouter);
// No session middleware — the browser extension authenticates with its own
// token (see routes/autofill.ts), not a same-origin cookie.
app.use("/api/autofill", autofillRouter);

seedIfEmpty()
  .catch((err) => console.error("Seeding failed:", err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`InternEZ backend listening on http://localhost:${PORT}`);
    });
  });
