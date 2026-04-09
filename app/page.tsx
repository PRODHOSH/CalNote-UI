"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent } from "react";

type ThemeSet = {
  accent: string;
  softAccent: string;
  edge: string;
};

const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1601758260892-ae5de161ae8b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1521292270410-a8c4d716d518?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1400&q=80",
];

const MONTH_THEMES: ThemeSet[] = [
  { accent: "#1685cf", softAccent: "#d7ecfb", edge: "#076db0" },
  { accent: "#1e8aa5", softAccent: "#d3f0f7", edge: "#117089" },
  { accent: "#2d9f7a", softAccent: "#d9f6ec", edge: "#1f8462" },
  { accent: "#66a126", softAccent: "#ecf7d8", edge: "#4a7e18" },
  { accent: "#bf8a00", softAccent: "#fff3cf", edge: "#9b7000" },
  { accent: "#c9720d", softAccent: "#ffe7cc", edge: "#aa5b00" },
  { accent: "#cc5f2f", softAccent: "#ffe0d4", edge: "#ab4a1f" },
  { accent: "#ce4e5a", softAccent: "#ffd9de", edge: "#ac3847" },
  { accent: "#b0528e", softAccent: "#f8dbec", edge: "#933f75" },
  { accent: "#875cb9", softAccent: "#eadff8", edge: "#70459f" },
  { accent: "#4f70bf", softAccent: "#dbe4fa", edge: "#3c56a6" },
  { accent: "#2e78ac", softAccent: "#d8ecf9", edge: "#1f6597" },
];

const HOLIDAY_BY_MONTH_DAY: Record<string, string> = {
  "01-01": "New Year",
  "02-14": "Valentine",
  "03-17": "St. Patrick",
  "04-22": "Earth Day",
  "05-01": "May Day",
  "06-21": "Solstice",
  "07-04": "Independence Day",
  "08-12": "Summer Peak",
  "09-01": "Labor Day",
  "10-31": "Halloween",
  "11-11": "Veterans Day",
  "12-25": "Christmas",
};

const STORAGE_KEY = "calnote.wall.v2";

type PersistedCalendarState = {
  displayMonth?: string;
  monthlyNotes?: Record<string, string>;
  dayNotes?: Record<string, string>;
  monthHeroOverrides?: Record<string, string>;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

function sameDay(left: Date | null, right: Date | null): boolean {
  if (!left || !right) {
    return false;
  }
  return left.getTime() === right.getTime();
}

function calendarDays(viewDate: Date): Date[] {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return startOfDay(day);
  });
}

export default function Home() {
  const [today] = useState(() => startOfDay(new Date()));
  const [displayMonth, setDisplayMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pageFlipTick, setPageFlipTick] = useState(0);
  const [monthlyNotes, setMonthlyNotes] = useState<Record<string, string>>({});
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [monthHeroOverrides, setMonthHeroOverrides] = useState<Record<string, string>>({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingFocusIndex = useRef<number | null>(null);

  const selectedTheme = MONTH_THEMES[displayMonth.getMonth()];
  const visibleDays = useMemo(() => calendarDays(displayMonth), [displayMonth]);
  const inMonthKey = monthKey(displayMonth);
  const heroSource = monthHeroOverrides[inMonthKey] ?? HERO_IMAGES[displayMonth.getMonth()];
  const selectedDateKey = selectedDate ? dateKey(selectedDate) : "";
  const isCustomHero = heroSource.startsWith("data:");

  const monthMemo = monthlyNotes[inMonthKey] ?? "";
  const dayMemo = selectedDateKey ? dayNotes[selectedDateKey] ?? "" : "";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(saved) as PersistedCalendarState;

      const loadedMonth = parseDateValue(parsed.displayMonth);

      if (loadedMonth) {
        setDisplayMonth(new Date(loadedMonth.getFullYear(), loadedMonth.getMonth(), 1));
      }

      if (parsed.monthlyNotes) {
        setMonthlyNotes(parsed.monthlyNotes);
      }
      if (parsed.dayNotes) {
        setDayNotes(parsed.dayNotes);
      }
      if (parsed.monthHeroOverrides) {
        setMonthHeroOverrides(parsed.monthHeroOverrides);
      }
    } catch {
      // Ignore bad local data and continue with defaults.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const payload: PersistedCalendarState = {
      displayMonth: displayMonth.toISOString(),
      monthlyNotes,
      dayNotes,
      monthHeroOverrides,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [displayMonth, monthlyNotes, dayNotes, monthHeroOverrides, hydrated]);

  useEffect(() => {
    const preferredIndex =
      visibleDays.findIndex((day) => sameDay(day, selectedDate)) >= 0
        ? visibleDays.findIndex((day) => sameDay(day, selectedDate))
        : visibleDays.findIndex((day) => sameDay(day, today));
    const firstCurrentMonthIndex = visibleDays.findIndex((day) => day.getMonth() === displayMonth.getMonth());

    setFocusedIndex(
      preferredIndex >= 0 ? preferredIndex : firstCurrentMonthIndex >= 0 ? firstCurrentMonthIndex : 0,
    );
  }, [visibleDays, selectedDate, displayMonth, today]);

  useEffect(() => {
    if (pendingFocusIndex.current === null) {
      return;
    }

    const targetIndex = pendingFocusIndex.current;
    pendingFocusIndex.current = null;

    requestAnimationFrame(() => {
      dayButtonRefs.current[targetIndex]?.focus();
      setFocusedIndex(targetIndex);
    });
  }, [visibleDays]);

  const selectedSummary = useMemo(() => {
    if (!selectedDate) {
      return "Pick a date";
    }
    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(selectedDate);
  }, [selectedDate]);

  const themeVars = {
    "--accent": selectedTheme.accent,
    "--accent-soft": selectedTheme.softAccent,
    "--accent-edge": selectedTheme.edge,
  } as CSSProperties;

  const handleSelectDay = (day: Date): void => {
    if (selectedDate && sameDay(day, selectedDate)) {
      setSelectedDate(null);
      return;
    }

    setSelectedDate(day);
  };

  const focusDayByIndex = (index: number): void => {
    if (index < 0 || index >= visibleDays.length) {
      return;
    }

    dayButtonRefs.current[index]?.focus();
    setFocusedIndex(index);
  };

  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    switch (event.key) {
      case "ArrowRight": {
        event.preventDefault();
        focusDayByIndex(index + 1);
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        focusDayByIndex(index - 1);
        break;
      }
      case "ArrowDown": {
        event.preventDefault();
        focusDayByIndex(index + 7);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        focusDayByIndex(index - 7);
        break;
      }
      case "Home": {
        event.preventDefault();
        focusDayByIndex(index - (index % 7));
        break;
      }
      case "End": {
        event.preventDefault();
        focusDayByIndex(index + (6 - (index % 7)));
        break;
      }
      case "PageUp": {
        event.preventDefault();
        pendingFocusIndex.current = index;
        stepMonth(-1);
        break;
      }
      case "PageDown": {
        event.preventDefault();
        pendingFocusIndex.current = index;
        stepMonth(1);
        break;
      }
      default:
        break;
    }
  };

  const stepMonth = (direction: number): void => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    setPageFlipTick((value) => value + 1);
  };

  const updateMonthMemo = (value: string): void => {
    setMonthlyNotes((current) => ({
      ...current,
      [inMonthKey]: value,
    }));
  };

  const updateDayMemo = (value: string): void => {
    if (!selectedDateKey) {
      return;
    }

    setDayNotes((current) => {
      if (!value.trim()) {
        const next = { ...current };
        delete next[selectedDateKey];
        return next;
      }

      return {
        ...current,
        [selectedDateKey]: value,
      };
    });
  };

  const handleHeroUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return;
      }

      setMonthHeroOverrides((current) => ({
        ...current,
        [inMonthKey]: reader.result as string,
      }));
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const resetMonthHero = (): void => {
    setMonthHeroOverrides((current) => {
      if (!current[inMonthKey]) {
        return current;
      }

      const next = { ...current };
      delete next[inMonthKey];
      return next;
    });
  };

  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(displayMonth);

  return (
    <main className="calendar-stage" style={themeVars}>
      <div className={`calendar-layout ${selectedDate ? "notes-open" : "notes-closed"}`}>
        <section className="wall-sheet-block" key={pageFlipTick}>
          <div className="month-controls docked">
            <button type="button" onClick={() => stepMonth(-1)} aria-label="Previous month">
              Prev
            </button>
            <h1>{monthLabel}</h1>
            <button type="button" onClick={() => stepMonth(1)} aria-label="Next month">
              Next
            </button>
          </div>

          <div className="hanger-row" aria-hidden>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <article className="wall-sheet" aria-label="Monthly wall calendar">
            <header className="hero-zone">
              <Image
                className="hero-image"
                src={heroSource}
                alt={`${monthLabel} calendar cover`}
                fill
                sizes="(max-width: 760px) 100vw, 70vw"
                priority
                unoptimized={isCustomHero}
              />
              <div className="hero-overlay" />
              <div className="hero-change" aria-label="Change month cover image">
                <label htmlFor="month-image" className="hero-change-trigger">
                  <span className="hero-change-icon" aria-hidden>
                    +
                  </span>
                  <span>Change cover</span>
                </label>
                <input
                  id="month-image"
                  className="hero-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleHeroUpload}
                />
                {monthHeroOverrides[inMonthKey] && (
                  <button type="button" className="hero-reset" onClick={resetMonthHero}>
                    Reset
                  </button>
                )}
              </div>
              <div className="hero-badge">
                <strong>{new Intl.DateTimeFormat("en", { month: "long" }).format(displayMonth)}</strong>
                <span>{displayMonth.getFullYear()}</span>
              </div>
            </header>

            <div className="sheet-bottom-grid">
              <aside className="paper-notes-preview" aria-label="Quick notes area">
                <h2>Notes</h2>
                <p>{monthMemo ? monthMemo : "Capture this month's reminders and highlights."}</p>
                <div className="paper-lines" aria-hidden>
                  {Array.from({ length: 8 }, (_, index) => (
                    <span key={`line-${index}`} />
                  ))}
                </div>
              </aside>

              <section className="month-grid" aria-label="Calendar days">
                <div className="month-grid-header">
                  {WEEK_DAYS.map((dayName) => (
                    <span key={dayName}>{dayName}</span>
                  ))}
                </div>

                <div className="month-grid-cells" role="grid" aria-label={`${monthLabel} calendar grid`}>
                  {visibleDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === displayMonth.getMonth();
                    const isSelected = sameDay(day, selectedDate);
                    const isToday = sameDay(day, today);
                    const dayKey = dateKey(day);
                    const hasDayNote = Boolean(dayNotes[dayKey]?.trim());
                    const holidayTag =
                      HOLIDAY_BY_MONTH_DAY[
                        `${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
                      ];
                    const preview = dayNotes[dayKey]?.trim();

                    const classes = [
                      "day-cell",
                      isCurrentMonth ? "current-month" : "outside-month",
                      hasDayNote ? "has-note" : "",
                      isSelected ? "selected-day" : "",
                      isToday ? "today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={dateKey(day)}
                        type="button"
                        className={classes}
                        onClick={() => {
                          handleSelectDay(day);
                          setFocusedIndex(index);
                        }}
                        onKeyDown={(event) => handleDayKeyDown(event, index)}
                        onFocus={() => setFocusedIndex(index)}
                        ref={(element) => {
                          dayButtonRefs.current[index] = element;
                        }}
                        role="gridcell"
                        tabIndex={focusedIndex === index ? 0 : -1}
                        aria-selected={isSelected}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`Select ${day.toDateString()}`}
                        title={
                          preview
                            ? `${day.toDateString()} - ${preview.slice(0, 48)}`
                            : holidayTag
                              ? `${holidayTag} - ${day.toDateString()}`
                              : day.toDateString()
                        }
                      >
                        <span>{day.getDate()}</span>
                        {hasDayNote && <em aria-hidden className="note-dot" />}
                        {holidayTag && <em aria-hidden className="holiday-dot" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </article>
        </section>

        {selectedDate && (
          <aside className="calendar-panel">
            <section className="selection-card" aria-live="polite">
              <h2>Selected Day</h2>
              <p>{selectedSummary}</p>
              <small>Click the same date again to clear selection.</small>
            </section>

            <section className="editor-card">
              <label htmlFor="day-note">Note For This Day</label>
              <textarea
                id="day-note"
                value={dayMemo}
                onChange={(event) => updateDayMemo(event.target.value)}
                placeholder="Write a quick plan, reminder, or task for this date..."
              />
            </section>

            <section className="editor-card">
              <label htmlFor="month-note">Monthly Memo</label>
              <textarea
                id="month-note"
                value={monthMemo}
                onChange={(event) => updateMonthMemo(event.target.value)}
                placeholder="Month-level reminders and goals..."
              />
            </section>
          </aside>
        )}
      </div>
    </main>
  );
}
