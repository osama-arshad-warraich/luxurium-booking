// src/state/BookingStore.tsx
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  MOCK_BOOKINGS,
  type MockBooking,
  type Slot,
} from "../mock/bookingsMockApi";
import {
  useAuditLogStore,
  type AuditLogEntry,
} from "./AuditLogStore";

export interface NewBookingFormInput {
  eventTitle: string;
  nameplateText: string;
  date: string; // "YYYY-MM-DD"
  slot: Slot;
  totalGuests: number | "";
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  familyOrCompanyName: string;
  customerAddress: string;
  customerReference: string;
  internalNote: string;
}

export type BookingLogAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

// Backwards-compatible alias for old booking log type
export type BookingChangeLogEntry = AuditLogEntry;

// Store surface
export interface BookingStoreContextType {
  // Active (non-deleted) bookings
  bookings: MockBooking[];

  // All bookings including deleted ones (for history / restore)
  allBookings: MockBooking[];

  // Only deleted bookings (Trash)
  deletedBookings: MockBooking[];

  // Form-driven creation
  addBookingFromForm: (form: NewBookingFormInput) => MockBooking;

  // Direct insertion (for legacy/mock data flows)
  addBooking: (booking: MockBooking) => void;

  // Hall allocation helper
  updateBookingHallSplit: (
    id: number,
    hallAGuests: number | null,
    hallBGuests: number | null
  ) => void;

  // Generic update for editing any fields
  updateBooking: (id: number, updates: Partial<MockBooking>) => void;

  // Soft delete / restore
  deleteBooking: (id: number, reason?: string) => void;
  restoreBooking: (id: number) => void;

  // Lookups
  getBookingById: (id: number) => MockBooking | undefined;

  // Convenience adapter into global audit log
  getLogsForBooking: (id: number) => BookingChangeLogEntry[];
}

const BookingStoreContext = createContext<BookingStoreContextType | undefined>(
  undefined
);

// --- helpers ---

function parseLocalISODateToLabel(iso: string): string {
  // Avoid timezone/off-by-one issues from new Date("YYYY-MM-DD")
  const parts = iso.split("-");
  if (parts.length !== 3) {
    const fallback = new Date();
    return fallback.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const fallback = new Date();
    return fallback.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildHallsFromSplit(
  hallAGuests: number | null,
  hallBGuests: number | null
): MockBooking["halls"] {
  const halls: MockBooking["halls"] = [];

  if (hallAGuests != null && hallAGuests > 0) {
    halls.push({
      hallCode: "A",
      hallName: "Hall A",
      capacity: 1000,
      guestsHere: hallAGuests,
      guestsInOtherHallsText:
        hallBGuests != null && hallBGuests > 0
          ? `${hallBGuests} in Hall B`
          : undefined,
    });
  }

  if (hallBGuests != null && hallBGuests > 0) {
    halls.push({
      hallCode: "B",
      hallName: "Hall B",
      capacity: 1000,
      guestsHere: hallBGuests,
      guestsInOtherHallsText:
        hallAGuests != null && hallAGuests > 0
          ? `${hallAGuests} in Hall A`
          : undefined,
    });
  }

  return halls;
}

export const BookingStoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // All bookings in memory (including deleted ones)
  const [allBookings, setAllBookings] = useState<MockBooking[]>(() => [
    ...MOCK_BOOKINGS,
  ]);

  // Global audit log store
  const { appendLog, getLogsForBooking: auditGetLogsForBooking } =
    useAuditLogStore();

  // Active bookings (filtered)
  const bookings = useMemo(
    () => allBookings.filter((b) => !b.isDeleted),
    [allBookings]
  );

  // Deleted bookings (Trash)
  const deletedBookings = useMemo(
    () => allBookings.filter((b) => b.isDeleted),
    [allBookings]
  );

  // 1) "Smart" creator used by the Booking Form
  const addBookingFromForm = (form: NewBookingFormInput): MockBooking => {
    const numericGuests =
      typeof form.totalGuests === "number" ? form.totalGuests : 0;

    // Convert YYYY-MM-DD to "DD Mon YYYY" like the mock data (local date safe).
    const eventDateLabel = form.date
      ? parseLocalISODateToLabel(form.date)
      : parseLocalISODateToLabel(
          new Date().toISOString().slice(0, 10)
        );

    const now = Date.now();

    const newBooking: MockBooking = {
      id: now,
      bookingRef: `TEMP-${now}`,
      eventTitle: form.eventTitle || "Untitled Event",
      nameplateText: form.nameplateText || undefined,

      eventDateLabel,
      slot: form.slot,
      totalGuests: numericGuests,

      hallAGuests: null,
      hallBGuests: null,

      status: "INQUIRY",

      customerName: form.customerName || "Unnamed Customer",
      customerPhone: form.customerPhone || "",
      customerWhatsapp: form.customerWhatsapp || "",
      familyOrCompanyName: form.familyOrCompanyName || "",
      customerAddress: form.customerAddress || "",
      customerReference: form.customerReference || "",

      hasPerformance: false,
      performanceDescription: undefined,

      halls: [],

      internalNote: form.internalNote || "",
      advance: undefined,
    };

    setAllBookings((prev) => [...prev, newBooking]);

    appendLog({
      entityType: "BOOKING",
      entityId: newBooking.id,
      bookingId: newBooking.id,
      action: "CREATE",
      summary: "Created booking from form",
    });

    return newBooking;
  };

  // 2) Simple "push this booking" helper
  const addBooking = (booking: MockBooking): void => {
    setAllBookings((prev) => [...prev, booking]);

    appendLog({
      entityType: "BOOKING",
      entityId: booking.id,
      bookingId: booking.id,
      action: "CREATE",
      summary: "Created booking (direct insert)",
    });
  };

  // 3) Generic update (for editing any fields from Booking Detail)
  //    👉 computes diff + logs OUTSIDE setAllBookings to avoid duplicate logs
  const updateBooking = (id: number, updates: Partial<MockBooking>): void => {
    const existing = allBookings.find((b) => b.id === id);
    if (!existing) return;

    const updated: MockBooking = { ...existing, ...updates };

    const diff: Record<string, { before: unknown; after: unknown }> = {};
    (Object.keys(updates) as (keyof MockBooking)[]).forEach((key) => {
      if (existing[key] !== updated[key]) {
        diff[String(key)] = {
          before: existing[key],
          after: updated[key],
        };
      }
    });

    const diffKeys = Object.keys(diff);
    if (diffKeys.length > 0) {
      const hallKeys = ["hallAGuests", "hallBGuests", "halls"];
      const onlyHallChanges = diffKeys.every((key) => hallKeys.includes(key));

      let summary = "Updated booking";

      if (onlyHallChanges) {
        summary = "Updated hall allocation";
      } else if (diffKeys.length === 1 && diffKeys[0] === "status") {
        const before = diff["status"].before;
        const after = diff["status"].after;
        if (before != null && after != null) {
          summary = `Status changed from ${String(before)} to ${String(after)}`;
        } else {
          summary = "Status updated";
        }
      } else if (diffKeys.length === 1 && diffKeys[0] === "eventDateLabel") {
        const before = diff["eventDateLabel"].before;
        const after = diff["eventDateLabel"].after;
        if (before && after) {
          summary = `Event date changed from ${String(before)} to ${String(after)}`;
        } else {
          summary = "Event date updated";
        }
      } else if (diffKeys.length === 1 && diffKeys[0] === "totalGuests") {
        const before = diff["totalGuests"].before;
        const after = diff["totalGuests"].after;
        summary = `Total guests changed from ${String(before ?? "—")} to ${String(after ?? "—")}`;
      } else {
        summary = `Updated fields: ${diffKeys.join(", ")}`;
      }

      appendLog({
        entityType: "BOOKING",
        entityId: id,
        bookingId: id,
        action: "UPDATE",
        summary,
        diff,
      });
    }

    setAllBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  // 4) Hall split helper – reuses generic update
  const updateBookingHallSplit = (
    id: number,
    hallAGuests: number | null,
    hallBGuests: number | null
  ): void => {
    const halls = buildHallsFromSplit(hallAGuests, hallBGuests);
    updateBooking(id, { hallAGuests, hallBGuests, halls });
  };

  // 5) Soft delete & restore (with diffs) – also logging OUTSIDE setAllBookings
  const deleteBooking = (id: number, reason?: string): void => {
    const existing = allBookings.find((b) => b.id === id);
    if (!existing) return;

    const now = new Date().toISOString();
    const updated: MockBooking = {
      ...existing,
      isDeleted: true,
      deletedAt: now,
      deletedBy: "System", // later: current user from auth
      deletedReason: reason || "",
    };

    const diff: Record<string, { before: unknown; after: unknown }> = {
      isDeleted: { before: existing.isDeleted ?? false, after: true },
      deletedAt: { before: existing.deletedAt ?? null, after: now },
      deletedBy: { before: existing.deletedBy ?? null, after: "System" },
      deletedReason: { before: existing.deletedReason ?? "", after: reason || "" },
    };

    appendLog({
      entityType: "BOOKING",
      entityId: id,
      bookingId: id,
      action: "DELETE",
      summary: reason ? `Deleted booking (${reason})` : "Deleted booking",
      diff,
    });

    setAllBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const restoreBooking = (id: number): void => {
    const existing = allBookings.find((b) => b.id === id);
    if (!existing) return;

    const updated: MockBooking = {
      ...existing,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      deletedReason: undefined,
    };

    const diff: Record<string, { before: unknown; after: unknown }> = {
      isDeleted: { before: existing.isDeleted ?? false, after: false },
      deletedAt: { before: existing.deletedAt ?? null, after: null },
      deletedBy: { before: existing.deletedBy ?? null, after: null },
      deletedReason: { before: existing.deletedReason ?? "", after: "" },
    };

    appendLog({
      entityType: "BOOKING",
      entityId: id,
      bookingId: id,
      action: "RESTORE",
      summary: "Restored booking",
      diff,
    });

    setAllBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const getBookingById = (id: number): MockBooking | undefined =>
    allBookings.find((b) => b.id === id);

  const getLogsForBooking = (id: number): BookingChangeLogEntry[] =>
    auditGetLogsForBooking(id);

  const value = useMemo(
    () => ({
      bookings,
      allBookings,
      deletedBookings,
      addBookingFromForm,
      addBooking,
      updateBookingHallSplit,
      updateBooking,
      deleteBooking,
      restoreBooking,
      getBookingById,
      getLogsForBooking,
    }),
    [bookings, allBookings, deletedBookings, auditGetLogsForBooking]
  );

  return (
    <BookingStoreContext.Provider value={value}>
      {children}
    </BookingStoreContext.Provider>
  );
};

export function useBookingStore(): BookingStoreContextType {
  const ctx = useContext(BookingStoreContext);
  if (!ctx) {
    throw new Error("useBookingStore must be used within a BookingStoreProvider");
  }
  return ctx;
}
