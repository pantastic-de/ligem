import type { DailyViewCounts } from "@/lib/view-stats";

const CHART_HEIGHT_PX = 112;
const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });

/**
 * "Zugriffe der letzten N Tage" — a plain CSS stacked bar chart (no
 * charting library), one bar per day, split into an Übersicht segment
 * (bottom) and a Detail segment (top) so the same daily/overview split
 * shown as totals elsewhere is also visible as a trend over time. Every
 * bar's exact counts are available via its native `title` tooltip; only
 * every ~5th day gets a visible x-axis label to avoid clutter on a 30-day
 * range.
 */
export function ViewTimelineChart({ data }: { data: DailyViewCounts[] }) {
  const max = Math.max(1, ...data.map((d) => d.overview + d.detail));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height: CHART_HEIGHT_PX }}>
        {data.map((d) => {
          const overviewH = Math.round((d.overview / max) * CHART_HEIGHT_PX);
          const detailH = Math.round((d.detail / max) * CHART_HEIGHT_PX);
          const label = dayFormat.format(new Date(`${d.date}T00:00:00`));
          return (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 flex-col justify-end overflow-hidden rounded-t"
              title={`${label}: ${d.overview} Übersicht, ${d.detail} Detail`}
            >
              <div className="w-full bg-secondary/70 transition-colors group-hover:bg-secondary" style={{ height: detailH }} />
              <div className="w-full bg-accent/60 transition-colors group-hover:bg-accent" style={{ height: overviewH }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex text-[10px] text-text-muted">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % labelEvery === 0 ? dayFormat.format(new Date(`${d.date}T00:00:00`)) : ""}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent/60" aria-hidden="true" />
          Übersicht
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/70" aria-hidden="true" />
          Detail
        </span>
      </div>
    </div>
  );
}
