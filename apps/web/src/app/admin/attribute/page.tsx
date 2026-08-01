import type { Metadata } from "next";

import type {
  AttributeGroup,
  AttributeOption,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { addGroup, addOption, deleteGroup, deleteOption } from "./actions";

export const metadata: Metadata = {
  title: "Attribute verwalten - Admin",
  robots: { index: false, follow: false },
};

type GroupWithOptions = AttributeGroup & {
  options: (AttributeOption & {
    _count: { listings: number; events: number };
  })[];
};

function GroupCard({ group, countKey }: { group: GroupWithOptions; countKey: "listings" | "events" }) {
  const unitLabel = countKey === "listings" ? "Projekt(e)" : "Termin(e)";

  return (
    <section className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{group.name}</h3>
          <p className="text-sm text-text-muted">
            {group.allowMultiple ? "Mehrfachauswahl" : "Einfachauswahl"} · Slug:{" "}
            {group.slug}
          </p>
        </div>
        {group.options.length === 0 ? (
          <form action={deleteGroup}>
            <input type="hidden" name="id" value={group.id} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
            >
              Gruppe löschen
            </button>
          </form>
        ) : null}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {group.options.map((option) => (
          <li
            key={option.id}
            className="flex items-center justify-between gap-4 rounded-xl bg-bg px-4 py-2"
          >
            <span>
              {option.name}{" "}
              <span className="text-sm text-text-muted">
                ({option._count[countKey]} {unitLabel})
              </span>
            </span>
            <form action={deleteOption}>
              <input type="hidden" name="id" value={option.id} />
              <button
                type="submit"
                className="text-sm font-medium text-error hover:underline"
              >
                Entfernen
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addOption} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="groupId" value={group.id} />
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`option-name-${group.id}`} className="text-sm font-medium">
            Neuer Wert
          </label>
          <input
            id={`option-name-${group.id}`}
            name="name"
            type="text"
            required
            className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-text"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover"
        >
          Hinzufügen
        </button>
      </form>
    </section>
  );
}

export default async function AdminAttributePage() {
  await requireAdminPage();

  const allGroups = await prisma.attributeGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { listings: true, events: true } } },
      },
    },
  });
  const listingGroups = allGroups.filter((g) => g.appliesTo === "LISTING");
  const eventGroups = allGroups.filter((g) => g.appliesTo === "EVENT");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Attribute &amp; Filter</h1>
      <p className="mt-2 text-text-muted">
        Jede Gruppe ist ein Filter (z. B. Projekt Typ, Grundwerte, oder
        Veranstaltungsart im Kalender). Neue Werte oder ganz neue Gruppen
        können jederzeit ergänzt werden, ohne Code zu ändern.
      </p>

      <h2 className="mt-10 text-xl font-bold">Filter für Projekte</h2>
      <div className="mt-4 flex flex-col gap-8">
        {listingGroups.map((group) => (
          <GroupCard key={group.id} group={group} countKey="listings" />
        ))}
      </div>

      <h2 className="mt-10 text-xl font-bold">Filter für Termine (Kalender)</h2>
      <div className="mt-4 flex flex-col gap-8">
        {eventGroups.map((group) => (
          <GroupCard key={group.id} group={group} countKey="events" />
        ))}
      </div>

      <form
        action={addGroup}
        className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Neue Attributgruppe</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Gilt für</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="appliesTo"
              value="LISTING"
              defaultChecked
              className="h-5 w-5"
            />
            Projekte
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="appliesTo" value="EVENT" className="h-5 w-5" />
            Termine (Kalender)
          </label>
        </fieldset>

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowMultiple"
            defaultChecked
            className="h-5 w-5"
          />
          Mehrfachauswahl erlauben (sonst Einfachauswahl)
        </label>
        <button
          type="submit"
          className="min-h-12 self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Gruppe anlegen
        </button>
      </form>
    </div>
  );
}
