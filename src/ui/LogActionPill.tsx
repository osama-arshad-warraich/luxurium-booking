// src/ui/LogActionPill.tsx
// Shared pill/badge for audit log actions (CREATE, UPDATE, DELETE, RESTORE, etc.)

import React from "react";

export interface LogActionPillProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  action: string;
  /**
   * Visual size of the pill. `sm` is good for dense tables/lists,
   * `md` for more prominent cards.
   */
  size?: "sm" | "md";
}

interface ActionStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  label: string;
}

const ACTION_STYLES: Record<string, ActionStyle> = {
  CREATE: {
    backgroundColor: "#dcfce7",
    borderColor: "#22c55e",
    textColor: "#166534",
    label: "Created",
  },
  UPDATE: {
    backgroundColor: "#e0f2fe",
    borderColor: "#60a5fa",
    textColor: "#1d4ed8",
    label: "Updated",
  },
  DELETE: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    textColor: "#b91c1c",
    label: "Deleted",
  },
  RESTORE: {
    backgroundColor: "#ecfdf5",
    borderColor: "#22c55e",
    textColor: "#15803d",
    label: "Restored",
  },
};

export const LogActionPill: React.FC<LogActionPillProps> = ({
  action,
  size = "sm",
  style,
  children,
  ...rest
}) => {
  const key = action.toUpperCase();
  const base =
    ACTION_STYLES[key] ??
    ({
      backgroundColor: "#f3f4f6",
      borderColor: "#d1d5db",
      textColor: "#374151",
      label: key,
    } as ActionStyle);

  const padding = size === "md" ? "0.18rem 0.7rem" : "0.05rem 0.45rem";
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
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children ?? base.label}
    </span>
  );
};
