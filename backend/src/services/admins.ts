// Who the moderators are: the account ids listed in ADMIN_USER_IDS
// (comma-separated). Ids rather than email addresses because signing up
// doesn't confirm the address yet — anyone could register a moderator's
// email before its owner does, but an account id only exists once the
// owner has made the account. Read on every call, not once at startup, so
// tests (and a changed Railway variable after a restart) see the current
// value.
export function adminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdmin(userId: string | undefined): boolean {
  return Boolean(userId) && adminUserIds().includes(userId!);
}
