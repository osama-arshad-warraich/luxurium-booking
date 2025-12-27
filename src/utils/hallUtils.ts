// src/utils/hallUtils.ts
// Shared helpers for hall usage / capacity calculations for a single booking.

import type {
  MockBooking,
  HallAllocation,
} from "../mock/bookingsMockApi";

export interface HallStats {
  guestsHere: number;
  capacity: number;
  otherGuests: number;
  otherLabel: string;
  remaining: number;
  isOverCapacity: boolean;
}

/**
 * Human-friendly description of which halls are used by this booking.
 * Mirrors the logic previously in BookingDetailPage.
 */
export function getHallsUsedText(b: MockBooking): string {
  const a = b.hallAGuests ?? 0;
  const bGuests = b.hallBGuests ?? 0;

  if (a > 0 && bGuests > 0) return "Hall A & Hall B";
  if (a > 0 && bGuests === 0) return "Hall A only";
  if (bGuests > 0 && a === 0) return "Hall B only";
  return "No halls recorded (data missing)";
}

/**
 * String like "300 total · Hall A 200 · Hall B 100" or null if no split.
 */
export function getGuestSplitText(b: MockBooking): string | null {
  const parts: string[] = [];
  if (b.hallAGuests != null) {
    parts.push(`Hall A ${b.hallAGuests}`);
  }
  if (b.hallBGuests != null) {
    parts.push(`Hall B ${b.hallBGuests}`);
  }
  if (!parts.length) return null;

  return `${b.totalGuests} total · ${parts.join(" · ")}`;
}

/**
 * Capacity/usage stats for a single hall (A or B) for this booking.
 * This is just the per-booking view, not slot-wide capacity logic.
 */
export function getHallStatsForBooking(
  b: MockBooking,
  hallCode: "A" | "B"
): HallStats {
  const hallAlloc: HallAllocation | undefined = b.halls
    ? b.halls.find((h: HallAllocation) => h.hallCode === hallCode)
    : undefined;

  const guestsHere =
    hallCode === "A"
      ? b.hallAGuests ?? (hallAlloc ? hallAlloc.guestsHere : 0)
      : b.hallBGuests ?? (hallAlloc ? hallAlloc.guestsHere : 0);

  // Default capacity is 1000 if we don't have a hall allocation object yet.
  const capacity = hallAlloc?.capacity ?? 1000;

  const otherGuests =
    hallCode === "A" ? b.hallBGuests ?? 0 : b.hallAGuests ?? 0;

  const otherLabel =
    hallCode === "A"
      ? `${otherGuests} in Hall B`
      : `${otherGuests} in Hall A`;

  const remaining = capacity - guestsHere;
  const isOverCapacity = guestsHere > capacity;

  return {
    guestsHere,
    capacity,
    otherGuests,
    otherLabel,
    remaining,
    isOverCapacity,
  };
}
