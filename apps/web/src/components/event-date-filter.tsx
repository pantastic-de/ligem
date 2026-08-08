"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const buttonClass =
  "min-h-9 rounded-full border border-text/20 px-3 text-sm font-medium transition-colors hover:bg-bg";

export function EventDateFilter({
  defaultVon,
  defaultBis,
  onChange,
  eventDayColors,
  legend,
  placeholder = "Zeitraum wählen (alle anstehenden Termine)",
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
      ? `${shortDateFormat.format(new Date(startDate))} – ${shortDateFormat.format(new Date(endDate))}`
      : `ab ${shortDateFormat.format(new Date(startDate))}`
    : "";

  const calendarContent = (
    <>
        <div className="flex items-center justify-between pr-12">
          <button
            type="button"
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
              )
            }
            className="min-h-9 min-w-9 rounded-full transition-colors hover:bg-bg"
            aria-label="Vorheriger Monat"
          >
            ‹
          </button>
          <span className="font-medium capitalize">
            {viewMonth.toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
              )
            }
            className="min-h-9 min-w-9 rounded-full transition-colors hover:bg-bg"
            aria-label="Nächster Monat"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const key = toDateKey(day);
            const isStart = key === startDate;
            const isEnd = key === endDate;
            const inRange = Boolean(
              startDate && endDate && key > startDate && key < endDate,
            );
            const dayColors = eventDayColors?.[key] ?? [];
            const selected = isStart || isEnd;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectDay(day)}
                aria-pressed={selected}
                aria-label={
                  dayColors.length > 0
                    ? `${dateLabelFormat.format(day)}, ${dayColors.length} Termin${dayColors.length > 1 ? "e" : ""}`
                    : dateLabelFormat.format(day)
                }
                className={[
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors hover:bg-bg",
                  selected ? "bg-primary text-white hover:bg-primary" : "",
                  inRange && !selected ? "bg-primary/15" : "",
                  isToday ? "ring-2 ring-inset ring-secondary" : "",
                ].join(" ")}
              >
                <span>{day.getDate()}</span>
                {dayColors.length > 0 ? (
                  <span className="flex gap-0.5">
                    {dayColors.slice(0, 3).map((color, idx) => (
                      <span
                        key={idx}
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: selected ? "#fff" : color }}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {legend && legend.length > 0 && eventDayColors && Object.keys(eventDayColors).length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-text/10 pt-3 text-xs text-text-muted">
            {legend.map((entry) => (
              <span key={entry.name} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
            ))}
          </div>
        ) : null}

        <p className="text-sm text-text-muted">
          {startDate
            ? endDate
              ? `Vom ${dateLabelFormat.format(new Date(startDate))} bis ${dateLabelFormat.format(new Date(endDate))}`
              : "Beginn gewählt, jetzt das Ende anklicken (für einen einzelnen Tag denselben Tag nochmal anklicken)."
            : emptyHint}
        </p>

        <div className="border-t border-text/10 pt-3">
          <span className="font-medium">Zeitraum</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyPreset(7)} className={buttonClass}>
              Nächste 7 Tage
            </button>
            <button type="button" onClick={() => applyPreset(30)} className={buttonClass}>
              Nächste 30 Tage
            </button>
            <button type="button" onClick={clearRange} className={buttonClass}>
              Alle anstehenden
            </button>
          </div>
        </div>
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
        <input
          type="text"
          readOnly
          value={rangeSummary}
          onFocus={() => setExpanded(true)}
          placeholder={placeholder}
          className="min-h-11 w-full cursor-pointer rounded-xl border border-text/20 bg-bg px-3 text-sm"
        />
      ) : (
      <div className="relative flex flex-col gap-3 rounded-2xl border border-text/20 bg-surface p-4">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Zeitraum-Auswahl schließen"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg"
        >
          ✕
        </button>
        <span className="pr-8 font-medium">{placeholder}</span>
        {calendarContent}
      </div>
      )}

      <input type="hidden" name="von" value={startDate} />
      <input type="hidden" name="bis" value={endDate} />
    </div>
  );
}
