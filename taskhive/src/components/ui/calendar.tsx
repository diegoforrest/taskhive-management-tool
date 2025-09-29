"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  className?: string;
};

function toIso(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function CalendarPicker({ value, onChange, className }: Props) {
  const selected = useMemo(() => (value ? new Date(value) : null), [value]);
  const [viewDate, setViewDate] = useState<Date>(selected ? new Date(selected) : startOfMonth(new Date()));

  const monthStart = startOfMonth(viewDate);
  const startDay = new Date(monthStart);
  startDay.setDate(1 - startDay.getDay()); // start week on Sunday

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    days.push(d);
  }

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className={className}>
      <div className="rounded-md border bg-popover p-2 w-full">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-1 rounded hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium">
            {viewDate.toLocaleString(undefined, { month: "long" })} {viewDate.getFullYear()}
          </div>
          <button
            type="button"
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="p-1 rounded hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const inMonth = d.getMonth() === viewDate.getMonth();
            const isSelected = selected ? isSameDay(d, selected) : false;
            const isToday = isSameDay(d, new Date());
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => onChange(toIso(d))}
                className={`h-8 flex items-center justify-center text-xs rounded ${
                  isSelected ? 'bg-primary text-primary-foreground' : inMonth ? 'bg-transparent' : 'text-muted-foreground'
                } ${isToday && !isSelected ? 'ring-1 ring-muted/40' : ''}`}
                aria-pressed={isSelected}
                aria-label={`Select ${d.toDateString()}`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs px-2 py-1 rounded hover:bg-muted"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => {
              const iso = toIso(new Date());
              onChange(iso);
              setViewDate(startOfMonth(new Date()));
            }}
            className="text-xs px-2 py-1 rounded hover:bg-muted"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
}
