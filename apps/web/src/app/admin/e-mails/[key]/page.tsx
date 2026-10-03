import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireAdminPage } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { getTemplateDefinition, type EmailTemplateKey } from "@/lib/email-templates";
import { getEmailTemplate } from "@/lib/email-template-store";
import { describeMailFrom } from "@/lib/mailer";

export const metadata: Metadata = {
  title: "E-Mail-Text bearbeiten",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  leer: "Betreff und Text dürfen nicht leer sein.",
  "keine-adresse": "Dein Konto hat keine zustellbare E-Mail-Adresse, deshalb konnte keine Testmail gesendet werden.",
};

export default async function EmailTemplateEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ ok?: string; error?: string; an?: string }>;
}) {
  const session = await requireAdminPage();
  const { key } = await params;
  const { ok, error, an } = await searchParams;
  if (!getTemplateDefinition(key)) notFound();
  const template = await getEmailTemplate(key as EmailTemplateKey);
  const { definition } = template;
  const displayName = session.user.name ?? session.user.email ?? "Admin";

  return (
    <AppShell active="admin-e-mails" isAdmin displayName={displayName}>
      <Link href="/admin/e-mails" className="text-sm font-medium text-primary hover:underline">
        ← Alle E-Mail-Texte
      </Link>
      <h1 className="mt-3 text-3xl font-bold">{definition.label}</h1>
      <dl className="mt-3 grid max-w-3xl grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Wann</dt>
        <dd className="text-text-muted">{definition.trigger}</dd>
        <dt className="font-semibold">An wen</dt>
        <dd className="text-text-muted">{definition.recipients}</dd>
        <dt className="font-semibold">Absender</dt>
        <dd className="text-text-muted">{describeMailFrom()}</dd>
        <dt className="font-semibold">Stand</dt>
        <dd className="text-text-muted">{template.customized ? "Angepasster Text" : "Standardtext"}</dd>
      </dl>

      {ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {ok === "gespeichert"
            ? "Gespeichert. Ab jetzt wird dieser Text verschickt."
            : ok === "zurueckgesetzt"
              ? "Zurückgesetzt. Es gilt wieder der Standardtext."
              : `Testmail an ${an ?? "dich"} ist unterwegs.`}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorMessages[error] ?? error}
        </p>
      ) : null}

      <EmailTemplateEditor
        // Remount after save/reset so the fields show what is stored now.
        key={`${template.subject}|${template.body}`}
        templateKey={key}
        initialSubject={template.subject}
        initialBody={template.body}
        customized={template.customized}
      />
    </AppShell>
  );
}
