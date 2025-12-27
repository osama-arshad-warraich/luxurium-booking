// src/utils/slotUtils.ts
// Shared helpers for working with lunch/dinner "slots" in Luxurium Booking.

import type { Slot } from "../mock/bookingsMockApi";

/**
 * Human-friendly label used across the app whenever we show a slot.
 * Example: "Lunch (1–5 pm)" or "Dinner (7–10 pm)".
 */
export function formatSlotHuman(slot: Slot): string {
  return slot === "LUNCH" ? "Lunch (1–5 pm)" : "Dinner (7–10 pm)";
}

/**
 * Shorter label variant, useful for very tight UI (table columns, chips).
 * Example: "Lunch" / "Dinner".
 */
export function formatSlotShort(slot: Slot): string {
  return slot === "LUNCH" ? "Lunch" : "Dinner";
}

/**
 * Sorting helper for slots.
 * Convention: Lunch comes before Dinner on the same date.
 *
 * Returns:
 *  - negative if a < b
 *  - zero     if a === b
 *  - positive if a > b
 *
 * Usage:
 *   list.sort((a, b) => compareSlots(a.slot, b.slot));
 */
export function compareSlots(a: Slot, b: Slot): number {
  if (a === b) return 0;
  return a === "LUNCH" ? -1 : 1;
}

/**
 * Optional compact code if we ever need "L" / "D" in labels or IDs.
 */
export function slotCode(slot: Slot): "L" | "D" {
  return slot === "LUNCH" ? "L" : "D";
}
