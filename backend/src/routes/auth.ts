import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../models/store.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";
import { authLimiter } from "../middleware/rateLimit.js";
import type { AuthUser, UserRole } from "../types/domain.js";

export const authRouter = Router();

function isValidRole(value: unknown): value is UserRole {
  return value === "applicant" || value === "company";
}

// A nonexistent email currently short-circuits before ever calling
// verifyPassword (no stored hash to check against), which makes it
// measurably faster than a wrong password for a real account — scrypt is
// deliberately slow, so that gap is a timing side-channel an attacker
// could use to enumerate which emails have accounts. Running verifyPassword
// against this fixed dummy hash even when there's no real user keeps the
// two cases' timing the same; the actual value never matters since it's
// never a real password.
const DUMMY_PASSWORD_HASH = hashPassword("not-a-real-password-timing-decoy");

authRouter.post("/signup", authLimiter, async (req, res) => {
  const { email, password, role, name } = req.body ?? {};

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (!isValidRole(role)) {
    res.status(400).json({ error: "Choose whether you're an applicant or a company" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.getUserByEmail(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const id = randomUUID();
  await db.createUser({ id, email: normalizedEmail, passwordHash: hashPassword(password), role });

  if (role === "applicant") {
    await db.saveApplicant(id, {
      name: String(name ?? ""),
      email: normalizedEmail,
      phone: "",
      portfolioUrl: "",
      citizenship: null,
      secondCitizenship: null,
      placeOfBirth: null,
      residence: null,
      availableFrom: "",
      preferredLength: null,
      workArrangementPreference: [],
      preferredLocations: [],
      languages: [],
      skills: [],
      interests: [],
      qualifications: [],
      summary: "",
      coverLetterPrompts: { whyThisField: "", provenStrength: "", workingStyle: "", careerGoals: "" },
      profileComplete: false,
      discoverable: false,
    });
  } else {
    await db.saveCompany(id, {
      name: String(name ?? ""),
      verified: false,
      logoUrl: null,
      description: "",
      website: "",
      headquarters: null,
      companySize: null,
    });
  }

  // Regenerating the session on the anonymous→authenticated transition
  // (rather than just setting userId/role on whatever session already
  // exists) prevents session fixation — an attacker who got a victim to
  // adopt a known session ID before login can't inherit it after login,
  // since login now issues a fresh one. regenerate() wipes the whole
  // session though, so earlyAccessGranted has to be captured first and
  // restored after — otherwise unlocking the gate then signing up
  // silently re-locks every request that follows.
  const hadEarlyAccess = req.session.earlyAccessGranted;
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Something went wrong — please try again." });
      return;
    }
    req.session.userId = id;
    req.session.role = role;
    if (hadEarlyAccess) req.session.earlyAccessGranted = true;
    const user: AuthUser = { id, email: normalizedEmail, role };
    res.status(201).json(user);
  });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const submittedPassword = typeof password === "string" ? password : "";
  const stored = normalizedEmail ? await db.getUserByEmail(normalizedEmail) : null;

  // Always run verifyPassword, even for an email that doesn't exist —
  // checking `stored` against the real hash when present, or the fixed
  // decoy hash when not, so both cases cost the same scrypt computation
  // and don't leak which emails have accounts via response timing.
  const passwordOk = verifyPassword(submittedPassword, stored?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!stored || !passwordOk) {
    res.status(401).json({ error: "Incorrect email or password" });
    return;
  }

  // See the matching comment in /signup — regenerate() wipes
  // earlyAccessGranted along with everything else, so it has to survive
  // the trip explicitly.
  const hadEarlyAccess = req.session.earlyAccessGranted;
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Something went wrong — please try again." });
      return;
    }
    req.session.userId = stored.id;
    req.session.role = stored.role;
    if (hadEarlyAccess) req.session.earlyAccessGranted = true;
    const user: AuthUser = { id: stored.id, email: stored.email, role: stored.role };
    res.json(user);
  });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.status(204).send());
});

authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    res.json(null);
    return;
  }
  const stored = await db.getUserById(req.session.userId);
  if (!stored) {
    res.json(null);
    return;
  }
  const user: AuthUser = { id: stored.id, email: stored.email, role: stored.role };
  res.json(user);
});
