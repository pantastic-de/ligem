import nodemailer from "nodemailer";

// Optional at the infra level, matching every other feature-gating env var
// in this app (ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID/SECRET, ...): local dev
// without SMTP credentials configured just skips sending (with a console
// warning) instead of throwing, so nothing else in the app depends on real
// mail credentials existing.
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const smtpFrom = process.env.SMTP_FROM;

const transport =
  smtpHost && smtpUser && smtpPassword
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        // 465 is the implicit-TLS port; every other common port (587, 25)
        // starts plaintext and upgrades via STARTTLS instead.
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword },
      })
    : null;

/**
 * Best-effort email send — never throws into its caller. Every call site in
 * this app fires this from inside an already-deferred after() callback (see
 * recordListingViews for the established pattern), so a slow/failed SMTP
 * attempt can't hold up or break the page/action that triggered it.
 */
export async function sendMail(options: { to: string; subject: string; text: string }): Promise<void> {
  if (!transport) {
    console.warn(`E-Mail nicht gesendet (kein SMTP konfiguriert): "${options.subject}" an ${options.to}`);
    return;
  }
  try {
    await transport.sendMail({
      from: smtpFrom || smtpUser,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  } catch (err) {
    console.error("Fehler beim E-Mail-Versand", err);
  }
}
