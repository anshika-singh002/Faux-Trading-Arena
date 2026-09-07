"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatPercent } from "@/lib/mock-data";

interface PriceChangeProps {
  value: number;
  percent: number;
  showIcon?: boolean;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceChange({
  value,
  percent,
  showIcon = true,
  showValue = true,
  size = "md",
  className = "",
}: PriceChangeProps) {
  const isPositive = percent > 0;
  const isNegative = percent < 0;
  const isNeutral = percent === 0;

  const color = isPositive
    ? "var(--color-positive)"
    : isNegative
    ? "var(--color-negative)"
    : "var(--color-text-3)";

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium tabular ${sizeClasses[size]} ${className}`}
      style={{ color }}
    >
      {showIcon && (
        isPositive ? <TrendingUp size={iconSize} /> :
        isNegative ? <TrendingDown size={iconSize} /> :
        <Minus size={iconSize} />
      )}
      {showValue && value !== 0 && (
        <span>
          {isPositive ? "+" : ""}{value.toFixed(2)}
        </span>
      )}
      <span>({formatPercent(percent)})</span>
    </span>
  );
}

interface ChangeTagProps {
  percent: number;
  size?: "sm" | "md";
}

export function ChangeTag({ percent, size = "sm" }: ChangeTagProps) {
  const isPositive = percent >= 0;
  return (
    <span
      className={`badge ${isPositive ? "badge-positive" : "badge-negative"} ${size === "sm" ? "text-xs" : "text-sm"}`}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(percent).toFixed(2)}%
    </span>
  );
}
