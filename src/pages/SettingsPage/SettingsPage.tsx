// src/pages/SettingsPage/SettingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import styles from "./SettingsPage.module.css";

type SettingsCategory =
  | "GENERAL"
  | "BOOKING"
  | "HALLS"
  | "ALERTS"
  | "FINANCE"
  | "MENU"
  | "USERS"
  | "DATA";

type WeekStart = "SUNDAY" | "MONDAY";
type CalendarView = "MONTH" | "WEEK" | "DAY";
type DateFormat = "DD_MMM_YYYY" | "DD_MM_YYYY" | "YYYY_MM_DD";
type BookingStatusDefault = "INQUIRY" | "TENTATIVE" | "CONFIRMED";
type StorageMode = "LOCAL" | "SERVER";

interface SettingsState {
  general: {
    venueName: string;
    shortCode: string;
    timezone: string;
    weekStart: WeekStart;
    defaultView: CalendarView;
    dateFormat: DateFormat;
  };
  booking: {
    defaultStatus: BookingStatusDefault;
    minLeadHours: number;
    editCutoffHours: number;
    fullThresholdPercent: number;
    allowManualFullyBooked: boolean;
    followupWindowDays: number;
  };
  halls: {
    hallAName: string;
    hallACapacity: number;
    hallANotes: string;
    hallBName: string;
    hallBCapacity: number;
    hallBNotes: string;
  };
  alerts: {
    capacityOverride: boolean;
    performance: boolean;
    inquiryFollowup: boolean;
    pastStatus: boolean;
    missingContact: boolean;
    guestSplit: boolean;
    allowDismiss: boolean;
    requireDismissReason: boolean;
    resolvedHistoryDays: number;
  };
  finance: {
    currency: string;
    minAdvancePercent: number;
    defaultAccount: string;
    invoicePattern: string;
  };
  menu: {
    menuChangeCutoffDays: number;
    headcountCutoffDays: number;
    defaultLunchMenu: string;
    defaultDinnerMenu: string;
  };
  data: {
    storageMode: StorageMode;
  };
}

const categories: {
  id: SettingsCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "GENERAL",
    label: "General & Branding",
    description: "Venue identity, branding, and global defaults.",
  },
  {
    id: "BOOKING",
    label: "Booking & Calendar",
    description: "Slots, booking behaviour, and fully-booked rules.",
  },
  {
    id: "HALLS",
    label: "Halls & Capacity",
    description: "Hall definitions, capacities, and layout notes.",
  },
  {
    id: "ALERTS",
    label: "Alerts & Dismissals",
    description: "Which alerts exist, how they behave, and dismissal rules.",
  },
  {
    id: "FINANCE",
    label: "Finance & Billing",
    description: "Defaults for advances, currency, and invoice behaviour.",
  },
  {
    id: "MENU",
    label: "Menu & Kitchen",
    description: "Menu change cutoffs and kitchen capacity hints.",
  },
  {
    id: "USERS",
    label: "Users & Access",
    description:
      "Managers, viewers, and granular access to different parts of the console.",
  },
  {
    id: "DATA",
    label: "Data & Backup",
    description: "Local storage mode and future backup/restore.",
  },
];

const DEFAULT_SETTINGS: SettingsState = {
  general: {
    venueName: "Luxurium",
    shortCode: "LUX",
    timezone: "Asia/Karachi",
    weekStart: "SUNDAY",
    defaultView: "MONTH",
    dateFormat: "DD_MMM_YYYY",
  },
  booking: {
    defaultStatus: "TENTATIVE",
    minLeadHours: 24,
    editCutoffHours: 6,
    fullThresholdPercent: 90,
    allowManualFullyBooked: true,
    followupWindowDays: 15,
  },
  halls: {
    hallAName: "Hall A",
    hallACapacity: 1000,
    hallANotes: "",
    hallBName: "Hall B",
    hallBCapacity: 1000,
    hallBNotes: "",
  },
  alerts: {
    capacityOverride: true,
    performance: true,
    inquiryFollowup: true,
    pastStatus: true,
    missingContact: true,
    guestSplit: true,
    allowDismiss: true,
    requireDismissReason: true,
    resolvedHistoryDays: 90,
  },
  finance: {
    currency: "PKR",
    minAdvancePercent: 30,
    defaultAccount: "HBL – Luxurium Ops",
    invoicePattern: "LUX-{YYYY}-{MM}-{NNNN}",
  },
  menu: {
    menuChangeCutoffDays: 3,
    headcountCutoffDays: 1,
    defaultLunchMenu: "Wedding Lunch – Standard",
    defaultDinnerMenu: "Wedding Dinner – Standard",
  },
  data: {
    storageMode: "LOCAL",
  },
};

const COLLAPSE_STORAGE_KEY = "luxurium.settings.collapse.v1";

const SettingsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] =
    useState<SettingsCategory>("GENERAL");
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.sessionStorage.getItem(COLLAPSE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const sectionRefs = useMemo<
    Record<SettingsCategory, React.RefObject<HTMLDivElement>>
  >(
    () => ({
      GENERAL: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
      BOOKING: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
      HALLS: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
      ALERTS: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
      FINANCE: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
      MENU: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
      USERS: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
      DATA: React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>,
    }),
    []
  );

  const categoryKeyMap: Partial<Record<SettingsCategory, keyof SettingsState>> = {
    GENERAL: "general",
    BOOKING: "booking",
    HALLS: "halls",
    ALERTS: "alerts",
    FINANCE: "finance",
    MENU: "menu",
    DATA: "data",
  };

  // Unsaved guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Persist collapse state
  useEffect(() => {
    try {
      window.sessionStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const markDirty = () => {
    setIsDirty(true);
    setStatus("");
  };

  const updateSettings = <K extends keyof SettingsState, T extends keyof SettingsState[K]>(
    category: K,
    key: T,
    value: SettingsState[K][T]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    markDirty();
  };

  const handleResetAll = () => {
    if (!window.confirm("Reset all settings to defaults?")) return;
    setSettings(DEFAULT_SETTINGS);
    setIsDirty(true);
    setStatus("");
  };

  const handleResetCategory = (category: SettingsCategory) => {
    if (!window.confirm("Reset this section to defaults?")) return;
    const key = categoryKeyMap[category];
    if (!key) return;
    setSettings((prev) => ({
      ...prev,
      [key]: DEFAULT_SETTINGS[key],
    }));
    setIsDirty(true);
    setStatus("");
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    setLastSavedAt(now);
    setIsDirty(false);
    setStatus("Saved (mock) at " + new Date(now).toLocaleString("en-PK"));
  };

  const scrollToCategory = (category: SettingsCategory) => {
    setSelectedCategory(category);
    const ref = sectionRefs[category];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1>Luxurium – Settings</h1>
          <p className={styles.subhead}>
            Configure how the Luxurium console behaves across bookings, halls,
            alerts, finance, menu, and access control. This is currently a
            front-end mock only – values are not persisted yet.
          </p>
          {isDirty && <div className={styles.dirtyBadge}>Unsaved changes</div>}
          {status && <div className={styles.status}>{status}</div>}
        </div>
        <div className={styles.headerActions}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleResetAll}
          >
            Reset all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={!isDirty}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </div>
      </header>

      {lastSavedAt && (
        <div className={styles.savedMeta}>
          Last saved: {new Date(lastSavedAt).toLocaleString("en-PK")}
        </div>
      )}

      {/* Main layout: left nav + main + side help */}
      <section className={styles.layout}>
        {/* Left vertical nav */}
        <aside className={styles.navPanel}>
          <div className={styles.navHeading}>Settings sections</div>
          <nav className={styles.navList}>
            {categories.map((cat) => {
              const isActive = cat.id === selectedCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                >
                  <div className={styles.navLabel}>{cat.label}</div>
                  {isActive && <div className={styles.navDesc}>{cat.description}</div>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className={styles.mainColumn}>
          {categories.map((cat) => (
            <section
              key={cat.id}
              ref={sectionRefs[cat.id]}
              id={cat.id}
              className={styles.categorySection}
            >
              <div className={styles.categoryHeader}>
                <div>
                  <div className={styles.categoryEyebrow}>{cat.label}</div>
                  <div className={styles.categoryTitle}>{cat.description}</div>
                </div>
                <div className={styles.categoryActions}>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleResetCategory(cat.id)}
                  >
                    Reset section
                  </Button>
                </div>
              </div>
              {renderMainColumn(
                cat.id,
                settings,
                updateSettings,
                collapsed,
                toggleCollapse
              )}
            </section>
          ))}
        </div>

        {/* Context side panel */}
        <div className={styles.sideColumn}>
          {renderSideColumn(selectedCategory)}
        </div>
      </section>
    </main>
  );
};

// ---------- Category content renderers (UI only, no real persistence) ----------

function renderMainColumn(
  category: SettingsCategory,
  settings: SettingsState,
  updateSettings: <K extends keyof SettingsState, T extends keyof SettingsState[K]>(
    category: K,
    key: T,
    value: SettingsState[K][T]
  ) => void,
  collapsed: Record<string, boolean>,
  toggleCollapse: (id: string) => void
): React.ReactNode {
  switch (category) {
    case "GENERAL":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="general-identity"
            title="Venue Identity"
            description="Basic information used across the console, in printouts, and in future invoices."
            collapsed={Boolean(collapsed["general-identity"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Venue name">
              <input
                type="text"
                value={settings.general.venueName}
                onChange={(e) => updateSettings("general", "venueName", e.target.value)}
                className={styles.input}
                placeholder="e.g. Luxurium Event Complex"
              />
            </SettingsField>

            <SettingsField label="Short code">
              <input
                type="text"
                value={settings.general.shortCode}
                onChange={(e) => updateSettings("general", "shortCode", e.target.value)}
                className={`${styles.input} ${styles.w120}`}
                placeholder="e.g. LUX"
              />
            </SettingsField>

            <SettingsField label="Timezone">
              <input
                type="text"
                value={settings.general.timezone}
                onChange={(e) => updateSettings("general", "timezone", e.target.value)}
                className={`${styles.input} ${styles.w220}`}
              />
              <p className={styles.fieldHint}>
                For now this is fixed; later we can support configuring timezones if
                needed.
              </p>
            </SettingsField>
          </CollapsibleCard>

          <CollapsibleCard
            id="general-ui"
            title="UI & Calendar Defaults"
            description="Controls calendar defaults and formatting."
            collapsed={Boolean(collapsed["general-ui"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Week starts on">
              <div className={styles.inlineRadioRow}>
                <label className={styles.inlineLabel}>
                  <input
                    type="radio"
                    name="weekStart"
                    checked={settings.general.weekStart === "SUNDAY"}
                    onChange={() => updateSettings("general", "weekStart", "SUNDAY")}
                  />
                  Sunday
                </label>
                <label className={styles.inlineLabel}>
                  <input
                    type="radio"
                    name="weekStart"
                    checked={settings.general.weekStart === "MONDAY"}
                    onChange={() => updateSettings("general", "weekStart", "MONDAY")}
                  />
                  Monday
                </label>
              </div>
            </SettingsField>

            <SettingsField label="Default calendar view">
              <select
                value={settings.general.defaultView}
                onChange={(e) =>
                  updateSettings("general", "defaultView", e.target.value as CalendarView)
                }
                className={`${styles.input} ${styles.w200}`}
              >
                <option value="MONTH">Month view</option>
                <option value="WEEK">Week view (future)</option>
                <option value="DAY">Day view (future)</option>
              </select>
            </SettingsField>

            <SettingsField label="Default date format">
              <select
                value={settings.general.dateFormat}
                onChange={(e) =>
                  updateSettings(
                    "general",
                    "dateFormat",
                    e.target.value as DateFormat
                  )
                }
                className={`${styles.input} ${styles.w220}`}
              >
                <option value="DD_MMM_YYYY">27 Nov 2025</option>
                <option value="DD_MM_YYYY">27/11/2025</option>
                <option value="YYYY_MM_DD">2025-11-27</option>
              </select>
            </SettingsField>
          </CollapsibleCard>
        </div>
      );

    case "BOOKING":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="booking-rules"
            title="Booking Rules"
            description="Control how new bookings behave, which status they start with, and safety cutoffs."
            collapsed={Boolean(collapsed["booking-rules"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Default status for new bookings">
              <select
                value={settings.booking.defaultStatus}
                onChange={(e) =>
                  updateSettings(
                    "booking",
                    "defaultStatus",
                    e.target.value as BookingStatusDefault
                  )
                }
                className={`${styles.input} ${styles.w220}`}
              >
                <option value="INQUIRY">Inquiry</option>
                <option value="TENTATIVE">Tentative</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>
            </SettingsField>

            <SettingsField label="Minimum lead time for new booking">
              <div className={styles.inlineRow}>
                <input
                  type="number"
                  min={0}
                  value={settings.booking.minLeadHours}
                  onChange={(e) =>
                    updateSettings("booking", "minLeadHours", Number(e.target.value))
                  }
                  className={`${styles.input} ${styles.w120}`}
                />
                <span className={styles.inlineHint}>hours before event start</span>
              </div>
            </SettingsField>

            <SettingsField label="Cutoff for editing existing bookings">
              <div className={styles.inlineRow}>
                <input
                  type="number"
                  min={0}
                  value={settings.booking.editCutoffHours}
                  onChange={(e) =>
                    updateSettings("booking", "editCutoffHours", Number(e.target.value))
                  }
                  className={`${styles.input} ${styles.w120}`}
                />
                <span className={styles.inlineHint}>
                  hours before event start (manager override still allowed)
                </span>
              </div>
            </SettingsField>
          </CollapsibleCard>

          <CollapsibleCard
            id="booking-full"
            title="“Fully Booked” Logic"
            description="Controls when a slot or day is treated as fully booked."
            collapsed={Boolean(collapsed["booking-full"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Auto mark slot as fully booked when…">
              <div className={styles.inlineRow}>
                <span className={styles.inlineLabelOnly}>Total guests in slot ≥</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.booking.fullThresholdPercent}
                  onChange={(e) =>
                    updateSettings(
                      "booking",
                      "fullThresholdPercent",
                      Number(e.target.value)
                    )
                  }
                  className={`${styles.input} ${styles.w90}`}
                />
                <span className={styles.inlineLabelOnly}>%</span>
                <span className={styles.inlineHint}>
                  of combined capacity of both halls
                </span>
              </div>
            </SettingsField>

            <SettingsField label="Manual fully booked / close out">
              <label className={styles.inlineLabel}>
                <input
                  type="checkbox"
                  checked={settings.booking.allowManualFullyBooked}
                  onChange={(e) =>
                    updateSettings("booking", "allowManualFullyBooked", e.target.checked)
                  }
                />
                Allow manager to manually mark a day or slot as “Fully Booked” even if
                capacity remains.
              </label>
              <p className={styles.fieldHint}>
                This maps to the “we just don’t want any more functions that day”
                behaviour you described.
              </p>
            </SettingsField>
          </CollapsibleCard>
        </div>
      );

    case "HALLS":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="halls-config"
            title="Hall Configuration"
            description="Define your halls and their typical capacities."
            collapsed={Boolean(collapsed["halls-config"])}
            onToggle={toggleCollapse}
          >
            <div className={styles.table}>
              <div className={`${styles.tableRow} ${styles.tableHeader}`}>
                <div>Code</div>
                <div>Name</div>
                <div>Default capacity</div>
                <div>Notes</div>
              </div>
              <div className={styles.tableRow}>
                <div className={styles.tableCellLabel}>A</div>
                <div className={styles.tableCell}>
                  <input
                    type="text"
                    value={settings.halls.hallAName}
                    onChange={(e) =>
                      updateSettings("halls", "hallAName", e.target.value)
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.tableCell}>
                  <input
                    type="number"
                    min={0}
                    value={settings.halls.hallACapacity}
                    onChange={(e) =>
                      updateSettings("halls", "hallACapacity", Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.tableCell}>
                  <input
                    type="text"
                    value={settings.halls.hallANotes}
                    onChange={(e) =>
                      updateSettings("halls", "hallANotes", e.target.value)
                    }
                    className={styles.input}
                    placeholder="e.g. Preferred for larger weddings"
                  />
                </div>
              </div>
              <div className={styles.tableRow}>
                <div className={styles.tableCellLabel}>B</div>
                <div className={styles.tableCell}>
                  <input
                    type="text"
                    value={settings.halls.hallBName}
                    onChange={(e) =>
                      updateSettings("halls", "hallBName", e.target.value)
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.tableCell}>
                  <input
                    type="number"
                    min={0}
                    value={settings.halls.hallBCapacity}
                    onChange={(e) =>
                      updateSettings("halls", "hallBCapacity", Number(e.target.value))
                    }
                    className={styles.input}
                  />
                </div>
                <div className={styles.tableCell}>
                  <input
                    type="text"
                    value={settings.halls.hallBNotes}
                    onChange={(e) =>
                      updateSettings("halls", "hallBNotes", e.target.value)
                    }
                    className={styles.input}
                    placeholder="e.g. Good for corporate events"
                  />
                </div>
              </div>
            </div>

            <p className={styles.fieldHint}>
              Future: we could support more halls or dynamic capacity profiles per
              layout.
            </p>
          </CollapsibleCard>
        </div>
      );

    case "ALERTS":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="alerts-types"
            title="Alert Types"
            description="Control which alerts are active. These map to the Alerts page and dashboard logic."
            collapsed={Boolean(collapsed["alerts-types"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Operational alerts">
              <div className={styles.checkboxColumn}>
                <label className={styles.inlineLabel}>
                  <input
                    type="checkbox"
                    checked={settings.alerts.capacityOverride}
                    onChange={(e) =>
                      updateSettings("alerts", "capacityOverride", e.target.checked)
                    }
                  />
                  Capacity override alerts (when hall exceeds safe capacity).
                </label>
                <label className={styles.inlineLabel}>
                  <input
                    type="checkbox"
                    checked={settings.alerts.performance}
                    onChange={(e) =>
                      updateSettings("alerts", "performance", e.target.checked)
                    }
                  />
                  Performance alerts for events with musical performances.
                </label>
                <label className={styles.inlineLabel}>
                  <input
                    type="checkbox"
                    checked={settings.alerts.inquiryFollowup}
                    onChange={(e) =>
                      updateSettings("alerts", "inquiryFollowup", e.target.checked)
                    }
                  />
                  Inquiry / tentative follow-up alerts.
                </label>
                <label className={styles.inlineLabel}>
                  <input
                    type="checkbox"
                    checked={settings.alerts.pastStatus}
                    onChange={(e) =>
                      updateSettings("alerts", "pastStatus", e.target.checked)
                    }
                  />
                  Past bookings not marked COMPLETED or CANCELLED.
                </label>
              </div>
            </SettingsField>

            <SettingsField label="Data quality alerts">
              <div className={styles.checkboxColumn}>
                <label className={styles.inlineLabel}>
                  <input
                    type="checkbox"
                    checked={settings.alerts.missingContact}
                    onChange={(e) =>
                      updateSettings("alerts", "missingContact", e.target.checked)
                    }
                  />
                  Missing critical contact details (phone / address).
                </label>
                <label className={styles.inlineLabel}>
                  <input
                    type="checkbox"
                    checked={settings.alerts.guestSplit}
                    onChange={(e) =>
                      updateSettings("alerts", "guestSplit", e.target.checked)
                    }
                  />
                  Guest split mismatch / complex multi-hall patterns (future).
                </label>
              </div>
            </SettingsField>

            <SettingsField label="Follow-up window for INQUIRY / TENTATIVE">
              <div className={styles.inlineRow}>
                <span className={styles.inlineLabelOnly}>
                  Start alerting when event is within
                </span>
                <input
                  type="number"
                  min={1}
                  value={settings.booking.followupWindowDays}
                  onChange={(e) =>
                    updateSettings("booking", "followupWindowDays", Number(e.target.value))
                  }
                  className={`${styles.input} ${styles.w90}`}
                />
                <span className={styles.inlineLabelOnly}>days from today.</span>
              </div>
              <p className={styles.fieldHint}>
                Once inside this window, the alert should reappear every day until
                status is updated or alert is dismissed.
              </p>
            </SettingsField>
          </CollapsibleCard>

          <CollapsibleCard
            id="alerts-dismissal"
            title="Alert Dismissal & Resolution"
            description="Control dismissal, reasons, and history."
            collapsed={Boolean(collapsed["alerts-dismissal"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Manual dismissal">
              <label className={styles.inlineLabel}>
                <input
                  type="checkbox"
                  checked={settings.alerts.allowDismiss}
                  onChange={(e) =>
                    updateSettings("alerts", "allowDismiss", e.target.checked)
                  }
                />
                Allow managers to dismiss alerts from the Alerts page.
              </label>
            </SettingsField>

            <SettingsField label="Reason for dismissal">
              <label className={styles.inlineLabel}>
                <input
                  type="checkbox"
                  checked={settings.alerts.requireDismissReason}
                  onChange={(e) =>
                    updateSettings("alerts", "requireDismissReason", e.target.checked)
                  }
                />
                Require a short reason when dismissing an alert (e.g. “exception
                approved by owner”).
              </label>
            </SettingsField>

            <SettingsField label="Alert history (future)">
              <p className={styles.fieldHint}>
                Later we can keep a timeline of resolved alerts. For now, this is
                just a design placeholder.
              </p>
              <div className={styles.inlineRow}>
                <input
                  type="number"
                  min={0}
                  value={settings.alerts.resolvedHistoryDays}
                  onChange={(e) =>
                    updateSettings(
                      "alerts",
                      "resolvedHistoryDays",
                      Number(e.target.value)
                    )
                  }
                  className={`${styles.input} ${styles.w90}`}
                />
                <span className={styles.inlineHint}>
                  days to keep resolved alerts in history.
                </span>
              </div>
            </SettingsField>
          </CollapsibleCard>
        </div>
      );

    case "FINANCE":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="finance-defaults"
            title="Finance Defaults"
            description="Used by future billing/finance module and booking advances."
            collapsed={Boolean(collapsed["finance-defaults"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Currency">
              <input
                type="text"
                value={settings.finance.currency}
                onChange={(e) =>
                  updateSettings("finance", "currency", e.target.value)
                }
                className={`${styles.input} ${styles.w120}`}
              />
            </SettingsField>

            <SettingsField label="Minimum advance to mark as CONFIRMED">
              <div className={styles.inlineRow}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.finance.minAdvancePercent}
                  onChange={(e) =>
                    updateSettings(
                      "finance",
                      "minAdvancePercent",
                      Number(e.target.value)
                    )
                  }
                  className={`${styles.input} ${styles.w90}`}
                />
                <span className={styles.inlineLabelOnly}>% of estimated total</span>
              </div>
              <p className={styles.fieldHint}>
                Future logic: if advance is below this, system will warn before
                allowing CONFIRMED status.
              </p>
            </SettingsField>

            <SettingsField label="Default destination account for advances">
              <select
                value={settings.finance.defaultAccount}
                onChange={(e) =>
                  updateSettings("finance", "defaultAccount", e.target.value)
                }
                className={`${styles.input} ${styles.w260}`}
              >
                <option>HBL – Luxurium Ops</option>
                <option>UBL – Luxurium Ops</option>
                <option>Cash counter</option>
              </select>
            </SettingsField>
          </CollapsibleCard>

          <CollapsibleCard
            id="finance-invoice"
            title="Invoice / Reference Pattern (future)"
            description="Design placeholder for invoice/reference pattern."
            collapsed={Boolean(collapsed["finance-invoice"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Pattern">
              <input
                type="text"
                value={settings.finance.invoicePattern}
                onChange={(e) =>
                  updateSettings("finance", "invoicePattern", e.target.value)
                }
                className={styles.input}
              />
              <p className={styles.fieldHint}>
                This is just a design placeholder. Later we can plug this into the
                booking reference / invoice generator.
              </p>
            </SettingsField>
          </CollapsibleCard>
        </div>
      );

    case "MENU":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="menu-rules"
            title="Menu & Catering Rules"
            description="Coordinate kitchen cutoffs and defaults."
            collapsed={Boolean(collapsed["menu-rules"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Menu change cutoff">
              <div className={styles.inlineRow}>
                <input
                  type="number"
                  min={0}
                  value={settings.menu.menuChangeCutoffDays}
                  onChange={(e) =>
                    updateSettings(
                      "menu",
                      "menuChangeCutoffDays",
                      Number(e.target.value)
                    )
                  }
                  className={`${styles.input} ${styles.w90}`}
                />
                <span className={styles.inlineHint}>
                  days before event (after this, menu changes need manager override).
                </span>
              </div>
            </SettingsField>

            <SettingsField label="Headcount change cutoff">
              <div className={styles.inlineRow}>
                <input
                  type="number"
                  min={0}
                  value={settings.menu.headcountCutoffDays}
                  onChange={(e) =>
                    updateSettings(
                      "menu",
                      "headcountCutoffDays",
                      Number(e.target.value)
                    )
                  }
                  className={`${styles.input} ${styles.w90}`}
                />
                <span className={styles.inlineHint}>
                  days before event (later changes are flagged for kitchen).
                </span>
              </div>
            </SettingsField>

            <SettingsField label="Default menu by slot (future)">
              <p className={styles.fieldHint}>
                Later, we can define a default menu per slot (Lunch vs Dinner) that the
                Menu module uses as a starting point.
              </p>
              <div className={styles.menuGrid}>
                <div className={styles.menuLabel}>Lunch</div>
                <select
                  value={settings.menu.defaultLunchMenu}
                  onChange={(e) =>
                    updateSettings("menu", "defaultLunchMenu", e.target.value)
                  }
                  className={styles.input}
                >
                  <option>Wedding Lunch – Standard</option>
                  <option>Corporate Lunch – Standard</option>
                  <option disabled>Custom (future)</option>
                </select>
                <div className={styles.menuLabel}>Dinner</div>
                <select
                  value={settings.menu.defaultDinnerMenu}
                  onChange={(e) =>
                    updateSettings("menu", "defaultDinnerMenu", e.target.value)
                  }
                  className={styles.input}
                >
                  <option>Wedding Dinner – Standard</option>
                  <option>Corporate Dinner – Standard</option>
                  <option disabled>Custom (future)</option>
                </select>
              </div>
            </SettingsField>
          </CollapsibleCard>
        </div>
      );

    case "USERS":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="users-roles"
            title="Roles & Access Levels"
            description="Conceptual layout for roles; actual auth comes later."
            collapsed={Boolean(collapsed["users-roles"])}
            onToggle={toggleCollapse}
          >
            <div className={styles.tableWide}>
              <div className={`${styles.tableRow} ${styles.tableHeader}`}>
                <div>Role</div>
                <div>Can do</div>
                <div>Cannot do</div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <strong>Super Manager</strong>
                  <div className={styles.tableSub}>Owner / top level</div>
                </div>
                <div className={styles.tableCell}>
                  Full access to all modules: bookings, alerts, finance, settings,
                  override capacity, mark fully booked.
                </div>
                <div className={styles.tableCell}>—</div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <strong>Booking Manager</strong>
                </div>
                <div className={styles.tableCell}>
                  Create/edit bookings, manage calendar, mark slots/days fully booked,
                  manage basic alerts.
                </div>
                <div className={styles.tableCell}>
                  Cannot edit finance settings, cannot see internal finance-only
                  dashboards (future).
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <strong>Finance Manager</strong>
                </div>
                <div className={styles.tableCell}>
                  View/edit amounts, advances, destination accounts, and finance
                  reports.
                </div>
                <div className={styles.tableCell}>
                  Cannot change hall capacities or booking rules (unless also Super
                  Manager).
                </div>
              </div>

              <div className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <strong>Viewer – Calendar</strong>
                </div>
                <div className={styles.tableCell}>
                  Can view dashboard, calendar, booking list and booking details (with
                  finance fields optionally hidden).
                </div>
                <div className={styles.tableCell}>
                  Cannot edit anything, cannot see internal settings or change alerts.
                </div>
              </div>
            </div>

            <p className={styles.fieldHint}>
              Later we can store users and assign these roles, then enforce permissions
              per page and action.
            </p>
          </CollapsibleCard>
        </div>
      );

    case "DATA":
      return (
        <div className={styles.cardStack}>
          <CollapsibleCard
            id="data-backup"
            title="Data & Backup"
            description="Control storage mode and future backup options."
            collapsed={Boolean(collapsed["data-backup"])}
            onToggle={toggleCollapse}
          >
            <SettingsField label="Storage mode">
              <select
                value={settings.data.storageMode}
                onChange={(e) =>
                  updateSettings(
                    "data",
                    "storageMode",
                    e.target.value as StorageMode
                  )
                }
                className={`${styles.input} ${styles.w260}`}
              >
                <option value="LOCAL">
                  In-browser only (local storage / JSON mock)
                </option>
                <option value="SERVER" disabled>
                  Connected to server (future)
                </option>
              </select>
              <p className={styles.fieldHint}>
                Right now, everything is in-memory mock data. Later we’ll add
                localStorage/IndexedDB, and then backend connectivity.
              </p>
            </SettingsField>

            <SettingsField label="Backup & restore (future)">
              <div className={styles.inlineRowWrap}>
                <Button type="button" size="sm" variant="secondary" disabled>
                  Download JSON backup
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled>
                  Restore from JSON
                </Button>
              </div>
              <p className={styles.fieldHint}>
                When we introduce local storage, this area will let you export /
                import all booking & settings data.
              </p>
            </SettingsField>
          </CollapsibleCard>
        </div>
      );

    default:
      return null;
  }
}

function renderSideColumn(category: SettingsCategory): React.ReactNode {
  // Right-hand column: contextual help / summary depending on category.
  switch (category) {
    case "GENERAL":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>How General Settings are used</h3>
          <p className={styles.sideText}>
            Venue name and short code appear on the dashboard, booking details,
            and (later) printed paperwork or invoices.
          </p>
          <p className={styles.sideText}>
            Week start day and calendar defaults control how the calendar renders by
            default. They do not affect any stored data.
          </p>
        </Card>
      );

    case "BOOKING":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Booking rules in practice</h3>
          <p className={styles.sideText}>
            These settings express how your team likes to work: how early bookings
            should be made, and when a day is considered mentally “full”.
          </p>
          <p className={styles.sideText}>
            In future, the Booking Form, Calendar, and Alerts will all read these rules
            to guide the manager during negotiations.
          </p>
        </Card>
      );

    case "HALLS":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Why hall capacity matters</h3>
          <p className={styles.sideText}>
            The capacity numbers are used by the calendar to compute remaining capacity,
            show overrides, and highlight very busy days.
          </p>
          <p className={styles.sideText}>
            Even if in reality you&apos;re flexible, the system needs a base capacity to
            calculate safety margins.
          </p>
        </Card>
      );

    case "ALERTS":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Alert design philosophy</h3>
          <p className={styles.sideText}>Alerts should be high-signal and actionable:</p>
          <ul className={styles.sideList}>
            <li>Safety issues (capacity override).</li>
            <li>Follow-up needs (inquiries & tentatives close to event).</li>
            <li>Data hygiene issues (missing contacts, past events not updated).</li>
          </ul>
          <p className={styles.sideText}>
            With dismissal rules and reasons, you can clear noise and keep the Alerts
            page focused.
          </p>
        </Card>
      );

    case "FINANCE":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Finance defaults & discipline</h3>
          <p className={styles.sideText}>
            Minimum advance rules help enforce a consistent policy with clients,
            especially during busy seasons.
          </p>
          <p className={styles.sideText}>
            Later, these settings will flow into per-booking quotes, invoices, and
            reports like “Advances pending” or “Overdue balances”.
          </p>
        </Card>
      );

    case "MENU":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Menu & kitchen coordination</h3>
          <p className={styles.sideText}>
            Cutoffs for menu and headcount changes protect the kitchen and reduce
            last-minute chaos.
          </p>
          <p className={styles.sideText}>
            When the Menu module exists, those settings will drive warnings like “too
            late to change menu” or “headcount change after cutoff”.
          </p>
        </Card>
      );

    case "USERS":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Multiple managers, multiple viewers</h3>
          <p className={styles.sideText}>
            Luxurium can have several managers and viewers, each with different access
            levels:
          </p>
          <ul className={styles.sideList}>
            <li>Some can edit bookings but not see finance.</li>
            <li>Some can manage finance but not hall capacities.</li>
            <li>Some can only view calendar / list without editing.</li>
          </ul>
          <p className={styles.sideText}>
            In the future, this section becomes the home of role + user management,
            access logs, and PIN-based overrides.
          </p>
        </Card>
      );

    case "DATA":
      return (
        <Card className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Data model roadmap</h3>
          <p className={styles.sideText}>Right now everything is in-memory mock data.</p>
          <ol className={styles.sideListNumbered}>
            <li>Local persistence (localStorage / IndexedDB).</li>
            <li>JSON backup & restore for testing.</li>
            <li>Eventually, a proper server database.</li>
          </ol>
          <p className={styles.sideText}>This page is where those options will be controlled.</p>
        </Card>
      );

    default:
      return null;
  }
}

// ---------- Small reusable UI helpers ----------

interface SettingsFieldProps {
  label: string;
  children: React.ReactNode;
}

const SettingsField: React.FC<SettingsFieldProps> = ({ label, children }) => (
  <div className={styles.field}>
    <div className={styles.fieldLabel}>{label}</div>
    {children}
  </div>
);

interface CollapsibleCardProps {
  id: string;
  title: string;
  description?: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  id,
  title,
  description,
  collapsed,
  onToggle,
  children,
}) => {
  return (
    <Card className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          {description && <p className={styles.cardHint}>{description}</p>}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onToggle(id)}
        >
          {collapsed ? "Expand" : "Collapse"}
        </Button>
      </div>
      {!collapsed && <div className={styles.cardBody}>{children}</div>}
    </Card>
  );
};

export default SettingsPage;
