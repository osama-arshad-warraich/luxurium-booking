// src/App.tsx
import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage/DashboardPage";
import CalendarPage from "./pages/CalendarPage/CalendarPage";
import BookingListPage from "./pages/BookingListPage/BookingListPage";
import BookingDetailPage from "./pages/BookingDetailPage/BookingDetailPage";
import BookingFormPage from "./pages/BookingFormPage/BookingFormPage";
import AlertsPage from "./pages/AlertsPage/AlertsPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import AuditLogPage from "./pages/AuditLogPage/AuditLogPage";
import ReportsPage from "./pages/ReportsPage/ReportsPage";
import styles from "./App.module.css";


const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const isActive = (pathPrefix: string) =>
    location.pathname === pathPrefix ||
    location.pathname.startsWith(pathPrefix + "/");

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.header}>
        <div className={styles.brandWrap}>
          <div className={styles.brandLogo}>L</div>
          <div className={styles.brandText}>
            <div className={styles.brandTitle}>Luxurium Booking</div>
            <div className={styles.brandSub}>Internal management console</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className={styles.nav}>
          <Link
            to="/dashboard"
            className={`${styles.navLink} ${
              isActive("/dashboard") ? styles.navLinkActive : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/calendar"
            className={`${styles.navLink} ${
              isActive("/calendar") ? styles.navLinkActive : ""
            }`}
          >
            Calendar
          </Link>
          <Link
            to="/bookings"
            className={`${styles.navLink} ${
              isActive("/bookings") ? styles.navLinkActive : ""
            }`}
          >
            Bookings
          </Link>
          <Link
            to="/alerts"
            className={`${styles.navLink} ${
              isActive("/alerts") ? styles.navLinkActive : ""
            }`}
          >
            Alerts
          </Link>
          <Link
            to="/audit-log"
            className={`${styles.navLink} ${
              isActive("/audit-log") ? styles.navLinkActive : ""
            }`}
          >
            Audit Log
          </Link>
          <Link
            to="/settings"
            className={`${styles.navLink} ${
              isActive("/settings") ? styles.navLinkActive : ""
            }`}
          >
            Settings
          </Link>
          <Link
            to="/reports"
            className={`${styles.navLink} ${
              isActive("/reports") ? styles.navLinkActive : ""
            }`}
          >
            Reports
          </Link>
        </nav>
      </header>

      {/* Content */}
      <div className={styles.content}>{children}</div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppLayout>
      <Routes>
        {/* Redirect root to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Main pages */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/bookings" element={<BookingListPage />} />
        <Route path="/bookings/new" element={<BookingFormPage />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
