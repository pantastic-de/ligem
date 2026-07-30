import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-data/shared";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { bulkAddRole, bulkDeleteUsers, bulkRemoveRole, updateUserRoles } from "./actions";

const BULK_FORM_ID = "bulk-nutzer-form";

const roleOptions: { value: string; label: string }[] = [
  { value: "SUCHENDE", label: "Suchende" },
  { value: "ANBIETER", label: "Anbieter" },
  { value: "MODERATOR", label: "Moderator:in" },
  { value: "ADMIN", label: "Admin" },
];

const errorMessages: Record<string, string> = {
  "keine-auswahl": "Bitte wähle mindestens einen Nutzer aus.",
  "besitzt-inhalte":
    "Einige ausgewählte Nutzer besitzen noch Projekte oder Termine und können deshalb nicht gelöscht werden. Übertrage oder lösche zuerst deren Inhalte.",
};

export default async function AdminNutzerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireAdminPage();
  const { error, ok } = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { roles: true },
  });

  const isDemoEmail = (email: string) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
  const demoCount = users.filter((u) => isDemoEmail(u.email)).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Nutzerverwaltung</h1>
      <p className="mt-2 text-text-muted">
        Rollen bestimmen, was jemand tun darf. Ein Nutzer kann mehrere Rollen
        gleichzeitig haben.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorMessages[error] ?? error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {ok} Nutzer gelöscht.
        </p>
      ) : null}

      {/* Checkboxes in each row below reference this form via the `form`
          attribute rather than DOM nesting — each row already has its own
          Rollen-speichern form, and a literal nested <form> would be
          invalid HTML. */}
      <form
        id={BULK_FORM_ID}
        className="mt-8 flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
      >
        <div>
          <h2 className="font-semibold">
            Auswahl
            {demoCount > 0 ? (
              <span className="ml-2 text-sm font-normal text-text-muted">
                ({demoCount} generiert)
              </span>
            ) : null}
          </h2>
          <BulkSelectControls formId={BULK_FORM_ID} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            name="role"
            defaultValue="SUCHENDE"
            className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm"
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            formAction={bulkAddRole}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
          >
            Rolle hinzufügen
          </button>
          <button
            type="submit"
            formAction={bulkRemoveRole}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
          >
            Rolle entfernen
          </button>
          <ConfirmSubmitButton
            formAction={bulkDeleteUsers}
            confirmText="Ausgewählte Nutzerkonten wirklich unwiderruflich löschen?"
            className="ml-auto inline-flex min-h-11 items-center rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Ausgewählte löschen
          </ConfirmSubmitButton>
        </div>
      </form>

      <ul className="mt-6 flex flex-col gap-4">
        {users.map((user) => {
          const activeRoles = new Set(user.roles.map((r) => r.role));
          const isSelf = user.id === session.user.id;
          const isDemo = isDemoEmail(user.email);
          return (
            <li key={user.id} className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="userIds"
                    value={user.id}
                    form={BULK_FORM_ID}
                    data-demo={isDemo ? "true" : undefined}
                    disabled={isSelf}
                    aria-label={`${user.name ?? user.email} auswählen`}
                    className="h-5 w-5 disabled:opacity-30"
                  />
                  <span className="font-semibold">
                    {user.name ?? "(kein Name)"}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-text-muted">(du)</span>
                    ) : null}
                    {isDemo ? (
                      <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning align-middle">
                        Demo
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="text-sm text-text-muted">{user.email}</span>
              </div>
              <form action={updateUserRoles} className="mt-4 flex flex-wrap items-center gap-4">
                <input type="hidden" name="userId" value={user.id} />
                {roleOptions.map((role) => (
                  <label
                    key={role.value}
                    className="flex min-h-11 items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={role.value}
                      defaultChecked={activeRoles.has(role.value as never)}
                      className="h-5 w-5"
                    />
                    {role.label}
                  </label>
                ))}
                <button
                  type="submit"
                  className="ml-auto inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Speichern
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
