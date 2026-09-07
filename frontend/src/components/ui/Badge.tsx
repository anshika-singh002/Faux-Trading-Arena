import { ReactNode } from "react";

type BadgeVariant = "positive" | "negative" | "warning" | "info" | "neutral" | "brand";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className = "", dot }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
          }}
        />
      )}
      {children}
    </span>
  );
}

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const map: Record<string, BadgeVariant> = {
    filled: "positive",
    open: "info",
    partial: "warning",
    pending: "warning",
    cancelled: "neutral",
    rejected: "negative",
    expired: "neutral",
  };

  return (
    <Badge variant={map[status] ?? "neutral"} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
