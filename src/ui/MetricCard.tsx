// src/ui/MetricCard.tsx
// Shared dashboard-style KPI tile used on Alerts, Dashboard, Reports, etc.

import React from "react";
import { Card } from "./Card";

export interface MetricCardProps {
  label: string;
  value: number | string;
  hint?: string;
  /**
   * Optional accent color for the side bar, e.g. "#ef4444".
   * If omitted, the card renders without the colored bar.
   */
  accentColor?: string;
}

/**
 * Luxurium metric tile:
 * - Uppercase label
 * - Big value
 * - Optional hint text
 * - Optional colored accent bar
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  hint,
  accentColor,
}) => {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        {accentColor && (
          <span
            style={{
              width: 6,
              height: 24,
              borderRadius: 999,
              backgroundColor: accentColor,
              display: "inline-block",
            }}
          />
        )}
        <div
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#6b7280",
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          marginTop: "0.25rem",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#111827",
        }}
      >
        {value}
      </div>

      {hint && (
        <div
          style={{
            marginTop: "0.35rem",
            fontSize: "0.78rem",
            color: "#9ca3af",
          }}
        >
          {hint}
        </div>
      )}
    </Card>
  );
};
