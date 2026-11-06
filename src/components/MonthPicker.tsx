import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`month-picker-calendar-icon ${className}`} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 2.5v4M14 2.5v4M2.75 8h14.5M6 11h1M9.5 11h1M13 11h1M6 14h1M9.5 14h1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  compactOnMobile?: boolean;
};

export function MonthPicker({ value, onChange, label, className = "", compactOnMobile = false }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [mobilePopoverPosition, setMobilePopoverPosition] = useState<{ left: number; top: number } | null>(null);
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
  const compactValue = new Date(`${value}-01T00:00:00`).toLocaleDateString("en", {
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMobilePopoverPosition(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMobilePopoverPosition(null);
      }
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
          if (open) {
            setOpen(false);
            setMobilePopoverPosition(null);
            return;
          }
          if (window.matchMedia("(max-width: 760px)").matches) {
            const bounds = pickerRef.current?.getBoundingClientRect();
            if (bounds) {
              const width = Math.min(280, window.innerWidth - 32);
              const height = Math.min(310, window.innerHeight - 32);
              const left = Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16));
              const below = bounds.bottom + 8;
              const top = below + height <= window.innerHeight - 16
                ? below
                : Math.max(16, bounds.top - height - 8);
              setMobilePopoverPosition({ left, top });
            }
          } else {
            setMobilePopoverPosition(null);
          }
          setOpen(true);
        }}
      >
        <CalendarIcon />
        {compactOnMobile ? (
          <>
            <span className="month-picker-full-label">{formattedValue}</span>
            <span className="month-picker-compact-label">{compactValue}</span>
          </>
        ) : <span>{formattedValue}</span>}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div
          className={`month-picker-popover${mobilePopoverPosition ? " mobile-month-picker-popover" : ""}`}
          style={mobilePopoverPosition ?? undefined}
          role="dialog"
          aria-label={`${label} calendar`}
        >
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
                    setMobilePopoverPosition(null);
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
