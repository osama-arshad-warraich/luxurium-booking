// src/state/AlertStore.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBookingStore } from "./BookingStore";
import {
  buildAlerts,
  type AlertDefinition,
  type AlertSeverity,
  type AlertType,
} from "../utils/alertEngine";

export type AlertResolutionStatus = "ACTIVE" | "RESOLVED" | "DISMISSED";

export interface AlertResolution {
  alertId: string;
  status: AlertResolutionStatus;
  /** Free-text note (e.g. “owner approved override”, “client cancelled”). */
  note?: string;
  /** ISO timestamp of the last update to this resolution record. */
  updatedAt: string;
}

export interface AlertWithResolution extends AlertDefinition {
  resolution?: AlertResolution;
  effectiveStatus: AlertResolutionStatus;
}

interface AlertStoreContextType {
  alerts: AlertWithResolution[];
  resolveAlert: (alertId: string, note?: string) => void;
  dismissAlert: (alertId: string, note?: string) => void;
  reopenAlert: (alertId: string) => void;
  getAlertsForBooking: (bookingId: number) => AlertWithResolution[];
}

const AlertStoreContext = createContext<AlertStoreContextType | undefined>(
  undefined
);

const STORAGE_KEY = "luxurium.alertResolutions.v1";

function normalizeResolutions(input: unknown): Record<string, AlertResolution> {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  const out: Record<string, AlertResolution> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;

    const alertId =
      typeof v.alertId === "string"
        ? v.alertId
        : typeof key === "string"
        ? key
        : "";

    const statusRaw = typeof v.status === "string" ? v.status : "";
    const status: AlertResolutionStatus =
      statusRaw === "DISMISSED" || statusRaw === "RESOLVED"
        ? statusRaw
        : "ACTIVE";

    // Back-compat: older fields `reason` / `dismissedAt`
    const note =
      typeof v.note === "string"
        ? v.note
        : typeof (v as any).reason === "string"
        ? ((v as any).reason as string)
        : undefined;

    const updatedAt =
      typeof v.updatedAt === "string"
        ? v.updatedAt
        : typeof (v as any).dismissedAt === "string"
        ? ((v as any).dismissedAt as string)
        : typeof (v as any).resolvedAt === "string"
        ? ((v as any).resolvedAt as string)
        : new Date().toISOString();

    if (!alertId) continue;

    out[alertId] = {
      alertId,
      status,
      note: note?.trim() || undefined,
      updatedAt,
    };
  }

  return out;
}

export const AlertStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { bookings } = useBookingStore();

  // Keep a lightweight clock so “soon/past” alerts update even if bookings don't change.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Resolutions are stored client-side (persisted in localStorage).
  // Later, this maps cleanly to a backend table keyed by {alertId}.
  const [resolutions, setResolutions] = useState<Record<string, AlertResolution>>(
    {}
  );

  const hasLoadedRef = useRef(false);

  // Load once
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        setResolutions(normalizeResolutions(parsed));
      }
    } catch {
      // ignore malformed storage
    } finally {
      hasLoadedRef.current = true;
    }
  }, []);

  // Persist on change (after initial load completes)
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resolutions));
    } catch {
      // ignore quota / private mode errors
    }
  }, [resolutions]);

  const baseAlerts: AlertDefinition[] = useMemo(
    () => buildAlerts(bookings, now),
    [bookings, now]
  );

  const alerts: AlertWithResolution[] = useMemo(() => {
    return baseAlerts.map((def) => {
      const res = resolutions[def.id];
      const effectiveStatus: AlertResolutionStatus = res?.status ?? "ACTIVE";
      return {
        ...def,
        resolution: res,
        effectiveStatus,
      };
    });
  }, [baseAlerts, resolutions]);

  const resolveAlert = (alertId: string, note?: string) => {
    setResolutions((prev) => ({
      ...prev,
      [alertId]: {
        alertId,
        status: "RESOLVED",
        note: note?.trim() || prev[alertId]?.note,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const dismissAlert = (alertId: string, note?: string) => {
    setResolutions((prev) => ({
      ...prev,
      [alertId]: {
        alertId,
        status: "DISMISSED",
        note: note?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const reopenAlert = (alertId: string) => {
    setResolutions((prev) => {
      const copy = { ...prev };
      delete copy[alertId];
      return copy;
    });
  };

  const getAlertsForBooking = (bookingId: number): AlertWithResolution[] =>
    alerts.filter((a) => a.bookingId === bookingId && a.effectiveStatus === "ACTIVE");

  return (
    <AlertStoreContext.Provider
      value={{ alerts, resolveAlert, dismissAlert, reopenAlert, getAlertsForBooking }}
    >
      {children}
    </AlertStoreContext.Provider>
  );
};

export const useAlertStore = (): AlertStoreContextType => {
  const ctx = useContext(AlertStoreContext);
  if (!ctx) {
    throw new Error("useAlertStore must be used within AlertStoreProvider");
  }
  return ctx;
};

// Optional helper if we ever want severity -> UI mapping in one place.
// NOTE: made robust to case differences ("CRITICAL" vs "critical") so styling/sorting
// won't silently break if alertEngine casing changes.
export function alertSeverityRank(severity: AlertSeverity): number {
  const s = String(severity).toLowerCase();
  switch (s) {
    case "critical":
      return 3;
    case "warning":
      return 2;
    case "info":
    default:
      return 1;
  }
}

export function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case "CAPACITY_OVERRIDE":
      return "Capacity";
    case "PERFORMANCE_HALL_CONFLICT":
      return "Performance";
    case "SOFT_BOOKING_FOLLOWUP":
      return "Follow-up";
    case "PAST_NOT_CLOSED":
      return "Past status";
    case "MISSING_CONTACT":
      return "Contact";
    case "GUEST_SPLIT_MISMATCH":
      return "Guest split";
    case "COMPLEX_MULTI_HALL_DAY":
      return "Multi-hall";
    case "HIGH_GUEST_COUNT":
      return "High guests";
    case "HIGH_ADVANCE_VALUE":
      return "High advance";
    default:
      return type;
  }
}
