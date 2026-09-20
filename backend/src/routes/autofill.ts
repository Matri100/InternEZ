import { Router } from "express";
import { db } from "../models/store.js";
import { buildAutofillProfile } from "../services/autofill.js";
import { writeLimiter } from "../middleware/rateLimit.js";

// Deliberately outside the normal session-cookie auth — the caller here is
// the browser extension running on a third-party site, not a same-origin
// page, so it authenticates with its own token instead (see
// routes/profile.ts extension-token endpoints). Rate-limited by IP since
// there's no session to key on — the token is unguessable either way
// (128 bits), but this is a free extra layer against brute-forcing it.
export const autofillRouter = Router();

autofillRouter.get("/:token", writeLimiter, async (req, res) => {
  const applicantId = await db.getApplicantIdByExtensionToken(req.params.token);
  if (!applicantId) {
    res.status(401).json({ error: "Invalid or revoked extension token" });
    return;
  }
  const applicant = await db.getApplicant(applicantId);
  if (!applicant) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const disclosures = await db.getVoluntaryDisclosures(applicantId);
  res.json(buildAutofillProfile(applicant, disclosures));
});
