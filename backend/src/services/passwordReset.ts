// Reset links carry the raw token; the database only ever sees its hash
// (see password_reset_tokens in db/database.ts). A fast hash is fine here,
// unlike passwords — the token itself is 32 random bytes, so there's no
// low-entropy input for scrypt's slowness to defend against.
import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}
