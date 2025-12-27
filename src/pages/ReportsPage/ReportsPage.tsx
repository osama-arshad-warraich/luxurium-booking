// src/pages/ReportsPage/ReportsPage.tsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "../../state/BookingStore";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { MetricCard } from "../../ui/MetricCard";
import { parseEventDateLabel } from "../../utils/dateUtils";
import { formatPKR } from "../../utils/moneyUtils";
import styles from "./ReportsPage.module.css";

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { bookings } = useBookingStore();

  const {
    bookingsThisMonth,
    guestsThisMonth,
    confirmedThisMonth,
    advanceThisMonth,
  } = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    let bookingsThisMonth = 0;
    let guestsThisMonth = 0;
    let confirmedThisMonth = 0;
    let advanceThisMonth = 0;

    for (const b of bookings) {
      const d = parseEventDateLabel(b.eventDateLabel);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;

      bookingsThisMonth += 1;
      guestsThisMonth += b.totalGuests ?? 0;

      if (b.status === "CONFIRMED" || b.status === "COMPLETED") {
        confirmedThisMonth += 1;
      }

      advanceThisMonth += b.advance?.amount ?? 0;
    }

    return {
      bookingsThisMonth,
      guestsThisMonth,
      confirmedThisMonth,
      advanceThisMonth,
    };
  }, [bookings]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Luxurium – Reports</h1>
          <p className={styles.subhead}>
            Early reporting view using your stored bookings. Later this will grow
            into monthly summaries, headcounts, hall-usage and export tools.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => navigate("/dashboard")}
        >
          Back to dashboard
        </Button>
      </header>

      {/* Top metrics */}
      <section className={styles.metricsGrid}>
        <MetricCard
          label="Bookings this month"
          value={bookingsThisMonth}
          hint="All events scheduled in this calendar month."
        />
        <MetricCard
          label="Guests this month"
          value={guestsThisMonth.toLocaleString("en-PK")}
          hint="Sum of totalGuests across this month."
        />
        <MetricCard
          label="Confirmed / completed"
          value={confirmedThisMonth}
          hint="Bookings with status CONFIRMED or COMPLETED this month."
        />
        <MetricCard
          label="Advance this month"
          value={formatPKR(advanceThisMonth)}
          hint="Sum of advance amounts for this month (approximate)."
        />
      </section>

      {/* Future reports layout */}
      <section className={styles.futureGrid}>
        <Card>
          <h2 className={styles.cardTitle}>Monthly summaries (coming soon)</h2>
          <p className={styles.cardText}>
            This section will show breakdowns by status, slot (Lunch/Dinner),
            and hall usage for a selected month, including capacity overrides.
          </p>
        </Card>

        <Card>
          <h2 className={styles.cardTitle}>Export & deep-dive (coming soon)</h2>
          <p className={styles.cardText}>
            Later we can add CSV/PDF export, per-day drilldowns, and more
            advanced financial views (per-head, menu types, etc.).
          </p>
        </Card>
      </section>
    </main>
  );
};

export default ReportsPage;
