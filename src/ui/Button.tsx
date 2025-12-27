// src/ui/Button.tsx
import React from "react";

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "md" | "sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** If true, button stretches to full width of its container. */
  fullWidth?: boolean;
}

const baseButtonStyle: React.CSSProperties = {
  borderRadius: 6,
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  fontSize: "0.9rem",
  cursor: "pointer",
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  md: {
    padding: "0.45rem 0.9rem",
    fontSize: "0.9rem",
  },
  sm: {
    padding: "0.3rem 0.6rem",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
  },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  secondary: {},
  primary: {
    borderColor: "#2563eb",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
  },
};

const disabledStyles: React.CSSProperties = {
  opacity: 0.6,
  cursor: "not-allowed",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  fullWidth,
  disabled,
  style,
  ...rest
}) => {
  const widthStyle = fullWidth ? { width: "100%" } : undefined;

  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...baseButtonStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...(disabled ? disabledStyles : {}),
        ...widthStyle,
        ...style,
      }}
    />
  );
};
