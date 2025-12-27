// src/components/dashboard/DashboardTodaySection.tsx
import React from "react";

export type Slot = "LUNCH" | "DINNER";

export type BookingStatus = "INQUIRY" | "TENTATIVE" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface TodayBooking {
  id: number;
  hall: "A" | "B";
  slot: Slot;
  eventTitle: string;
  customerName: string;
  guestsHere: number;
  totalGuests: number;
  otherHallsText?: string; // e.g. "300 in Hall B"
  status: BookingStatus;
}

interface DashboardTodaySectionProps {
  dateLabel: string; // e.g. "27 Nov 2025"
  bookings: TodayBooking[];
}

const DashboardTodaySection: React.FC<DashboardTodaySectionProps> = ({
  dateLabel,
  bookings,
}) => {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2>Today – {dateLabel}</h2>

      {bookings.length === 0 && <p>No bookings today.</p>}

      {bookings.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          {/* Group by slot */}
          {(["LUNCH", "DINNER"] as Slot[]).map((slot) => {
            const bookingsForSlot = bookings.filter((b) => b.slot === slot);
            if (bookingsForSlot.length === 0) return null;

            return (
              <div
                key={slot}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ marginBottom: "0.5rem" }}>
                  {slot === "LUNCH" ? "Lunch (1–5 pm)" : "Dinner (7–10 pm)"}
                </h3>

                {/* Group by hall inside each slot */}
                {(["A", "B"] as ("A" | "B")[]).map((hall) => {
                  const hallBookings = bookingsForSlot.filter(
                    (b) => b.hall === hall
                  );
                  if (hallBookings.length === 0) return null;

                  return (
                    <div
                      key={hall}
                      style={{
                        marginBottom: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        background: "#fafafa",
                        borderRadius: 6,
                      }}
                    >
                      <h4 style={{ marginBottom: "0.25rem" }}>
                        Hall {hall} – {hallBookings.length} event
                        {hallBookings.length > 1 ? "s" : ""}
                      </h4>

                      <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
                        {hallBookings.map((booking) => (
                          <li key={booking.id} style={{ marginBottom: "0.35rem" }}>
                            <strong>{booking.eventTitle}</strong> –{" "}
                            {booking.customerName}{" "}
                            <span style={{ fontSize: "0.9em", color: "#555" }}>
                              ({booking.guestsHere} here / {booking.totalGuests} total
                              {booking.otherHallsText
                                ? `; ${booking.otherHallsText}`
                                : ""}
                              )
                            </span>{" "}
                            <span
                              style={{
                                fontSize: "0.8em",
                                padding: "0.1rem 0.35rem",
                                borderRadius: 4,
                                background:
                                  booking.status === "CONFIRMED"
                                    ? "#d1fae5"
                                    : booking.status === "TENTATIVE"
                                    ? "#fef3c7"
                                    : "#e5e7eb",
                                border: "1px solid #d1d5db",
                                marginLeft: "0.25rem",
                              }}
                            >
                              {booking.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default DashboardTodaySection;
