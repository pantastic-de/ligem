import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { addCategory, deleteCategory } from "./actions";

export default async function AdminKategorienPage() {
  await requireAdminPage();

  const categories = await prisma.listingCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { listings: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Kategorien</h1>
      <p className="mt-2 text-text-muted">
        &bdquo;Art des Projektinserates&ldquo; — die Taxonomie, der ein
        Projekt-Eintrag zugeordnet werden kann (mehrfach möglich).
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-sm"
          >
            <div>
              <span className="font-semibold">{category.name}</span>
              <span className="ml-2 text-sm text-text-muted">
                {category._count.listings} Projekt(e)
              </span>
            </div>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={category.id} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                Löschen
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form
        action={addCategory}
        className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Neue Kategorie</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="font-medium">
            Name (Deutsch)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nameEn" className="font-medium">
            Name (Englisch, optional)
          </label>
          <input
            id="nameEn"
            name="nameEn"
            type="text"
            className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
          />
        </div>
        <button
          type="submit"
          className="min-h-12 self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Hinzufügen
        </button>
      </form>
    </div>
  );
}
