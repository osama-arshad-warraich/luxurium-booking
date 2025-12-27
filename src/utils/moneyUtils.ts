// src/utils/moneyUtils.ts
// Shared helpers for working with PKR amounts in Luxurium Booking.

/**
 * Format a number as PKR for display in the UI.
 *
 * Example:
 *   formatPKR(250000) => "Rs 250,000"
 * (Exact symbol/spacing is handled by the browser's locale rules.)
 */
export function formatPKR(amount: number): string {
  return amount.toLocaleString("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  });
}

/**
 * Simple helper if you ever want a plain "250,000" without the currency code.
 */
export function formatPKRPlain(amount: number): string {
  return amount.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  });
}
