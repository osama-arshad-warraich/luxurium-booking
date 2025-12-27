// src/utils/dateUtils.ts
// Shared helpers for working with booking/event dates in Luxurium Booking.

/**
 * Our booking dates are stored as human-readable strings like "27 Nov 2025"
 * (see eventDateLabel on MockBooking). The JS Date constructor can parse
 * this format reliably enough for our internal tool.
 */
export function parseEventDateLabel(label: string): Date {
  return new Date(label);
}

/**
 * Older code sometimes used this shorter name; keep it as a tiny alias
 * so we don't have to touch every call site at once.
 */
export function parseEventDate(label: string): Date {
  return parseEventDateLabel(label);
}

/**
 * Normalized YYYY-MM-DD key for grouping/filtering by calendar day.
 */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Small alias kept to match existing naming used in some places
 * (for example the alert engine).
 */
export function dateKeyFromDate(d: Date): string {
  return dateKey(d);
}

/**
 * Calendar header helper, e.g. "November 2025".
 */
export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * For <input type="date"> values: "YYYY-MM-DD".
 */
export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Start-of-day helper used in alerts and other date math.
 */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Simple date addition helper (days relative to a base date).
 */
export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Standard Luxurium label for a booking slot, including time window.
 * Example: "Lunch (1–5 pm)" or "Dinner (7–10 pm)".
 */
export function formatSlotLabel(slot: "LUNCH" | "DINNER"): string {
  return slot === "LUNCH" ? "Lunch (1–5 pm)" : "Dinner (7–10 pm)";
}

/**
 * Standard Luxurium event-date label used for eventDateLabel fields.
 * Example: 27 Nov 2025
 */
export function formatEventDateLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
