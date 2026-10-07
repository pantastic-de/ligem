import Link from "next/link";

/** Switch between the two review queues, shown above both moderation pages. */
export function ModerationSwitch({ active }: { active: "projekte" | "termine" }) {
  const items = [
    { key: "projekte", href: "/admin/projekte", label: "Projekte prüfen" },
    { key: "termine", href: "/admin/termine", label: "Termine prüfen" },
  ] as const;
  return (
    <div className="mb-4 inline-flex rounded-full bg-surface p-1 shadow-sm" role="group" aria-label="Moderation">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={`inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
            active === item.key ? "bg-primary text-white" : "text-text-muted hover:text-text"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
