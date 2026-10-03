import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/site";
import { notificationSettingsUrl, oneClickUnsubscribeUrl } from "@/lib/notification-token";
import {
  fillBody,
  fillSubject,
  getTemplateDefinition,
  htmlToText,
  wrapEmailHtml,
  type EmailTemplateKey,
} from "@/lib/email-templates";

/** Subject and body as currently in effect: the admin's edit if there is one, else the default. */
export async function getEmailTemplate(key: EmailTemplateKey) {
  const definition = getTemplateDefinition(key);
  if (!definition) throw new Error(`Unbekannte E-Mail-Vorlage: ${key}`);
  const override = await prisma.emailTemplate.findUnique({ where: { key } }).catch(() => null);
  return {
    definition,
    subject: override?.subject ?? definition.subject,
    body: override?.body ?? definition.body,
    customized: Boolean(override),
  };
}

/**
 * Renders a mail. `footerLink` fills the standard footer ("fusszeile"
 * template) with the recipient's personal settings link; without it the
 * footer links to the settings page behind the login.
 */
export function renderEmail(
  key: EmailTemplateKey,
  subject: string,
  body: string,
  values: Record<string, string>,
  footer?: { body: string; link?: string },
): { subject: string; html: string; text: string } {
  const definition = getTemplateDefinition(key)!;
  const filled = fillBody(body, definition, values);
  const footerDefinition = getTemplateDefinition("fusszeile")!;
  const footerHtml = footer
    ? fillBody(footer.body, footerDefinition, { einstellungen_link: footer.link ?? `${SITE_URL}/benachrichtigungen` })
    : "";
  return {
    subject: fillSubject(subject, values),
    html: wrapEmailHtml(filled, SITE_URL, footerHtml),
    text: htmlToText(filled) + (footerHtml ? `\n\n--\n${htmlToText(footerHtml)}` : ""),
  };
}

type SendOptions = {
  replyTo?: string;
  // E.g. the "account deleted" mail: there is no account left to manage.
  noFooter?: boolean;
  attachments?: { filename: string; content: string; contentType?: string }[];
};

/**
 * Renders a template with the given values and sends it (HTML plus a
 * plain-text version, standard footer with the personal settings link).
 * Respects the recipient's notification settings by the template's
 * category: "konto" mails always go out, "projekte"/"admin"/
 * "kontaktanfragen" only while the matching switch is on. Favorite mails
 * are already filtered per favorite before they get here.
 */
export async function sendTemplateMail(
  key: EmailTemplateKey,
  to: string,
  values: Record<string, string>,
  options: SendOptions = {},
): Promise<void> {
  // Reserved test/demo domains can never receive mail (see isDeliverable).
  if (/\.(invalid|local)$/i.test(to)) return;
  const template = await getEmailTemplate(key);
  const category = template.definition.category;
  const user = await prisma.user
    .findFirst({
      where: { email: { equals: to, mode: "insensitive" } },
      select: { id: true, notifyContactRequestsByEmail: true, notifyListingStatusByEmail: true, notifyAdminByEmail: true },
    })
    .catch(() => null);

  if (user) {
    if (category === "projekte" && !user.notifyListingStatusByEmail) return;
    if (category === "admin" && !user.notifyAdminByEmail) return;
    if (category === "kontaktanfragen" && !user.notifyContactRequestsByEmail) return;
  }

  const footerTemplate = await getEmailTemplate("fusszeile");
  const mail = renderEmail(
    key,
    template.subject,
    template.body,
    values,
    options.noFooter ? undefined : { body: footerTemplate.body, link: user ? notificationSettingsUrl(user.id) : undefined },
  );

  // One-click unsubscribe (RFC 8058) for everything that can be switched off.
  const headers =
    user && category !== "konto"
      ? {
          "List-Unsubscribe": `<${oneClickUnsubscribeUrl(user.id)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined;

  await sendMail({ to, ...mail, replyTo: options.replyTo, headers, attachments: options.attachments });
}
