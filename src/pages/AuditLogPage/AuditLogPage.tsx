// src/pages/AuditLogPage/AuditLogPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "../../state/BookingStore";
import {
  useAuditLogStore,
  type AuditLogEntry,
} from "../../state/AuditLogStore";
import { type MockBooking } from "../../mock/bookingsMockApi";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { LogActionPill } from "../../ui/LogActionPill";
import styles from "./AuditLogPage.module.css";

type ActionFilter = "ALL" | "CREATE" | "UPDATE" | "DELETE" | "RESTORE";
type TimePreset = "24h" | "7d" | "30d" | "ALL" | "CUSTOM";

interface LogRow {
  log: AuditLogEntry;
  booking?: MockBooking;
  diffKeys: string[];
}

const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { allBookings } = useBookingStore();
  const { logs } = useAuditLogStore();

  const [searchText, setSearchText] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [bookingIdFilter, setBookingIdFilter] = useState("");
  const [showOnlyWithDiff, setShowOnlyWithDiff] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [timePreset, setTimePreset] = useState<TimePreset>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const rows: LogRow[] = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const bookingIdNum =
      bookingIdFilter.trim() !== "" ? Number(bookingIdFilter) : NaN;

    // ---- time range boundaries (on log.at) ----
    const now = new Date();
    let minTime: number | null = null;
    let maxTime: number | null = null;

    if (timePreset === "24h") {
      minTime = now.getTime() - 24 * 60 * 60 * 1000;
    } else if (timePreset === "7d") {
      minTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (timePreset === "30d") {
      minTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else if (timePreset === "CUSTOM") {
      if (fromDate) {
        const d = new Date(fromDate);
        d.setHours(0, 0, 0, 0);
        minTime = d.getTime();
      }
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        maxTime = d.getTime();
      }
    }
    // timePreset === "ALL" => no bounds

    return logs
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .map((log) => {
        const booking = log.bookingId
          ? allBookings.find((b) => b.id === log.bookingId)
          : undefined;
        const diffKeys = log.diff ? Object.keys(log.diff) : [];
        return { log, booking, diffKeys };
      })
      .filter((row) => {
        const { log, booking, diffKeys } = row;

        // Time range filter (based on log.at)
        const logTime = new Date(log.at).getTime();
        if (minTime !== null && logTime < minTime) return false;
        if (maxTime !== null && logTime > maxTime) return false;

        // Action filter
        if (
          actionFilter !== "ALL" &&
          log.action.toUpperCase() !== actionFilter
        ) {
          return false;
        }

        // Only entries that actually changed fields
        if (showOnlyWithDiff && diffKeys.length === 0) {
          return false;
        }

        // Booking ID filter
        if (!Number.isNaN(bookingIdNum) && bookingIdFilter.trim() !== "") {
          if (log.bookingId !== bookingIdNum) return false;
        }

        // Text search
        if (search.length === 0) return true;

        const haystackParts: string[] = [log.summary, String(log.bookingId ?? "")];

        if (booking) {
          const maybeStrings: Array<string | undefined> = [
            booking.bookingRef,
            booking.eventTitle,
            booking.customerName,
            booking.customerPhone,
            booking.customerWhatsapp,
            booking.customerAddress,
            booking.customerReference,
          ];

          // Only push defined, non-empty strings
          maybeStrings.forEach((v) => {
            if (typeof v === "string" && v.trim() !== "") {
              haystackParts.push(v);
            }
          });
        }

        const haystack = haystackParts.join(" ").toLowerCase();
        return haystack.includes(search);
      });
  }, [
    logs,
    allBookings,
    actionFilter,
    bookingIdFilter,
    searchText,
    showOnlyWithDiff,
    timePreset,
    fromDate,
    toDate,
  ]);

  return (
    <main className={styles.page}>
      <h1>Luxurium – Audit log</h1>
      <p className={styles.subhead}>
        Central history of all booking changes: creates, updates, deletes and restores.
        Use this page when you need to investigate who changed what and when.
      </p>

      {/* Filters */}
      <Card className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          {/* Search */}
          <div className={`${styles.field} ${styles.fieldGrow}`}>
            <label className={styles.label}>Search</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Booking ref, event, customer, phone, address, reference…"
              className={styles.input}
            />
          </div>

          {/* Time range presets */}
          <div className={`${styles.field} ${styles.timeRange}`}>
            <label className={styles.label}>Time range</label>
            <div className={styles.presetRow}>
              {(
                [
                  { key: "24h", label: "Last 24 hours" },
                  { key: "7d", label: "Last 7 days" },
                  { key: "30d", label: "Last 30 days" },
                  { key: "ALL", label: "All time" },
                  { key: "CUSTOM", label: "Custom" },
                ] as { key: TimePreset; label: string }[]
              ).map(({ key, label }) => {
                const isActive = timePreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimePreset(key)}
                    className={`${styles.presetBtn} ${
                      isActive ? styles.presetBtnActive : ""
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom date range – only meaningful when preset is CUSTOM */}
          <div className={styles.field}>
            <label className={styles.label}>From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setTimePreset("CUSTOM");
              }}
              className={`${styles.input} ${styles.dateInput}`}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setTimePreset("CUSTOM");
              }}
              className={`${styles.input} ${styles.dateInput}`}
            />
          </div>

          {/* Action filter */}
          <div className={styles.field}>
            <label className={styles.label}>Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
              className={`${styles.input} ${styles.select}`}
            >
              <option value="ALL">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="RESTORE">Restore</option>
            </select>
          </div>

          {/* Booking ID filter */}
          <div className={styles.field}>
            <label className={styles.label}>Booking ID</label>
            <input
              type="number"
              value={bookingIdFilter}
              onChange={(e) => setBookingIdFilter(e.target.value)}
              placeholder="Exact ID"
              className={`${styles.input} ${styles.numberInput}`}
            />
          </div>

          {/* Only with diff */}
          <div className={`${styles.field} ${styles.optionsField}`}>
            <label className={styles.label}>Options</label>
            <div className={styles.checkboxRow}>
              <input
                id="onlyDiff"
                type="checkbox"
                checked={showOnlyWithDiff}
                onChange={(e) => setShowOnlyWithDiff(e.target.checked)}
              />
              <label htmlFor="onlyDiff">Only entries with field changes</label>
            </div>
          </div>

          {/* Clear */}
          <div className={styles.field}>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearchText("");
                setActionFilter("ALL");
                setBookingIdFilter("");
                setShowOnlyWithDiff(false);
                setTimePreset("30d");
                setFromDate("");
                setToDate("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card
        className={styles.tableCard}
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div className={styles.tableHeader}>
          <div>
            <strong>{rows.length}</strong> log entr
            {rows.length === 1 ? "y" : "ies"} shown
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => navigate("/bookings")}
          >
            Back to bookings
          </Button>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.theadRow}>
                <th className={styles.th}>When</th>
                <th className={styles.th}>Booking</th>
                <th className={styles.th}>Action</th>
                <th className={styles.th}>Summary</th>
                <th className={styles.th}>Changes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    No log entries match your filters.
                  </td>
                </tr>
              ) : (
                rows.map(({ log, booking, diffKeys }) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDiff = diffKeys.length > 0;

                  return (
                    <React.Fragment key={log.id}>
                      {/* Main row */}
                      <tr
                        className={`${styles.row} ${
                          isExpanded ? styles.rowExpanded : ""
                        }`}
                      >
                        {/* When */}
                        <td className={styles.td}>
                          <div>{new Date(log.at).toLocaleString("en-PK")}</div>
                          <div className={styles.whenIdMeta}>
                            ID: {log.id.slice(0, 12)}…
                          </div>
                          <div className={styles.whenActorMeta}>
                            By: {log.actor}
                          </div>
                        </td>

                        {/* Booking */}
                        <td className={styles.td}>
                          {booking ? (
                            <>
                              <div
                                className={styles.bookingLink}
                                onClick={() => navigate(`/bookings/${booking.id}`)}
                              >
                                #{booking.id} – {booking.eventTitle}
                              </div>
                              <div className={styles.bookingMeta}>
                                Ref: {booking.bookingRef}
                              </div>
                              {booking.customerName && (
                                <div className={styles.bookingMeta}>
                                  {booking.customerName}
                                </div>
                              )}
                              {booking.isDeleted && (
                                <div className={styles.deletedBadge}>Deleted</div>
                              )}
                            </>
                          ) : (
                            <span className={styles.missingBooking}>
                              Booking not found (may be from older data set)
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className={styles.td}>
                          <LogActionPill action={log.action} />
                        </td>

                        {/* Summary */}
                        <td className={styles.td}>
                          <div>{log.summary}</div>
                        </td>

                        {/* Changes */}
                        <td className={styles.td}>
                          {hasDiff ? (
                            <>
                              <div className={styles.changesMeta}>
                                {diffKeys.length} field
                                {diffKeys.length > 1 ? "s" : ""} changed
                              </div>

                              <div className={styles.tagsRow}>
                                {diffKeys.slice(0, 4).map((field) => (
                                  <span key={field} className={styles.fieldTag}>
                                    {humanizeFieldName(field)}
                                  </span>
                                ))}
                                {diffKeys.length > 4 && (
                                  <span
                                    className={`${styles.fieldTag} ${styles.fieldTagMore}`}
                                  >
                                    +{diffKeys.length - 4} more
                                  </span>
                                )}
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  setExpandedLogId(isExpanded ? null : log.id)
                                }
                              >
                                {isExpanded ? "Hide field changes" : "View field changes"}
                              </Button>
                            </>
                          ) : (
                            <span className={styles.noDiff}>
                              No field-level diff recorded for this entry.
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Diff detail row */}
                      {isExpanded && hasDiff && (
                        <tr className={styles.diffRow}>
                          <td colSpan={5} className={styles.diffCell}>
                            <div className={styles.diffLabel}>Field-level changes</div>

                            <div className={styles.diffGrid}>
                              <div className={styles.diffHeaderCell}>Field</div>
                              <div className={styles.diffHeaderCell}>Before</div>
                              <div className={styles.diffHeaderCell}>After</div>

                              {diffKeys.map((field) => {
                                const change = log.diff?.[field];
                                const beforeText = truncateValue(
                                  formatValue(change?.before)
                                );
                                const afterText = truncateValue(
                                  formatValue(change?.after)
                                );
                                const changed = beforeText !== afterText;

                                return (
                                  <React.Fragment key={field}>
                                    <div className={styles.diffFieldName}>
                                      {humanizeFieldName(field)}
                                    </div>

                                    <div className={styles.diffBefore}>{beforeText}</div>

                                    <div
                                      className={`${styles.diffAfter} ${
                                        changed
                                          ? styles.diffAfterChanged
                                          : styles.diffAfterSame
                                      }`}
                                    >
                                      {afterText}
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};

// ---------- helpers ----------

function humanizeFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value === "" ? "“” (empty)" : value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function truncateValue(value: string, maxLength = 120): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1) + "…";
}

export default AuditLogPage;
