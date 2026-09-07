import { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width, height = 16, className = "", style }: SkeletonProps) {
  return (
    <span
      className={`skeleton block ${className}`}
      style={{
        width: width ?? "100%",
        height,
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? "65%" : "100%"} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="surface rounded-lg p-4 flex flex-col gap-2">
      <Skeleton height={12} width={80} />
      <Skeleton height={28} width={120} />
      <Skeleton height={14} width={80} />
    </div>
  );
}
