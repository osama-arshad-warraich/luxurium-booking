// src/state/AuditLogStore.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// What kind of thing the log entry is about.
// We start with BOOKING, but this can later include: "MENU", "FINANCE", "INVENTORY", etc.
export type AuditEntityType = "BOOKING" | "SYSTEM";

// Keep action as string so we can log any future actions without TS pain.
export interface AuditLogEntry {
  id: string; // generated ID
  at: string; // ISO timestamp
  actor?: string; // "System", "Osama", etc.

  entityType: AuditEntityType;
  entityId: string | number; // ID of the entity (e.g. booking id)

  // Convenience field for booking-specific UIs like Booking Detail page
  bookingId?: number;

  action: string;
  summary: string;
  details?: string;
  diff?: Record<string, { before: unknown; after: unknown }>;
}

export interface AuditLogStoreContextType {
  logs: AuditLogEntry[];

  // Append a new log entry
  appendLog: (entry: AppendLogInput) => void;

  // Get all log entries for a given entity
  getLogsForEntity: (
    entityType: AuditEntityType,
    entityId: string | number
  ) => AuditLogEntry[];

  // Convenience for bookings
  getLogsForBooking: (bookingId: number) => AuditLogEntry[];
}

// When appending, caller does NOT provide id/at (we generate them).
// actor is optional – we default to a global actor name for now.
export interface AppendLogInput {
  entityType: AuditEntityType;
  entityId: string | number;

  // Optional; useful for booking-related logs.
  bookingId?: number;

  action: string;
  summary: string;
  details?: string;
  diff?: Record<string, { before: unknown; after: unknown }>;

  actor?: string;
}

const DEFAULT_ACTOR = "System";

const AuditLogStoreContext = createContext<AuditLogStoreContextType | undefined>(
  undefined
);

export const AuditLogStoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  const appendLog = (entry: AppendLogInput): void => {
    const at = new Date().toISOString();
    const id = `${at}-${Math.random().toString(36).slice(2, 10)}`;

    const actor =
      entry.actor && entry.actor.trim().length > 0
        ? entry.actor.trim()
        : DEFAULT_ACTOR;

    const entityIdValue = entry.entityId;

    // If bookingId isn't explicitly provided but this is a BOOKING entity,
    // try to infer it from entityId.
    let bookingId: number | undefined = entry.bookingId;
    if (bookingId === undefined && entry.entityType === "BOOKING") {
      const maybeNum = Number(entityIdValue);
      if (!Number.isNaN(maybeNum)) {
        bookingId = maybeNum;
      }
    }

    const newEntry: AuditLogEntry = {
      id,
      at,
      actor,
      entityType: entry.entityType,
      entityId: entityIdValue,
      bookingId,
      action: entry.action,
      summary: entry.summary,
      details: entry.details,
      diff: entry.diff,
    };

    setLogs((prev) => [...prev, newEntry]);
  };

  const getLogsForEntity = (
    entityType: AuditEntityType,
    entityId: string | number
  ): AuditLogEntry[] => {
    const idStr = String(entityId);
    return logs.filter(
      (log) => log.entityType === entityType && String(log.entityId) === idStr
    );
  };

  const getLogsForBooking = (bookingId: number): AuditLogEntry[] => {
    const idStr = String(bookingId);
    return logs.filter(
      (log) =>
        log.bookingId === bookingId ||
        (log.entityType === "BOOKING" && String(log.entityId) === idStr)
    );
  };

  const value = useMemo(
    () => ({
      logs,
      appendLog,
      getLogsForEntity,
      getLogsForBooking,
    }),
    [logs]
  );

  return (
    <AuditLogStoreContext.Provider value={value}>
      {children}
    </AuditLogStoreContext.Provider>
  );
};

export function useAuditLogStore(): AuditLogStoreContextType {
  const ctx = useContext(AuditLogStoreContext);
  if (!ctx) {
    throw new Error(
      "useAuditLogStore must be used within an AuditLogStoreProvider"
    );
  }
  return ctx;
}
