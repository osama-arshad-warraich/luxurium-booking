import React from "react";

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Very small shared Card primitive for Luxurium back-office.
 * - Gives you consistent padding, border, background.
 * - You can override anything via the `style` prop.
 */
const baseCardStyle: React.CSSProperties = {
  padding: "0.9rem 1rem",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
};

export const Card: React.FC<CardProps> = ({
  children,
  style,
  ...rest
}) => {
  return (
    <div style={{ ...baseCardStyle, ...style }} {...rest}>
      {children}
    </div>
  );
};
