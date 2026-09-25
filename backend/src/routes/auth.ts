import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../models/store.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from "../services/passwordReset.js";
import { sendEmail } from "../services/email.js";
import { isAdmin } from "../services/admins.js";
import { escapeHtml, notifyModerators } from "../services/moderation.js";
import { authLimiter } from "../middleware/rateLimit.js";
import type { AuthUser, UserRole } from "../types/domain.js";

export const authRouter = Router();

// Used to build the link inside password-reset emails — the frontend isn't
// reachable from this backend process any other way. Defaults to the local
// Vite dev server; set APP_URL for a real deployment.
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

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

// Error responses carry a `code` next to the English `error`, so the
// frontend can show the message in the visitor's own language.

authRouter.post("/signup", authLimiter, async (req, res) => {
  const { email, password, role, name } = req.body ?? {};

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid email address", code: "invalidEmail" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters", code: "passwordTooShort" });
    return;
  }
  if (!isValidRole(role)) {
    res.status(400).json({ error: "Choose whether you're an applicant or a company", code: "roleRequired" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.getUserByEmail(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists", code: "emailTaken" });
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
    const companyName = String(name ?? "").trim() || "(no name given)";
    notifyModerators(`New company waiting for review: ${companyName}`, [
      `<strong>${escapeHtml(companyName)}</strong> signed up with ${escapeHtml(normalizedEmail)}.`,
      "Its listings stay hidden from students until you verify it.",
    ]);
  }

  // Regenerating the session on the anonymous→authenticated transition
  // (rather than just setting userId/role on whatever session already
  // exists) prevents session fixation — an attacker who got a victim to
  // adopt a known session ID before login can't inherit it after login,
  // since login now issues a fresh one.
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Something went wrong — please try again.", code: "serverError" });
      return;
    }
    req.session.userId = id;
    req.session.role = role;
    const user: AuthUser = { id, email: normalizedEmail, role, isAdmin: isAdmin(id) };
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
    res.status(401).json({ error: "Incorrect email or password", code: "wrongCredentials" });
    return;
  }
  // Only said after the password checked out, so it can't be used to find
  // out which addresses have (suspended) accounts.
  if (stored.suspendedAt) {
    res.status(403).json({
      error: "This account has been suspended. If you think this is a mistake, write to hello@internez.eu.",
      code: "accountSuspended",
    });
    return;
  }

  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Something went wrong — please try again.", code: "serverError" });
      return;
    }
    req.session.userId = stored.id;
    req.session.role = stored.role;
    const user: AuthUser = { id: stored.id, email: stored.email, role: stored.role, isAdmin: isAdmin(stored.id) };
    res.json(user);
  });
});

authRouter.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body ?? {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  // Same response whether or not an account exists — confirming/denying
  // that here would let anyone enumerate registered emails.
  const response = { message: "If an account exists for that email, we've sent a reset link." };

  const user = normalizedEmail ? await db.getUserByEmail(normalizedEmail) : null;
  if (user) {
    const { token, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    await db.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    await sendEmail(
      user.email,
      "Reset your InternEZ password",
      `<p>Someone requested a password reset for your InternEZ account.</p>
       <p><a href="${resetUrl}">${resetUrl}</a></p>
       <p>This link expires in an hour. If you didn't request this, you can ignore this email.</p>`
    );
  }

  res.json(response);
});

authRouter.post("/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "Missing or invalid reset link", code: "invalidResetLink" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters", code: "passwordTooShort" });
    return;
  }

  const tokenHash = hashResetToken(token);
  const stored = await db.getPasswordResetToken(tokenHash);
  if (!stored || new Date(stored.expiresAt).getTime() < Date.now()) {
    res.status(400).json({ error: "This reset link is invalid or has expired", code: "expiredResetLink" });
    return;
  }

  await db.updateUserPassword(stored.userId, hashPassword(password));
  await db.deletePasswordResetToken(tokenHash);
  res.json({ message: "Password updated — you can now log in." });
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
  // Suspending deletes the account's sessions already; this covers one
  // that somehow survived.
  if (stored.suspendedAt) {
    req.session.destroy(() => res.json(null));
    return;
  }
  const user: AuthUser = { id: stored.id, email: stored.email, role: stored.role, isAdmin: isAdmin(stored.id) };
  res.json(user);
});
