// src/pages/BookingDetailPage/BookingDetailPage.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBookingStore } from "../../state/BookingStore";
import {
  type MockBooking,
  type HallAllocation,
  type Slot,
} from "../../mock/bookingsMockApi";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { StatusPill } from "../../ui/StatusPill";
import { LogActionPill } from "../../ui/LogActionPill";
import { parseEventDateLabel, toISODateString } from "../../utils/dateUtils";
import { formatSlotHuman } from "../../utils/slotUtils";
import { useAlertStore, alertTypeLabel } from "../../state/AlertStore";
import styles from "./BookingDetailPage.module.css";

function normalizeText(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function parseLocalISODateToLabel(iso: string): string | null {
  // Avoid timezone/off-by-one issues from new Date("YYYY-MM-DD")
  const parts = iso.split("-");
  if (parts.length !== 3) return null;

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const local = new Date(y, m - 1, d);
  if (Number.isNaN(local.getTime())) return null;

  return local.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseOptionalNonNegativeInt(input: string): number | null {
  const raw = input.trim();
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  return Math.floor(n);
}

function formatPKRCompact(amount: number): string {
  try {
    return amount.toLocaleString("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    });
  } catch {
    return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
  }
}

function severityKeyFromUnknown(sev: unknown): "critical" | "warning" | "info" {
  const s = String(sev ?? "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "warning") return "warning";
  return "info";
}

function severityRank(sev: unknown): number {
  const k = severityKeyFromUnknown(sev);
  switch (k) {
    case "critical":
      return 3;
    case "warning":
      return 2;
    default:
      return 1;
  }
}

const BookingDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    allBookings,
    updateBookingHallSplit,
    updateBooking,
    deleteBooking,
    restoreBooking,
    getLogsForBooking,
  } = useBookingStore();

  const { getAlertsForBooking, resolveAlert, dismissAlert } = useAlertStore();

  const bookingId = id ? Number(id) : NaN;

  const booking: MockBooking | undefined = useMemo(() => {
    if (Number.isNaN(bookingId)) return undefined;
    return allBookings.find((b) => b.id === bookingId);
  }, [bookingId, allBookings]);

  // Local editable state for hall splits
  const [hallAInput, setHallAInput] = useState<string>("");
  const [hallBInput, setHallBInput] = useState<string>("");

  // Global "edit booking" state
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields for core booking data
  const [editEventTitle, setEditEventTitle] = useState("");
  const [editNameplateText, setEditNameplateText] = useState("");
  const [editDateISO, setEditDateISO] = useState("");
  const [editSlot, setEditSlot] = useState<MockBooking["slot"]>("LUNCH");
  const [editTotalGuests, setEditTotalGuests] = useState<string>("");

  const [editStatus, setEditStatus] =
    useState<MockBooking["status"]>("INQUIRY");

  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerWhatsapp, setEditCustomerWhatsapp] = useState("");
  const [editFamilyOrCompanyName, setEditFamilyOrCompanyName] =
    useState("");
  const [editCustomerAddress, setEditCustomerAddress] = useState("");
  const [editCustomerReference, setEditCustomerReference] = useState("");
  const [editInternalNote, setEditInternalNote] = useState("");
  const [editHasPerformance, setEditHasPerformance] =
    useState<boolean>(false);
  const [editPerformanceDescription, setEditPerformanceDescription] =
    useState("");

  // Delete / restore confirmation state
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteInput, setDeleteInput] = useState("");

  // Keep inputs in sync when booking changes
  useEffect(() => {
    if (!booking) return;

    setHallAInput(
      booking.hallAGuests != null ? String(booking.hallAGuests) : ""
    );
    setHallBInput(
      booking.hallBGuests != null ? String(booking.hallBGuests) : ""
    );

    setEditEventTitle(booking.eventTitle || "");
    setEditNameplateText(booking.nameplateText ?? "");

    const parsedDate = parseEventDateLabel(booking.eventDateLabel);
    setEditDateISO(toISODateString(parsedDate));
    setEditSlot(booking.slot);
    setEditTotalGuests(String(booking.totalGuests ?? 0));
    setEditStatus(booking.status);

    setEditCustomerName(booking.customerName || "");
    setEditCustomerPhone(booking.customerPhone || "");
    setEditCustomerWhatsapp(booking.customerWhatsapp || "");
    setEditFamilyOrCompanyName(booking.familyOrCompanyName || "");
    setEditCustomerAddress(booking.customerAddress || "");
    setEditCustomerReference(booking.customerReference || "");
    setEditInternalNote(booking.internalNote || "");
    setEditHasPerformance(Boolean(booking.hasPerformance));
    setEditPerformanceDescription(booking.performanceDescription ?? "");

    setIsEditing(false);
    setDeleteMode(false);
    setDeleteReason("");
    setDeleteInput("");
  }, [booking]);

  if (!booking) {
    return (
      <main className={styles.page}>
        <h1>Booking not found</h1>
        <p className={styles.subtitleMuted}>
          We couldn’t find a booking with this ID in the current data set.
        </p>
        <div className={styles.topActionsRow}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/bookings")}
          >
            Back to all bookings
          </Button>
        </div>
      </main>
    );
  }

  const isDeleted = booking.isDeleted === true;
  const slotLabel = formatSlotHuman(booking.slot);

  const hallAStats = getHallStatsForBooking(booking, "A");
  const hallBStats = getHallStatsForBooking(booking, "B");

  const totalGuests = booking.totalGuests ?? 0;
  const splitTotal =
    (hallAStats.guestsHere ?? 0) + (hallBStats.guestsHere ?? 0);

  const hallsUsedText = buildHallsUsedText(
    totalGuests,
    hallAStats.guestsHere,
    hallBStats.guestsHere
  );
  const guestSplitText = buildGuestSplitText(
    hallAStats.guestsHere,
    hallBStats.guestsHere
  );

  const hasHallA = hallAStats.guestsHere > 0;
  const hasHallB = hallBStats.guestsHere > 0;

  const splitMismatchWarning =
    totalGuests > 0 && splitTotal > 0 && splitTotal !== totalGuests;

  const splitMissingWarning = totalGuests > 0 && splitTotal === 0;

  const logs = getLogsForBooking(booking.id);
  const recentLogs = logs.slice(-5).reverse();

  const confirmDeleteDisabled = deleteInput.trim() !== "DELETE";

  // Alerts integration (optional → included)
  const bookingAlerts = getAlertsForBooking(booking.id)
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  // Dirty-state indicator (optional → included)
  const baseDateISO = toISODateString(
    parseEventDateLabel(booking.eventDateLabel)
  );
  const isDirty =
    isEditing &&
    !isDeleted &&
    (normalizeText(editEventTitle) !== normalizeText(booking.eventTitle) ||
      normalizeText(editNameplateText) !==
        normalizeText(booking.nameplateText ?? "") ||
      normalizeText(editDateISO) !== normalizeText(baseDateISO) ||
      editSlot !== booking.slot ||
      (Number(editTotalGuests) || 0) !== (booking.totalGuests ?? 0) ||
      editStatus !== booking.status ||
      normalizeText(editCustomerName) !== normalizeText(booking.customerName) ||
      normalizeText(editCustomerPhone) !==
        normalizeText(booking.customerPhone) ||
      normalizeText(editCustomerWhatsapp) !==
        normalizeText(booking.customerWhatsapp) ||
      normalizeText(editFamilyOrCompanyName) !==
        normalizeText(booking.familyOrCompanyName) ||
      normalizeText(editCustomerAddress) !==
        normalizeText(booking.customerAddress) ||
      normalizeText(editCustomerReference) !==
        normalizeText(booking.customerReference) ||
      (editInternalNote ?? "") !== (booking.internalNote ?? "") ||
      Boolean(editHasPerformance) !== Boolean(booking.hasPerformance) ||
      normalizeText(editPerformanceDescription) !==
        normalizeText(booking.performanceDescription ?? ""));

  const canSaveEdits = !isDeleted && isEditing;

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Booking Detail – Luxurium</h1>
          <p className={styles.subtitleMuted}>
            Full view of this event’s booking, hall allocation, customer details
            and advance summary. All values are exactly as entered – the system
            never auto-adjusts guest counts for you.
          </p>

          {isDeleted && (
            <div className={styles.deletedBanner}>
              This booking is deleted and hidden from calendar/dashboard. You can
              restore it from the Danger zone on the right.
            </div>
          )}

          <div className={styles.metaRow}>
            <StatusPill
              status={booking.status}
              size="md"
              style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
            />
            <span>Booking ref: {booking.bookingRef}</span>
            <span className={styles.metaDot}>·</span>
            <span>
              {booking.eventDateLabel} · {slotLabel}
            </span>

            {bookingAlerts.length > 0 && (
              <>
                <span className={styles.metaDot}>·</span>
                <button
                  type="button"
                  className={styles.dirtyBadge}
                  onClick={() =>
                    navigate(
                      `/alerts?bookingId=${booking.id}&status=ACTIVE`
                    )
                  }
                  title="Open alerts filtered to this booking"
                >
                  {bookingAlerts.length} active alert
                  {bookingAlerts.length === 1 ? "" : "s"}
                </button>
              </>
            )}

            {isDirty && (
              <>
                <span className={styles.metaDot}>·</span>
                <span className={styles.dirtyBadge}>Unsaved changes</span>
              </>
            )}
          </div>
        </div>

        <div className={styles.headerRight}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/bookings")}
          >
            Back to all bookings
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const d = parseEventDateLabel(booking.eventDateLabel);
              const iso = toISODateString(d);
              navigate(
                `/calendar?date=${iso}&slot=${booking.slot}&bookingId=${booking.id}`
              );
            }}
          >
            Open in calendar
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(`/alerts?bookingId=${booking.id}&status=ACTIVE`)
            }
          >
            Open alerts
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
          >
            Print summary
          </Button>
        </div>
      </header>

      {/* Two-column layout */}
      <section className={styles.twoCol}>
        {/* LEFT COLUMN */}
        <div className={styles.colStack}>
          {/* Event summary */}
          <Card>
            <h2 className={styles.cardTitle}>Event summary</h2>

            <LabelValueRow label="Event" value={booking.eventTitle} />
            <LabelValueRow
              label="Date & slot"
              value={`${booking.eventDateLabel} · ${slotLabel}`}
            />
            <LabelValueRow label="Halls used" value={hallsUsedText} />
            <LabelValueRow
              label="Guests (total)"
              value={`${(booking.totalGuests ?? 0).toLocaleString(
                "en-PK"
              )} guests`}
            />

            {(splitMismatchWarning || splitMissingWarning) && (
              <div className={styles.warnBox}>
                {splitMissingWarning ? (
                  <>
                    <strong>Hall split not set:</strong> total guests is{" "}
                    {(totalGuests ?? 0).toLocaleString("en-PK")}, but Hall A/B
                    split is not entered yet. The system won’t auto-adjust —
                    please set Hall A/Hall B guests if you want split-based
                    reporting.
                  </>
                ) : (
                  <>
                    <strong>Guest split mismatch:</strong> total guests is{" "}
                    {totalGuests.toLocaleString("en-PK")}, but Hall A + Hall B
                    equals {splitTotal.toLocaleString("en-PK")}. The system won’t
                    auto-adjust — this is just a warning.
                  </>
                )}
              </div>
            )}

            {guestSplitText && (
              <LabelValueRow
                label="Guest split by hall"
                value={guestSplitText}
              />
            )}

            {booking.nameplateText && (
              <LabelValueRow
                label="Nameplate (signage)"
                value={booking.nameplateText}
              />
            )}

            {booking.hasPerformance && (
              <LabelValueRow
                label="Performance"
                value={
                  booking.performanceDescription
                    ? `Yes – ${booking.performanceDescription}`
                    : "Yes – musical / stage performance"
                }
              />
            )}

            {booking.internalNote && (
              <div className={styles.internalNote}>
                <div className={styles.internalNoteLabel}>Internal note</div>
                <div className={styles.internalNoteBody}>
                  {booking.internalNote}
                </div>
              </div>
            )}
          </Card>

          {/* Editable core fields */}
          <Card>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>Edit booking</h2>

              <div className={styles.cardHeaderActions}>
                {!isDeleted && (
                  <>
                    {!isEditing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit fields
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (!booking) return;

                            const parsedDate = parseEventDateLabel(
                              booking.eventDateLabel
                            );
                            setEditEventTitle(booking.eventTitle || "");
                            setEditNameplateText(booking.nameplateText ?? "");
                            setEditDateISO(toISODateString(parsedDate));
                            setEditSlot(booking.slot);
                            setEditTotalGuests(String(booking.totalGuests ?? 0));
                            setEditStatus(booking.status);

                            setEditCustomerName(booking.customerName || "");
                            setEditCustomerPhone(booking.customerPhone || "");
                            setEditCustomerWhatsapp(booking.customerWhatsapp || "");
                            setEditFamilyOrCompanyName(
                              booking.familyOrCompanyName || ""
                            );
                            setEditCustomerAddress(booking.customerAddress || "");
                            setEditCustomerReference(
                              booking.customerReference || ""
                            );
                            setEditInternalNote(booking.internalNote || "");
                            setEditHasPerformance(Boolean(booking.hasPerformance));
                            setEditPerformanceDescription(
                              booking.performanceDescription ?? ""
                            );

                            setIsEditing(false);
                          }}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={!canSaveEdits}
                          onClick={() => {
                            if (!booking) return;

                            const numericGuests = Number(editTotalGuests) || 0;

                            const dateLabelFromISO = editDateISO
                              ? parseLocalISODateToLabel(editDateISO)
                              : null;

                            const fallbackDateLabel = booking.eventDateLabel;

                            updateBooking(booking.id, {
                              eventTitle:
                                normalizeText(editEventTitle) || "Untitled Event",
                              nameplateText:
                                normalizeText(editNameplateText) || undefined,
                              eventDateLabel:
                                dateLabelFromISO ?? fallbackDateLabel,
                              slot: editSlot,
                              totalGuests: numericGuests,
                              status: editStatus,
                              customerName:
                                normalizeText(editCustomerName) ||
                                "Unnamed Customer",
                              customerPhone: normalizeText(editCustomerPhone),
                              customerWhatsapp:
                                normalizeText(editCustomerWhatsapp),
                              familyOrCompanyName:
                                normalizeText(editFamilyOrCompanyName),
                              customerAddress:
                                normalizeText(editCustomerAddress),
                              customerReference:
                                normalizeText(editCustomerReference),
                              internalNote: editInternalNote,
                              hasPerformance: editHasPerformance,
                              performanceDescription: editHasPerformance
                                ? normalizeText(editPerformanceDescription) ||
                                  undefined
                                : undefined,
                            });

                            setIsEditing(false);
                          }}
                        >
                          Save changes
                        </Button>
                      </>
                    )}
                  </>
                )}

                {isDeleted && (
                  <span className={styles.inlineMuted}>
                    This booking is deleted. Restore it before editing.
                  </span>
                )}
              </div>
            </div>

            {isDeleted && booking.deletedAt && (
              <p className={styles.subtitleMuted}>
                Deleted at{" "}
                {new Date(booking.deletedAt).toLocaleString("en-PK")}
                {booking.deletedReason
                  ? ` – reason: ${booking.deletedReason}`
                  : ""}
              </p>
            )}

            {isEditing && !isDeleted && (
              <div className={styles.editGrid}>
                {/* Left column */}
                <div className={styles.editCol}>
                  <EditableField
                    label="Event title"
                    value={editEventTitle}
                    onChange={setEditEventTitle}
                  />
                  <EditableField
                    label="Nameplate text"
                    value={editNameplateText}
                    onChange={setEditNameplateText}
                  />

                  <div>
                    <div className={styles.fieldLabel}>Event date</div>
                    <input
                      type="date"
                      value={editDateISO}
                      onChange={(e) => setEditDateISO(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <div className={styles.fieldLabel}>Slot</div>
                    <select
                      value={editSlot}
                      onChange={(e) =>
                        setEditSlot(e.target.value as MockBooking["slot"])
                      }
                      className={styles.input}
                    >
                      <option value="LUNCH">Lunch (1–5 pm)</option>
                      <option value="DINNER">Dinner (7–10 pm)</option>
                    </select>
                  </div>

                  <div>
                    <div className={styles.fieldLabel}>Total guests</div>
                    <input
                      type="number"
                      min={0}
                      value={editTotalGuests}
                      onChange={(e) => setEditTotalGuests(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div>
                    <div className={styles.fieldLabel}>Status</div>
                    <select
                      value={editStatus}
                      onChange={(e) =>
                        setEditStatus(e.target.value as MockBooking["status"])
                      }
                      className={styles.input}
                    >
                      <option value="INQUIRY">Inquiry</option>
                      <option value="TENTATIVE">Tentative</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Right column */}
                <div className={styles.editCol}>
                  <EditableField
                    label="Customer name"
                    value={editCustomerName}
                    onChange={setEditCustomerName}
                  />
                  <EditableField
                    label="Customer phone"
                    value={editCustomerPhone}
                    onChange={setEditCustomerPhone}
                  />
                  <EditableField
                    label="WhatsApp"
                    value={editCustomerWhatsapp}
                    onChange={setEditCustomerWhatsapp}
                  />
                  <EditableField
                    label="Family / company"
                    value={editFamilyOrCompanyName}
                    onChange={setEditFamilyOrCompanyName}
                  />
                  <EditableField
                    label="Address"
                    value={editCustomerAddress}
                    onChange={setEditCustomerAddress}
                  />
                  <EditableField
                    label="Reference / care of"
                    value={editCustomerReference}
                    onChange={setEditCustomerReference}
                  />
                </div>

                {/* Full-width fields */}
                <div className={styles.fullWidth}>
                  <div className={styles.fieldLabel}>Internal note</div>
                  <textarea
                    value={editInternalNote}
                    onChange={(e) => setEditInternalNote(e.target.value)}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.fullWidth}>
                  <div className={styles.checkboxRow}>
                    <input
                      id="hasPerformance"
                      type="checkbox"
                      checked={editHasPerformance}
                      onChange={(e) => setEditHasPerformance(e.target.checked)}
                    />
                    <label
                      htmlFor="hasPerformance"
                      className={styles.fieldLabelNoMargin}
                    >
                      Event has performance / stage show
                    </label>
                  </div>

                  {editHasPerformance && (
                    <div className={styles.performanceBlock}>
                      <div className={styles.fieldLabel}>Performance details</div>
                      <input
                        type="text"
                        value={editPerformanceDescription}
                        onChange={(e) =>
                          setEditPerformanceDescription(e.target.value)
                        }
                        placeholder="e.g. Live band, DJ, Qawwali"
                        className={styles.input}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isEditing && !isDeleted && (
              <p className={styles.subtitleMuted}>
                Use “Edit fields” to adjust title, date, slot, guests, customer
                details and performance info. Changes appear immediately on the
                calendar and dashboard.
              </p>
            )}
          </Card>

          {/* Hall Allocation & Capacity */}
          <Card>
            <div className={styles.cardHeaderRow}>
              <div>
                <h2 className={styles.cardTitle}>Hall allocation & capacity</h2>
                <p className={styles.subtitleMuted}>
                  How this booking uses Hall A and Hall B. You stay in control –
                  the system won’t change these numbers automatically.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setHallAInput(
                    booking.hallAGuests != null ? String(booking.hallAGuests) : ""
                  );
                  setHallBInput(
                    booking.hallBGuests != null ? String(booking.hallBGuests) : ""
                  );
                }}
              >
                Reset hall fields
              </Button>
            </div>

            {/* Booking-level allocation summary */}
            <div className={styles.hallSummary}>
              <div>
                <strong>Total guests:</strong>{" "}
                {(booking.totalGuests ?? 0).toLocaleString("en-PK")}
              </div>

              {guestSplitText && (
                <div className={styles.hallSummaryMuted}>
                  <strong>Split:</strong> {guestSplitText}
                </div>
              )}

              <div className={styles.hallSummaryMuted}>
                <strong>Halls used:</strong> {hallsUsedText}
              </div>

              {splitMismatchWarning && (
                <div className={styles.hallSummaryWarn}>
                  ⚠ Split mismatch: Hall A + Hall B ={" "}
                  {splitTotal.toLocaleString("en-PK")} (total is{" "}
                  {totalGuests.toLocaleString("en-PK")})
                </div>
              )}

              {splitMissingWarning && (
                <div className={styles.hallSummaryWarn}>
                  ℹ Hall split not set yet — enter Hall A/Hall B guests if you
                  want split-based planning & alerts.
                </div>
              )}

              {booking.hasPerformance && (
                <div className={styles.hallSummaryPerf}>
                  🎵 Performance in this booking – check hall-level usage and
                  noise implications.
                </div>
              )}
            </div>

            {/* Editable guest split */}
            <div className={styles.hallEditBox}>
              <div className={styles.hallEditHeader}>
                Edit hall guest counts
              </div>

              <div className={styles.hallEditGrid}>
                <div>
                  <div className={styles.hallFieldTitle}>Hall A guests</div>
                  <input
                    type="number"
                    min={0}
                    value={hallAInput}
                    onChange={(e) => setHallAInput(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div>
                  <div className={styles.hallFieldTitle}>Hall B guests</div>
                  <input
                    type="number"
                    min={0}
                    value={hallBInput}
                    onChange={(e) => setHallBInput(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.hallEditFooter}>
                <div className={styles.hallEditHint}>
                  Expected total: {totalGuests.toLocaleString("en-PK")}. We won’t
                  auto-adjust; this is your decision.
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const a = parseOptionalNonNegativeInt(hallAInput);
                    const b = parseOptionalNonNegativeInt(hallBInput);
                    updateBookingHallSplit(booking.id, a, b);
                  }}
                >
                  Save hall allocation
                </Button>
              </div>
            </div>

            {/* Per-hall cards */}
            <div className={styles.miniCardsGrid}>
              <HallAllocationMiniCard
                hallLabel="Hall A"
                stats={hallAStats}
                isUsed={hasHallA}
              />
              <HallAllocationMiniCard
                hallLabel="Hall B"
                stats={hallBStats}
                isUsed={hasHallB}
              />
            </div>

            {/* Overrides note */}
            {((hallAStats.isOverCapacity && hasHallA) ||
              (hallBStats.isOverCapacity && hasHallB)) && (
              <div className={styles.capacityOverrideBanner}>
                <strong>Capacity override:</strong>{" "}
                {hallAStats.isOverCapacity && hasHallA && (
                  <>
                    Hall A has {hallAStats.guestsHere} / {hallAStats.capacity}.{" "}
                  </>
                )}
                {hallBStats.isOverCapacity && hasHallB && (
                  <>
                    Hall B has {hallBStats.guestsHere} / {hallBStats.capacity}.{" "}
                  </>
                )}
                Please verify that this override is intentional and safe.
              </div>
            )}
          </Card>

          {/* Customer details */}
          <Card>
            <h2 className={styles.cardTitle}>Customer details</h2>

            <LabelValueRow label="Primary contact" value={booking.customerName} />
            <LabelValueRow label="Family / company" value={booking.familyOrCompanyName} />
            <LabelValueRow label="Phone" value={booking.customerPhone} />
            <LabelValueRow label="WhatsApp" value={booking.customerWhatsapp} />
            <LabelValueRow label="Address" value={booking.customerAddress} />
            <LabelValueRow label="Reference / care of" value={booking.customerReference} />
          </Card>

          {/* Menu & Catering (placeholder) */}
          <Card>
            <h2 className={styles.cardTitle}>Menu & Catering</h2>
            <p className={styles.subtitleMuted}>
              The Menu module will own all menu and catering details. This booking will simply link to a catering order and display a short summary here.
            </p>

            <div className={styles.menuPlaceholderBox}>
              No menu is linked yet. Once the Menu module is built, you’ll be able to:
              <ul className={styles.menuPlaceholderList}>
                <li>Attach a catering order to this booking.</li>
                <li>Show a summary (package name, per-head, total amount).</li>
                <li>Open the full menu editor from here.</li>
              </ul>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.colStack}>
          {/* Active alerts (optional → included) */}
          <Card>
            <div className={styles.cardHeaderRow}>
              <div>
                <h2 className={styles.cardTitle}>Active alerts</h2>
                <p className={styles.subtitleMuted}>
                  Operational warnings for this booking. You can resolve/dismiss,
                  but the system won’t auto-change any booking numbers.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  navigate(`/alerts?bookingId=${booking.id}&status=ACTIVE`)
                }
              >
                Open Alerts
              </Button>
            </div>

            {bookingAlerts.length === 0 ? (
              <p className={styles.subtitleMuted}>
                No active alerts for this booking.
              </p>
            ) : (
              <div className={styles.alertList}>
                {bookingAlerts.map((a) => {
                  const sevKey = severityKeyFromUnknown(a.severity);
                  const typeLbl = alertTypeLabel(a.type);

                  return (
                    <div key={a.id} className={styles.alertRow}>
                      <div className={styles.alertRowTop}>
                        <div className={styles.alertLeft}>
                          <span className={styles.alertType}>{typeLbl}</span>
                          <span className={styles.alertDot}>·</span>
                          <span className={styles.alertId}>#{a.id}</span>
                        </div>

                        <span className={styles.alertPill} data-severity={sevKey}>
                          {sevKey.toUpperCase()}
                        </span>
                      </div>

                      <div className={styles.alertBody}>
                        <strong>{a.title}</strong>
                        <div>{a.message}</div>
                        {a.sub ? <div className={styles.subtitleMuted}>{a.sub}</div> : null}
                      </div>

                      <div className={styles.alertActions}>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            navigate(
                              `/alerts?bookingId=${booking.id}&status=ACTIVE&type=${encodeURIComponent(
                                a.type
                              )}`
                            )
                          }
                        >
                          View in Alerts
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const note =
                              window.prompt("Resolution note (optional):") ?? "";
                            resolveAlert(a.id, note.trim() || undefined);
                          }}
                        >
                          Resolve
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const note =
                              window.prompt("Dismiss note (optional):") ?? "";
                            dismissAlert(a.id, note.trim() || undefined);
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Booking meta + tags */}
          <Card>
            <h2 className={styles.cardTitle}>Status & tags</h2>
            <LabelValueRow
              label="Status"
              value={<StatusPill status={booking.status} />}
            />
            <LabelValueRow label="Slot" value={slotLabel} />
            <LabelValueRow label="Booking ref" value={booking.bookingRef} />

            <div className={styles.quickCopyRow}>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(booking.bookingRef));
                    alert("Copied booking ref to clipboard.");
                  } catch {
                    alert("Could not copy. Your browser may block clipboard access.");
                  }
                }}
              >
                Copy booking ref
              </Button>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(booking.id));
                    alert("Copied booking ID to clipboard.");
                  } catch {
                    alert("Could not copy. Your browser may block clipboard access.");
                  }
                }}
              >
                Copy booking ID
              </Button>
            </div>

            <p className={styles.subtitleMuted}>
              In a real system this card would also show created/updated timestamps, user who last edited, and manual tags.
            </p>
          </Card>

          {/* Advance & Billing summary */}
          <Card>
            <h2 className={styles.cardTitle}>Advance & billing</h2>

            {booking.advance ? (
              <>
                <div className={styles.advanceBlock}>
                  <div>
                    <strong>Amount:</strong>{" "}
                    {formatPKRCompact(booking.advance.amount)}
                  </div>
                  <div className={styles.advanceRow}>
                    <strong>Method:</strong> {booking.advance.method}
                  </div>
                  <div className={styles.advanceRow}>
                    <strong>Destination account:</strong>{" "}
                    {booking.advance.destinationAccount}
                  </div>
                  {booking.advance.reference && (
                    <div className={styles.advanceRow}>
                      <strong>Reference:</strong> {booking.advance.reference}
                    </div>
                  )}
                  {booking.advance.receivedAtLabel && (
                    <div className={styles.advanceRow}>
                      <strong>Received on:</strong>{" "}
                      {booking.advance.receivedAtLabel}
                    </div>
                  )}
                </div>

                <p className={styles.subtitleMuted}>
                  Finance module will later use this data for reports and reconciliation across multiple bank accounts and cash counters.
                </p>
              </>
            ) : (
              <p className={styles.subtitleMuted}>
                No advance is recorded yet for this booking. Once the finance module is built, this section will show advance payments and full billing history.
              </p>
            )}

            <Button
              type="button"
              variant="secondary"
              fullWidth
              className={styles.fullWidthButton}
              onClick={() =>
                alert(
                  "Future: this will open an 'Update Advance' flow, tied to the Finance module."
                )
              }
            >
              Update advance (future)
            </Button>
          </Card>

          {/* Change history */}
          <Card>
            <h2 className={styles.cardTitle}>Change history</h2>

            {recentLogs.length === 0 ? (
              <p className={styles.subtitleMuted}>
                No changes recorded yet for this booking.
              </p>
            ) : (
              <>
                <p className={styles.subtitleMuted}>
                  Showing latest {recentLogs.length} changes for this booking.
                  For the complete system-wide log, open the Audit log.
                </p>

                <ul className={styles.auditList}>
                  {recentLogs.map((log) => {
                    const diffEntries = log.diff ? Object.entries(log.diff) : [];
                    return (
                      <li key={log.id} className={styles.auditItem}>
                        <div className={styles.auditTopRow}>
                          <LogActionPill action={log.action} />
                          <div className={styles.auditAt}>
                            {new Date(log.at).toLocaleString("en-PK")}
                          </div>
                        </div>

                        <div className={styles.auditSummary}>{log.summary}</div>

                        {diffEntries.length > 0 && (
                          <ul className={styles.auditDiffList}>
                            {diffEntries
                              .filter(([field]) => field !== "halls")
                              .map(([field, { before, after }]) => (
                                <li key={field}>
                                  <strong>{formatBookingFieldLabel(field)}:</strong>{" "}
                                  {formatDiffValueForDisplay(field, before)}{" "}
                                  <span className={styles.diffArrow}>→</span>{" "}
                                  {formatDiffValueForDisplay(field, after)}
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className={styles.topMarginSm}
                  onClick={() => navigate(`/audit-log?bookingId=${booking.id}`)}
                >
                  View full audit log for this booking
                </Button>
              </>
            )}
          </Card>

          {/* Quick navigation */}
          <Card>
            <h2 className={styles.cardTitle}>Quick navigation</h2>
            <div className={styles.quickNavStack}>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => navigate("/dashboard")}
              >
                Go to dashboard
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => navigate("/calendar")}
              >
                View month in calendar
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => navigate("/bookings")}
              >
                Back to booking list
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => navigate("/audit-log")}
              >
                Open full audit log
              </Button>
            </div>
          </Card>

          {/* Danger zone – delete / restore */}
          <Card>
            <h2 className={styles.cardTitle}>Danger zone</h2>

            {isDeleted ? (
              <>
                <p className={styles.subtitleMuted}>
                  This booking is currently marked as deleted. It is hidden from
                  normal views but kept in the audit log. You can restore it if
                  this delete was a mistake.
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  className={styles.restoreButton}
                  onClick={() => restoreBooking(booking.id)}
                >
                  Restore booking
                </Button>
              </>
            ) : (
              <>
                {!deleteMode ? (
                  <div className={styles.dangerRow}>
                    <p className={styles.dangerText}>
                      Deleting a booking hides it from calendar, dashboard and
                      lists, but keeps it in the audit log so it can be restored
                      later.
                    </p>

                    <Button
                      type="button"
                      variant="secondary"
                      className={styles.deleteButton}
                      onClick={() => setDeleteMode(true)}
                    >
                      Delete this booking…
                    </Button>
                  </div>
                ) : (
                  <div className={styles.deleteConfirmBox}>
                    <p className={styles.subtitleMuted}>
                      This is a sensitive action. The booking will disappear from
                      normal views but remain in the audit log.
                    </p>

                    <label className={styles.blockLabel}>
                      <span className={styles.fieldLabel}>
                        Reason for deletion (optional)
                      </span>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        className={styles.textareaSmall}
                      />
                    </label>

                    <label className={styles.blockLabel}>
                      <span className={styles.fieldLabel}>
                        Type <strong>DELETE</strong> to confirm
                      </span>
                      <input
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        className={styles.input}
                      />
                    </label>

                    <div className={styles.confirmActions}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setDeleteMode(false);
                          setDeleteReason("");
                          setDeleteInput("");
                        }}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        disabled={confirmDeleteDisabled}
                        className={
                          confirmDeleteDisabled
                            ? styles.confirmDeleteDisabled
                            : styles.confirmDelete
                        }
                        onClick={() => {
                          if (confirmDeleteDisabled) return;
                          deleteBooking(
                            booking.id,
                            deleteReason.trim() || undefined
                          );
                          setDeleteMode(false);
                        }}
                      >
                        Confirm delete
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </section>
    </main>
  );
};

// ---------- Small helper components & functions ----------

interface LabelValueRowProps {
  label: string;
  value?: React.ReactNode;
}

const LabelValueRow: React.FC<LabelValueRowProps> = ({ label, value }) => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }

  return (
    <div className={styles.labelRow}>
      <div className={styles.labelKey}>{label}</div>
      <div className={styles.labelValue}>{value}</div>
    </div>
  );
};

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, onChange }) => (
  <div>
    <div className={styles.fieldLabel}>{label}</div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={styles.input}
    />
  </div>
);

interface HallStats {
  guestsHere: number;
  capacity: number;
  otherGuests: number;
  otherLabel: string;
  remaining: number;
  isOverCapacity: boolean;
}

interface HallAllocationMiniCardProps {
  hallLabel: string;
  stats: HallStats;
  isUsed: boolean;
}

const HallAllocationMiniCard: React.FC<HallAllocationMiniCardProps> = ({
  hallLabel,
  stats,
  isUsed,
}) => {
  const capacityPercent =
    stats.capacity > 0
      ? Math.min((stats.guestsHere / stats.capacity) * 100, 130)
      : 0;

  const isOver = stats.isOverCapacity;

  return (
    <div
      className={[
        styles.hallMiniCard,
        !isUsed ? styles.hallMiniUnused : "",
        isOver ? styles.hallMiniOver : "",
      ].join(" ")}
    >
      <div className={styles.hallMiniTop}>
        <div className={styles.hallMiniTitle}>{hallLabel}</div>
        <div className={styles.hallMiniCap}>
          {stats.guestsHere} / {stats.capacity}
        </div>
      </div>

      <div className={styles.capacityBar}>
        <div
          className={isOver ? styles.capacityFillOver : styles.capacityFillOk}
          style={{ width: `${capacityPercent}%` }}
        />
      </div>

      <div className={styles.hallMiniLine}>
        This booking: <strong>{stats.guestsHere}</strong> guests here.
      </div>

      <div className={styles.hallMiniLineMuted}>
        Other halls (this booking):{" "}
        {stats.otherGuests > 0 ? (
          <strong>{stats.otherLabel}</strong>
        ) : (
          "no guests in other hall"
        )}
      </div>

      <div className={styles.hallMiniBottomLine}>
        {isOver ? (
          <span className={styles.overText}>
            Over capacity by {Math.max(stats.guestsHere - stats.capacity, 0)} guests
          </span>
        ) : (
          <span className={styles.okText}>
            Within capacity – {Math.max(stats.remaining, 0)} seats free
          </span>
        )}
      </div>
    </div>
  );
};

function buildHallsUsedText(totalGuests: number, hallA: number, hallB: number): string {
  if (hallA > 0 && hallB > 0) return "Hall A & Hall B";
  if (hallA > 0 && hallB === 0) return "Hall A only";
  if (hallB > 0 && hallA === 0) return "Hall B only";
  if (totalGuests > 0) return "Not allocated yet";
  return "No guests recorded";
}

function buildGuestSplitText(hallA: number, hallB: number): string {
  const a = Math.max(0, hallA || 0);
  const b = Math.max(0, hallB || 0);
  if (a <= 0 && b <= 0) return "";
  if (a > 0 && b > 0) {
    return `${a.toLocaleString("en-PK")} in Hall A / ${b.toLocaleString("en-PK")} in Hall B`;
  }
  if (a > 0) return `${a.toLocaleString("en-PK")} in Hall A`;
  return `${b.toLocaleString("en-PK")} in Hall B`;
}

function getHallStatsForBooking(b: MockBooking, hallCode: "A" | "B"): HallStats {
  const hallAllocA: HallAllocation | undefined = b.halls
    ? b.halls.find((h: HallAllocation) => h.hallCode === "A")
    : undefined;
  const hallAllocB: HallAllocation | undefined = b.halls
    ? b.halls.find((h: HallAllocation) => h.hallCode === "B")
    : undefined;

  const guestsA = b.hallAGuests ?? (hallAllocA ? hallAllocA.guestsHere : 0);
  const guestsB = b.hallBGuests ?? (hallAllocB ? hallAllocB.guestsHere : 0);

  const hallAlloc = hallCode === "A" ? hallAllocA : hallAllocB;

  const guestsHere = hallCode === "A" ? guestsA : guestsB;
  const capacity = hallAlloc?.capacity ?? 1000;

  const otherGuests = hallCode === "A" ? guestsB : guestsA;
  const otherLabel =
    hallCode === "A" ? `${otherGuests} in Hall B` : `${otherGuests} in Hall A`;

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

// --- log UI helpers & diff formatting ---

function formatBookingFieldLabel(fieldKey: string): string {
  switch (fieldKey) {
    case "eventTitle":
      return "Event title";
    case "nameplateText":
      return "Nameplate text";
    case "eventDateLabel":
      return "Event date";
    case "slot":
      return "Slot";
    case "totalGuests":
      return "Total guests";
    case "status":
      return "Status";
    case "customerName":
      return "Customer name";
    case "customerPhone":
      return "Customer phone";
    case "customerWhatsapp":
      return "WhatsApp";
    case "familyOrCompanyName":
      return "Family / company";
    case "customerAddress":
      return "Address";
    case "customerReference":
      return "Reference / care of";
    case "internalNote":
      return "Internal note";
    case "hasPerformance":
      return "Has performance";
    case "performanceDescription":
      return "Performance details";
    case "hallAGuests":
      return "Hall A guests";
    case "hallBGuests":
      return "Hall B guests";
    case "advance":
      return "Advance / billing";
    case "isDeleted":
      return "Deleted flag";
    case "deletedAt":
      return "Deleted at";
    case "deletedBy":
      return "Deleted by";
    case "deletedReason":
      return "Deletion reason";
    default:
      return fieldKey;
  }
}

function formatDiffValueForDisplay(fieldKey: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (fieldKey === "slot") return formatSlotHuman(value as Slot);
    return String(value);
  }

  if (fieldKey === "advance" && typeof value === "object") {
    const adv = value as any;
    const parts: string[] = [];
    if (adv.amount != null) parts.push(String(adv.amount));
    if (adv.method) parts.push(String(adv.method));
    if (adv.destinationAccount) parts.push(String(adv.destinationAccount));
    return parts.length > 0 ? parts.join(" / ") : "[advance updated]";
  }

  return "[complex value]";
}

export default BookingDetailPage;
