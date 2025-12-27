// src/pages/CalendarPage/CalendarPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  type MockBooking,
  type Slot,
  type BookingStatus,
} from "../../mock/bookingsMockApi";
import { useBookingStore } from "../../state/BookingStore";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { StatusPill } from "../../ui/StatusPill";
import {
  parseEventDateLabel,
  dateKey,
  formatMonthYear,
} from "../../utils/dateUtils";
import { formatSlotHuman } from "../../utils/slotUtils";
import { getGuestSplitText } from "../../utils/hallUtils";
import styles from "./CalendarPage.module.css";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Density = "COMFY" | "COMPACT";
type PanelPreference = "auto" | "left" | "right";

interface SlotSummary {
  slot: Slot;
  totalGuests: number;
  events: MockBooking[];
}

interface HallUsage {
  hallAUsed: number;
  hallBUsed: number;
  hallACapacity: number;
  hallBCapacity: number;
  hallAEventCount: number;
  hallBEventCount: number;
}

interface SelectedSlotState {
  date: Date;
  slot: Slot;
}

const PANEL_PREF_KEY = "luxurium.calendar.panelPreference";

function formatEventCount(n: number): string {
  return `${n} ${n === 1 ? "Event" : "Events"}`;
}

function getStatusColorStyle(status: BookingStatus): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} {
  switch (status) {
    case "INQUIRY":
      return {
        backgroundColor: "#e0f2fe",
        borderColor: "#60a5fa",
        textColor: "#1d4ed8",
      };
    case "TENTATIVE":
      return {
        backgroundColor: "#fef3c7",
        borderColor: "#facc15",
        textColor: "#92400e",
      };
    case "CONFIRMED":
      return {
        backgroundColor: "#dcfce7",
        borderColor: "#22c55e",
        textColor: "#166534",
      };
    case "COMPLETED":
      return {
        backgroundColor: "#f3f4f6",
        borderColor: "#d1d5db",
        textColor: "#374151",
      };
    case "CANCELLED":
      return {
        backgroundColor: "#fee2e2",
        borderColor: "#fca5a5",
        textColor: "#b91c1c",
      };
    default:
      return {
        backgroundColor: "#ffffff",
        borderColor: "#d1d5db",
        textColor: "#374151",
      };
  }
}

function computeHallUsage(events: MockBooking[]): HallUsage {
  let hallAUsed = 0;
  let hallBUsed = 0;
  let hallACap = 0;
  let hallBCap = 0;

  let hallAEventCount = 0;
  let hallBEventCount = 0;

  for (const b of events) {
    let usedA = false;
    let usedB = false;

    for (const hall of b.halls ?? []) {
      if (hall.hallCode === "A") {
        hallAUsed += hall.guestsHere;
        hallACap = Math.max(hallACap, hall.capacity);
        usedA = true;
      } else if (hall.hallCode === "B") {
        hallBUsed += hall.guestsHere;
        hallBCap = Math.max(hallBCap, hall.capacity);
        usedB = true;
      }
    }

    if (usedA) hallAEventCount += 1;
    if (usedB) hallBEventCount += 1;
  }

  if (hallACap === 0) hallACap = 1000;
  if (hallBCap === 0) hallBCap = 1000;

  return {
    hallAUsed,
    hallBUsed,
    hallACapacity: hallACap,
    hallBCapacity: hallBCap,
    hallAEventCount,
    hallBEventCount,
  };
}

function getShortEventTitle(eventTitle: string): string {
  if (!eventTitle) return "";
  const words = eventTitle.split(" ").filter(Boolean);
  const short = words.slice(0, 2).join(" ");
  return short.length > 30 ? short.slice(0, 27) + "…" : short;
}

const CalendarPage: React.FC = () => {
  const { bookings: allBookings } = useBookingStore();
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlotState | null>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("right");
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [closedSlots, setClosedSlots] = useState<string[]>([]);
  const [density, setDensity] = useState<Density>("COMFY");
  const [highlightOverrides, setHighlightOverrides] = useState(true);
  const [highlightPerformance, setHighlightPerformance] = useState(true);
  const [panelPreference, setPanelPreference] = useState<PanelPreference>(() => {
    try {
      const raw = window.localStorage.getItem(PANEL_PREF_KEY);
      if (raw === "left" || raw === "right" || raw === "auto") return raw;
    } catch {
      // ignore
    }
    return "auto";
  });

  // Deep-link: read ?date=YYYY-MM-DD&slot=LUNCH|DINNER and open that day/slot
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    const slotParam = params.get("slot") as Slot | null;

    if (!dateParam) return;

    const [yearStr, monthStr, dayStr] = dateParam.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const day = Number(dayStr);

    if (!year || month < 0 || !day) return;

    const d = new Date(year, month, day);

    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDay(d);

    if (slotParam === "LUNCH" || slotParam === "DINNER") {
      setSelectedSlot({ date: d, slot: slotParam });
    } else {
      setSelectedSlot(null);
    }

    const dow = d.getDay();
    setPanelSide(dow <= 3 ? "right" : "left");
  }, [location.search]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, MockBooking[]>();
    for (const booking of allBookings) {
      const d = parseEventDateLabel(booking.eventDateLabel);
      const key = dateKey(d);
      const arr = map.get(key) ?? [];
      arr.push(booking);
      map.set(key, arr);
    }
    return map;
  }, [allBookings]);

  const { weeks, monthLabel } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const monthIndex = currentMonth.getMonth();

    const firstOfMonth = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstWeekday = firstOfMonth.getDay();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, monthIndex, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return {
      weeks,
      monthLabel: formatMonthYear(currentMonth),
    };
  }, [currentMonth]);

  const goPrevMonth = () => {
    setCurrentMonth((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return new Date(y, m - 1, 1);
    });
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  const goNextMonth = () => {
    setCurrentMonth((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return new Date(y, m + 1, 1);
    });
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  const jumpMonthOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    const base = new Date();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      opts.push({
        label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        value: `${d.getFullYear()}-${d.getMonth()}`,
      });
    }
    return opts;
  }, []);

  const isDayClosed = (date: Date) => closedDays.includes(dateKey(date));
  const isSlotClosed = (date: Date, slot: Slot) =>
    isDayClosed(date) || closedSlots.includes(`${dateKey(date)}|${slot}`);

  const toggleDayClosed = (date: Date) => {
    const key = dateKey(date);
    setClosedDays((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleSlotClosed = (date: Date, slot: Slot) => {
    const key = `${dateKey(date)}|${slot}`;
    setClosedSlots((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // DAY PANEL DATA
  let dayPanelDateLabel = "";
  let dayPanelBookings: MockBooking[] = [];
  let dayPanelLunchSummary: SlotSummary | null = null;
  let dayPanelDinnerSummary: SlotSummary | null = null;
  let dayPanelClosed = false;
  let dayLunchBookings: MockBooking[] = [];
  let dayDinnerBookings: MockBooking[] = [];
  let dayPanelUsage: HallUsage | null = null;

  if (selectedDay) {
    const key = dateKey(selectedDay);
    const bookings = bookingsByDate.get(key) ?? [];
    dayPanelBookings = bookings;
    dayPanelLunchSummary = buildSlotSummary(bookings, "LUNCH");
    dayPanelDinnerSummary = buildSlotSummary(bookings, "DINNER");
    dayPanelClosed = isDayClosed(selectedDay);
    dayLunchBookings = bookings.filter((b) => b.slot === "LUNCH");
    dayDinnerBookings = bookings.filter((b) => b.slot === "DINNER");

    dayPanelUsage = computeHallUsage(bookings);

    dayPanelDateLabel = selectedDay.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // SLOT PANEL DATA
  let slotPanelBookings: MockBooking[] = [];
  let slotPanelUsage: HallUsage | null = null;
  let slotPanelDateLabel = "";
  let slotPanelClosed = false;
  let slotPanelDayClosed = false;

  if (selectedSlot) {
    const key = dateKey(selectedSlot.date);
    const bookings = bookingsByDate.get(key) ?? [];
    slotPanelBookings = bookings.filter((b) => b.slot === selectedSlot.slot);
    slotPanelUsage = computeHallUsage(slotPanelBookings);
    slotPanelDateLabel = selectedSlot.date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    slotPanelClosed = isSlotClosed(selectedSlot.date, selectedSlot.slot);
    slotPanelDayClosed = isDayClosed(selectedSlot.date);
  }

  const hasSidePanel = selectedDay !== null || selectedSlot !== null;

  const effectivePanelSide =
    panelPreference === "auto" ? panelSide : panelPreference;

  return (
    <main className={styles.page}>
      <h1>Luxurium – Calendar</h1>
      <p className={styles.subhead}>
        Month view of bookings. Lunch and Dinner are clearly separated. Each event pill
        is color-coded by status (Inquiry/Tentative/Confirmed/etc.). Click a date for day
        details or a slot for slot details.
      </p>

      {/* LEGEND */}
      <section className={styles.legendRow}>
        <LegendSwatch
          label="Inquiry"
          style={{ backgroundColor: "#e0f2fe", borderColor: "#60a5fa" }}
        />
        <LegendSwatch
          label="Tentative"
          style={{ backgroundColor: "#fef3c7", borderColor: "#facc15" }}
        />
        <LegendSwatch
          label="Confirmed"
          style={{ backgroundColor: "#dcfce7", borderColor: "#22c55e" }}
        />
        <LegendSwatch
          label="Completed"
          style={{ backgroundColor: "#f3f4f6", borderColor: "#d1d5db" }}
        />
        <LegendSwatch
          label="Cancelled"
          style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5" }}
        />
        <LegendSwatch
          label="Closed"
          style={{ backgroundColor: "#fee2e2", borderColor: "#b91c1c" }}
        />
        <span className={styles.legendNote}>🎵 = Performance · ! = Capacity override</span>
      </section>

      {/* CONTROLS */}
      <section className={`${styles.controls} ${styles.stickyControls}`}>
        <div className={styles.controlGroup}>
          <Button type="button" size="sm" onClick={goPrevMonth}>
            ← Previous
          </Button>
          <div className={styles.monthLabel}>{monthLabel}</div>
          <Button type="button" size="sm" onClick={goNextMonth}>
            Next →
          </Button>
        </div>

        <div className={styles.controlGroup}>
          <select
            className={`${styles.input} ${styles.w200}`}
            value={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setCurrentMonth(new Date(y, m, 1));
              setSelectedDay(null);
              setSelectedSlot(null);
            }}
          >
            {jumpMonthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className={`${styles.input} ${styles.w150}`}
            value={density}
            onChange={(e) => setDensity(e.target.value as Density)}
          >
            <option value="COMFY">Comfortable</option>
            <option value="COMPACT">Compact</option>
          </select>

          <select
            className={`${styles.input} ${styles.w150}`}
            value={panelPreference}
            onChange={(e) => {
              const pref = e.target.value as PanelPreference;
              setPanelPreference(pref);
              try {
                window.localStorage.setItem(PANEL_PREF_KEY, pref);
              } catch {
                // ignore
              }
            }}
          >
            <option value="auto">Panel side: Auto</option>
            <option value="left">Panel side: Left</option>
            <option value="right">Panel side: Right</option>
          </select>

          <Button type="button" size="sm" onClick={() => window.print()}>
            Print month
          </Button>
        </div>

        <div className={styles.filterChips}>
          <button
            type="button"
            className={`${styles.chip} ${highlightOverrides ? styles.chipActive : ""}`}
            onClick={() => setHighlightOverrides((v) => !v)}
          >
            Highlight overrides
          </button>
          <button
            type="button"
            className={`${styles.chip} ${highlightPerformance ? styles.chipActive : ""}`}
            onClick={() => setHighlightPerformance((v) => !v)}
          >
            Highlight performance
          </button>
        </div>
      </section>

      {/* CALENDAR GRID */}
      <div className={styles.calendarWrap}>
        <section className={styles.calendar}>
          {/* Weekday header */}
          <div className={styles.weekdayHeader}>
            {weekdayLabels.map((label) => (
              <div key={label} className={styles.weekdayCell}>
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div
            className={`${styles.weeks} ${density === "COMPACT" ? styles.densityCompact : ""
              }`}
          >
            {weeks.map((week, weekIndex) =>
              week.map((dayDate, dayIndex) => {
                if (!dayDate) {
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={styles.dayCellEmpty}
                      aria-hidden
                    />
                  );
                }

                const key = dateKey(dayDate);
                const dayBookings = bookingsByDate.get(key) ?? [];

                const lunchSummary = buildSlotSummary(dayBookings, "LUNCH");
                const dinnerSummary = buildSlotSummary(dayBookings, "DINNER");

                const isToday =
                  dayDate.getFullYear() === today.getFullYear() &&
                  dayDate.getMonth() === today.getMonth() &&
                  dayDate.getDate() === today.getDate();
                const isWeekend = dayIndex === 0 || dayIndex === 6;
                const dayClosed = isDayClosed(dayDate);

                const openSide = dayIndex <= 3 ? "right" : "left";

                const hasOverride =
                  highlightOverrides &&
                  ((lunchSummary &&
                    (lunchSummary.totalGuests >
                      computeHallUsage(lunchSummary.events).hallACapacity +
                      computeHallUsage(lunchSummary.events).hallBCapacity)) ||
                    (dinnerSummary &&
                      (dinnerSummary.totalGuests >
                        computeHallUsage(dinnerSummary.events).hallACapacity +
                        computeHallUsage(dinnerSummary.events).hallBCapacity)));

                const hasPerformance =
                  highlightPerformance &&
                  (lunchSummary?.events.some((e) => e.hasPerformance) ||
                    dinnerSummary?.events.some((e) => e.hasPerformance));

                const dayBadges: string[] = [];
                if (dayClosed) dayBadges.push("Closed");
                if (hasOverride) dayBadges.push("Override");
                if (hasPerformance) dayBadges.push("Performance");

                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`${styles.dayCell} ${isToday ? styles.dayToday : ""
                      } ${selectedDay && dateKey(selectedDay) === key
                        ? styles.daySelected
                        : ""
                      } ${isWeekend ? styles.dayWeekend : ""} ${dayClosed ? styles.dayClosed : ""
                      }`}
                    data-day-index={`${weekIndex * 7 + dayIndex}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${weekdayLabels[dayIndex]
                      } ${dayDate.toLocaleDateString("en-GB")} with ${dayBookings.length
                      } events`}
                    onClick={() => {
                      setPanelSide(openSide);
                      setSelectedDay(dayDate);
                      setSelectedSlot(null);
                    }}
                    onKeyDown={(e) =>
                      handleDayKeyDown(
                        e,
                        weekIndex * 7 + dayIndex,
                        dayDate,
                        lunchSummary,
                        dinnerSummary,
                        setSelectedDay,
                        setSelectedSlot,
                        setPanelSide
                      )
                    }
                  >
                    {/* Day header */}
                    <div className={styles.dayHeader}>
                      <div className={styles.dayDate}>
                        {dayDate.toLocaleDateString("en-GB", { weekday: "short" })}{" "}
                        {dayDate.getDate()}
                      </div>
                      <div className={styles.dayMeta}>
                        {dayBookings.length > 0 && (
                          <span className={styles.dayEventsMeta}>
                            {dayBookings.length} event{dayBookings.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {dayClosed && (
                          <span className={styles.closedBadge}>Day closed</span>
                        )}
                      </div>
                    </div>

                    {/* Lunch block */}
                    <div className={styles.slotBlock}>
                      <div className={styles.slotHeader}>
                        <div className={styles.slotLabel}>Lunch</div>
                        {isSlotClosed(dayDate, "LUNCH") && (
                          <span className={styles.closedPill}>Closed</span>
                        )}
                      </div>
                      <SlotPreview
                        label="Lunch"
                        summary={lunchSummary}
                        isClosed={isSlotClosed(dayDate, "LUNCH")}
                        highlightPerformance={highlightPerformance}
                        highlightOverrides={highlightOverrides}
                        onClick={() => {
                          setPanelSide(openSide);
                          setSelectedSlot({ date: dayDate, slot: "LUNCH" });
                          setSelectedDay(dayDate);
                        }}
                      />
                    </div>

                    {/* Dinner block */}
                    <div className={`${styles.slotBlock} ${styles.slotDinner}`}>
                      <div className={styles.slotHeader}>
                        <div className={styles.slotLabel}>Dinner</div>
                        {isSlotClosed(dayDate, "DINNER") && (
                          <span className={styles.closedPill}>Closed</span>
                        )}
                      </div>
                      <SlotPreview
                        label="Dinner"
                        summary={dinnerSummary}
                        isClosed={isSlotClosed(dayDate, "DINNER")}
                        highlightPerformance={highlightPerformance}
                        highlightOverrides={highlightOverrides}
                        onClick={() => {
                          setPanelSide(openSide);
                          setSelectedSlot({ date: dayDate, slot: "DINNER" });
                          setSelectedDay(dayDate);
                        }}
                      />
                    </div>

                    {dayBadges.length > 0 && (
                      <div className={styles.dayBadges}>
                        {dayBadges.map((b) => (
                          <span key={b} className={styles.badge}>
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* FIXED SIDE PANEL (left or right) */}
      {hasSidePanel && (
        <div
          className={`${styles.sidePanel} ${effectivePanelSide === "right" ? styles.sideRight : styles.sideLeft
            }`}
        >
          <Card className={styles.sideCard}>
            {/* Header with close */}
            <div className={styles.sideHeader}>
              {selectedSlot ? (
                <div>
                  <h2 className={styles.sideTitle}>
                    Slot Details – {slotPanelDateLabel} –{" "}
                    {selectedSlot && formatSlotHuman(selectedSlot.slot)}
                  </h2>
                  <p className={styles.sideSubhead}>
                    All events in this slot, hall usage, close controls, and a shortcut
                    to create a new booking here.
                  </p>
                </div>
              ) : selectedDay ? (
                <div>
                  <h2 className={styles.sideTitle}>Day Details – {dayPanelDateLabel}</h2>
                  <p className={styles.sideSubhead}>
                    Overview of Lunch and Dinner for this day, with separate lists of
                    events per slot.
                  </p>
                </div>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelectedDay(null);
                  setSelectedSlot(null);
                }}
                style={{ whiteSpace: "nowrap" }}
              >
                Close
              </Button>
            </div>

            {/* Content scroll area */}
            <div className={styles.sideScroll}>
              {/* SLOT MODE */}
              {selectedSlot && (
                <>
                  {/* Usage summary */}
                  {slotPanelUsage && (
                    <div className={styles.usageBox}>
                      <div className={styles.usageItem}>
                        <div className={styles.usageTitle}>Hall A</div>
                        <div className={styles.usageMeta}>
                          {slotPanelUsage.hallAUsed}/{slotPanelUsage.hallACapacity} -{" "}
                          {formatEventCount(slotPanelUsage.hallAEventCount)}
                        </div>
                      </div>
                      <div className={styles.usageItem}>
                        <div className={styles.usageTitle}>Hall B</div>
                        <div className={styles.usageMeta}>
                          {slotPanelUsage.hallBUsed}/{slotPanelUsage.hallBCapacity} -{" "}
                          {formatEventCount(slotPanelUsage.hallBEventCount)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Close controls + new booking */}
                  <div className={styles.actionRow}>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        selectedSlot && toggleSlotClosed(selectedSlot.date, selectedSlot.slot)
                      }
                      style={
                        slotPanelClosed
                          ? {
                            borderColor: "#b91c1c",
                            backgroundColor: "#fee2e2",
                            color: "#b91c1c",
                          }
                          : {}
                      }
                    >
                      {slotPanelClosed
                        ? "Re-open this slot"
                        : "Close this slot for new bookings"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        selectedSlot && toggleDayClosed(selectedSlot.date)
                      }
                      style={
                        slotPanelDayClosed
                          ? {
                            borderColor: "#b91c1c",
                            backgroundColor: "#fee2e2",
                            color: "#b91c1c",
                          }
                          : {}
                      }
                    >
                      {slotPanelDayClosed
                        ? "Re-open entire day"
                        : "Close entire day for new bookings"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        if (!selectedSlot || slotPanelClosed) return;
                        const iso = dateKey(selectedSlot.date);
                        navigate(`/bookings/new?date=${iso}&slot=${selectedSlot.slot}`);
                      }}
                      disabled={slotPanelClosed}
                      style={
                        slotPanelClosed
                          ? {
                            borderColor: "#9ca3af",
                            backgroundColor: "#e5e7eb",
                            color: "#6b7280",
                          }
                          : { marginLeft: "auto", whiteSpace: "nowrap" }
                      }
                    >
                      New Booking in this Slot
                    </Button>
                  </div>

                  {/* Events list */}
                  <div className={styles.slotEvents}>
                    <h3 className={styles.sectionTitle}>
                      Events in this slot ({slotPanelBookings.length})
                    </h3>

                    {slotPanelBookings.length === 0 ? (
                      <p className={styles.muted}>
                        No events in this slot. If the slot is open, you can create a new
                        booking using the button above.
                      </p>
                    ) : (
                      <div className={styles.eventList}>
                        {slotPanelBookings.map((b) => (
                          <div key={b.id} className={styles.eventCard}>
                            <div className={styles.eventTop}>
                              <div className={styles.eventTitle}>{b.eventTitle}</div>
                              {b.nameplateText && (
                                <div className={styles.eventSub}>
                                  Nameplate: {b.nameplateText}
                                </div>
                              )}
                            </div>
                            <div className={styles.eventMeta}>
                              <strong>{b.totalGuests}</strong> guests
                              <div className={styles.eventMetaSub}>
                                {getGuestSplitText(b)}
                              </div>
                            </div>
                            <div className={styles.eventBadges}>
                              <span>
                                <strong>Customer:</strong> {b.customerName}
                              </span>
                              {b.customerReference && (
                                <span className={styles.eventDim}>
                                  Ref: {b.customerReference}
                                </span>
                              )}
                              {b.customerAddress && (
                                <span className={styles.eventDim}>
                                  Address: {b.customerAddress}
                                </span>
                              )}
                              {b.status && <StatusPill status={b.status} size="sm" />}
                              {b.hasPerformance && (
                                <span className={styles.performanceBadge}>🎵 Performance</span>
                              )}
                            </div>
                            <div className={styles.eventActions}>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => navigate(`/bookings/${b.id}`)}
                              >
                                View booking details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* DAY MODE */}
              {!selectedSlot && selectedDay && (
                <>
                  <div className={styles.usageBox}>
                    <div>
                      <strong>Total events:</strong> {dayPanelBookings.length}
                    </div>

                    {dayPanelUsage && (
                      <div className={styles.usageStack}>
                        <div>
                          <strong>Hall A:</strong>{" "}
                          {formatEventCount(dayPanelUsage.hallAEventCount)}
                        </div>
                        <div>
                          <strong>Hall B:</strong>{" "}
                          {formatEventCount(dayPanelUsage.hallBEventCount)}
                        </div>
                      </div>
                    )}

                    {dayPanelLunchSummary && (
                      <div className={styles.usageInline}>
                        <strong>Lunch:</strong> {dayPanelLunchSummary.totalGuests} guests,{" "}
                        {dayPanelLunchSummary.events.length} event
                        {dayPanelLunchSummary.events.length > 1 ? "s" : ""}
                      </div>
                    )}
                    {dayPanelDinnerSummary && (
                      <div className={styles.usageInline}>
                        <strong>Dinner:</strong> {dayPanelDinnerSummary.totalGuests} guests,{" "}
                        {dayPanelDinnerSummary.events.length} event
                        {dayPanelDinnerSummary.events.length > 1 ? "s" : ""}
                      </div>
                    )}
                    {dayPanelBookings.length === 0 && (
                      <div className={styles.muted}>No events for this day yet.</div>
                    )}
                  </div>

                  <div className={styles.actionRow}>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => selectedDay && toggleDayClosed(selectedDay)}
                      style={
                        dayPanelClosed
                          ? {
                            borderColor: "#b91c1c",
                            backgroundColor: "#fee2e2",
                            color: "#b91c1c",
                          }
                          : {}
                      }
                    >
                      {dayPanelClosed
                        ? "Re-open entire day"
                        : "Close entire day for new bookings"}
                    </Button>
                  </div>

                  {/* Lunch section */}
                  <div className={styles.slotSection}>
                    <h3 className={styles.sectionTitle}>
                      Lunch Slot
                      {dayPanelLunchSummary
                        ? ` – ${dayPanelLunchSummary.totalGuests} guests, ${dayPanelLunchSummary.events.length} event${dayPanelLunchSummary.events.length > 1 ? "s" : ""
                        }`
                        : ""}
                    </h3>
                    {dayLunchBookings.length === 0 ? (
                      <p className={styles.muted}>No Lunch events for this day.</p>
                    ) : (
                      <div className={styles.eventList}>
                        {dayLunchBookings.map((b) => (
                          <EventListCard key={b.id} booking={b} navigate={navigate} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dinner section */}
                  <div className={styles.slotSection}>
                    <h3 className={styles.sectionTitle}>
                      Dinner Slot
                      {dayPanelDinnerSummary
                        ? ` – ${dayPanelDinnerSummary.totalGuests} guests, ${dayPanelDinnerSummary.events.length} event${dayPanelDinnerSummary.events.length > 1 ? "s" : ""
                        }`
                        : ""}
                    </h3>
                    {dayDinnerBookings.length === 0 ? (
                      <p className={styles.muted}>No Dinner events for this day.</p>
                    ) : (
                      <div className={styles.eventList}>
                        {dayDinnerBookings.map((b) => (
                          <EventListCard key={b.id} booking={b} navigate={navigate} />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
};

// --- helpers ---

function buildSlotSummary(bookings: MockBooking[], slot: Slot): SlotSummary | null {
  const slotBookings = bookings.filter((b) => b.slot === slot);
  if (slotBookings.length === 0) return null;

  const totalGuests = slotBookings.reduce((sum, b) => sum + (b.totalGuests ?? 0), 0);

  return {
    slot,
    totalGuests,
    events: slotBookings,
  };
}

interface SlotPreviewProps {
  label: "Lunch" | "Dinner";
  summary: SlotSummary | null;
  isClosed: boolean;
  highlightPerformance: boolean;
  highlightOverrides: boolean;
  onClick: () => void;
}

const SlotPreview: React.FC<SlotPreviewProps> = ({
  summary,
  isClosed,
  highlightPerformance,
  highlightOverrides,
  onClick,
}) => {
  if (!summary) {
    return (
      <div
        className={styles.slotBoxEmpty}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        aria-label="No events in this slot"
      >
        <div className={styles.slotEmptyText}>No events</div>
        {isClosed && <div className={styles.slotClosedText}>Closed for new bookings</div>}
      </div>
    );
  }

  const { totalGuests, events } = summary;
  const usage = computeHallUsage(events);

  const {
    hallAUsed,
    hallBUsed,
    hallACapacity,
    hallBCapacity,
    hallAEventCount,
    hallBEventCount,
  } = usage;

  const closedOverrideClass = isClosed ? styles.slotBoxClosed : "";

  const overA = hallAUsed > hallACapacity;
  const overB = hallBUsed > hallBCapacity;
  const hasOverride = highlightOverrides && (overA || overB);
  const hasPerformance = highlightPerformance && events.some((e) => e.hasPerformance);

  return (
    <div
      className={`${styles.slotBox} ${closedOverrideClass}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`Slot with ${events.length} events and ${totalGuests} guests`}
    >
      <div className={styles.slotHeaderRow}>
        <div>
          <strong>{totalGuests}</strong> guests · {events.length} event
          {events.length > 1 ? "s" : ""}
          {hasPerformance && <span className={styles.slotIcon}> 🎵</span>}
          {hasOverride && !isClosed && <span className={styles.slotOverride}> !</span>}
        </div>
      </div>

      <div className={styles.slotUsage}>
        <div className={styles.slotUsageItem}>
          <div className={styles.slotUsageLabel}>Hall A</div>
          <div className={styles.slotUsageValue}>
            {hallAUsed}/{hallACapacity} - {formatEventCount(hallAEventCount)}
          </div>
        </div>
        <div className={styles.slotUsageItem}>
          <div className={styles.slotUsageLabel}>Hall B</div>
          <div className={styles.slotUsageValue}>
            {hallBUsed}/{hallBCapacity} - {formatEventCount(hallBEventCount)}
          </div>
        </div>
      </div>

      {isClosed && <div className={styles.slotClosedText}>Closed for new bookings</div>}

      <div className={styles.eventPills}>
        {events.map((b) => {
          const shortTitle = getShortEventTitle(b.eventTitle);
          const statusStyle = getStatusColorStyle(b.status);
          return (
            <div
              key={b.id}
              className={styles.eventPill}
              style={{
                backgroundColor: statusStyle.backgroundColor,
                borderColor: statusStyle.borderColor,
                color: statusStyle.textColor,
              }}
            >
              <div className={styles.eventPillText}>
                <div className={styles.eventPillTitle}>{shortTitle}</div>
                <div className={styles.eventPillSub}>{b.customerName}</div>
              </div>
              <div className={styles.eventPillGuests}>{b.totalGuests}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface LegendSwatchProps {
  label: string;
  style: React.CSSProperties;
}

const LegendSwatch: React.FC<LegendSwatchProps> = ({ label, style }) => (
  <div className={styles.legendSwatch}>
    <span className={styles.legendSquare} style={style} />
    <span>{label}</span>
  </div>
);

interface EventListCardProps {
  booking: MockBooking;
  navigate: ReturnType<typeof useNavigate>;
}

const EventListCard: React.FC<EventListCardProps> = ({ booking, navigate }) => (
  <div className={styles.eventCard}>
    <div className={styles.eventTop}>
      <div className={styles.eventTitle}>{booking.eventTitle}</div>
      {booking.nameplateText && (
        <div className={styles.eventSub}>Nameplate: {booking.nameplateText}</div>
      )}
    </div>
    <div className={styles.eventMeta}>
      <strong>{booking.totalGuests}</strong> guests
      <div className={styles.eventMetaSub}>{getGuestSplitText(booking)}</div>
    </div>
    <div className={styles.eventBadges}>
      <span>
        <strong>Customer:</strong> {booking.customerName}
      </span>
      {booking.status && <StatusPill status={booking.status} size="sm" />}
      {booking.hasPerformance && (
        <span className={styles.performanceBadge}>🎵 Performance</span>
      )}
    </div>
    <div className={styles.eventActions}>
      <Button type="button" size="sm" onClick={() => navigate(`/bookings/${booking.id}`)}>
        View booking details
      </Button>
    </div>
  </div>
);

function handleDayKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  index: number,
  dayDate: Date,
  lunchSummary: SlotSummary | null,
  dinnerSummary: SlotSummary | null,
  setSelectedDay: (d: Date) => void,
  setSelectedSlot: (s: SelectedSlotState | null) => void,
  setPanelSide: (side: "left" | "right") => void
) {
  const key = e.key;
  const totalCells = 42; // 6 weeks * 7 days grid slots
  const moveFocus = (next: number) => {
    const el = document.querySelector<HTMLElement>(
      `[data-day-index="${next}"]`
    );
    if (el) {
      el.focus();
    }
  };

  if (key === "Enter") {
    e.preventDefault();
    setPanelSide(dayDate.getDay() <= 3 ? "right" : "left");
    setSelectedDay(dayDate);
    setSelectedSlot(null);
    return;
  }

  if (key === "Enter" && e.shiftKey) {
    e.preventDefault();
    const slotToOpen: Slot =
      lunchSummary && lunchSummary.events.length > 0
        ? "LUNCH"
        : dinnerSummary && dinnerSummary.events.length > 0
          ? "DINNER"
          : "LUNCH";
    setPanelSide(dayDate.getDay() <= 3 ? "right" : "left");
    setSelectedDay(dayDate);
    setSelectedSlot({ date: dayDate, slot: slotToOpen });
    return;
  }

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
    e.preventDefault();
    let next = index;
    if (key === "ArrowLeft") next = index - 1;
    if (key === "ArrowRight") next = index + 1;
    if (key === "ArrowUp") next = index - 7;
    if (key === "ArrowDown") next = index + 7;
    if (next >= 0 && next < totalCells) {
      moveFocus(next);
    }
  }
}

export default CalendarPage;
