import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

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

const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPassword);

/**
 * The From header. SMTP_FROM may be a full address ("LiGem <info@ligem.de>"
 * or "info@ligem.de") or just a display name ("LiGem - Leben in
 * Gemeinschaft"). A bare name used to go straight into nodemailer, which
 * then sent no From header and an empty envelope sender (MAIL FROM:<>),
 * which mail programs show as "MAILER-DAEMON". A name without "@" is now
 * paired with SMTP_USER's address.
 */
export const mailFrom: string | { name: string; address: string } | undefined =
  smtpFrom && smtpFrom.includes("@")
    ? smtpFrom
    : smtpUser
      ? smtpFrom
        ? { name: smtpFrom, address: smtpUser }
        : smtpUser
      : undefined;

/** Human-readable sender for the admin e-mail page. */
export function describeMailFrom(): string {
  if (!mailFrom) return "nicht konfiguriert";
  return typeof mailFrom === "string" ? mailFrom : `${mailFrom.name} <${mailFrom.address}>`;
}
let transportPromise: Promise<Transporter> | null = null;

/**
 * nodemailer resolves SMTP_HOST with direct DNS queries and only falls back
 * to the OS resolver, so it ignores /etc/hosts — including the entries
 * docker-compose.prod.yml's `extra_hosts` writes there. On the production
 * server, DNS hands back 127.0.1.1 (the host's own-hostname entry) for the
 * mail server's name, which inside the container is the container itself.
 * Resolving via dns.lookup (the OS resolver, /etc/hosts first) and
 * connecting to that address with `servername` set keeps the extra_hosts
 * mapping working while STARTTLS still checks the certificate against the
 * real hostname. Resolved once per process.
 */
function getTransport(): Promise<Transporter> {
  transportPromise ??= (async () => {
    const host = smtpHost as string;
    const address = isIP(host) ? host : (await lookup(host)).address;
    return nodemailer.createTransport({
      host: address,
      port: smtpPort,
      // 465 is the implicit-TLS port; every other common port (587, 25)
      // starts plaintext and upgrades via STARTTLS instead.
      secure: smtpPort === 465,
      tls: isIP(host) ? undefined : { servername: host },
      auth: { user: smtpUser, pass: smtpPassword },
    });
  })().catch((err) => {
    // Don't cache a failed lookup; the next send retries it.
    transportPromise = null;
    throw err;
  });
  return transportPromise;
}

/**
 * Best-effort email send — never throws into its caller. Every call site in
 * this app fires this from inside an already-deferred after() callback (see
 * recordListingViews for the established pattern), so a slow/failed SMTP
 * attempt can't hold up or break the page/action that triggered it.
 */
export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  // Where a reply should go (e.g. the person who sent a contact request).
  replyTo?: string;
}): Promise<void> {
  if (!smtpConfigured) {
    console.warn(`E-Mail nicht gesendet (kein SMTP konfiguriert): "${options.subject}" an ${options.to}`);
    return;
  }
  try {
    const transport = await getTransport();
    await transport.sendMail({
      from: mailFrom,
      // Envelope sender stays the authenticated mailbox, so bounces reach it
      // and the server never sees an empty MAIL FROM.
      envelope: { from: smtpUser, to: options.to },
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  } catch (err) {
    console.error("Fehler beim E-Mail-Versand", err);
  }
}
