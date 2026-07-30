import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { updateUserRoles } from "./actions";

const roleOptions: { value: string; label: string }[] = [
  { value: "SUCHENDE", label: "Suchende" },
  { value: "ANBIETER", label: "Anbieter" },
  { value: "MODERATOR", label: "Moderator:in" },
  { value: "ADMIN", label: "Admin" },
];

export default async function AdminNutzerPage() {
  await requireAdminPage();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { roles: true },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Nutzerverwaltung</h1>
      <p className="mt-2 text-text-muted">
        Rollen bestimmen, was jemand tun darf. Ein Nutzer kann mehrere Rollen
        gleichzeitig haben.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {users.map((user) => {
          const activeRoles = new Set(user.roles.map((r) => r.role));
          return (
            <li key={user.id} className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {user.name ?? "(kein Name)"}
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
