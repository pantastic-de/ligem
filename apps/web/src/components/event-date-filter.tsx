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
  emptyHint = "Alle anstehenden Termine — zum Eingrenzen einen Beginn-Tag anklicken.",
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
}) {
  const [startDate, setStartDate] = useState(defaultVon ?? "");
  const [endDate, setEndDate] = useState(defaultBis ?? "");
  // The calendar starts collapsed behind a single-line summary input — see
  // the input below — and only opens once that input is clicked/focused.
  const [expanded, setExpanded] = useState(false);

  const skipFirstChange = useRef(true);
  useEffect(() => {
    if (skipFirstChange.current) {
      skipFirstChange.current = false;
      return;
    }
    onChange?.();
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
      // single-day range) — collapse back to the compact summary input.
      setEndDate(key);
      setExpanded(false);
    }
  }

  function applyPreset(daysAhead: number | null) {
    const today = new Date();
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setStartDate(toDateKey(today));
    if (daysAhead == null) {
      setEndDate("");
      setExpanded(false);
      return;
    }
    const end = new Date(today);
    end.setDate(end.getDate() + daysAhead);
    setEndDate(toDateKey(end));
    setExpanded(false);
  }

  function clearRange() {
    setStartDate("");
    setEndDate("");
    setExpanded(false);
  }

  const rangeSummary = startDate
    ? endDate
      ? `${shortDateFormat.format(new Date(startDate))} – ${shortDateFormat.format(new Date(endDate))}`
      : `ab ${shortDateFormat.format(new Date(startDate))}`
    : "";

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        readOnly
        value={rangeSummary}
        onFocus={() => setExpanded(true)}
        placeholder={placeholder}
        className="min-h-11 w-full cursor-pointer rounded-xl border border-text/20 bg-bg px-3 text-sm"
      />
      {expanded ? (
      <>
      <div className="relative flex flex-col gap-3 rounded-2xl border border-text/20 bg-surface p-4">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Zeitraum-Auswahl schließen"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg"
        >
          ✕
        </button>
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
                    ? `${dateLabelFormat.format(day)} — ${dayColors.length} Termin${dayColors.length > 1 ? "e" : ""}`
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
              : "Beginn gewählt — jetzt das Ende anklicken (für einen einzelnen Tag denselben Tag nochmal anklicken)."
            : emptyHint}
        </p>
      </div>

      <span className="font-medium">Zeitraum</span>
      <div className="flex flex-wrap gap-2">
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
      </>
      ) : null}

      <input type="hidden" name="von" value={startDate} />
      <input type="hidden" name="bis" value={endDate} />
    </div>
  );
}
