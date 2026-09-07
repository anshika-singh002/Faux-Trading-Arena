"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { generateOHLCV } from "@/lib/mock-data";
import type { TimeRange } from "@/lib/types";

interface PriceChartProps {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  height?: number;
  showVolume?: boolean;
  showControls?: boolean;
}

const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];

export function PriceChart({
  symbol,
  currentPrice,
  changePercent,
  height = 320,
  showVolume = true,
  showControls = true,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);

  const [activeRange, setActiveRange] = useState<TimeRange>("1M");
  const [chartType, setChartType] = useState<"area" | "candlestick">("area");
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);

  const isPositive = changePercent >= 0;

  const loadData = useCallback(() => {
    const chart = chartRef.current;
    const mainSeries = mainSeriesRef.current;
    if (!chart || !mainSeries) return;

    const data = generateOHLCV(symbol, activeRange);
    if (data.length === 0) return;

    if (chartType === "candlestick") {
      mainSeries.setData(
        data.map((d) => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    } else {
      mainSeries.setData(
        data.map((d) => ({
          time: d.time,
          value: d.close,
        }))
      );
    }

    if (showVolume && volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        data.map((d) => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? "rgba(38,194,129,0.4)" : "rgba(224,82,82,0.4)",
        }))
      );
    }

    chart.timeScale().fitContent();
  }, [symbol, activeRange, chartType, showVolume]);

  // Init chart (runs once)
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    import("lightweight-charts").then((lc) => {
      if (!mounted || !containerRef.current) return;

      const chart = lc.createChart(containerRef.current, {
        layout: {
          background: { type: lc.ColorType.Solid, color: "transparent" },
          textColor: "#5C6480",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#1F2235", style: lc.LineStyle.Dotted },
          horzLines: { color: "#1F2235", style: lc.LineStyle.Dotted },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: {
            color: "#5C6480",
            width: 1,
            style: lc.LineStyle.Dashed,
            labelBackgroundColor: "#21253A",
          },
          horzLine: {
            color: "#5C6480",
            width: 1,
            style: lc.LineStyle.Dashed,
            labelBackgroundColor: "#21253A",
          },
        },
        rightPriceScale: {
          borderColor: "#2A2E40",
          textColor: "#5C6480",
        },
        timeScale: {
          borderColor: "#2A2E40",
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
        width: containerRef.current.clientWidth,
        height,
      });

      chartRef.current = chart;

      // Volume series
      if (showVolume) {
        try {
          // v5 API
          const vs = chart.addSeries(lc.HistogramSeries, {
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
          });
          vs.priceScale().applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
            borderVisible: false,
          });
          volumeSeriesRef.current = vs;
        } catch {
          // v4 fallback — silently skip volume
        }
      }

      // Main series
      const color = isPositive ? "#26C281" : "#E05252";
      let mainSeries;
      try {
        if (chartType === "area") {
          mainSeries = chart.addSeries(lc.AreaSeries, {
            lineColor: color,
            topColor: isPositive ? "rgba(38,194,129,0.18)" : "rgba(224,82,82,0.18)",
            bottomColor: "rgba(0,0,0,0)",
            lineWidth: 2,
            priceLineVisible: true,
            priceLineColor: color,
            priceLineStyle: lc.LineStyle.Dashed,
          });
        } else {
          mainSeries = chart.addSeries(lc.CandlestickSeries, {
            upColor: "#26C281",
            downColor: "#E05252",
            borderUpColor: "#26C281",
            borderDownColor: "#E05252",
            wickUpColor: "#26C281",
            wickDownColor: "#E05252",
          });
        }
      } catch {
        // v4 fallback
        if (chartType === "area") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mainSeries = (chart as any).addAreaSeries({
            lineColor: color,
            topColor: isPositive ? "rgba(38,194,129,0.18)" : "rgba(224,82,82,0.18)",
            bottomColor: "rgba(0,0,0,0)",
            lineWidth: 2,
          });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mainSeries = (chart as any).addCandlestickSeries({
            upColor: "#26C281", downColor: "#E05252",
          });
        }
      }

      mainSeriesRef.current = mainSeries;

      // Crosshair
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.subscribeCrosshairMove((param: any) => {
        if (!param?.time || !mainSeries) {
          setCrosshairPrice(null);
          return;
        }
        const data = param.seriesData?.get(mainSeries);
        if (data && typeof data === "object") {
          const d = data as Record<string, number>;
          setCrosshairPrice(d.close ?? d.value ?? null);
        }
      });

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);

      // Load initial data
      const ohlcv = generateOHLCV(symbol, "1M");
      if (chartType === "area") {
        mainSeries.setData(ohlcv.map((d) => ({ time: d.time, value: d.close })));
      } else {
        mainSeries.setData(ohlcv);
      }
      if (showVolume && volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(
          ohlcv.map((d) => ({
            time: d.time, value: d.volume,
            color: d.close >= d.open ? "rgba(38,194,129,0.4)" : "rgba(224,82,82,0.4)",
          }))
        );
      }
      chart.timeScale().fitContent();

      return () => {
        mounted = false;
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        mainSeriesRef.current = null;
        volumeSeriesRef.current = null;
      };
    });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload on range/type change
  useEffect(() => {
    if (mainSeriesRef.current) loadData();
  }, [activeRange, loadData]);

  return (
    <div style={{ position: "relative" }}>
      {showControls && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          {/* Range buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: r === activeRange ? "var(--color-brand)" : "var(--color-border)",
                  background: r === activeRange ? "var(--color-brand-muted)" : "transparent",
                  color: r === activeRange ? "var(--color-brand)" : "var(--color-text-3)",
                  fontSize: "0.75rem",
                  fontWeight: r === activeRange ? 600 : 400,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div style={{ display: "flex", gap: 4, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 2 }}>
            {(["area", "candlestick"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 4,
                  border: "none",
                  background: chartType === type ? "var(--color-surface-2)" : "transparent",
                  color: chartType === type ? "var(--color-text)" : "var(--color-text-3)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  textTransform: "capitalize",
                }}
              >
                {type === "area" ? "Line" : "Candle"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crosshair tooltip */}
      {crosshairPrice !== null && (
        <div style={{
          position: "absolute",
          top: showControls ? 48 : 8,
          left: 8,
          zIndex: 10,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "4px 10px",
          fontSize: "0.75rem",
          fontFamily: "var(--font-mono)",
          pointerEvents: "none",
        }}>
          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
            ₹{crosshairPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div ref={containerRef} style={{ width: "100%", height }} className="chart-container" />
    </div>
  );
}
