"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dateLabelFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "long",
});

const shortDateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function EventDateFilter({
  defaultVon,
  defaultBis,
  onChange,
  eventDayColors,
  legend,
  placeholder = "Alle anstehenden Termine",
  emptyHint = "Alle anstehenden Termine, zum Eingrenzen einen Beginn-Tag anklicken.",
  embedded = false,
}: {
  defaultVon?: string;
  defaultBis?: string;
  // Called whenever the selected date range changes due to user interaction
  // (calendar click or preset button) — lets a parent search form auto-apply
  // filters without a submit button.
  onChange?: () => void;
  // Date (YYYY-MM-DD) -> distinct event-type colors found that day, shown as
  // small dots on the matching calendar cell.
  eventDayColors?: Record<string, string[]>;
  // Name + color for each event type, shown as a small legend so the dots'
  // colors carry meaning rather than being purely decorative.
  legend?: { name: string; color: string }[];
  // This component is also reused for /projekte's "Suchzeitraum" filter
  // (a listing's own move-in window, not an event feed), so the
  // Termine-flavored copy is overridable rather than hardcoded.
  placeholder?: string;
  emptyHint?: string;
  // /projekte's "Suchzeitraum" usage already nests this component inside
  // its own collapsible <details> fieldset (its own border + "Suchzeitraum"
  // summary/chevron already provide both the frame and the expand/collapse
  // control) — rendering this component's *own* bordered box/title/✕ on
  // top of that produced a visibly doubled frame with a redundant "Suchzeitraum
  // wählen" title inside it, and a ✕ that only collapsed the inner box while
  // leaving the outer one open. `embedded` drops this component's own
  // border/collapsed-summary-input/title/✕ entirely and just renders the
  // calendar/legend/presets flush — the parent's own frame and its native
  // <summary> disclosure become the only frame and the only "close"
  // control. /termine's sidebar usage (not nested in anything) leaves this
  // false and keeps the self-contained boxed behavior.
  embedded?: boolean;
}) {
  const [startDate, setStartDate] = useState(defaultVon ?? "");
  const [endDate, setEndDate] = useState(defaultBis ?? "");
  // The calendar starts open by default; the "✕" in its top-right corner
  // collapses it down to a single-line summary input (see below) when the
  // extra vertical space isn't needed — it otherwise stays open, including
  // across selecting a range/preset, since collapsing is an explicit choice
  // rather than an automatic side effect of picking a date.
  const [expanded, setExpanded] = useState(true);

  // Stores the last [startDate, endDate] combination `onChange` actually
  // fired for (see location-radius-picker.tsx's identical pattern for why
  // this is a value comparison rather than a "have I run once" boolean
  // ref) — a plain boolean flips true→false on the *first* of React 18
  // Strict Mode's dev-only double-invoked mount effects, so the second one
  // incorrectly treats itself as a real change and fires onChange despite
  // nothing having actually changed yet.
  const lastChangeKey = useRef(`${startDate}|${endDate}`);
  useEffect(() => {
    const key = `${startDate}|${endDate}`;
    if (lastChangeKey.current !== key) {
      lastChangeKey.current = key;
      onChange?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const [viewMonth, setViewMonth] = useState(() => {
    const base = startDate ? new Date(startDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Computed once per render (cheap) rather than memoized — used to ring-
  // highlight today's cell in the day grid below, independent of whichever
  // day(s) are actually selected.
  const todayKey = toDateKey(new Date());
  // Shown as the current value while no range is set.
  const allLabel = placeholder;

  const days = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Montag = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewMonth]);

  function selectDay(day: Date) {
    const key = toDateKey(day);
    if (!startDate || (startDate && endDate) || key < startDate) {
      setStartDate(key);
      setEndDate("");
    } else {
      // Range complete (including the same day clicked twice, for a
      // single-day range).
      setEndDate(key);
    }
  }

  function applyPreset(daysAhead: number | null) {
    const today = new Date();
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setStartDate(toDateKey(today));
    if (daysAhead == null) {
      setEndDate("");
      return;
    }
    const end = new Date(today);
    end.setDate(end.getDate() + daysAhead);
    setEndDate(toDateKey(end));
  }

  function clearRange() {
    setStartDate("");
    setEndDate("");
  }

  const rangeSummary = startDate
    ? endDate
      ? startDate === endDate
        ? shortDateFormat.format(new Date(startDate))
        : `${shortDateFormat.format(new Date(startDate))} bis ${shortDateFormat.format(new Date(endDate))}`
      : `ab ${shortDateFormat.format(new Date(startDate))}`
    : "";

  // Which quick-pick matches the current range, so its pill reads as active.
  const todayDate = new Date();
  const activePreset: "7" | "30" | "alle" | null = !startDate
    ? "alle"
    : startDate === todayKey && endDate === toDateKey(addDays(todayDate, 7))
      ? "7"
      : startDate === todayKey && endDate === toDateKey(addDays(todayDate, 30))
        ? "30"
        : null;

  const presets: { id: "7" | "30" | "alle"; label: string; onClick: () => void }[] = [
    { id: "7", label: "7 Tage", onClick: () => applyPreset(7) },
    { id: "30", label: "30 Tage", onClick: () => applyPreset(30) },
    { id: "alle", label: "Alle", onClick: clearRange },
  ];

  const hint = startDate && !endDate
    ? "Jetzt das Ende anklicken. Für einen einzelnen Tag denselben Tag noch einmal."
    : null;

  const calendarContent = (
    <>
      <div className="flex rounded-full bg-bg p-1" role="group" aria-label="Schnellauswahl Zeitraum">
        {presets.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={preset.onClick}
              aria-pressed={active}
              className={`min-h-10 flex-1 rounded-full px-2 text-sm font-semibold transition-colors ${
                active ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg hover:text-text"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-lg font-bold capitalize">
          {viewMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg hover:text-text"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div>
        <div className="grid grid-cols-7 pb-1 text-center text-xs font-semibold uppercase tracking-wide">
          {WEEKDAYS.map((weekday, i) => (
            <div key={weekday} className={i >= 5 ? "text-primary/70" : "text-text-muted"}>
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const key = toDateKey(day);
            const isStart = key === startDate;
            const isEnd = key === endDate;
            const hasRange = Boolean(startDate && endDate && startDate !== endDate);
            const inRange = Boolean(startDate && endDate && key > startDate && key < endDate);
            const dayColors = eventDayColors?.[key] ?? [];
            const selected = isStart || isEnd;
            const isToday = key === todayKey;
            // A soft band behind the whole range, rounded off at its two ends
            // and where it wraps into the next week row.
            const column = i % 7;
            const band = hasRange && (inRange || isStart || isEnd)
              ? `bg-primary/12 ${isStart || column === 0 ? "rounded-l-full" : ""} ${isEnd || column === 6 ? "rounded-r-full" : ""}`
              : "";
            return (
              <div key={key} className={`flex justify-center ${band}`}>
                <button
                  type="button"
                  onClick={() => selectDay(day)}
                  aria-pressed={selected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={
                    dayColors.length > 0
                      ? `${dateLabelFormat.format(day)}, ${dayColors.length} Terminart${dayColors.length > 1 ? "en" : ""}`
                      : dateLabelFormat.format(day)
                  }
                  className={[
                    "relative flex h-12 w-12 max-w-full flex-col items-center justify-center rounded-full text-base tabular-nums transition-colors",
                    selected
                      ? "bg-primary font-bold text-white shadow-sm"
                      : isToday
                        ? "font-bold text-primary ring-1 ring-inset ring-primary/40 hover:bg-primary/10"
                        : "hover:bg-bg",
                  ].join(" ")}
                >
                  <span className="leading-none">{day.getDate()}</span>
                  <span className="mt-1 flex h-1.5 gap-0.5" aria-hidden="true">
                    {dayColors.slice(0, 3).map((color, idx) => (
                      <span
                        key={idx}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: selected ? "rgba(255,255,255,0.9)" : color }}
                      />
                    ))}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {hint ? <p className="text-sm text-text-muted">{hint}</p> : null}
      {embedded && !hint ? (
        <p className="text-sm text-text-muted">
          {startDate
            ? endDate
              ? `Vom ${dateLabelFormat.format(new Date(startDate))} bis ${dateLabelFormat.format(new Date(endDate))}`
              : `Ab ${dateLabelFormat.format(new Date(startDate))}`
            : emptyHint}
        </p>
      ) : null}

      {legend && legend.length > 0 && eventDayColors && Object.keys(eventDayColors).length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 border-t border-text/10 pt-3" aria-label="Farben der Veranstaltungsarten">
          {legend.map((entry) => (
            <li
              key={entry.name}
              className="inline-flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-xs text-text-muted"
            >
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {embedded ? (
        // Already nested inside a parent's own bordered/collapsible
        // container (see the `embedded` prop doc above) — no own
        // frame/title/✕ here, the parent's frame and <summary> disclosure
        // are the only ones.
        calendarContent
      ) : !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-text/15 bg-bg px-4 text-left transition-colors hover:border-primary/40"
        >
          <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">Zeitraum</span>
            <span className="block font-semibold">{rangeSummary || allLabel}</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
        </button>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-text/10 bg-surface p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">Zeitraum</span>
              <span className="block font-semibold">{rangeSummary || allLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Kalender einklappen"
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg hover:text-text"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {calendarContent}
        </div>
      )}

      <input type="hidden" name="von" value={startDate} />
      <input type="hidden" name="bis" value={endDate} />
    </div>
  );
}
