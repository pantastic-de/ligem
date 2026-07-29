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

const buttonClass =
  "min-h-9 rounded-full border border-text/20 px-3 text-sm font-medium transition-colors hover:bg-bg";

export function EventDateFilter({
  defaultVon,
  defaultBis,
  onChange,
}: {
  defaultVon?: string;
  defaultBis?: string;
  // Called whenever the selected date range changes due to user interaction
  // (calendar click or preset button) — lets a parent search form auto-apply
  // filters without a submit button.
  onChange?: () => void;
}) {
  const [startDate, setStartDate] = useState(defaultVon ?? "");
  const [endDate, setEndDate] = useState(defaultBis ?? "");

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

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-col gap-3 rounded-2xl border border-text/20 bg-surface p-4">
        <div className="flex items-center justify-between">
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
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectDay(day)}
                aria-pressed={isStart || isEnd}
                aria-label={dateLabelFormat.format(day)}
                className={[
                  "min-h-9 rounded-lg text-sm transition-colors hover:bg-bg",
                  isStart || isEnd ? "bg-primary text-white hover:bg-primary" : "",
                  inRange && !isStart && !isEnd ? "bg-primary/15" : "",
                ].join(" ")}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-text-muted">
          {startDate
            ? endDate
              ? `Vom ${dateLabelFormat.format(new Date(startDate))} bis ${dateLabelFormat.format(new Date(endDate))}`
              : "Beginn gewählt — jetzt das Ende anklicken (für einen einzelnen Tag denselben Tag nochmal anklicken)."
            : "Alle anstehenden Termine — zum Eingrenzen einen Beginn-Tag anklicken."}
        </p>
      </div>

      <input type="hidden" name="von" value={startDate} />
      <input type="hidden" name="bis" value={endDate} />
    </div>
  );
}
