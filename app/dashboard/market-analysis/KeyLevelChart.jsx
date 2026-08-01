"use client";

import { useEffect, useMemo, useRef } from "react";
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    LineStyle,
} from "lightweight-charts";
import { buildChartSummary } from "./format";

const LEVEL_STYLE = {
    do: { color: "#22d3ee", title: "DO" },
    pwh: { color: "#38bdf8", title: "PWH" },
    pdh: { color: "#B7FB5B", title: "PDH" },
    pdl: { color: "#f59e0b", title: "PDL" },
    pwl: { color: "#f472b6", title: "PWL" },
    pdm: { color: "#67e8f9", title: "PDM" },
    wo: { color: "#fde68a", title: "WO" },
    pwm: { color: "#facc15", title: "PWM" },
};

// Real-series candlestick chart. Levels rendered as price lines, never HTML overlays.
export default function KeyLevelChart({ payload }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);
    const priceLinesRef = useRef([]);

    // Create chart once.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        const chart = createChart(container, {
            layout: {
                background: { color: "transparent" },
                textColor: "#9ca3af",
                fontFamily: "inherit",
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: "rgba(148,163,184,0.08)" },
                horzLines: { color: "rgba(148,163,184,0.08)" },
            },
            rightPriceScale: { borderColor: "rgba(148,163,184,0.15)" },
            timeScale: {
                borderColor: "rgba(148,163,184,0.15)",
                barSpacing: 3,
                minBarSpacing: 2,
                timeVisible: true,
            },
            crosshair: { mode: 1 },
            autoSize: false,
            width: container.clientWidth,
            height: container.clientHeight,
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#B7FB5B",
            downColor: "#f87171",
            borderUpColor: "#B7FB5B",
            borderDownColor: "#f87171",
            wickUpColor: "#B7FB5B",
            wickDownColor: "#f87171",
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceScaleId: "volume",
            priceFormat: { type: "volume" },
        });
        chart.priceScale("volume").applyOptions({
            scaleMargins: { top: 0.82, bottom: 0 },
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;

        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            chart.resize(width, height);
        });
        observer.observe(container);

        return () => {
            observer.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
            priceLinesRef.current = [];
        };
    }, []);

    // Push data + price lines when payload changes (no chart re-create).
    useEffect(() => {
        const candleSeries = candleSeriesRef.current;
        const volumeSeries = volumeSeriesRef.current;
        if (!candleSeries || !volumeSeries || !payload) return;

        candleSeries.setData(payload.candles || []);
        volumeSeries.setData(payload.volume || []);
        chartRef.current?.timeScale().fitContent();

        // Reset previous level lines.
        for (const line of priceLinesRef.current) {
            candleSeries.removePriceLine(line);
        }
        priceLinesRef.current = [];

        for (const key of ["do", "pwh", "pdh", "pdl", "pdm", "wo", "pwl", "pwm"]) {
            const price = payload.levels?.[key];
            if (!Number.isFinite(price)) continue;
            const style = LEVEL_STYLE[key];
            const line = candleSeries.createPriceLine({
                price,
                color: style.color,
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: style.title,
            });
            priceLinesRef.current.push(line);
        }

        if (Number.isFinite(payload.currentPrice)) {
            const line = candleSeries.createPriceLine({
                price: payload.currentPrice,
                color: "#e5e7eb",
                lineWidth: 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: "NOW",
            });
            priceLinesRef.current.push(line);
        }
    }, [payload]);

    const summary = useMemo(() => buildChartSummary(payload), [payload]);

    return (
        <div className="relative h-full w-full">
            <div ref={containerRef} className="h-full w-full" />
            <p className="sr-only" role="img" aria-label={summary}>
                {summary}
            </p>
        </div>
    );
}
