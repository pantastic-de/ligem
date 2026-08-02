import Link from "next/link";
import { Bot, UserRound, Globe2, Flag, Server, Search, Filter } from "lucide-react";

import type { ViewSource } from "@/lib/view-stats";

const KIND_ICON = {
  bot: Bot,
  user: UserRound,
  referrer: Globe2,
  country: Flag,
  hostname: Server,
  search: Search,
  filter: Filter,
} as const;

/**
 * A leaderboard of ViewSource rows — plain CSS bars (no charting library)
 * sized relative to the largest single entry, each row combining an icon
 * (bot/registered user/referrer/country/hostname/search term/filter
 * combination), the entry's label, and its share of this SAME list's own
 * total (not some other, unrelated total the caller might also be
 * tracking) — reused for every breakdown across the Listing/Event/site-wide
 * statistics pages, one call per distinct breakdown (bot/user/referrer;
 * countries; hostnames; search terms; filter combinations).
 */
export function ViewSourceBreakdown({
  sources,
  viewerIsAdmin,
}: {
  sources: ViewSource[];
  // A registered viewer's name only links to /admin/nutzer when whoever is
  // looking at THIS statistics page is themselves an admin — that page is
  // admin-only, so the link would just 403 for a plain listing owner; they
  // see the same name as plain text instead.
  viewerIsAdmin: boolean;
}) {
  if (sources.length === 0) {
    return <p className="text-text-muted">Noch keine Daten erfasst.</p>;
  }

  const total = sources.reduce((sum, s) => sum + s.count, 0);
  const max = Math.max(...sources.map((s) => s.count));

  return (
    <ul className="flex flex-col gap-2">
      {sources.map((source, i) => {
        const Icon = KIND_ICON[source.kind];
        const sharePct = total > 0 ? Math.round((source.count / total) * 100) : 0;
        const barPct = max > 0 ? Math.round((source.count / max) * 100) : 0;
        return (
          <li key={`${source.kind}-${source.label}-${i}`} className="relative overflow-hidden rounded-xl bg-bg">
            <div
              className="absolute inset-y-0 left-0 bg-accent/25"
              style={{ width: `${barPct}%` }}
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-3 px-4 py-2.5">
              <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {source.kind === "user" && viewerIsAdmin && source.userId ? (
                  <Link
                    href={`/admin/nutzer#user-${source.userId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {source.label}
                  </Link>
                ) : (
                  <span className="font-medium">{source.label}</span>
                )}
              </span>
              <span className="shrink-0 text-sm text-text-muted">
                {source.count} · {sharePct}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
