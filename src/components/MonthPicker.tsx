import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

export function MonthPicker({ value, onChange, label, className = "" }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [selectedYear, selectedMonth] = value.split("-").map(Number);
  const [displayDate, setDisplayDate] = useState(() => new Date(selectedYear, selectedMonth - 1, 1));
  const displayYear = displayDate.getFullYear();
  const displayMonth = displayDate.getMonth();
  const firstWeekday = new Date(displayYear, displayMonth, 1).getDay();
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const today = new Date();
  const displayMonthName = displayDate.toLocaleDateString("en", { month: "long" });
  const formattedValue = new Date(`${value}-01T00:00:00`).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`month-picker ${className}`} ref={pickerRef}>
      <button
        type="button"
        className="month-picker-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDisplayDate(new Date(selectedYear, selectedMonth - 1, 1));
          setOpen((current) => !current);
        }}
      >
        <CalendarDays size={18} />
        <span>{formattedValue}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="month-picker-popover" role="dialog" aria-label={`${label} calendar`}>
          <div className="month-picker-heading">
            <button type="button" aria-label="Previous month" onClick={() => setDisplayDate(new Date(displayYear, displayMonth - 1, 1))}><ChevronLeft size={16} /></button>
            <strong>{displayMonthName} {displayYear}</strong>
            <button type="button" aria-label="Next month" onClick={() => setDisplayDate(new Date(displayYear, displayMonth + 1, 1))}><ChevronRight size={16} /></button>
          </div>
          <div className="month-picker-calendar">
            {weekdays.map((day) => <span className="month-picker-weekday" key={day}>{day}</span>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span className="month-picker-empty" key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const isToday = today.getFullYear() === displayYear && today.getMonth() === displayMonth && today.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  className={isToday ? "today" : ""}
                  aria-label={`${displayMonthName} ${day}, ${displayYear}`}
                  onClick={() => {
                    onChange(`${displayYear}-${String(displayMonth + 1).padStart(2, "0")}`);
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
