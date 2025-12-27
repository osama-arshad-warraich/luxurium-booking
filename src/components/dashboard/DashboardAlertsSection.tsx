// src/components/dashboard/DashboardAlertsSection.tsx
import React from "react";

export interface DashboardAlert {
  id: number;
  type: "NO_ADVANCE" | "TENTATIVE_SOON" | "OVERRIDE" | "OTHER";
  message: string;
}

interface DashboardAlertsSectionProps {
  alerts: DashboardAlert[];
}

const DashboardAlertsSection: React.FC<DashboardAlertsSectionProps> = ({
  alerts,
}) => {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2>Alerts</h2>

      {alerts.length === 0 && <p>No alerts right now. 🎉</p>}

      {alerts.length > 0 && (
        <ul style={{ marginTop: "0.75rem", paddingLeft: "1.25rem" }}>
          {alerts.map((alert) => (
            <li key={alert.id} style={{ marginBottom: "0.35rem" }}>
              {alert.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DashboardAlertsSection;
