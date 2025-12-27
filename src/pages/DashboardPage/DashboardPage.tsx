// src/pages/DashboardPage/DashboardPage.tsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "../../state/BookingStore";
import { useAlertStore, alertSeverityRank } from "../../state/AlertStore";
import { type MockBooking, type Slot } from "../../mock/bookingsMockApi";
import { parseEventDateLabel, dateKey } from "../../utils/dateUtils";
import {
  formatSlotHuman,
  formatSlotShort,
  compareSlots,
} from "../../utils/slotUtils";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { MetricCard } from "../../ui/MetricCard";
import styles from "./DashboardPage.module.css";

const DashboardPage: React.FC = () => {
  const { bookings } = useBookingStore();
  const { alerts } = useAlertStore();
  const navigate = useNavigate();

  const today = new Date();
  const todayKey = dateKey(today);
  const monthKey = `${today.getFullYear()}-${today.getMonth()}`;

  // --- Derived data (READ ONLY) ---

  const todaysBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const d = parseEventDateLabel(b.eventDateLabel);
        return dateKey(d) === todayKey;
      }),
    [bookings, todayKey]
  );

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => {
        const d = parseEventDateLabel(b.eventDateLabel);
        return d > now;
      })
      .sort((a, b) => {
        const da = parseEventDateLabel(a.eventDateLabel);
        const db = parseEventDateLabel(b.eventDateLabel);
        const diff = da.getTime() - db.getTime();
        if (diff !== 0) return diff;
        // Lunch before Dinner on the same day
        return compareSlots(a.slot, b.slot);
      })
      .slice(0, 8);
    // todayKey ensures a re-run when the day changes (if a re-render happens)
  }, [bookings, todayKey]);

  const totalConfirmedThisMonth = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return bookings.filter((b) => {
      const d = parseEventDateLabel(b.eventDateLabel);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        (b.status === "CONFIRMED" || b.status === "COMPLETED")
      );
    }).length;
  }, [bookings, monthKey]);

  const totalGuestsServedAndBooked = useMemo(() => {
    return bookings.reduce((sum, b) => sum + (b.totalGuests || 0), 0);
  }, [bookings]);

  // Use only active alerts; show the *most recent* 5, then sort those by severity.
  const dashboardAlerts = useMemo(() => {
    const active = alerts.filter((a) => a.effectiveStatus === "ACTIVE");
    const lastFive = active.slice(-5); // most recent 5
    return lastFive.sort(
      (a, b) => alertSeverityRank(b.severity) - alertSeverityRank(a.severity)
    );
  }, [alerts]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Luxurium – Dashboard</h1>
          <p className={styles.subhead}>
            Today’s schedule, upcoming events, and key alerts – all based on your
            stored bookings (no automatic changes to guest counts).
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/calendar")}
          >
            Open calendar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate("/bookings/new")}
          >
            New booking
          </Button>
        </div>
      </header>

      {/* High-level metrics */}
      <section className={styles.metricsGrid}>
        <MetricCard
          label="Today’s events"
          value={todaysBookings.length}
          hint="Total number of events happening today."
        />
        <MetricCard
          label="Confirmed this month"
          value={totalConfirmedThisMonth}
          hint="Confirmed or completed bookings in this calendar month."
        />
        <MetricCard
          label="Guests (served + upcoming)"
          value={totalGuestsServedAndBooked.toLocaleString("en-PK")}
          hint="Sum of totalGuests across all bookings (past and future)."
        />
      </section>

      {/* Main layout: Today / Upcoming / Alerts */}
      <section className={styles.mainGrid}>
        {/* LEFT: Today + Upcoming */}
        <div className={styles.leftCol}>
          {/* Today section */}
          <Card>
            <div className={styles.todayHeaderRow}>
              <h2 className={styles.cardTitle}>Today’s Schedule</h2>
              <span className={styles.todayDate}>
                {today.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            {todaysBookings.length === 0 ? (
              <p className={styles.mutedText}>No bookings for today.</p>
            ) : (
              <div className={styles.slotsGrid}>
                {renderTodaySlot("LUNCH", todaysBookings, navigate)}
                {renderTodaySlot("DINNER", todaysBookings, navigate)}
              </div>
            )}
          </Card>

          {/* Upcoming bookings */}
          <Card>
            <h2 className={styles.cardTitle}>Upcoming Bookings</h2>

            {upcomingBookings.length === 0 ? (
              <p className={styles.mutedText}>No upcoming bookings found.</p>
            ) : (
              <div className={styles.upcomingList}>
                {upcomingBookings.map((b) => {
                  const dateStr = b.eventDateLabel;
                  const slotLabel = formatSlotShort(b.slot);
                  const hallLabel = buildHallShortLabel(b);

                  return (
                    <div key={b.id} className={styles.upcomingRow}>
                      <div className={styles.rowMain}>
                        <div className={styles.upcomingMeta}>
                          {dateStr} · {slotLabel}
                        </div>
                        <div className={styles.rowTitle}>{b.eventTitle}</div>
                        <div className={styles.upcomingSub}>
                          {b.customerName} · {b.totalGuests} guests
                          {hallLabel ? ` · ${hallLabel}` : ""}
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/bookings/${b.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Alerts */}
        <Card>
          <h2 className={styles.cardTitle}>Alerts & Warnings</h2>

          {dashboardAlerts.length === 0 ? (
            <p className={styles.mutedText}>No active alerts right now.</p>
          ) : (
            <ul className={styles.alertsList}>
              {dashboardAlerts.map((a) => {
                const severityClass =
                  a.severity === "critical"
                    ? styles.alertCritical
                    : a.severity === "warning"
                      ? styles.alertWarning
                      : styles.alertInfo;

                return (
                  <li
                    key={a.id}
                    className={`${styles.alertItem} ${severityClass}`}
                  >
                    <div>
                      <div className={styles.alertTypeRow}>
                        <span className={styles.alertType}>
                          {a.type.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>

                      <div className={styles.alertTitle}>{a.title}</div>
                      <div className={styles.alertMessage}>{a.message}</div>

                      {a.sub && <div className={styles.alertSub}>{a.sub}</div>}
                    </div>

                    {a.bookingId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/bookings/${a.bookingId}`)}
                      >
                        Open
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className={styles.viewAllWrap}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/alerts")}
            >
              View all alerts
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
};

// ---------- helpers (READ ONLY) ----------

function renderTodaySlot(
  slot: Slot,
  todaysBookings: MockBooking[],
  navigate: (path: string) => void
) {
  const slotLabel = formatSlotHuman(slot);
  const bookings = todaysBookings.filter((b) => b.slot === slot);

  if (bookings.length === 0) {
    return (
      <div className={`${styles.slotCard} ${styles.slotCardEmpty}`}>
        <div className={styles.slotLabel}>{slotLabel}</div>
        <div className={styles.slotEmptyMeta}>No events in this slot.</div>
      </div>
    );
  }

  const totalGuests = bookings.reduce((sum, b) => sum + (b.totalGuests || 0), 0);

  return (
    <div className={styles.slotCard}>
      <div className={styles.slotHeaderRow}>
        <div>
          <div className={styles.slotLabel}>{slotLabel}</div>
          <div className={styles.slotMeta}>
            {bookings.length} event{bookings.length > 1 ? "s" : ""} ·{" "}
            {totalGuests} guests
          </div>
        </div>
      </div>

      <div className={styles.slotList}>
        {bookings.map((b) => {
          const hallLabel = buildHallShortLabel(b);

          return (
            <div key={b.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowTitle}>
                  {b.eventTitle}
                  {b.hasPerformance ? " 🎵" : ""}
                </div>
                <div className={styles.rowSub}>
                  {b.customerName} · {b.totalGuests} guests
                  {hallLabel ? ` · ${hallLabel}` : ""}
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/bookings/${b.id}`)}
              >
                View
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildHallShortLabel(b: MockBooking): string {
  const parts: string[] = [];
  if (b.hallAGuests != null) {
    parts.push(`A ${b.hallAGuests}`);
  }
  if (b.hallBGuests != null) {
    parts.push(`B ${b.hallBGuests}`);
  }
  return parts.join(" · ");
}

export default DashboardPage;
