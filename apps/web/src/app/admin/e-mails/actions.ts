"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/authz";
import { sendMail } from "@/lib/mailer";
import { sanitizeEmailHtml } from "@/lib/sanitize-html";
import { exampleValues, getTemplateDefinition, type EmailTemplateKey } from "@/lib/email-templates";
import { renderEmail } from "@/lib/email-template-store";

function readForm(formData: FormData) {
  const key = formData.get("key")?.toString() ?? "";
  const definition = getTemplateDefinition(key);
  if (!definition) redirect("/admin/e-mails");
  const subject = (formData.get("subject")?.toString() ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  // Browsers submit textarea line breaks as \r\n.
  const body = sanitizeEmailHtml((formData.get("body")?.toString() ?? "").replace(/\r\n?/g, "\n").slice(0, 50_000));
  return { key: key as EmailTemplateKey, definition, subject, body };
}

export async function saveEmailTemplate(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const { key, definition, subject, body } = readForm(formData);
  if (!subject || !body.replace(/<[^>]*>/g, "").trim()) {
    redirect(`/admin/e-mails/${key}?error=leer`);
  }

  // Saving the default text unchanged keeps the template on "Standard", so
  // later improvements to the default still reach it.
  if (subject === definition.subject && body === sanitizeEmailHtml(definition.body)) {
    await prisma.emailTemplate.deleteMany({ where: { key } });
  } else {
    await prisma.emailTemplate.upsert({
      where: { key },
      create: { key, subject, body, updatedById: session.user.id },
      update: { subject, body, updatedById: session.user.id },
    });
  }
  revalidatePath("/admin/e-mails");
  redirect(`/admin/e-mails/${key}?ok=gespeichert`);
}

export async function resetEmailTemplate(formData: FormData): Promise<void> {
  await requireAdminAction();
  const { key } = readForm(formData);
  await prisma.emailTemplate.deleteMany({ where: { key } });
  revalidatePath("/admin/e-mails");
  redirect(`/admin/e-mails/${key}?ok=zurueckgesetzt`);
}

/** Sends what is currently in the form (saved or not), filled with example values, to the admin's own address. */
export async function sendTestEmail(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const { key, definition, subject, body } = readForm(formData);
  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (!admin || /\.(invalid|local)$/i.test(admin.email)) {
    redirect(`/admin/e-mails/${key}?error=keine-adresse`);
  }
  const mail = renderEmail(key, subject || definition.subject, body || definition.body, exampleValues(definition));
  await sendMail({ to: admin.email, ...mail, subject: `[Test] ${mail.subject}` });
  redirect(`/admin/e-mails/${key}?ok=test&an=${encodeURIComponent(admin.email)}`);
}
