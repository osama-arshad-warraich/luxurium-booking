// src/pages/BookingListPage/BookingListPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type MockBooking, type BookingStatus } from "../../mock/bookingsMockApi";
import { useBookingStore } from "../../state/BookingStore";
import { useAlertStore, alertSeverityRank } from "../../state/AlertStore";
import type { AlertSeverity } from "../../utils/alertEngine";
import { parseEventDateLabel, dateKey } from "../../utils/dateUtils";
import { formatSlotHuman, compareSlots } from "../../utils/slotUtils";
import { getGuestSplitText } from "../../utils/hallUtils";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { StatusPill } from "../../ui/StatusPill";
import styles from "./BookingListPage.module.css";

type StatusFilter = BookingStatus | "ALL";
type StateFilter = "ACTIVE" | "DELETED" | "ALL";
type DateScope = "UPCOMING" | "PAST" | "ALL";
type SortMode = "STATUS_THEN_DATE" | "DATE_ASC" | "DATE_DESC";
type Density = "COMFY" | "COMPACT";

type BookingRow = {
  booking: MockBooking;
  eventDate: Date;
  eventDateKey: string; // YYYY-MM-DD
};

const statusPriority: Record<BookingStatus, number> = {
  INQUIRY: 0,
  TENTATIVE: 1,
  CONFIRMED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
};

const STORAGE_KEY = "luxurium.bookingListView.v1";

type PersistedView = {
  q?: string;
  status?: StatusFilter;
  year?: string;
  month?: string;
  day?: string;
  state?: StateFilter;
  scope?: DateScope;
  sort?: SortMode;
  rows?: number;
  density?: Density;
  page?: number;
};

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function buildCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";

  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escapeCell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ];

  return lines.join("\n");
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

function toCsvRows(
  rows: BookingRow[],
  alertInfoByBooking: Map<number, { count: number; maxSeverity: AlertSeverity }>
) {
  return rows.map(({ booking: b, eventDateKey }) => {
    const alertInfo = alertInfoByBooking.get(b.id);
    const alertCount = alertInfo?.count ?? 0;
    const maxAlertSeverity = alertInfo?.maxSeverity ?? "";

    return {
      id: b.id,
      bookingRef: b.bookingRef,
      eventDateLabel: b.eventDateLabel,
      dateKey: eventDateKey,
      slot: formatSlotHuman(b.slot),
      eventTitle: b.eventTitle,
      nameplateText: b.nameplateText ?? "",
      customerName: b.customerName ?? "",
      familyOrCompanyName: b.familyOrCompanyName ?? "",
      customerPhone: b.customerPhone ?? "",
      customerWhatsapp: b.customerWhatsapp ?? "",
      customerAddress: b.customerAddress ?? "",
      customerReference: b.customerReference ?? "",
      totalGuests: b.totalGuests ?? "",
      hallAGuests: b.hallAGuests ?? "",
      hallBGuests: b.hallBGuests ?? "",
      hallSplitText: getGuestSplitText(b) ?? "",
      hasPerformance: b.hasPerformance ? "YES" : "NO",
      performanceDescription: b.performanceDescription ?? "",
      status: b.status,
      isDeleted: b.isDeleted ? "YES" : "NO",
      activeAlertsCount: alertCount,
      maxAlertSeverity,
    };
  });
}

const BookingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { bookings: activeBookings, allBookings } = useBookingStore();
  const { alerts } = useAlertStore();

  // Debounced search
  const [searchDraft, setSearchDraft] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("ACTIVE");
  const [dateScope, setDateScope] = useState<DateScope>("UPCOMING");
  const [sortMode, setSortMode] = useState<SortMode>("DATE_ASC");
  const [density, setDensity] = useState<Density>("COMFY");

  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  const todayKey = dateKey(new Date());
  const didInitRef = useRef(false);

  // Hydrate from URL (preferred) or localStorage
  useEffect(() => {
    const p = Object.fromEntries(searchParams.entries());
    const hasUrlState = Object.keys(p).length > 0;

    const apply = (v: PersistedView) => {
      const q = v.q ?? "";
      setSearchDraft(q);
      setSearchQuery(q);

      setStatusFilter((v.status ?? "ALL") as StatusFilter);
      setYearFilter(v.year ?? "");
      setMonthFilter(v.month ?? "");
      setDayFilter(v.day ?? "");
      setStateFilter((v.state ?? "ACTIVE") as StateFilter);
      setDateScope((v.scope ?? "UPCOMING") as DateScope);
      setSortMode((v.sort ?? "DATE_ASC") as SortMode);
      setPageSize(typeof v.rows === "number" ? v.rows : 25);
      setDensity((v.density ?? "COMFY") as Density);
      setPage(typeof v.page === "number" ? v.page : 1);
    };

    if (hasUrlState) {
      apply({
        q: p.q ?? "",
        status: (p.status as StatusFilter) ?? "ALL",
        year: p.year ?? "",
        month: p.month ?? "",
        day: p.day ?? "",
        state: (p.state as StateFilter) ?? "ACTIVE",
        scope: (p.scope as DateScope) ?? "UPCOMING",
        sort: (p.sort as SortMode) ?? "DATE_ASC",
        rows: p.rows ? Number(p.rows) : 25,
        density: (p.density as Density) ?? "COMFY",
        page: p.page ? Number(p.page) : 1,
      });
    } else {
      const saved = safeParseJSON<PersistedView>(localStorage.getItem(STORAGE_KEY));
      if (saved) apply(saved);
    }

    didInitRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce searchDraft -> searchQuery
  useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchDraft), 200);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  const isSearchSyncing = searchDraft !== searchQuery;

  // Reset pagination when filters change
  useEffect(() => {
    if (!didInitRef.current) return;
    setPage(1);
  }, [
    searchQuery,
    statusFilter,
    yearFilter,
    monthFilter,
    dayFilter,
    stateFilter,
    dateScope,
    sortMode,
    pageSize,
    density,
  ]);

  // Persist to localStorage + URL query params
  useEffect(() => {
    if (!didInitRef.current) return;

    const view: PersistedView = {
      q: searchQuery.trim() ? searchQuery : "",
      status: statusFilter,
      year: yearFilter,
      month: monthFilter,
      day: dayFilter,
      state: stateFilter,
      scope: dateScope,
      sort: sortMode,
      rows: pageSize,
      density,
      page,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    } catch {
      // ignore
    }

    const next = new URLSearchParams();

    if (view.q) next.set("q", view.q);
    if (statusFilter !== "ALL") next.set("status", String(statusFilter));
    if (yearFilter) next.set("year", yearFilter);
    if (monthFilter) next.set("month", monthFilter);
    if (dayFilter) next.set("day", dayFilter);
    if (stateFilter !== "ACTIVE") next.set("state", stateFilter);
    if (dateScope !== "UPCOMING") next.set("scope", dateScope);
    if (sortMode !== "DATE_ASC") next.set("sort", sortMode);
    if (pageSize !== 25) next.set("rows", String(pageSize));
    if (density !== "COMFY") next.set("density", density);
    if (page !== 1) next.set("page", String(page));

    const current = searchParams.toString();
    const nextStr = next.toString();
    if (current !== nextStr) {
      setSearchParams(next, { replace: true });
    }
  }, [
    searchQuery,
    statusFilter,
    yearFilter,
    monthFilter,
    dayFilter,
    stateFilter,
    dateScope,
    sortMode,
    pageSize,
    density,
    page,
    searchParams,
    setSearchParams,
  ]);

  // Active alerts per booking
  const alertInfoByBooking = useMemo(() => {
    const map = new Map<number, { count: number; maxSeverity: AlertSeverity }>();

    for (const a of alerts) {
      if (a.effectiveStatus !== "ACTIVE") continue;
      if (typeof a.bookingId !== "number") continue;

      const prev = map.get(a.bookingId) ?? { count: 0, maxSeverity: "info" as AlertSeverity };
      const nextCount = prev.count + 1;
      const nextMax =
        alertSeverityRank(a.severity) > alertSeverityRank(prev.maxSeverity)
          ? a.severity
          : prev.maxSeverity;

      map.set(a.bookingId, { count: nextCount, maxSeverity: nextMax });
    }

    return map;
  }, [alerts]);

  // Build rows based on filters
  const filteredRows = useMemo(() => {
    let base: MockBooking[];
    if (stateFilter === "ACTIVE") {
      base = [...activeBookings];
    } else if (stateFilter === "DELETED") {
      base = allBookings.filter((b) => b.isDeleted);
    } else {
      base = [...allBookings];
    }

    let rows: BookingRow[] = base.map((b) => {
      const d = parseEventDateLabel(b.eventDateLabel);
      const key = dateKey(d);
      return { booking: b, eventDate: d, eventDateKey: key };
    });

    if (dateScope === "UPCOMING") {
      rows = rows.filter((r) => r.eventDateKey >= todayKey);
    } else if (dateScope === "PAST") {
      rows = rows.filter((r) => r.eventDateKey < todayKey);
    }

    const search = searchQuery.trim().toLowerCase();
    if (search.length > 0) {
      rows = rows.filter(({ booking: b }) => {
        const haystack = [
          b.bookingRef,
          b.eventTitle,
          b.nameplateText,
          b.customerName,
          b.customerPhone,
          b.customerWhatsapp,
          b.familyOrCompanyName,
          b.customerAddress,
          b.customerReference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });
    }

    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => r.booking.status === statusFilter);
    }

    if (yearFilter || monthFilter || dayFilter) {
      rows = rows.filter((r) => {
        const d = r.eventDate;
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();

        if (yearFilter && year !== Number(yearFilter)) return false;
        if (monthFilter && month !== Number(monthFilter)) return false;
        if (dayFilter && day !== Number(dayFilter)) return false;

        return true;
      });
    }

    rows.sort((ra, rb) => {
      const a = ra.booking;
      const b = rb.booking;

      const timeDiff = ra.eventDate.getTime() - rb.eventDate.getTime();

      if (sortMode === "DATE_DESC") {
        if (timeDiff !== 0) return -timeDiff;
        return compareSlots(a.slot, b.slot);
      }

      if (sortMode === "STATUS_THEN_DATE") {
        const pa = statusPriority[a.status];
        const pb = statusPriority[b.status];
        if (pa !== pb) return pa - pb;

        if (timeDiff !== 0) return timeDiff;
        return compareSlots(a.slot, b.slot);
      }

      if (timeDiff !== 0) return timeDiff;
      return compareSlots(a.slot, b.slot);
    });

    return rows;
  }, [
    activeBookings,
    allBookings,
    searchQuery,
    statusFilter,
    yearFilter,
    monthFilter,
    dayFilter,
    stateFilter,
    dateScope,
    sortMode,
    todayKey,
  ]);

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const pagedRows = filteredRows.slice(startIndex, endIndex);

  const scopeLabel =
    dateScope === "UPCOMING" ? "Upcoming (today+)" : dateScope === "PAST" ? "Past" : "All";

  const exportRows = (rows: BookingRow[], filenamePrefix: string) => {
    const csvRows = toCsvRows(rows, alertInfoByBooking);
    const csv = buildCsv(csvRows);
    const today = new Date().toISOString().slice(0, 10);
    const name = `${filenamePrefix}-${today}.csv`;
    downloadTextFile(name, csv, "text/csv;charset=utf-8");
  };

  const exportFiltered = () => exportRows(filteredRows, "luxurium-bookings-filtered");
  const exportThisPage = () => exportRows(pagedRows, "luxurium-bookings-page");
  const exportAll = () => {
    const allRows: BookingRow[] = allBookings.map((b) => {
      const d = parseEventDateLabel(b.eventDateLabel);
      const key = dateKey(d);
      return { booking: b, eventDate: d, eventDateKey: key };
    });
    exportRows(allRows, "luxurium-bookings-all");
  };

  return (
    <main className={styles.main}>
      <div className={styles.titleRow}>
        <div>
          <h1>Luxurium – Bookings</h1>
          <p className={styles.intro}>
            Default view shows <strong>Upcoming bookings (today and forward)</strong>. Older
            bookings are available via Date Scope.
          </p>
        </div>

        <div className={styles.pageActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={exportFiltered}
            disabled={isSearchSyncing}
          >
            Export filtered ({totalCount})
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={exportThisPage}
            disabled={isSearchSyncing}
          >
            Export page ({pagedRows.length})
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={exportAll}
            disabled={isSearchSyncing}
          >
            Export all ({allBookings.length})
          </Button>
          <Button type="button" variant="primary" onClick={() => navigate("/bookings/new")}>
            New booking
          </Button>
        </div>
      </div>

      <Card className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          <div className={styles.search}>
            <label className={styles.filterLabel} htmlFor="bookingSearch">
              Search
            </label>
            <div className={styles.searchInputWrap}>
              <input
                id="bookingSearch"
                type="text"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Event, customer, phone, address, reference, booking ref…"
                className={styles.filterInput}
              />
              {searchDraft.trim().length > 0 && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  aria-label="Clear search"
                  onClick={() => setSearchDraft("")}
                >
                  ×
                </button>
              )}
            </div>
            {isSearchSyncing && <div className={styles.searchHint}>Updating…</div>}
          </div>

          <div>
            <label className={styles.filterLabel} htmlFor="dateScope">
              Date scope
            </label>
            <select
              id="dateScope"
              value={dateScope}
              onChange={(e) => setDateScope(e.target.value as DateScope)}
              className={`${styles.filterInput} ${styles.w170}`}
            >
              <option value="UPCOMING">Upcoming (today+)</option>
              <option value="PAST">Past</option>
              <option value="ALL">All</option>
            </select>
          </div>

          <div>
            <label className={styles.filterLabel} htmlFor="sortMode">
              Sort
            </label>
            <select
              id="sortMode"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className={`${styles.filterInput} ${styles.w190}`}
            >
              <option value="STATUS_THEN_DATE">Needs action first</option>
              <option value="DATE_ASC">Date ↑ (old → new)</option>
              <option value="DATE_DESC">Date ↓ (new → old)</option>
            </select>
          </div>

          <div>
            <label className={styles.filterLabel} htmlFor="density">
              Density
            </label>
            <select
              id="density"
              value={density}
              onChange={(e) => setDensity(e.target.value as Density)}
              className={`${styles.filterInput} ${styles.w150}`}
            >
              <option value="COMFY">Comfortable</option>
              <option value="COMPACT">Compact</option>
            </select>
          </div>

          <div className={styles.dateGroup}>
            <div>
              <label className={styles.filterLabel} htmlFor="yearFilter">
                Year
              </label>
              <input
                id="yearFilter"
                type="number"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                placeholder="2025"
                className={`${styles.filterInput} ${styles.w90}`}
              />
            </div>

            <div>
              <label className={styles.filterLabel} htmlFor="monthFilter">
                Month
              </label>
              <select
                id="monthFilter"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className={`${styles.filterInput} ${styles.w120}`}
              >
                <option value="">All</option>
                <option value="1">Jan</option>
                <option value="2">Feb</option>
                <option value="3">Mar</option>
                <option value="4">Apr</option>
                <option value="5">May</option>
                <option value="6">Jun</option>
                <option value="7">Jul</option>
                <option value="8">Aug</option>
                <option value="9">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>
            </div>

            <div>
              <label className={styles.filterLabel} htmlFor="dayFilter">
                Day
              </label>
              <input
                id="dayFilter"
                type="number"
                min={1}
                max={31}
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                placeholder="1–31"
                className={`${styles.filterInput} ${styles.w80}`}
              />
            </div>
          </div>

          <div>
            <label className={styles.filterLabel} htmlFor="statusFilter">
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={`${styles.filterInput} ${styles.w140}`}
            >
              <option value="ALL">All</option>
              <option value="INQUIRY">Inquiry</option>
              <option value="TENTATIVE">Tentative</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className={styles.filterLabel} htmlFor="stateFilter">
              State
            </label>
            <select
              id="stateFilter"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as StateFilter)}
              className={`${styles.filterInput} ${styles.w170}`}
            >
              <option value="ACTIVE">Active only</option>
              <option value="DELETED">Deleted / Trash</option>
              <option value="ALL">All (incl. deleted)</option>
            </select>
          </div>

          <div>
            <label className={styles.filterLabel} htmlFor="pageSize">
              Rows
            </label>
            <select
              id="pageSize"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`${styles.filterInput} ${styles.w110}`}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className={styles.clearRow}>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setSearchDraft("");
              setSearchQuery("");
              setStatusFilter("ALL");
              setYearFilter("");
              setMonthFilter("");
              setDayFilter("");
              setStateFilter("ACTIVE");
              setDateScope("UPCOMING");
              setSortMode("DATE_ASC");
              setPageSize(25);
              setDensity("COMFY");
              setPage(1);
            }}
          >
            Clear filters
          </Button>

          <div className={styles.summary}>
            <strong>{scopeLabel}</strong> · Showing{" "}
            <strong>{totalCount === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of{" "}
            <strong>{totalCount}</strong>
          </div>
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableHeaderLeft}>
            <div>
              <strong>{totalCount}</strong> booking{totalCount !== 1 ? "s" : ""} found
            </div>
          </div>

          <div className={styles.paginationControls}>
            <Button
              type="button"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              ← Prev
            </Button>
            <div className={styles.pageLabel}>
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next →
            </Button>
          </div>
        </div>

        <div className={[styles.tableWrap, density === "COMPACT" ? styles.densityCompact : ""].join(" ")}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.theadRow}>
                <th className={styles.th}>Date / Slot</th>
                <th className={styles.th}>Event</th>
                <th className={styles.th}>Customer</th>
                <th className={styles.th}>Guests / Halls</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    <span className={styles.emptyText}>No bookings match your filters.</span>
                  </td>
                </tr>
              ) : (
                pagedRows.map(({ booking: b, eventDate: d }) => {
                  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });

                  const isDeleted = b.isDeleted === true;
                  const totalGuests = b.totalGuests ?? 0;
                  const guestSplit = getGuestSplitText(b);

                  const rowClassName = [
                    styles.row,
                    styles.rowClickable,
                    isDeleted ? styles.rowDeleted : "",
                    isDeleted && stateFilter === "ALL" ? styles.rowDeletedDim : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const alertInfo = alertInfoByBooking.get(b.id);
                  const alertCount = alertInfo?.count ?? 0;
                  const alertMax = alertInfo?.maxSeverity ?? "info";

                  const alertBadgeClass =
                    alertCount === 0
                      ? ""
                      : alertMax === "critical"
                      ? styles.alertBadgeCritical
                      : alertMax === "warning"
                      ? styles.alertBadgeWarning
                      : styles.alertBadgeInfo;

                  return (
                    <tr
                      key={b.id}
                      className={rowClassName}
                      onClick={() => navigate(`/bookings/${b.id}`)}
                      title="Click to open booking"
                    >
                      <td className={styles.td}>
                        <div className={styles.datePrimary}>
                          {weekday} {b.eventDateLabel}
                        </div>
                        <div className={styles.smallMuted}>{formatSlotHuman(b.slot)}</div>
                        <div className={styles.smallFaint}>{dateKey(d)}</div>
                      </td>

                      <td className={styles.td}>
                        <div className={styles.eventTitle}>{b.eventTitle}</div>
                        {b.nameplateText && (
                          <div className={styles.nameplate}>
                            Nameplate: <strong>{b.nameplateText}</strong>
                          </div>
                        )}
                        <div className={styles.refText}>Ref: {b.bookingRef}</div>
                        {b.hasPerformance && (
                          <div className={styles.performance}>
                            🎵 Performance
                            {b.performanceDescription ? ` – ${b.performanceDescription}` : ""}
                          </div>
                        )}
                      </td>

                      <td className={styles.td}>
                        <div className={styles.customerName}>{b.customerName || "—"}</div>
                        {b.familyOrCompanyName && (
                          <div className={styles.customerSub}>{b.familyOrCompanyName}</div>
                        )}
                        <div className={styles.customerMeta}>
                          {b.customerPhone || "—"}
                          {b.customerWhatsapp && b.customerWhatsapp !== b.customerPhone && (
                            <span> • WhatsApp: {b.customerWhatsapp}</span>
                          )}
                        </div>
                        {b.customerAddress && (
                          <div className={styles.customerMeta}>Address: {b.customerAddress}</div>
                        )}
                        {b.customerReference && (
                          <div className={styles.customerMeta}>
                            Ref / Care of: {b.customerReference}
                          </div>
                        )}
                      </td>

                      <td className={styles.td}>
                        <div className={styles.guestCount}>
                          {totalGuests.toLocaleString("en-PK")} guests
                        </div>
                        <div className={styles.guestSplit}>
                          {guestSplit || "Hall allocation TBD"}
                        </div>
                      </td>

                      <td className={styles.td}>
                        <div>
                          <StatusPill status={b.status} size="sm" />
                        </div>

                        {alertCount > 0 && (
                          <div className={styles.alertBadgeWrap}>
                            <span className={`${styles.alertBadge} ${alertBadgeClass}`}>
                              Alerts: {alertCount}
                            </span>
                          </div>
                        )}

                        {isDeleted && (
                          <div className={styles.deletedBadgeWrap}>
                            <span className={styles.deletedBadge}>Deleted</span>
                          </div>
                        )}
                      </td>

                      <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.actionsCell}>
                          <div className={styles.actionRow}>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={() => navigate(`/bookings/${b.id}`)}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/bookings/${b.id}?mode=edit`)}
                            >
                              Edit
                            </Button>
                          </div>

                          <div className={styles.actionRow}>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                navigate("/bookings/new", {
                                  state: { duplicateFromId: b.id },
                                })
                              }
                            >
                              Duplicate
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                copyToClipboard(
                                  `Booking #${b.id} | Ref: ${b.bookingRef} | ${b.eventTitle}`
                                )
                              }
                            >
                              Copy ref
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footerPager}>
          <div className={styles.footerSummary}>
            Showing <strong>{totalCount === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of{" "}
            <strong>{totalCount}</strong>
          </div>

          <div className={styles.paginationControls}>
            <Button
              type="button"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              ← Prev
            </Button>
            <div className={styles.pageLabel}>
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
};

export default BookingListPage;
