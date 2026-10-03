import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/site";
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

export function renderEmail(
  key: EmailTemplateKey,
  subject: string,
  body: string,
  values: Record<string, string>,
): { subject: string; html: string; text: string } {
  const definition = getTemplateDefinition(key)!;
  const filled = fillBody(body, definition, values);
  return {
    subject: fillSubject(subject, values),
    html: wrapEmailHtml(filled, SITE_URL),
    text: htmlToText(filled),
  };
}

/** Renders a template with the given values and sends it (HTML plus a plain-text version). */
export async function sendTemplateMail(
  key: EmailTemplateKey,
  to: string,
  values: Record<string, string>,
  options: { replyTo?: string } = {},
): Promise<void> {
  const template = await getEmailTemplate(key);
  const mail = renderEmail(key, template.subject, template.body, values);
  await sendMail({ to, ...mail, replyTo: options.replyTo });
}
