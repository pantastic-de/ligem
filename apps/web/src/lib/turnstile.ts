// Cloudflare Turnstile — CAPTCHA for the contact form's anonymous/not-yet-
// verified senders (see submitContactRequest and the "Kontaktanfragen"
// section in CLAUDE.md). Optional at the infra level like every other
// feature-gating env var in this app: without NEXT_PUBLIC_TURNSTILE_SITE_KEY
// set, the widget just doesn't render (see homepage-import-field.tsx's
// aiImportEnabled for the same pattern) — but unlike a missing SMTP config,
// a missing *secret* key here fails the verification closed (see below),
// since silently letting every submission through would defeat the whole
// point of having CAPTCHA at all.
export const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/**
 * Verifies a Turnstile response token server-side against Cloudflare's
 * siteverify endpoint. Fails closed: any error, missing token, or missing
 * TURNSTILE_SECRET_KEY returns false rather than throwing or defaulting to
 * "allow" — a broken CAPTCHA config should block anonymous submissions, not
 * silently disable the protection it exists for.
 */
export async function verifyTurnstileToken(token: string | null, remoteIp: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey || !token) return false;

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
