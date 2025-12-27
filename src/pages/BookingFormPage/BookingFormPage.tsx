import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBookingStore } from "../../state/BookingStore";
import { useAlertStore } from "../../state/AlertStore";
import type { MockBooking, Slot } from "../../mock/bookingsMockApi";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { formatEventDateLabel } from "../../utils/dateUtils";
import { formatSlotHuman } from "../../utils/slotUtils";
import styles from "./BookingFormPage.module.css";

type HallUsageMode = "A_ONLY" | "B_ONLY" | "BOTH";

interface NewBookingFormState {
  eventTitle: string;
  nameplateText: string;
  date: string;
  slot: Slot;
  totalGuests: number | "";

  customerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  familyOrCompanyName: string;
  customerAddress: string;
  customerReference: string; // reference / care of

  internalNote: string;

  // Hall & Capacity
  hallUsageMode: HallUsageMode;
  hallAGuests: number | "";
  hallBGuests: number | "";
  hasPerformance: boolean;
  performanceDescription: string;
}

const HALL_CAPACITY_A = 1000;
const HALL_CAPACITY_B = 1000;
const DRAFT_STORAGE_KEY = "luxurium.bookingForm.draft.v1";

const DEFAULT_FORM: NewBookingFormState = {
  eventTitle: "",
  nameplateText: "",
  date: "",
  slot: "LUNCH",
  totalGuests: "",

  customerName: "",
  customerPhone: "",
  customerWhatsapp: "",
  familyOrCompanyName: "",
  customerAddress: "",
  customerReference: "",

  internalNote: "",

  hallUsageMode: "A_ONLY",
  hallAGuests: "",
  hallBGuests: "",
  hasPerformance: false,
  performanceDescription: "",
};

const BookingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookings, addBooking } = useBookingStore();
  const { alerts } = useAlertStore();

  const [form, setForm] = useState<NewBookingFormState>(DEFAULT_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const hasHydratedDraftRef = useRef(false);
  const hasAppliedDuplicateRef = useRef(false);

  // ---- Initial hydration (draft + query params) ----
  useEffect(() => {
    if (!hasHydratedDraftRef.current) {
      try {
        const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as NewBookingFormState;
          setForm({ ...DEFAULT_FORM, ...parsed });
        }
      } catch {
        // ignore malformed draft
      } finally {
        hasHydratedDraftRef.current = true;
      }
    }

    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    const slotParam = params.get("slot");

    setForm((prev) => {
      const nextSlot =
        slotParam === "DINNER"
          ? "DINNER"
          : slotParam === "LUNCH"
          ? "LUNCH"
          : prev.slot;

      return {
        ...prev,
        date: prev.date || dateParam || "",
        slot: nextSlot || "LUNCH",
      };
    });
  }, [location.search]);

  // ---- Duplicate prefill (location.state.duplicateFromId) ----
  useEffect(() => {
    const state = location.state as { duplicateFromId?: number } | null;
    if (!state?.duplicateFromId || hasAppliedDuplicateRef.current) return;

    const source = bookings.find((b) => b.id === state.duplicateFromId);
    if (source) {
      setForm((prev) =>
        buildFormFromBooking(
          source,
          prev.date,
          // Prefer source slot unless user already changed it
          prev.slot === DEFAULT_FORM.slot ? source.slot : prev.slot
        )
      );
      setIsDirty(true);
      setShowErrors(false);
    }
    hasAppliedDuplicateRef.current = true;
  }, [bookings, location.state]);

  // ---- Draft persistence ----
  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form]);

  // ---- Warn on unload when dirty ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const updateField = <K extends keyof NewBookingFormState>(
    key: K,
    value: NewBookingFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setStatusMessage("");
  };

  const validate = useCallback((state: NewBookingFormState) => {
    const errs: Partial<Record<keyof NewBookingFormState, string>> = {};
    if (!state.eventTitle.trim()) errs.eventTitle = "Event title is required.";
    if (!state.date.trim()) errs.date = "Date is required.";
    if (!state.slot) errs.slot = "Slot is required.";
    if (!state.customerName.trim()) errs.customerName = "Customer name is required.";
    if (!state.customerPhone.trim()) errs.customerPhone = "Customer phone is required.";
    return errs;
  }, []);

  const errors = useMemo(() => validate(form), [form, validate]);
  const hasErrors = Object.keys(errors).length > 0;

  const latestBooking =
    bookings.length > 0
      ? [...bookings].sort((a, b) => Number(b.id) - Number(a.id))[0]
      : null;

  const createBookingPayload = (): MockBooking => {
    const maxId =
      bookings.length === 0
        ? 0
        : bookings.reduce((max, b) => (b.id > max ? b.id : max), 0);
    const newId = maxId + 1;

    const eventDateLabel =
      form.date && form.date !== ""
        ? formatEventDateLabel(new Date(form.date + "T00:00:00"))
        : formatEventDateLabel(new Date());

    const totalGuestsNum =
      typeof form.totalGuests === "number" ? form.totalGuests : 0;

    const hallAGuestsValue =
      form.hallAGuests === "" ? null : Number(form.hallAGuests);
    const hallBGuestsValue =
      form.hallBGuests === "" ? null : Number(form.hallBGuests);

    const halls: MockBooking["halls"] = [];

    if (hallAGuestsValue && hallAGuestsValue > 0) {
      halls.push({
        hallCode: "A",
        hallName: "Hall A",
        capacity: HALL_CAPACITY_A,
        guestsHere: hallAGuestsValue,
        guestsInOtherHallsText:
          hallBGuestsValue && hallBGuestsValue > 0
            ? `${hallBGuestsValue} in Hall B`
            : undefined,
      });
    }

    if (hallBGuestsValue && hallBGuestsValue > 0) {
      halls.push({
        hallCode: "B",
        hallName: "Hall B",
        capacity: HALL_CAPACITY_B,
        guestsHere: hallBGuestsValue,
        guestsInOtherHallsText:
          hallAGuestsValue && hallAGuestsValue > 0
            ? `${hallAGuestsValue} in Hall A`
            : undefined,
      });
    }

    return {
      id: newId,
      bookingRef: `TEMP-${newId}`,
      eventTitle: form.eventTitle || "Untitled Event",
      nameplateText: form.nameplateText || undefined,
      eventDateLabel,
      slot: form.slot,
      totalGuests: totalGuestsNum,
      hallAGuests: hallAGuestsValue,
      hallBGuests: hallBGuestsValue,
      status: "CONFIRMED", // default for now

      customerName: form.customerName || "Unknown",
      customerPhone: form.customerPhone || "",
      customerWhatsapp: form.customerWhatsapp || "",
      familyOrCompanyName: form.familyOrCompanyName || "",
      customerAddress: form.customerAddress || "",
      customerReference: form.customerReference || "",

      hasPerformance: form.hasPerformance,
      performanceDescription:
        form.hasPerformance && form.performanceDescription
          ? form.performanceDescription
          : undefined,

      halls,
      internalNote: form.internalNote || "",
      advance: undefined,
    };
  };

  const handleSubmit = (destination: "list" | "detail") => {
    setShowErrors(true);
    if (hasErrors) return;
    setIsSubmitting(true);

    const newBooking = createBookingPayload();
    console.log("New booking submitted (mock, in-memory):", newBooking);
    addBooking(newBooking);

    try {
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsDirty(false);
    setIsSubmitting(false);
    setStatusMessage("Saved successfully.");

    if (destination === "detail") {
      navigate(`/bookings/${newBooking.id}`);
    } else {
      navigate("/bookings");
    }
  };

  // ---- Derived read-only info for Hall & Capacity (no mutations) ----
  const hallAGuestsNum =
    typeof form.hallAGuests === "number" ? form.hallAGuests : 0;
  const hallBGuestsNum =
    typeof form.hallBGuests === "number" ? form.hallBGuests : 0;

  const totalHallGuests = hallAGuestsNum + hallBGuestsNum;
  const totalGuestsNum =
    typeof form.totalGuests === "number" ? form.totalGuests : 0;

  const splitMatchesTotal =
    form.totalGuests !== "" && totalHallGuests === totalGuestsNum;

  const hallAOverBy =
    hallAGuestsNum > HALL_CAPACITY_A
      ? hallAGuestsNum - HALL_CAPACITY_A
      : 0;
  const hallBOverBy =
    hallBGuestsNum > HALL_CAPACITY_B
      ? hallBGuestsNum - HALL_CAPACITY_B
      : 0;

  const relevantAlerts = useMemo(() => {
    if (!form.date) return [];
    return alerts.filter(
      (a) =>
        a.effectiveStatus === "ACTIVE" &&
        a.dateKey === form.date &&
        (!a.slot || a.slot === form.slot)
    );
  }, [alerts, form.date, form.slot]);

  const copyFromBooking = (source: MockBooking) => {
    const next = buildFormFromBooking(source, form.date, form.slot);
    setForm(next);
    setIsDirty(true);
    setShowErrors(false);
    setStatusMessage("Copied values from booking.");
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setIsDirty(false);
    setShowErrors(false);
    setStatusMessage("");
    try {
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const confirmNavigateAway = () => {
    if (!isDirty) return true;
    return window.confirm(
      "You have unsaved changes on this booking form. Leave without saving?"
    );
  };

  const fillHallSplit = (mode: "A" | "B" | "CLEAR") => {
    const total = typeof form.totalGuests === "number" ? form.totalGuests : 0;
    if (mode === "CLEAR") {
      updateField("hallAGuests", "");
      updateField("hallBGuests", "");
      return;
    }
    if (mode === "A") {
      updateField("hallAGuests", total);
      updateField("hallBGuests", "");
    } else {
      updateField("hallBGuests", total);
      updateField("hallAGuests", "");
    }
  };

  return (
    <main className={styles.page}>
      <h1>Luxurium – New Booking</h1>
      <p className={styles.subhead}>
        This form writes directly to the in-memory BookingStore. No automatic
        changes are made to your numbers – we only show warnings for you to
        review.
      </p>

      {statusMessage && <div className={styles.status}>{statusMessage}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit("list");
        }}
        className={styles.formGrid}
      >
        {/* LEFT COLUMN */}
        <div className={styles.column}>
          {/* Event basics */}
          <Card>
            <h2 className={styles.cardTitle}>Event Basics</h2>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="eventTitle">
                Event Title
              </label>
              <input
                id="eventTitle"
                type="text"
                value={form.eventTitle}
                onChange={(e) => updateField("eventTitle", e.target.value)}
                className={styles.input}
                aria-invalid={Boolean(showErrors && errors.eventTitle)}
                aria-describedby="eventTitle-error"
                placeholder="e.g. Walima – Ali & Sara"
              />
              {showErrors && errors.eventTitle && (
                <div id="eventTitle-error" className={styles.errorText}>
                  {errors.eventTitle}
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="nameplateText">
                Nameplate (for signage)
              </label>
              <input
                id="nameplateText"
                type="text"
                value={form.nameplateText}
                onChange={(e) => updateField("nameplateText", e.target.value)}
                className={styles.input}
                placeholder="e.g. Ali & Sara Walima"
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                className={styles.input}
                aria-invalid={Boolean(showErrors && errors.date)}
                aria-describedby="date-error"
              />
              {showErrors && errors.date && (
                <div id="date-error" className={styles.errorText}>
                  {errors.date}
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="slot">
                Slot
              </label>
              <select
                id="slot"
                value={form.slot}
                onChange={(e) => updateField("slot", e.target.value as Slot)}
                className={styles.input}
                aria-invalid={Boolean(showErrors && errors.slot)}
                aria-describedby="slot-error"
              >
                {(["LUNCH", "DINNER"] as Slot[]).map((slot) => (
                  <option key={slot} value={slot}>
                    {formatSlotHuman(slot)}
                  </option>
                ))}
              </select>
              {showErrors && errors.slot && (
                <div id="slot-error" className={styles.errorText}>
                  {errors.slot}
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="totalGuests">
                Total Guests (approx.)
              </label>
              <input
                id="totalGuests"
                type="number"
                min={0}
                value={form.totalGuests}
                onChange={(e) =>
                  updateField(
                    "totalGuests",
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className={styles.input}
              />
              <div className={styles.muted}>
                Overall headcount for the event. Hall split below is separate
                and is never auto-adjusted.
              </div>
            </div>
          </Card>

          {/* Customer details */}
          <Card>
            <h2 className={styles.cardTitle}>Customer Details</h2>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="customerName">
                Primary Contact Name
              </label>
              <input
                id="customerName"
                type="text"
                value={form.customerName}
                onChange={(e) => updateField("customerName", e.target.value)}
                className={styles.input}
                aria-invalid={Boolean(showErrors && errors.customerName)}
                aria-describedby="customerName-error"
              />
              {showErrors && errors.customerName && (
                <div id="customerName-error" className={styles.errorText}>
                  {errors.customerName}
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="customerPhone">
                Phone
              </label>
              <input
                id="customerPhone"
                type="tel"
                value={form.customerPhone}
                onChange={(e) => updateField("customerPhone", e.target.value)}
                className={styles.input}
                aria-invalid={Boolean(showErrors && errors.customerPhone)}
                aria-describedby="customerPhone-error"
              />
              {showErrors && errors.customerPhone && (
                <div id="customerPhone-error" className={styles.errorText}>
                  {errors.customerPhone}
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="customerWhatsapp">
                WhatsApp
              </label>
              <input
                id="customerWhatsapp"
                type="tel"
                value={form.customerWhatsapp}
                onChange={(e) =>
                  updateField("customerWhatsapp", e.target.value)
                }
                className={styles.input}
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="familyOrCompanyName">
                Family / Company
              </label>
              <input
                id="familyOrCompanyName"
                type="text"
                value={form.familyOrCompanyName}
                onChange={(e) =>
                  updateField("familyOrCompanyName", e.target.value)
                }
                className={styles.input}
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="customerAddress">
                Address
              </label>
              <input
                id="customerAddress"
                type="text"
                value={form.customerAddress}
                onChange={(e) => updateField("customerAddress", e.target.value)}
                className={styles.input}
                placeholder="e.g. DHA Phase 6, Karachi"
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label} htmlFor="customerReference">
                Reference / Care of
              </label>
              <input
                id="customerReference"
                type="text"
                value={form.customerReference}
                onChange={(e) =>
                  updateField("customerReference", e.target.value)
                }
                className={styles.input}
                placeholder="e.g. Mr. Naveed (Owner’s friend)"
              />
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h2 className={styles.cardTitle}>Internal Note</h2>
            <textarea
              value={form.internalNote}
              onChange={(e) => updateField("internalNote", e.target.value)}
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Special instructions, VIP notes, etc."
            />
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.column}>
          {/* Hall & Capacity */}
          <Card>
            <h2 className={styles.cardTitle}>Hall &amp; Capacity</h2>

            {/* Hall usage mode */}
            <div className={styles.fieldRow}>
              <label className={styles.label}>Hall usage</label>

              <div className={styles.hallUsageOptions}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="hallUsageMode"
                    value="A_ONLY"
                    checked={form.hallUsageMode === "A_ONLY"}
                    onChange={() => updateField("hallUsageMode", "A_ONLY")}
                  />
                  <span>Single Hall A</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="hallUsageMode"
                    value="B_ONLY"
                    checked={form.hallUsageMode === "B_ONLY"}
                    onChange={() => updateField("hallUsageMode", "B_ONLY")}
                  />
                  <span>Single Hall B</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="hallUsageMode"
                    value="BOTH"
                    checked={form.hallUsageMode === "BOTH"}
                    onChange={() => updateField("hallUsageMode", "BOTH")}
                  />
                  <span>Both halls (A + B)</span>
                </label>
              </div>

              <div className={styles.muted}>
                This is for your own clarity. It doesn&apos;t force any numbers.
              </div>
            </div>

            {/* Per-hall guests */}
            <div className={styles.splitGrid}>
              <div className={styles.fieldStack}>
                <label className={styles.label}>Guests in Hall A</label>
                <input
                  type="number"
                  min={0}
                  value={form.hallAGuests}
                  onChange={(e) =>
                    updateField(
                      "hallAGuests",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.fieldStack}>
                <label className={styles.label}>Guests in Hall B</label>
                <input
                  type="number"
                  min={0}
                  value={form.hallBGuests}
                  onChange={(e) =>
                    updateField(
                      "hallBGuests",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.splitButtons}>
              <Button
                type="button"
                size="sm"
                onClick={() => fillHallSplit("A")}
                variant="secondary"
              >
                Fill Hall A with total
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => fillHallSplit("B")}
                variant="secondary"
              >
                Fill Hall B with total
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => fillHallSplit("CLEAR")}
                variant="secondary"
              >
                Clear split
              </Button>
            </div>

            {/* Split + capacity info (read-only) */}
            <div className={styles.infoBox}>
              <div>
                <strong>Hall split total:</strong> {totalHallGuests} guests
                {form.totalGuests !== "" && (
                  <>
                    {" "}
                    · <strong>Event total:</strong> {totalGuestsNum} guests
                  </>
                )}
              </div>

              {form.totalGuests !== "" && (
                <div className={styles.infoLine}>
                  {splitMatchesTotal ? (
                    <span className={styles.okText}>
                      ✓ Split matches total guests.
                    </span>
                  ) : (
                    <span className={styles.warnText}>
                      ⚠ Split does not match total guests. Please double-check.
                    </span>
                  )}
                </div>
              )}

              <div className={styles.hallSection}>
                <div>
                  <strong>Hall A:</strong> {hallAGuestsNum}/{HALL_CAPACITY_A}{" "}
                  {hallAOverBy > 0 ? (
                    <span className={styles.warnText}>
                      (⚠ over by {hallAOverBy})
                    </span>
                  ) : (
                    <span className={styles.dimText}>
                      ({Math.max(HALL_CAPACITY_A - hallAGuestsNum, 0)} free)
                    </span>
                  )}
                </div>

                <div className={styles.hallLine}>
                  <strong>Hall B:</strong> {hallBGuestsNum}/{HALL_CAPACITY_B}{" "}
                  {hallBOverBy > 0 ? (
                    <span className={styles.warnText}>
                      (⚠ over by {hallBOverBy})
                    </span>
                  ) : (
                    <span className={styles.dimText}>
                      ({Math.max(HALL_CAPACITY_B - hallBGuestsNum, 0)} free)
                    </span>
                  )}
                </div>
              </div>

              {/* Performance section */}
              <div className={styles.perfSection}>
                <h3 className={styles.perfTitle}>Performance / Music</h3>

                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={form.hasPerformance}
                    onChange={(e) =>
                      updateField("hasPerformance", e.target.checked)
                    }
                  />
                  <span>This booking includes a performance or loud music</span>
                </label>

                {form.hasPerformance && (
                  <div className={styles.perfNotes}>
                    <label className={styles.label} htmlFor="performanceDescription">
                      Performance notes
                    </label>
                    <textarea
                      id="performanceDescription"
                      value={form.performanceDescription}
                      onChange={(e) =>
                        updateField("performanceDescription", e.target.value)
                      }
                      className={`${styles.input} ${styles.textareaSm}`}
                      placeholder="e.g. Dhol + DJ, main focus in Hall A."
                    />
                    <div className={styles.muted}>
                      Other hall is still free for normal events; this just
                      helps with planning / noise awareness.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Alerts preview */}
          <Card>
            <h2 className={styles.cardTitle}>Active Alerts Preview</h2>
            {!form.date ? (
              <p className={styles.muted}>
                Select a date (and slot) to see alerts already active for that day/slot.
              </p>
            ) : relevantAlerts.length === 0 ? (
              <p className={styles.muted}>No active alerts for this date/slot.</p>
            ) : (
              <ul className={styles.alertList}>
                {relevantAlerts.map((a) => (
                  <li key={a.id} className={styles.alertItem}>
                    <div className={styles.alertTitle}>{a.title}</div>
                    <div className={styles.alertMessage}>{a.message}</div>
                    {a.sub && <div className={styles.alertSub}>{a.sub}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Advance (placeholder) */}
          <Card>
            <h2 className={styles.cardTitle}>Advance (future)</h2>
            <p className={styles.muted}>
              Advance entry will be handled in a dedicated flow or modal after
              the booking is created, so finance can track destination account
              and method correctly.
            </p>
          </Card>

          <div className={styles.actionsRow}>
            <div className={styles.actionsLeft}>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || hasErrors}
              >
                Save (mock)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting || hasErrors}
                onClick={() => handleSubmit("detail")}
              >
                Save & open detail
              </Button>
            </div>

            <div className={styles.actionsRight}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!confirmNavigateAway()) return;
                  navigate("/bookings");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => resetForm()}
              >
                Reset form
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!latestBooking}
                onClick={() => latestBooking && copyFromBooking(latestBooking)}
              >
                Copy from last booking
              </Button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
};

function buildFormFromBooking(
  source: MockBooking,
  keepDate: string,
  keepSlot: Slot
): NewBookingFormState {
  const hallUsageMode: HallUsageMode =
    source.hallAGuests && source.hallBGuests
      ? "BOTH"
      : source.hallAGuests
      ? "A_ONLY"
      : source.hallBGuests
      ? "B_ONLY"
      : "A_ONLY";

  return {
    eventTitle: source.eventTitle || "",
    nameplateText: source.nameplateText || "",
    date: keepDate || "",
    slot: keepSlot || source.slot,
    totalGuests: source.totalGuests ?? "",

    customerName: source.customerName || "",
    customerPhone: source.customerPhone || "",
    customerWhatsapp: source.customerWhatsapp || "",
    familyOrCompanyName: source.familyOrCompanyName || "",
    customerAddress: source.customerAddress || "",
    customerReference: source.customerReference || "",

    internalNote: source.internalNote || "",

    hallUsageMode,
    hallAGuests: source.hallAGuests ?? "",
    hallBGuests: source.hallBGuests ?? "",
    hasPerformance: Boolean(source.hasPerformance),
    performanceDescription: source.performanceDescription || "",
  };
}

export default BookingFormPage;
