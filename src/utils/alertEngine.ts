// src/utils/alertEngine.ts
import type { MockBooking, Slot } from "../mock/bookingsMockApi";
import {
  parseEventDateLabel,
  dateKeyFromDate,
  startOfDay,
  addDays,
} from "./dateUtils";

// ----- Types -----

export type AlertType =
  | "CAPACITY_OVERRIDE"
  | "PERFORMANCE_HALL_CONFLICT"
  | "SOFT_BOOKING_FOLLOWUP"
  | "PAST_NOT_CLOSED"
  | "MISSING_CONTACT"
  | "GUEST_SPLIT_MISMATCH"
  | "COMPLEX_MULTI_HALL_DAY"
  | "HIGH_GUEST_COUNT"
  | "HIGH_ADVANCE_VALUE";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertDefinition {
  id: string;
  type: AlertType;
  severity: AlertSeverity;

  title: string;
  message: string;
  sub?: string;

  bookingId?: number;
  dateKey?: string;
  slot?: Slot;
}

type HallCode = "A" | "B";

interface HallSlotUsage {
  used: number;
  capacity: number;
  eventCount: number;

  // Best representative booking to link/open (largest guestsHere)
  sampleBookingId?: number;
  sampleDateLabel?: string;
  sampleGuestsHere: number;
}

// ----- Main builder -----

export function buildAlerts(
  bookings: MockBooking[],
  today: Date
): AlertDefinition[] {
  const alerts: AlertDefinition[] = [];
  const todayStart = startOfDay(today);
  const in15Days = addDays(todayStart, 15);

  // Precompute maps for multi-hall and performance analysis
  const slotHallBookings = new Map<string, MockBooking[]>(); // date|slot|hallCode -> bookings
  const daySlotBookings = new Map<string, MockBooking[]>(); // date|slot -> bookings

  // Aggregate hall usage per date|slot|hallCode (THIS powers capacity override)
  const hallSlotUsage = new Map<string, HallSlotUsage>();

  for (const b of bookings) {
    const d = parseEventDateLabel(b.eventDateLabel);
    const dk = dateKeyFromDate(d);
    const slot = b.slot;

    // day+slot grouping
    const daySlotKey = `${dk}|${slot}`;
    const daySlotArr = daySlotBookings.get(daySlotKey) ?? [];
    daySlotArr.push(b);
    daySlotBookings.set(daySlotKey, daySlotArr);

    // hall allocations
    for (const hall of b.halls ?? []) {
      const hallCode = hall.hallCode as HallCode;
      const key = `${dk}|${slot}|${hallCode}`;

      // Bookings list by hall for performance checks
      const list = slotHallBookings.get(key) ?? [];
      list.push(b);
      slotHallBookings.set(key, list);

      // Usage aggregation for capacity override
      const prev = hallSlotUsage.get(key);
      const nextUsed = (prev?.used ?? 0) + hall.guestsHere;
      const nextCapacity = Math.max(prev?.capacity ?? hall.capacity, hall.capacity);
      const nextEventCount = (prev?.eventCount ?? 0) + 1;

      // Choose the booking with the largest guestsHere as the sample link
      let sampleBookingId = prev?.sampleBookingId;
      let sampleDateLabel = prev?.sampleDateLabel;
      let sampleGuestsHere = prev?.sampleGuestsHere ?? 0;

      if (hall.guestsHere >= sampleGuestsHere) {
        sampleGuestsHere = hall.guestsHere;
        sampleBookingId = b.id;
        sampleDateLabel = b.eventDateLabel;
      }

      hallSlotUsage.set(key, {
        used: nextUsed,
        capacity: nextCapacity,
        eventCount: nextEventCount,
        sampleBookingId,
        sampleDateLabel,
        sampleGuestsHere,
      });
    }
  }

  // 1) Capacity override – hall+slot aggregate (multi-event overbooking)
  // This restores the earlier behavior where Hall A Dinner total > 1000 triggers CRITICAL.
  for (const [key, usage] of hallSlotUsage.entries()) {
    if (usage.used <= usage.capacity) continue;

    const [dk, slotStr, hallCode] = key.split("|") as [string, Slot, string];
    const dateLabel = usage.sampleDateLabel ?? dk;
    const humanSlot = slotStr === "LUNCH" ? "Lunch" : "Dinner";

    alerts.push({
      id: `cap-${dk}-${slotStr}-${hallCode}`,
      type: "CAPACITY_OVERRIDE",
      severity: "critical",
      bookingId: usage.sampleBookingId,
      dateKey: dk,
      slot: slotStr,
      title: `Capacity override – Hall ${hallCode}`,
      message: `${dateLabel} (${humanSlot}): Hall ${hallCode} has ${usage.used} guests across ${usage.eventCount} event(s) for ${usage.capacity} capacity.`,
      sub: "This indicates the hall is overbooked for the same slot. Review allocations, safety, and get explicit manager approval if this is intentional.",
    });
  }

  // 2) Performance conflict – performance + other event in the SAME hall (same date+slot+hall)
  for (const [key, list] of slotHallBookings.entries()) {
    if (list.length <= 1) continue;

    const hasPerformance = list.some((b) => b.hasPerformance);
    if (!hasPerformance) continue;

    const [dk, slotStr, hallCode] = key.split("|") as [string, Slot, string];
    const anyWithPerf = list.find((b) => b.hasPerformance);
    const dateLabel = anyWithPerf ? anyWithPerf.eventDateLabel : dk;

    alerts.push({
      id: `perf-conflict-${dk}-${slotStr}-${hallCode}`,
      type: "PERFORMANCE_HALL_CONFLICT",
      severity: "warning",
      bookingId: anyWithPerf?.id,
      dateKey: dk,
      slot: slotStr,
      title: "Performance + other event in same hall",
      message: `There are ${list.length} event(s) in Hall ${hallCode} during ${
        slotStr === "LUNCH" ? "Lunch" : "Dinner"
      } on ${dateLabel}, and at least one has a performance.`,
      sub: "By rule, a hall with musical performance should usually be exclusive. Review and decide if this is acceptable (or dismiss with manager note).",
    });
  }

  // Per-booking rules (follow-ups, past status, data quality, etc.)
  for (const b of bookings) {
    const d = parseEventDateLabel(b.eventDateLabel);
    const dk = dateKeyFromDate(d);

    // 3) Inquiry / Tentative within 15 days – follow-up needed
    const isSoftStatus = b.status === "INQUIRY" || b.status === "TENTATIVE";
    if (isSoftStatus && d >= todayStart && d <= in15Days) {
      const humanSlot = b.slot === "LUNCH" ? "Lunch" : "Dinner";
      alerts.push({
        id: `soft-follow-${b.id}`,
        type: "SOFT_BOOKING_FOLLOWUP",
        severity: "warning",
        bookingId: b.id,
        dateKey: dk,
        slot: b.slot,
        title:
          b.status === "INQUIRY"
            ? "Inquiry – follow up"
            : "Tentative – confirm or release",
        message: `${b.eventTitle} on ${b.eventDateLabel} (${humanSlot}).`,
        sub: `Status: ${b.status}. Contact: ${b.customerName}${
          b.customerPhone ? " – " + b.customerPhone : ""
        }. Please confirm or free the slot.`,
      });
    }

    // 4) Past bookings that are not COMPLETED or CANCELLED
    const isPast = d < todayStart;
    const isOpenStatus =
      b.status === "INQUIRY" ||
      b.status === "TENTATIVE" ||
      b.status === "CONFIRMED";
    if (isPast && isOpenStatus) {
      alerts.push({
        id: `past-open-${b.id}`,
        type: "PAST_NOT_CLOSED",
        severity: "warning",
        bookingId: b.id,
        dateKey: dk,
        slot: b.slot,
        title: "Past booking not closed",
        message: `${b.eventTitle} on ${b.eventDateLabel} is still marked as ${b.status}.`,
        sub: "Mark this booking as COMPLETED or CANCELLED so reporting and headcount stay accurate.",
      });
    }

    // 5) Missing critical contact details (phone or address)
    const missingPhone = !b.customerPhone || b.customerPhone.trim() === "";
    const missingAddress = !b.customerAddress || b.customerAddress.trim() === "";
    if (missingPhone || missingAddress) {
      const missingParts: string[] = [];
      if (missingPhone) missingParts.push("phone");
      if (missingAddress) missingParts.push("address");

      alerts.push({
        id: `missing-contact-${b.id}`,
        type: "MISSING_CONTACT",
        severity: "info",
        bookingId: b.id,
        dateKey: dk,
        slot: b.slot,
        title: "Missing contact details",
        message: `${b.eventTitle} is missing: ${missingParts.join(" & ")}.`,
        sub: `Customer: ${b.customerName}. Add ${missingParts.join(
          " and "
        )} so it’s easier to reach them and keep records complete.`,
      });
    }

    // 6) Guest split mismatch (totalGuests vs Hall A/B split)
    const a = b.hallAGuests;
    const bb = b.hallBGuests;
    if (a != null || bb != null) {
      const sum = (a || 0) + (bb || 0);
      if (b.totalGuests && sum !== b.totalGuests) {
        alerts.push({
          id: `split-mismatch-${b.id}`,
          type: "GUEST_SPLIT_MISMATCH",
          severity: "info",
          bookingId: b.id,
          dateKey: dk,
          slot: b.slot,
          title: "Guest split mismatch",
          message: `${b.eventTitle}: totalGuests = ${b.totalGuests}, but Hall A + Hall B = ${sum}.`,
          sub: "Check hall splits – this affects capacity logic and guest reporting.",
        });
      }
    }

    // 7) High guest count (big event)
    if (b.totalGuests >= 1500) {
      alerts.push({
        id: `high-guests-${b.id}`,
        type: "HIGH_GUEST_COUNT",
        severity: "info",
        bookingId: b.id,
        dateKey: dk,
        slot: b.slot,
        title: "Very large guest count",
        message: `${b.eventTitle} has ${b.totalGuests} guests planned.`,
        sub: "Large event – double-check staffing, kitchen capacity, parking, and entry/exit flow.",
      });
    }

    // 8) High advance value (high-value booking)
    if (b.advance && b.advance.amount >= 200000) {
      alerts.push({
        id: `high-advance-${b.id}`,
        type: "HIGH_ADVANCE_VALUE",
        severity: "info",
        bookingId: b.id,
        dateKey: dk,
        slot: b.slot,
        title: "High-value booking (advance)",
        message: `${b.eventTitle} has an advance of Rs ${b.advance.amount.toLocaleString(
          "en-PK"
        )}.`,
        sub: `Destination: ${b.advance.destinationAccount}. Keep an eye on finance follow-up and final payment.`,
      });
    }
  }

  // 9) Complex multi-hall / multi-function slots (day+slot)
  for (const [key, list] of daySlotBookings.entries()) {
    if (list.length <= 1) continue;
    const multiHallEvents = list.filter((b) => b.halls && b.halls.length > 1);
    if (multiHallEvents.length >= 2 || list.length >= 3) {
      const [dk, slotStr] = key.split("|") as [string, Slot];
      const labelDate = multiHallEvents[0]?.eventDateLabel ?? dk;
      alerts.push({
        id: `complex-multihall-${dk}-${slotStr}`,
        type: "COMPLEX_MULTI_HALL_DAY",
        severity: "info",
        dateKey: dk,
        slot: slotStr,
        title: "Complex multi-hall slot",
        message: `${list.length} events in this slot, with ${multiHallEvents.length} using multiple halls (${
          slotStr === "LUNCH" ? "Lunch" : "Dinner"
        } on ${labelDate}).`,
        sub: "Worth reviewing allocations, timings, and movement carefully.",
      });
    }
  }

  return alerts;
}
