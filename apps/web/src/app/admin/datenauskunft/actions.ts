"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/authz";
import { buildDataExport } from "@/lib/data-export";
import { sendTemplateMail } from "@/lib/email-template-store";

async function pendingRequest(formData: FormData) {
  const id = formData.get("requestId")?.toString();
  const request = id ? await prisma.dataExportRequest.findUnique({ where: { id } }) : null;
  if (!request || request.status !== "PENDING") redirect("/admin/datenauskunft?error=erledigt");
  return request;
}

/** Builds the export and mails it to the user as a JSON attachment. */
export async function approveDataExport(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const request = await pendingRequest(formData);
  const exportData = await buildDataExport(request.userId);
  const date = new Date().toISOString().slice(0, 10);

  // Sent synchronously (not via after()): the admin should only see "sent"
  // once the mail has actually been handed to the mail server.
  await sendTemplateMail(
    "datenauskunft-versand",
    exportData.email,
    { name: exportData.name, uebersicht: exportData.summary },
    {
      attachments: [
        {
          filename: `ligem-daten-${date}.json`,
          content: JSON.stringify(exportData.data, null, 2),
          contentType: "application/json",
        },
      ],
    },
  );
  await prisma.dataExportRequest.update({
    where: { id: request.id },
    data: { status: "SENT", decidedAt: new Date(), decidedById: session.user.id },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/datenauskunft?ok=gesendet`);
}

export async function rejectDataExport(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const request = await pendingRequest(formData);
  const reason = formData.get("reason")?.toString().trim().slice(0, 2000);
  if (!reason) redirect(`/admin/datenauskunft?error=grund`);

  const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { name: true, email: true } });
  await prisma.dataExportRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED", decidedAt: new Date(), decidedById: session.user.id, rejectReason: reason },
  });
  if (user) await sendTemplateMail("datenauskunft-abgelehnt", user.email, { name: user.name ?? user.email, grund: reason });
  revalidatePath("/", "layout");
  redirect(`/admin/datenauskunft?ok=abgelehnt`);
}
