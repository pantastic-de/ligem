import Link from "next/link";
import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { EMAIL_TEMPLATES } from "@/lib/email-templates";
import { describeMailFrom } from "@/lib/mailer";

export const metadata: Metadata = {
  title: "E-Mail-Texte",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function EmailTemplatesPage() {
  const session = await requireAdminPage();
  const overrides = await prisma.emailTemplate.findMany({
    select: { key: true, subject: true, updatedAt: true, updatedBy: { select: { name: true, email: true } } },
  });
  const byKey = new Map(overrides.map((o) => [o.key, o]));
  const displayName = session.user.name ?? session.user.email ?? "Admin";

  return (
    <AppShell active="admin-e-mails" isAdmin displayName={displayName}>
      <h1 className="text-3xl font-bold">E-Mail-Texte</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        Alle E-Mails, die LiGem verschickt. Betreff und Text lassen sich anpassen, Platzhalter wie{" "}
        <code className="rounded bg-bg px-1">{"{{projekt}}"}</code> werden beim Versand ersetzt. Jede Mail geht als
        HTML mit einer automatisch erzeugten Textfassung raus.
      </p>
      <p className="mt-3 text-sm text-text-muted">
        Absender: <strong className="text-text">{describeMailFrom()}</strong>
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {EMAIL_TEMPLATES.map((template) => {
          const override = byKey.get(template.key);
          return (
            <li key={template.key}>
              <Link
                href={`/admin/e-mails/${template.key}`}
                className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg sm:p-5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{template.label}</span>
                    {override ? (
                      <span className="rounded-full bg-accent/30 px-2 py-0.5 text-xs font-semibold">Angepasst</span>
                    ) : (
                      <span className="rounded-full bg-text/10 px-2 py-0.5 text-xs font-medium text-text-muted">
                        Standard
                      </span>
                    )}
                  </span>
                  <span className="text-sm">Betreff: {override?.subject ?? template.subject}</span>
                  <span className="text-sm text-text-muted">{template.trigger}</span>
                  {override ? (
                    <span className="text-xs text-text-muted">
                      Zuletzt geändert {dateFormat.format(override.updatedAt)}
                      {override.updatedBy ? ` von ${override.updatedBy.name ?? override.updatedBy.email}` : ""}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
