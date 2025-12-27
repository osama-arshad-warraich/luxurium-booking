// src/ui/StatusPill.tsx
// Shared pill/badge for booking statuses (Inquiry, Tentative, Confirmed, etc.)

import React from "react";
import type { BookingStatus } from "../mock/bookingsMockApi";

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: BookingStatus;
  /**
   * Visual size of the pill. `sm` is good for tables, `md` for headers/cards.
   */
  size?: "sm" | "md";
}

interface StatusStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  label: string;
}

// Canonical status colors/labels used across the app
const STATUS_STYLES: Record<BookingStatus, StatusStyle> = {
  INQUIRY: {
    backgroundColor: "#e0f2fe",
    borderColor: "#60a5fa",
    textColor: "#1d4ed8",
    label: "Inquiry",
  },
  TENTATIVE: {
    backgroundColor: "#fef3c7",
    borderColor: "#facc15",
    textColor: "#92400e",
    label: "Tentative",
  },
  CONFIRMED: {
    backgroundColor: "#dcfce7",
    borderColor: "#22c55e",
    textColor: "#166534",
    label: "Confirmed",
  },
  COMPLETED: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
    textColor: "#374151",
    label: "Completed",
  },
  CANCELLED: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    textColor: "#b91c1c",
    label: "Cancelled",
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = "sm",
  style,
  children,
  ...rest
}) => {
  const base =
    STATUS_STYLES[status] ??
    ({
      backgroundColor: "#ffffff",
      borderColor: "#d1d5db",
      textColor: "#374151",
      label: status,
    } as StatusStyle);

  const padding = size === "md" ? "0.18rem 0.7rem" : "0.1rem 0.5rem";
  const fontSize = size === "md" ? "0.8rem" : "0.75rem";

  return (
    <span
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding,
        borderRadius: 999,
        border: `1px solid ${base.borderColor}`,
        backgroundColor: base.backgroundColor,
        color: base.textColor,
        fontSize,
        fontWeight: 600,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children ?? base.label}
    </span>
  );
};
