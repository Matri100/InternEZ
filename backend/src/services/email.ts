// Resend's HTTP API is a single POST, so calling it directly with fetch
// avoids pulling in their SDK for one endpoint. RESEND_API_KEY unset (local
// dev, CI) logs instead of sending — same no-op-when-unconfigured pattern
// as EARLY_ACCESS_KEY, so this never blocks anyone without real email
// credentials.
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "InternEZ <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return RESEND_API_KEY.length > 0;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to send email (${res.status}): ${body}`);
  }
}
