import { ApiError } from "../api/client";
import type { MessageKey } from "./messages/en";

const API_ERROR_KEYS: Record<string, MessageKey> = {
  invalidEmail: "apiError.invalidEmail",
  passwordTooShort: "apiError.passwordTooShort",
  roleRequired: "apiError.roleRequired",
  emailTaken: "apiError.emailTaken",
  wrongCredentials: "apiError.wrongCredentials",
  invalidResetLink: "apiError.invalidResetLink",
  expiredResetLink: "apiError.expiredResetLink",
  accountSuspended: "apiError.accountSuspended",
  alreadyReported: "apiError.alreadyReported",
  reportReasonRequired: "apiError.reportReasonRequired",
  rateLimited: "apiError.rateLimited",
  serverError: "apiError.serverError",
  network: "apiError.network",
};

// The message to show for a failed request: translated when the server
// sent a known code, the server's own (English) text otherwise.
export function errorText(err: unknown, t: (key: MessageKey) => string): string {
  const key = err instanceof ApiError && err.code ? API_ERROR_KEYS[err.code] : undefined;
  if (key) return t(key);
  return err instanceof Error && err.message ? err.message : t("common.somethingWrong");
}
