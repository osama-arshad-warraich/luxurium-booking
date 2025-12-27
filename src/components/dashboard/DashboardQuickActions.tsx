// src/components/dashboard/DashboardQuickActions.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

const DashboardQuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2>Quick Actions</h2>
      <div
        style={{
          marginTop: "0.75rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => navigate("/bookings/new")}>New Booking</button>
        <button onClick={() => navigate("/calendar")}>Open Calendar</button>
        <button onClick={() => navigate("/bookings")}>View All Bookings</button>
        <button onClick={() => navigate("/reports")}>Reports</button>
        <button onClick={() => navigate("/alerts")}>Alerts</button>
        <button onClick={() => navigate("/settings")}>Settings</button>
        <button onClick={() => navigate("/audit-log")}>Audit log</button>
      </div>
    </section>
  );
};

export default DashboardQuickActions;
