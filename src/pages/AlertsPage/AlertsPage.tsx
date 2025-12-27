// src/pages/AlertsPage/AlertsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBookingStore } from "../../state/BookingStore";
import {
  alertSeverityRank,
  alertTypeLabel,
  useAlertStore,
} from "../../state/AlertStore";
import type { AlertSeverity, AlertType } from "../../utils/alertEngine";
import type { MockBooking } from "../../mock/bookingsMockApi";
import { formatSlotShort } from "../../utils/slotUtils";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { MetricCard } from "../../ui/MetricCard";
import { StatusPill } from "../../ui/StatusPill";
import styles from "./AlertsPage.module.css";

type AlertFilterStatus = "ACTIVE" | "ALL" | "RESOLVED" | "DISMISSED";
type AlertTypeOptionValue = "ALL" | AlertType;
type BookingFilterValue = "ALL" | number;

interface TypeOption {
  value: AlertTypeOptionValue;
  label: string;
}

interface BookingOption {
  value: string; // bookingId as string
  label: string;
}

const ALL_ALERT_TYPES: AlertType[] = [
  "CAPACITY_OVERRIDE",
  "PERFORMANCE_HALL_CONFLICT",
  "SOFT_BOOKING_FOLLOWUP",
  "PAST_NOT_CLOSED",
  "MISSING_CONTACT",
  "GUEST_SPLIT_MISMATCH",
  "COMPLEX_MULTI_HALL_DAY",
  "HIGH_GUEST_COUNT",
  "HIGH_ADVANCE_VALUE",
];

function parseFilterStatus(raw: string | null): AlertFilterStatus | null {
  if (!raw) return null;
  const v = raw.toUpperCase();
  if (v === "ACTIVE" || v === "ALL" || v === "RESOLVED" || v === "DISMISSED") {
    return v;
  }
  return null;
}

function parseFilterSeverity(raw: string | null): "ALL" | AlertSeverity | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "all") return "ALL";
  if (v === "critical" || v === "warning" || v === "info") return v;
  return null;
}

function parseFilterType(raw: string | null): AlertTypeOptionValue | null {
  if (!raw) return null;
  if (raw === "ALL") return "ALL";
  return ALL_ALERT_TYPES.includes(raw as AlertType) ? (raw as AlertType) : null;
}

function parseBookingId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  return n;
}

const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { bookings } = useBookingStore();
  const { alerts, dismissAlert, resolveAlert, reopenAlert } = useAlertStore();

  const bookingById = useMemo(() => {
    const map = new Map<number, MockBooking>();
    for (const b of bookings) {
      map.set(b.id, b);
    }
    return map;
  }, [bookings]);

  // Filters
  const [filterBookingId, setFilterBookingId] =
    useState<BookingFilterValue>("ALL");
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | AlertSeverity>(
    "ALL"
  );
  const [filterStatus, setFilterStatus] = useState<AlertFilterStatus>("ACTIVE");
  const [filterType, setFilterType] = useState<AlertTypeOptionValue>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Initialize filters from URL query ONCE (supports /alerts?bookingId=123 etc.)
  const hasInitializedFromQueryRef = useRef(false);
  useEffect(() => {
    if (hasInitializedFromQueryRef.current) return;

    const bid = parseBookingId(searchParams.get("bookingId"));
    if (bid != null) setFilterBookingId(bid);

    const st = parseFilterStatus(searchParams.get("status"));
    if (st) setFilterStatus(st);

    const sev = parseFilterSeverity(searchParams.get("severity"));
    if (sev) setFilterSeverity(sev);

    const ty = parseFilterType(searchParams.get("type"));
    if (ty) setFilterType(ty);

    const q = searchParams.get("q");
    if (q) setSearchTerm(q);

    hasInitializedFromQueryRef.current = true;
  }, [searchParams]);

  // Dismiss-with-note editing
  const [dismissEditingId, setDismissEditingId] = useState<string | null>(null);
  const [dismissReasonDraft, setDismissReasonDraft] = useState<string>("");

  const bookingOptions: BookingOption[] = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => {
      const da = a.eventDateLabel ?? "";
      const db = b.eventDateLabel ?? "";
      if (da !== db) return da.localeCompare(db);

      const sa = String(a.slot ?? "");
      const sb = String(b.slot ?? "");
      if (sa !== sb) return sa.localeCompare(sb);

      return String(a.eventTitle ?? "").localeCompare(String(b.eventTitle ?? ""));
    });

    return sorted.map((b) => ({
      value: String(b.id),
      label: `#${b.id} · ${b.eventDateLabel} · ${formatSlotShort(b.slot)} · ${b.eventTitle}`,
    }));
  }, [bookings]);

  const typeOptions: TypeOption[] = useMemo(() => {
    const set = new Set<AlertType>();
    for (const a of alerts) set.add(a.type);

    const sorted = Array.from(set).sort((a, b) =>
      alertTypeLabel(a).localeCompare(alertTypeLabel(b))
    );

    const base: TypeOption[] = [
      { value: "ALL" as AlertTypeOptionValue, label: "All types" },
    ];

    return base.concat(
      sorted.map(
        (t): TypeOption => ({ value: t, label: alertTypeLabel(t) })
      )
    );
  }, [alerts]);

  const enhanced = useMemo(() => {
    return alerts.map((a) => {
      const booking = a.bookingId ? bookingById.get(a.bookingId) : undefined;
      return {
        ...a,
        booking,
        dateLabel: booking?.eventDateLabel ?? a.dateKey,
        bookingStatus: booking?.status,
        bookingTitle: booking?.eventTitle,
        bookingCustomer: booking?.customerName,
      };
    });
  }, [alerts, bookingById]);

  // Metrics (active only)
  const totalActive = useMemo(
    () => enhanced.filter((a) => a.effectiveStatus === "ACTIVE").length,
    [enhanced]
  );

  const totalCriticalActive = useMemo(
    () =>
      enhanced.filter(
        (a) => a.effectiveStatus === "ACTIVE" && a.severity === "critical"
      ).length,
    [enhanced]
  );

  const totalFollowUps = useMemo(
    () =>
      enhanced.filter(
        (a) =>
          a.effectiveStatus === "ACTIVE" && a.type === "SOFT_BOOKING_FOLLOWUP"
      ).length,
    [enhanced]
  );

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = enhanced.filter((a) => {
      if (filterBookingId !== "ALL" && a.bookingId !== filterBookingId) {
        return false;
      }
      if (filterStatus !== "ALL" && a.effectiveStatus !== filterStatus) {
        return false;
      }
      if (filterSeverity !== "ALL" && a.severity !== filterSeverity) {
        return false;
      }
      if (filterType !== "ALL" && a.type !== filterType) {
        return false;
      }

      if (q) {
        const haystack = [
          a.title,
          a.message,
          a.sub ?? "",
          a.dateLabel ?? "",
          a.bookingTitle ?? "",
          a.bookingCustomer ?? "",
          alertTypeLabel(a.type),
          a.bookingId ? `#${a.bookingId}` : "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const sev = alertSeverityRank(b.severity) - alertSeverityRank(a.severity);
      if (sev !== 0) return sev;

      const da = a.dateKey ?? "";
      const db = b.dateKey ?? "";
      if (da && db && da !== db) return da.localeCompare(db);

      const ba = a.bookingId ? 1 : 0;
      const bb = b.bookingId ? 1 : 0;
      if (ba !== bb) return bb - ba;

      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [
    enhanced,
    filterBookingId,
    filterSeverity,
    filterStatus,
    filterType,
    searchTerm,
  ]);

  const clearFilters = () => {
    setFilterBookingId("ALL");
    setFilterSeverity("ALL");
    setFilterStatus("ACTIVE");
    setFilterType("ALL");
    setSearchTerm("");
  };

  const markResolved = (id: string) => {
    resolveAlert(id);
    if (dismissEditingId === id) {
      setDismissEditingId(null);
      setDismissReasonDraft("");
    }
  };

  const startDismissEdit = (id: string) => {
    const existing = alerts.find((a) => a.id === id)?.resolution?.note ?? "";
    setDismissEditingId(id);
    setDismissReasonDraft(existing);
  };

  const cancelDismissEdit = () => {
    setDismissEditingId(null);
    setDismissReasonDraft("");
  };

  const confirmDismiss = () => {
    if (!dismissEditingId) return;
    const trimmed = dismissReasonDraft.trim();
    dismissAlert(dismissEditingId, trimmed || undefined);
    setDismissEditingId(null);
    setDismissReasonDraft("");
  };

  const bookingSelectValue =
    filterBookingId === "ALL" ? "ALL" : String(filterBookingId);

  const selectedBookingKnown =
    filterBookingId === "ALL"
      ? true
      : bookingOptions.some((o) => o.value === String(filterBookingId));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Luxurium – Alerts Center</h1>
          <p className={styles.subtitle}>
            A focused view of capacity overrides, performance conflicts,
            follow-ups, data gaps, and status clean-up. Resolve or dismiss alerts
            with a note so you always know what was decided.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </header>

      <section className={styles.metricsGrid}>
        <MetricCard
          label="Active alerts"
          value={totalActive}
          hint="Alerts that still need attention or a decision."
        />
        <MetricCard
          label="Critical"
          value={totalCriticalActive}
          hint="Highest severity alerts that can affect safety/operations."
          accentColor="#ef4444"
        />
        <MetricCard
          label="Follow-ups"
          value={totalFollowUps}
          hint="Inquiries / tentatives that should be confirmed or released."
          accentColor="#f59e0b"
        />
      </section>

      <section className={styles.mainGrid}>
        {/* LEFT: Filters */}
        <Card className={styles.filterCard}>
          <div className={styles.filterHeader}>
            <h2 className={styles.cardTitle}>Filters</h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={clearFilters}
            >
              Clear
            </Button>
          </div>

          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}>Booking</div>
            <select
              value={bookingSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "ALL") {
                  setFilterBookingId("ALL");
                  return;
                }
                const n = Number(v);
                setFilterBookingId(Number.isFinite(n) ? n : "ALL");
              }}
              className={styles.select}
            >
              <option value="ALL">All bookings</option>
              {!selectedBookingKnown && filterBookingId !== "ALL" && (
                <option value={String(filterBookingId)}>
                  Booking #{filterBookingId} (not in list)
                </option>
              )}
              {bookingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}>Severity</div>
            <div className={styles.chipRow}>
              {(
                [
                  { value: "ALL" as const, label: "All" },
                  { value: "critical" as const, label: "Critical" },
                  { value: "warning" as const, label: "Warning" },
                  { value: "info" as const, label: "Info" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilterSeverity(opt.value)}
                  className={[
                    styles.chipButton,
                    filterSeverity === opt.value ? styles.chipButtonActive : "",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}>Status</div>
            <div className={styles.chipRow}>
              {(
                [
                  { value: "ACTIVE" as const, label: "Active" },
                  { value: "ALL" as const, label: "All" },
                  { value: "RESOLVED" as const, label: "Resolved" },
                  { value: "DISMISSED" as const, label: "Dismissed" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilterStatus(opt.value)}
                  className={[
                    styles.chipButton,
                    filterStatus === opt.value ? styles.chipButtonActive : "",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}>Type</div>
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as AlertTypeOptionValue)
              }
              className={styles.select}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}>Search</div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, message, client..."
              className={styles.input}
            />
          </div>

          <p className={styles.filterNote}>
            Alerts update from bookings automatically. “Resolve” is a workflow
            mark; the underlying issue should still be corrected in the booking
            data. “Dismiss” is for manager-approved exceptions (add a note).
          </p>
        </Card>

        {/* RIGHT: Alert list */}
        <Card>
          <div className={styles.feedHeader}>
            <h2 className={styles.cardTitle}>Alert feed</h2>
            <span className={styles.feedCount}>
              Showing {filteredAndSorted.length} of {enhanced.length}
            </span>
          </div>

          {filteredAndSorted.length === 0 ? (
            <p className={styles.emptyState}>No alerts match your current filters.</p>
          ) : (
            <div className={styles.alertList}>
              {filteredAndSorted.map((alert) => {
                const severityStyle = getSeverityStyle(alert.severity);
                const statusLabel = getStatusLabel(alert.effectiveStatus);
                const typeLabel = alertTypeLabel(alert.type);

                const dynamicStyle: React.CSSProperties = {
                  border: `1px solid ${severityStyle.borderColor}`,
                  background:
                    alert.effectiveStatus === "ACTIVE"
                      ? severityStyle.backgroundGradient
                      : "#f9fafb",
                };

                return (
                  <div
                    key={alert.id}
                    className={styles.alertItem}
                    style={dynamicStyle}
                  >
                    <div className={styles.alertTopRow}>
                      <div className={styles.alertBody}>
                        <div className={styles.alertTitleRow}>
                          <span
                            className={styles.severityBar}
                            style={{ backgroundColor: severityStyle.pillColor }}
                          />
                          <div className={styles.alertTitle} title={alert.title}>
                            {alert.title}
                          </div>
                        </div>

                        <div className={styles.alertMessage}>{alert.message}</div>

                        {alert.sub && (
                          <div className={styles.alertSub}>{alert.sub}</div>
                        )}

                        {alert.resolution?.note &&
                          alert.effectiveStatus !== "ACTIVE" && (
                            <div className={styles.resolutionNote}>
                              Note: {alert.resolution.note}
                            </div>
                          )}
                      </div>

                      <div className={styles.alertMeta}>
                        <span
                          className={styles.pillTag}
                          style={{
                            backgroundColor: severityStyle.tagBg,
                            color: severityStyle.tagText,
                          }}
                        >
                          {severityLabel(alert.severity)}
                        </span>

                        <span className={styles.pillTagMuted}>{statusLabel}</span>
                        <span className={styles.pillTagMuted}>{typeLabel}</span>

                        {alert.bookingStatus && (
                          <StatusPill
                            status={alert.bookingStatus}
                            size="sm"
                            style={{ marginTop: 2 }}
                          />
                        )}

                        {(alert.dateLabel || alert.slot) && (
                          <span className={styles.dateLine}>
                            {alert.dateLabel ?? ""}
                            {alert.slot ? ` · ${formatSlotShort(alert.slot)}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.alertActions}>
                      <div className={styles.leftActions}>
                        {alert.effectiveStatus === "ACTIVE" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={() => markResolved(alert.id)}
                            >
                              Mark resolved
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => startDismissEdit(alert.id)}
                            >
                              Dismiss with note
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => reopenAlert(alert.id)}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>

                      {alert.bookingId && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => navigate(`/bookings/${alert.bookingId}`)}
                        >
                          Open booking
                        </Button>
                      )}
                    </div>

                    {dismissEditingId === alert.id &&
                      alert.effectiveStatus === "ACTIVE" && (
                        <div className={styles.dismissEditor}>
                          <div className={styles.dismissHelp}>
                            Add a short note (e.g. “owner approved override”,
                            “client cancelled”, “move to Hall B”).
                          </div>

                          <textarea
                            value={dismissReasonDraft}
                            onChange={(e) => setDismissReasonDraft(e.target.value)}
                            rows={2}
                            className={styles.textarea}
                            placeholder="Optional note..."
                          />

                          <div className={styles.dismissActions}>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={confirmDismiss}
                            >
                              Confirm dismiss
                            </Button>
                            <Button type="button" size="sm" onClick={cancelDismissEdit}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </main>
  );
};

function getSeverityStyle(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return {
        borderColor: "#fecaca",
        backgroundGradient:
          "linear-gradient(135deg, #fef2f2 0%, #fee2e2 30%, #ffffff 100%)",
        pillColor: "#ef4444",
        tagBg: "#fee2e2",
        tagText: "#b91c1c",
      };
    case "warning":
      return {
        borderColor: "#facc15",
        backgroundGradient:
          "linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #ffffff 100%)",
        pillColor: "#f59e0b",
        tagBg: "#fef3c7",
        tagText: "#92400e",
      };
    case "info":
    default:
      return {
        borderColor: "#bfdbfe",
        backgroundGradient:
          "linear-gradient(135deg, #eff6ff 0%, #dbeafe 30%, #ffffff 100%)",
        pillColor: "#3b82f6",
        tagBg: "#dbeafe",
        tagText: "#1d4ed8",
      };
  }
}

function getStatusLabel(status: AlertFilterStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "RESOLVED":
      return "Resolved";
    case "DISMISSED":
      return "Dismissed";
    case "ALL":
      return "All";
    default:
      return status;
  }
}

function severityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "info":
    default:
      return "Info";
  }
}

export default AlertsPage;
