import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/domain.js";
import { isAdmin } from "../services/admins.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: UserRole;
  }
}

export function requireApplicant(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== "applicant") {
    res.status(401).json({ error: "Sign in as an applicant to continue" });
    return;
  }
  next();
}

export function requireCompany(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== "company") {
    res.status(401).json({ error: "Sign in as a company to continue" });
    return;
  }
  next();
}

// Moderators (ADMIN_USER_IDS, see services/admins.ts) — on top of
// requireAuth, which already confirmed someone is signed in.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdmin(req.session.userId)) {
    res.status(403).json({ error: "Only InternEZ moderators can do this" });
    return;
  }
  next();
}

// For routes shared by both roles (messaging) — just confirms someone is
// signed in; the route itself branches on req.session.role.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.role) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  next();
}
