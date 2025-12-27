// src/components/dashboard/DashboardUpcomingSection.tsx
import React from "react";

export interface UpcomingDaySummary {
  dateLabel: string; // e.g. "28 Nov 2025"
  totalEvents: number;
  totalGuests: number;
}

interface DashboardUpcomingSectionProps {
  days: UpcomingDaySummary[];
}

const DashboardUpcomingSection: React.FC<DashboardUpcomingSectionProps> = ({
  days,
}) => {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2>Upcoming (next few days)</h2>

      {days.length === 0 && <p>No upcoming bookings in this range.</p>}

      {days.length > 0 && (
        <ul style={{ marginTop: "0.75rem", paddingLeft: "1.25rem" }}>
          {days.map((day) => (
            <li key={day.dateLabel} style={{ marginBottom: "0.5rem" }}>
              <strong>{day.dateLabel}</strong> – {day.totalEvents} event
              {day.totalEvents !== 1 ? "s" : ""}, approx.{" "}
              {day.totalGuests.toLocaleString()} guests
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DashboardUpcomingSection;
