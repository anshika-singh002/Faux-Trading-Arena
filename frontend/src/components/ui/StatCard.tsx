import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | ReactNode;
  change?: string | ReactNode;
  changePositive?: boolean;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  changePositive,
  icon,
  className = "",
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={`surface rounded-lg ${compact ? "p-3" : "p-4"} ${className}`}
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="stat-label">{label}</div>
          <div className={`stat-value ${compact ? "text-xl" : ""}`}>{value}</div>
          {change !== undefined && (
            <div
              className="stat-change"
              style={{
                color:
                  changePositive === undefined
                    ? "var(--color-text-3)"
                    : changePositive
                    ? "var(--color-positive)"
                    : "var(--color-negative)",
              }}
            >
              {change}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              color: "var(--color-text-3)",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
