import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
}

/* ================= DATE UTILS ================= */

const formatDisplayDate = (date: Date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatInputDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatJustDate = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const parseDateString = (val: string): Date | null => {
  if (!val) return null;
  const clean = val.trim();
  if (clean.includes("/")) {
    const [d, m, y] = clean.split("/").map(Number);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }
  if (clean.includes("-")) {
    const [y, m, d] = clean.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }
  return null;
};

const formatJustTime = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Adjust to start Monday (0-6)
};

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isBetween = (date: Date, start: Date, end: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d > s && d < e;
};

const PRESETS = [
  { id: "today", label: "Aujourd'hui" },
  { id: "yesterday", label: "Hier" },
  { id: "this-week", label: "Cette semaine" },
  { id: "last-week", label: "Semaine dernière" },
  { id: "this-month", label: "Ce mois-ci" },
  { id: "last-month", label: "Mois dernier" },
  { id: "this-year", label: "Cette année" },
  { id: "last-year", label: "Année dernière" },
  { id: "all-time", label: "Tout le temps" },
];

/* ================= COMPONENT ================= */

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Temporary selection state
  const [startDate, setStartDate] = useState<Date>(new Date(from));
  const [endDate, setEndDate] = useState<Date>(new Date(to));
  const [startDateText, setStartDateText] = useState<string>(formatJustDate(new Date(from)));
  const [startTimeText, setStartTimeText] = useState<string>(formatJustTime(new Date(from)));
  const [endDateText, setEndDateText] = useState<string>(formatJustDate(new Date(to)));
  const [endTimeText, setEndTimeText] = useState<string>(formatJustTime(new Date(to)));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // View state (which months are visible)
  const [viewDate, setViewDate] = useState(new Date(startDate));

  // Sync inputs when startDate / endDate change
  useEffect(() => {
    setStartDateText(formatJustDate(startDate));
    setStartTimeText(formatJustTime(startDate));
  }, [startDate]);

  useEffect(() => {
    setEndDateText(formatJustDate(endDate || startDate));
    setEndTimeText(formatJustTime(endDate || startDate));
  }, [endDate, startDate]);

  useEffect(() => {
    const s = new Date(from);
    setStartDate(s);
    setStartDateText(formatJustDate(s));
    setStartTimeText(formatJustTime(s));
  }, [from]);

  useEffect(() => {
    const e = new Date(to);
    setEndDate(e);
    setEndDateText(formatJustDate(e));
    setEndTimeText(formatJustTime(e));
  }, [to]);

  // Click outside to close (desktop only, on mobile the backdrop handles it)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Compute dropdown alignment on desktop
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const estimatedWidth = 760;
    if (rect.left + estimatedWidth > window.innerWidth) {
      setDropdownAlign('right');
    } else {
      setDropdownAlign('left');
    }
  }, [isOpen]);

  const handleDayClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      const newStart = new Date(date);
      newStart.setHours(startDate ? startDate.getHours() : 0, startDate ? startDate.getMinutes() : 0, 0, 0);
      setStartDate(newStart);
      setEndDate(null as any);
    } else if (startDate && !endDate) {
      if (date < startDate) {
        const newStart = new Date(date);
        newStart.setHours(0, 0, 0, 0);
        const newEnd = new Date(startDate);
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
        setStartDate(newStart);
      } else {
        const newEnd = new Date(date);
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
      }
    }
  };

  const applyPreset = (type: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (type) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case "this-week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "last-week": {
        const lastWeekStart = new Date();
        const d = now.getDay();
        lastWeekStart.setDate(now.getDate() - d - 6 + (d === 0 ? -6 : 0));
        start = lastWeekStart;
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "this-month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-month":
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "this-year":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-year":
        start.setFullYear(now.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      case "all-time":
        start = new Date(2020, 0, 1);
        break;
    }

    setStartDate(start);
    setEndDate(end);
    setViewDate(new Date(start));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDateText(val);
    const parsed = parseDateString(val);
    if (parsed) {
      const updated = new Date(startDate);
      updated.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      if (!isNaN(updated.getTime())) {
        setStartDate(updated);
        setViewDate(new Date(updated));
      }
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartTimeText(val);
    if (val) {
      const [h, m] = val.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const updated = new Date(startDate);
        updated.setHours(h, m, 0, 0);
        setStartDate(updated);
      }
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndDateText(val);
    const parsed = parseDateString(val);
    if (parsed) {
      const base = endDate || startDate || new Date();
      const updated = new Date(base);
      updated.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      if (!isNaN(updated.getTime())) {
        setEndDate(updated);
      }
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndTimeText(val);
    if (val) {
      const [h, m] = val.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const base = endDate || startDate || new Date();
        const updated = new Date(base);
        updated.setHours(h, m, 59, 999);
        setEndDate(updated);
      }
    }
  };

  const handleApply = () => {
    const s = startDate;
    const e = endDate || startDate;
    onRangeChange(formatInputDateTime(s), formatInputDateTime(e));
    setIsOpen(false);
  };

  const renderMonth = (monthOffset: number, showBothChevronsOnMobile = false) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1);
    const monthName = date.toLocaleString("fr-FR", { month: "long" });
    const year = date.getFullYear();
    const month = date.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const days = [];
    // Previous month filler
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, current: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, current: true, date: new Date(year, month, i) });
    }
    // Next month filler
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }

    return (
      <div className="w-full max-w-[300px] sm:w-[280px] mx-auto">
        <div className="relative mb-3 sm:mb-4 flex items-center justify-center font-semibold text-gray-700 capitalize text-sm sm:text-base">
          {/* Navigation chevrons */}
          {monthOffset === 0 && (
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          <span>{monthName} {year}</span>

          {(monthOffset === 1 || showBothChevronsOnMobile) && (
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className={`absolute right-0 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors ${
                showBothChevronsOnMobile && monthOffset === 0 ? "md:hidden" : ""
              }`}
              title="Mois suivant"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="text-[11px] sm:text-xs font-medium text-gray-400 py-1.5 sm:py-2">
              {d}
            </div>
          ))}
          {days.map((d, idx) => {
            const isSelected = (startDate && isSameDay(d.date, startDate)) || (endDate && isSameDay(d.date, endDate));
            const isInRange = startDate && endDate && isBetween(d.date, startDate, endDate);
            const isHovered = startDate && !endDate && hoverDate && (
              (d.date > startDate && d.date <= hoverDate) || (d.date < startDate && d.date >= hoverDate)
            );

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDayClick(d.date)}
                onMouseEnter={() => setHoverDate(d.date)}
                className={`relative h-8 w-8 sm:h-9 sm:w-9 mx-auto text-xs sm:text-sm transition-all flex items-center justify-center font-medium
                  ${!d.current ? "text-gray-300" : "text-gray-700"}
                  ${isSelected ? "bg-[#3B82F6] text-white rounded-lg z-10 shadow-sm" : ""}
                  ${isInRange ? "bg-[#3B82F6]/10 text-[#3B82F6]" : ""}
                  ${isHovered ? "bg-[#3B82F6]/5" : ""}
                  hover:bg-gray-100 rounded-lg
                `}
              >
                {d.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 rounded-xl border border-[#3B82F6]/30 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:border-[#3B82F6] hover:bg-gray-50/50 transition-all"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 shrink-0 text-[#3B82F6]" />
          <span className="truncate">
            {formatDisplayDate(new Date(from))} - {formatDisplayDate(new Date(to))}
          </span>
        </div>
      </button>

      {/* Picker Modal on Mobile, Dropdown on Desktop */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={popoverRef}
            className={`
              fixed inset-x-3 bottom-3 top-auto z-50 max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-200
              md:absolute md:inset-auto md:bottom-auto md:top-full md:mt-2 md:max-h-none md:overflow-visible md:rounded-3xl md:w-auto md:max-w-none
              ${dropdownAlign === 'right' ? 'md:right-0' : 'md:left-0'}
            `}
          >
            <div className="flex flex-col md:flex-row">
              {/* Presets Bar: Horizontal scroll on mobile, Vertical sidebar on desktop */}
              <div className="flex md:w-44 lg:w-48 shrink-0 flex-row overflow-x-auto border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/70 p-2 md:p-3 lg:p-4 gap-1.5 md:flex-col md:overflow-visible">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className="shrink-0 whitespace-nowrap rounded-lg md:rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-medium text-gray-600 hover:bg-white hover:text-[#3B82F6] hover:shadow-xs transition-all text-left"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Main Calendar Area */}
              <div className="flex flex-col flex-1 min-w-0">
                {/* Top Controls & Manual Inputs */}
                <div className="border-b border-gray-100 bg-gray-50/40 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Start Date / Time Pill */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-xs focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/20 transition-all">
                      <input
                        type="text"
                        placeholder="JJ/MM/AAAA"
                        value={startDateText}
                        onChange={handleStartDateChange}
                        className="w-[78px] sm:w-[82px] p-0 text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent"
                      />
                      <span className="text-gray-300 font-normal text-xs select-none">|</span>
                      <input
                        type="time"
                        value={startTimeText}
                        onChange={handleStartTimeChange}
                        className="w-[58px] sm:w-[68px] p-0 text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent cursor-pointer"
                      />
                    </div>

                    <div className="hidden sm:block h-px w-2.5 bg-gray-300 shrink-0" />

                    {/* End Date / Time Pill */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-xs focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/20 transition-all">
                      <input
                        type="text"
                        placeholder="JJ/MM/AAAA"
                        value={endDateText}
                        onChange={handleEndDateChange}
                        className="w-[78px] sm:w-[82px] p-0 text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent"
                      />
                      <span className="text-gray-300 font-normal text-xs select-none">|</span>
                      <input
                        type="time"
                        value={endTimeText}
                        onChange={handleEndTimeChange}
                        className="w-[58px] sm:w-[68px] p-0 text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 sm:flex-none text-center rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="flex-1 sm:flex-none text-center rounded-xl bg-[#3B82F6] px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>

                {/* Calendar Months Display: 1 Month on Mobile with Prev/Next, 2 Months on md+ */}
                <div className="flex flex-col md:flex-row gap-6 p-4 sm:p-6 justify-center">
                  {/* First Month (shown always, with both chevrons on mobile) */}
                  <div className="relative">
                    {renderMonth(0, true)}
                  </div>

                  {/* Second Month (shown only on md and larger) */}
                  <div className="hidden md:block relative">
                    {renderMonth(1, false)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
