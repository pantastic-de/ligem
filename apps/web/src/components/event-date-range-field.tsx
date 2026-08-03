"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const TIME_STEP_MINUTES = 15;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDefault(value?: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date: date ?? "", time: time ?? "" };
}

function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += TIME_STEP_MINUTES) {
      options.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return options;
}
const TIME_OPTIONS = buildTimeOptions();

const dateLabelFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "long",
});

export function EventDateRangeField({
  defaultStartAt,
  defaultEndAt,
}: {
  defaultStartAt?: string;
  defaultEndAt?: string;
}) {
  const startDefaults = parseDefault(defaultStartAt);
  const endDefaults = parseDefault(defaultEndAt);

  const [startDate, setStartDate] = useState(startDefaults.date);
  const [startTime, setStartTime] = useState(startDefaults.time || "18:00");
  const [endDate, setEndDate] = useState(endDefaults.date);
  const [endTime, setEndTime] = useState(endDefaults.time || "20:00");

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
      setEndDate(key);
    }
  }

  const startDateTime = startDate ? `${startDate}T${startTime}` : "";
  const endDateTime = endDate ? `${endDate}T${endTime}` : "";
  const sameDayInvalidOrder = Boolean(
    startDate && endDate && startDate === endDate && endTime <= startTime,
  );

  return (
    <div className="flex flex-col gap-3">
      <span className="font-medium">Termindatum *</span>
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
            const isToday = key === todayKey;
            // Past days are still clickable (no hard restriction), but
            // greyed out since a new event's start/end date in the past
            // isn't a meaningful choice.
            const isPast = key < todayKey;
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
                  isToday ? "ring-2 ring-inset ring-secondary" : "",
                  isPast && !isStart && !isEnd ? "text-text-muted/50" : "",
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
              : "Beginn gewählt, jetzt das Ende anklicken (für einen eintägigen Termin denselben Tag nochmal anklicken)."
            : "Bitte zuerst den Beginn-Tag anklicken."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startTime" className="font-medium">
            Beginn Uhrzeit *
          </label>
          <select
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endTime" className="font-medium">
            Ende Uhrzeit
          </label>
          <select
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!endDate}
            className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text disabled:opacity-50"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sameDayInvalidOrder ? (
        <p className="text-sm text-error">
          Die Ende-Uhrzeit muss nach der Beginn-Uhrzeit liegen.
        </p>
      ) : null}

      <input type="hidden" name="startAt" value={startDateTime} />
      <input type="hidden" name="endAt" value={endDate ? endDateTime : ""} />
    </div>
  );
}
