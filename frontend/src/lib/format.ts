// Number formatting helpers (₹, percent, volume).

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1e12) {          // 1 lakh crore+
    return `₹${(value / 1e12).toFixed(2)} L Cr`;
  }
  if (compact && Math.abs(value) >= 1e7) {           // 1 crore+
    return `₹${(value / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
  }
  if (compact && Math.abs(value) >= 1e5) {           // 1 lakh+
    return `₹${(value / 1e5).toFixed(2)} L`;
  }
  if (compact && Math.abs(value) >= 1e3) {
    return `₹${(value / 1e3).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(volume: number): string {
  if (!volume) return "—";
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
