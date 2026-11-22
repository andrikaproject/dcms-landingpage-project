"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    CandlestickSeries,
    createChart,
    createSeriesMarkers,
    CrosshairMode,
    HistogramSeries,
    LineSeries,
    LineStyle,
    TickMarkType,
} from "lightweight-charts";
import { CaretDown, CaretUp, Check, Copy, EyeSlash } from "@phosphor-icons/react";
import { distanceFromPrice, emaSeries } from "@/lib/market/chart-levels";
import { formatPercent, formatPrice } from "../overview/ui";
import { TimeMarkerPrimitive, ZoneBandPrimitive } from "./primitives";
import IndicatorLegend from "./indicators/IndicatorLegend";
import { buildIndicatorLayers, clearIndicatorLayers } from "./indicators/indicatorLayers";

const UP = "#4ade80";
const DOWN = "#f87171";
const EMA_FAST_COLOR = "#60a5fa";
const EMA_SLOW_COLOR = "#c084fc";
const HOVER_TOLERANCE_PX = 6;
// Popover level: lebar tetap supaya posisinya bisa dijepit di dalam chart, jeda
// tutup supaya kursor sempat menyeberang dari garis ke tombol, dan jeda pindah
// supaya garis lain yang dilewati di jalan tidak merebut popover.
const POPOVER_WIDTH = 264;
const POPOVER_HEIGHT = 128;
const CLOSE_DELAY_MS = 500;
const SWITCH_DELAY_MS = 180;
const COPY_REVERT_MS = 1600;
const INITIAL_VISIBLE_BARS = 150;
const PANE_SEPARATOR_PX = 1;

function pricePrecision(price) {
    const value = Math.abs(Number(price));
    if (!Number.isFinite(value) || value === 0) return 2;
    if (value >= 1000) return 2;
    if (value >= 1) return 4;
    return Math.min(10, Math.max(4, Math.ceil(-Math.log10(value)) + 3));
}

// Sumbu waktu memakai jam lokal user, bukan UTC bawaan library.
function formatTick(time, type) {
    const date = new Date(time * 1000);
    if (type === TickMarkType.Year) return String(date.getFullYear());
    if (type === TickMarkType.Month) return date.toLocaleDateString("id-ID", { month: "short" });
    if (type === TickMarkType.DayOfMonth) return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatCrosshairTime(time) {
    return new Date(time * 1000).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "–";
    if (number >= 1e9) return `${(number / 1e9).toFixed(2)}B`;
    if (number >= 1e6) return `${(number / 1e6).toFixed(2)}M`;
    if (number >= 1e3) return `${(number / 1e3).toFixed(1)}K`;
    return number.toFixed(0);
}

function shortLabel(level) {
    if (level.key === "sl") return "SL";
    return level.label.split(" · ")[0].toUpperCase();
}

function Legend({ pair, timeframe, candle, ema21, ema50, volume, showEma21, showEma50, showVolume, children }) {
    if (!candle) return null;
    const tone = candle.close >= candle.open ? "text-[#4ade80]" : "text-[#f87171]";
    const item = (label, value) => (
        <span className="whitespace-nowrap">
            <span className="text-[#64748b]">{label}</span> <span className={tone}>{formatPrice(value)}</span>
        </span>
    );

    return (
        <div className="pointer-events-none absolute left-3.5 top-3 z-10 flex max-w-[calc(100%-96px)] flex-col items-start gap-1 font-mono text-[11px] leading-[14px]">
            <div className="flex flex-wrap items-center gap-x-2.5">
                <span className="font-chakra text-xs font-semibold text-[#f8fafc]">{pair} · {timeframe}</span>
                {item("O", candle.open)}
                {item("H", candle.high)}
                {item("L", candle.low)}
                {item("C", candle.close)}
            </div>
            <div className="flex flex-wrap items-center gap-x-3">
                {showEma21 && ema21 !== undefined && <span style={{ color: EMA_FAST_COLOR }}>EMA 21 {formatPrice(ema21)}</span>}
                {showEma50 && ema50 !== undefined && <span style={{ color: EMA_SLOW_COLOR }}>EMA 50 {formatPrice(ema50)}</span>}
                {showVolume && volume !== undefined && <span className="text-[#64748b]">Vol {formatVolume(volume)}</span>}
            </div>
            {children}
        </div>
    );
}

// Legend indikator overlay menumpuk di atas candle, jadi hanya beberapa baris
// pertama yang tampil; sisanya diringkas ke satu tombol yang bisa dibuka.
const LEGEND_VISIBLE = 2;

function OverlayLegendList({ indicators, index, onAction }) {
    const [expanded, setExpanded] = useState(false);
    if (!indicators.length) return null;
    const hiddenCount = Math.max(0, indicators.length - LEGEND_VISIBLE);
    const shown = expanded || hiddenCount === 0 ? indicators : indicators.slice(0, LEGEND_VISIBLE);
    return (
        <>
            {shown.map((indicator) => (
                <IndicatorLegend key={indicator.uid} indicator={indicator} index={index} isPane={false} onAction={onAction} />
            ))}
            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    className="pointer-events-auto inline-flex h-6 w-fit items-center gap-1 rounded-md bg-[#161a1e]/90 px-2 font-chakra text-[11px] font-semibold text-[#cbd5e1] shadow-[var(--shadow-button)] hover:text-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]"
                >
                    {expanded ? <CaretUp size={11} weight="bold" aria-hidden /> : <CaretDown size={11} weight="bold" aria-hidden />}
                    {expanded ? "Ringkas legend" : `+${hiddenCount} indikator lain`}
                </button>
            )}
        </>
    );
}

export default function LiveChart({
    pair,
    timeframeLabel,
    candles,
    volume,
    currentPrice,
    levels,
    hiddenLevels,
    showEma21,
    showEma50,
    showVolume,
    structureMarker,
    lockMarker,
    levelSourceLabel,
    resetToken,
    onHideLevel,
    onCopyLevel,
    indicators = [],
    newPaneUid = null,
    onIndicatorAction,
    legendExtra = null,
}) {
    const containerRef = useRef(null);
    const apiRef = useRef(null);
    const priceLinesRef = useRef([]);
    const hoverTimerRef = useRef(null);
    const switchTimerRef = useRef(null);
    const copyTimerRef = useRef(null);
    const insidePopoverRef = useRef(false);
    // Level yang ditutup dengan Escape tidak dibuka lagi sampai kursor meninggalkan garisnya.
    const dismissedKeyRef = useRef(null);
    const [crosshair, setCrosshair] = useState(null);
    const [hover, setHover] = useState(null);
    const [copyState, setCopyState] = useState(null);
    const layersRef = useRef([]);
    const [paneTops, setPaneTops] = useState([]);
    const [offscreen, setOffscreen] = useState({ above: [], below: [] });
    const [rangeTick, setRangeTick] = useState(0);

    const ema21 = useMemo(() => emaSeries(candles, 21), [candles]);
    const ema50 = useMemo(() => emaSeries(candles, 50), [candles]);
    const visibleLevels = useMemo(() => levels.filter((level) => !hiddenLevels.has(level.key)), [levels, hiddenLevels]);
    // Dibaca handler crosshair yang dipasang sekali saat chart dibuat.
    const visibleLevelsRef = useRef(visibleLevels);
    useEffect(() => {
        visibleLevelsRef.current = visibleLevels;
    }, [visibleLevels]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;
        const fontFamily = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace";

        const chart = createChart(container, {
            autoSize: true,
            layout: { background: { color: "transparent" }, textColor: "#64748b", fontFamily, fontSize: 10, attributionLogo: false },
            grid: { vertLines: { color: "rgba(148,163,184,0.06)" }, horzLines: { color: "rgba(148,163,184,0.06)" } },
            rightPriceScale: { borderColor: "#232a30", scaleMargins: { top: 0.12, bottom: 0.22 } },
            timeScale: { borderColor: "#232a30", timeVisible: true, secondsVisible: false, rightOffset: 6, tickMarkFormatter: formatTick },
            localization: { timeFormatter: formatCrosshairTime },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: "#64748b", style: LineStyle.Dashed, labelBackgroundColor: "#1e293b" },
                horzLine: { color: "#64748b", style: LineStyle.Dashed, labelBackgroundColor: "#1e293b" },
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: UP, downColor: DOWN, borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN,
            priceLineColor: "#b8fb5c", priceLineStyle: LineStyle.Dotted,
        });
        const volumeSeries = chart.addSeries(HistogramSeries, { priceScaleId: "volume", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
        chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        const lineOptions = { lineWidth: 1.5, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false };
        const emaFastSeries = chart.addSeries(LineSeries, { ...lineOptions, color: EMA_FAST_COLOR });
        const emaSlowSeries = chart.addSeries(LineSeries, { ...lineOptions, color: EMA_SLOW_COLOR });
        const zone = new ZoneBandPrimitive({ visible: false, fontFamily });
        const marker = new TimeMarkerPrimitive({ visible: false, fontFamily });
        candleSeries.attachPrimitive(zone);
        candleSeries.attachPrimitive(marker);
        const markers = createSeriesMarkers(candleSeries, []);

        chart.subscribeCrosshairMove((param) => {
            const bar = param.seriesData?.get(candleSeries);
            setCrosshair(bar ? {
                index: Number.isFinite(param.logical) ? Math.round(param.logical) : null,
                candle: bar,
                ema21: param.seriesData.get(emaFastSeries)?.value,
                ema50: param.seriesData.get(emaSlowSeries)?.value,
                volume: param.seriesData.get(volumeSeries)?.value,
            } : null);

            // Garis level yang ditunjuk kursor menebal dan memunculkan tooltip.
            const y = param.point?.y;
            const near = y === undefined ? null : visibleLevelsRef.current
                .filter((level) => level.kind === "line")
                .map((level) => ({ level, y: candleSeries.priceToCoordinate(level.price) }))
                .filter((entry) => entry.y !== null && Math.abs(entry.y - y) <= HOVER_TOLERANCE_PX)
                .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];

            // Kursor di dalam popover tidak memicu event chart; penjagaan ini untuk
            // event terakhir yang masih tiba saat kursor baru masuk.
            if (insidePopoverRef.current) return;
            window.clearTimeout(hoverTimerRef.current);
            if (!near || near.level.key !== dismissedKeyRef.current) dismissedKeyRef.current = null;
            if (near && near.level.key === dismissedKeyRef.current) return;
            if (!near) {
                window.clearTimeout(switchTimerRef.current);
                hoverTimerRef.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS);
                return;
            }
            const width = container.clientWidth;
            const height = container.clientHeight;
            const open = (current) => ({
                key: near.level.key,
                // Posisi dikunci saat popover dibuka; hanya y yang mengikuti garis.
                x: Math.min(Math.max(8, param.point.x - 24), Math.max(8, width - POPOVER_WIDTH - 8)),
                y: near.y,
                above: near.y + POPOVER_HEIGHT + 16 > height,
                ...(current && current.key === near.level.key ? { x: current.x, above: current.above } : {}),
            });
            setHover((current) => {
                if (!current || current.key === near.level.key) {
                    window.clearTimeout(switchTimerRef.current);
                    return open(current);
                }
                // Garis lain: pindah hanya bila kursor bertahan di sana sebentar.
                window.clearTimeout(switchTimerRef.current);
                switchTimerRef.current = window.setTimeout(() => setHover(open(null)), SWITCH_DELAY_MS);
                return current;
            });
        });

        chart.applyOptions({ layout: { panes: { separatorColor: "#232a30", separatorHoverColor: "rgba(184, 251, 92, 0.25)", enableResize: true } } });
        chart.timeScale().subscribeVisibleLogicalRangeChange(() => setRangeTick((value) => value + 1));
        apiRef.current = { chart, candleSeries, volumeSeries, emaFastSeries, emaSlowSeries, zone, marker, markers, fontFamily };
        return () => {
            window.clearTimeout(hoverTimerRef.current);
            window.clearTimeout(switchTimerRef.current);
            window.clearTimeout(copyTimerRef.current);
            layersRef.current = [];
            chart.remove();
            apiRef.current = null;
            priceLinesRef.current = [];
        };
    }, []);

    const firstTime = candles[0]?.time;
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        const reference = candles.at(-1)?.close ?? currentPrice;
        const precision = pricePrecision(reference);
        api.candleSeries.applyOptions({ priceFormat: { type: "price", precision, minMove: 10 ** -precision } });
        api.candleSeries.setData(candles);
        api.volumeSeries.setData(volume);
        // currentPrice sengaja tidak jadi dependensi: presisi cukup dihitung saat data berganti.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candles, volume]);

    // Zoom hanya disetel ulang saat set candle baru (ganti koin/timeframe), bukan
    // setiap pembaruan harga live.
    useEffect(() => {
        const timeScale = apiRef.current?.chart.timeScale();
        if (!timeScale || !candles.length) return;
        // 1.000 bar sekaligus terlalu rapat; tampilkan bagian terbaru, sisanya bisa digeser.
        timeScale.setVisibleLogicalRange({ from: Math.max(0, candles.length - INITIAL_VISIBLE_BARS), to: candles.length + 6 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstTime, resetToken]);

    // Layer indikator dibangun ulang saat set bar atau hasil indikator berubah,
    // bukan pada tiap tick harga live.
    const barsKey = `${candles.length}|${firstTime}|${candles.at(-1)?.time}`;
    const candlesRef = useRef(candles);
    useEffect(() => {
        candlesRef.current = candles;
    }, [candles]);
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        clearIndicatorLayers(api.chart, layersRef.current);
        layersRef.current = buildIndicatorLayers({
            chart: api.chart, candleSeries: api.candleSeries, indicators, candles: candlesRef.current, fontFamily: api.fontFamily,
        });
        setRangeTick((value) => value + 1);
    }, [indicators, barsKey]);

    // Posisi atas tiap panel untuk legend panel. Tinggi bisa berubah lewat tarik
    // pembatas tanpa event, jadi dicek berkala selama ada panel tambahan.
    const paneCount = indicators.filter((indicator) => !indicator.overlay).length;
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return undefined;
        const measure = () => {
            let top = 0;
            const tops = api.chart.panes().map((pane) => {
                const current = top;
                top += pane.getHeight() + PANE_SEPARATOR_PX;
                return current;
            });
            setPaneTops((previous) => (previous.length === tops.length && previous.every((value, index) => value === tops[index]) ? previous : tops));
        };
        measure();
        if (!paneCount) return undefined;
        const timer = window.setInterval(measure, 400);
        return () => window.clearInterval(timer);
    }, [paneCount, indicators]);

    // Level DCMS di luar area harga yang terlihat ditandai chip di tepi chart.
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        const height = api.chart.panes()[0]?.getHeight() ?? 0;
        const above = [];
        const below = [];
        for (const level of visibleLevels) {
            if (level.kind !== "line") continue;
            const y = api.candleSeries.priceToCoordinate(level.price);
            if (y === null) continue;
            if (y < 0) above.push(level);
            else if (y > height) below.push(level);
        }
        setOffscreen((previous) => (previous.above.length === above.length && previous.below.length === below.length
            && previous.above.every((level, index) => level.key === above[index].key) && previous.below.every((level, index) => level.key === below[index].key)
            ? previous : { above, below }));
    }, [visibleLevels, rangeTick, candles]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        api.emaFastSeries.setData(showEma21 ? ema21 : []);
        api.emaSlowSeries.setData(showEma50 ? ema50 : []);
        api.volumeSeries.applyOptions({ visible: showVolume });
    }, [ema21, ema50, showEma21, showEma50, showVolume]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        for (const line of priceLinesRef.current) api.candleSeries.removePriceLine(line);
        priceLinesRef.current = [];

        let zoneLevel = null;
        for (const level of visibleLevels) {
            if (level.kind === "zone") {
                zoneLevel = level;
                for (const price of [level.low, level.high]) {
                    priceLinesRef.current.push(api.candleSeries.createPriceLine({
                        price, color: "rgba(148,163,184,0.55)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false,
                    }));
                }
                continue;
            }
            const distance = distanceFromPrice(level.price, currentPrice);
            priceLinesRef.current.push(api.candleSeries.createPriceLine({
                price: level.price,
                color: level.color,
                lineWidth: hover?.key === level.key ? 2 : 1,
                lineStyle: hover?.key === level.key ? LineStyle.Solid : level.lineStyle === "dotted" ? LineStyle.Dotted : LineStyle.Dashed,
                axisLabelVisible: true,
                axisLabelColor: level.color,
                axisLabelTextColor: "#0b0d0f",
                title: `${shortLabel(level)} ${formatPercent(distance)}`,
            }));
        }

        api.zone.applyOptions(zoneLevel
            ? { visible: true, low: zoneLevel.low, high: zoneLevel.high, label: `ZONA ENTRY ${formatPrice(zoneLevel.low)}–${formatPrice(zoneLevel.high)}` }
            : { visible: false });
    }, [visibleLevels, currentPrice, hover?.key]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        api.markers.setMarkers(structureMarker
            ? [{ time: structureMarker.time, position: "belowBar", color: "#b8fb5c", shape: "arrowUp", text: structureMarker.text }]
            : []);
        api.marker.applyOptions(lockMarker ? { visible: true, time: lockMarker.time, label: lockMarker.label } : { visible: false });
    }, [structureMarker, lockMarker, candles]);

    const lastIndex = candles.length - 1;
    const legend = crosshair || (lastIndex >= 0 ? {
        candle: candles[lastIndex],
        ema21: ema21.at(-1)?.value,
        ema50: ema50.at(-1)?.value,
        volume: volume[lastIndex]?.value,
    } : null);
    const hoveredLevel = hover ? visibleLevels.find((level) => level.key === hover.key) : null;
    const showTooltip = Boolean(hoveredLevel);
    const copied = copyState && hover && copyState.key === hover.key ? copyState.status : null;

    function closePopover() {
        insidePopoverRef.current = false;
        window.clearTimeout(hoverTimerRef.current);
        window.clearTimeout(switchTimerRef.current);
        setHover(null);
    }

    // Tanda centang muncul saat diklik, sebelum clipboard menjawab; bila ditolak
    // berganti jadi "Gagal". Tidak ada toast untuk salin.
    function copyLevel(level) {
        window.clearTimeout(copyTimerRef.current);
        setCopyState({ key: level.key, status: "done" });
        const revert = () => {
            copyTimerRef.current = window.setTimeout(() => setCopyState(null), COPY_REVERT_MS);
        };
        Promise.resolve()
            .then(() => onCopyLevel(level))
            .then(revert, () => {
                setCopyState({ key: level.key, status: "error" });
                revert();
            });
    }
    const hoveredDistance = hoveredLevel ? distanceFromPrice(hoveredLevel.price, currentPrice) : null;

    useEffect(() => {
        if (!showTooltip) return undefined;
        function handleKey(event) {
            if (event.key !== "Escape") return;
            dismissedKeyRef.current = hover?.key ?? null;
            closePopover();
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [showTooltip, hover?.key]);

    return (
        <div className="relative h-full w-full">
            <Legend
                pair={pair}
                timeframe={timeframeLabel}
                candle={legend?.candle}
                ema21={legend?.ema21}
                ema50={legend?.ema50}
                volume={legend?.volume}
                showEma21={showEma21}
                showEma50={showEma50}
                showVolume={showVolume}
            >
                <OverlayLegendList indicators={indicators.filter((indicator) => indicator.overlay)} index={crosshair?.index} onAction={onIndicatorAction} />
                {legendExtra}
            </Legend>
            <div ref={containerRef} className="h-full w-full" />
            {indicators.filter((indicator) => !indicator.overlay).map((indicator, order) => (
                paneTops[order + 1] === undefined ? null : (
                    <div key={indicator.uid} className="pointer-events-none absolute left-3.5 z-10" style={{ top: paneTops[order + 1] + 6 }}>
                        <IndicatorLegend indicator={indicator} index={crosshair?.index} isPane isNew={newPaneUid === indicator.uid} onAction={onIndicatorAction} />
                    </div>
                )
            ))}
            {(offscreen.above.length > 0 || offscreen.below.length > 0) && (
                <>
                    <div className="pointer-events-none absolute right-[72px] top-3 z-10 flex gap-1.5">
                        {offscreen.above.map((level) => (
                            <span key={level.key} className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold" style={{ color: level.color, borderColor: level.color, background: "rgba(11,13,15,0.85)" }}>
                                ↑ {shortLabel(level)} {formatPrice(level.price)}
                            </span>
                        ))}
                    </div>
                    <div className="pointer-events-none absolute right-[72px] z-10 flex gap-1.5" style={paneTops[1] === undefined ? { bottom: 36 } : { top: paneTops[1] - 26 }}>
                        {offscreen.below.map((level) => (
                            <span key={level.key} className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold" style={{ color: level.color, borderColor: level.color, background: "rgba(11,13,15,0.85)" }}>
                                ↓ {shortLabel(level)} {formatPrice(level.price)}
                            </span>
                        ))}
                    </div>
                </>
            )}
            {showTooltip && (
                // Pembungkus transparan menjembatani garis dan kartu (padding 8px),
                // jadi kursor tidak pernah melewati celah yang menutup popover.
                <div
                    role="dialog"
                    aria-label={`Level ${hoveredLevel.label}`}
                    onMouseEnter={() => {
                        insidePopoverRef.current = true;
                        window.clearTimeout(hoverTimerRef.current);
                        window.clearTimeout(switchTimerRef.current);
                    }}
                    onMouseLeave={() => {
                        insidePopoverRef.current = false;
                        hoverTimerRef.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS);
                    }}
                    className={`absolute z-20 ${hover.above ? "pb-2" : "pt-2"}`}
                    style={hover.above ? { left: hover.x, bottom: `calc(100% - ${hover.y - 4}px)`, width: POPOVER_WIDTH } : { left: hover.x, top: hover.y + 4, width: POPOVER_WIDTH }}
                >
                    <div className="rounded-lg bg-[#161a1e] p-3 shadow-[var(--shadow-menu)]">
                        <p className="font-mono text-xs font-semibold" style={{ color: hoveredLevel.color }}>
                            {hoveredLevel.label} · {formatPrice(hoveredLevel.price)}
                        </p>
                        <p className="mt-1 font-chakra text-xs text-[#cbd5e1]">{formatPercent(hoveredDistance)} dari harga sekarang</p>
                        <p className="mt-0.5 font-chakra text-[11px] text-[#94a3b8]">{levelSourceLabel}</p>
                        <div className="mt-3 grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => copyLevel(hoveredLevel)}
                                className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-[#1e252b] px-2.5 font-chakra text-xs font-semibold text-[#f8fafc] shadow-[var(--shadow-button)] hover:bg-[#232a30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] pointer-coarse:h-11"
                            >
                                {copied === "done" ? <Check size={14} weight="bold" className="text-[#b8fb5c]" aria-hidden /> : <Copy size={14} aria-hidden />}
                                {copied === "done" ? "Disalin" : copied === "error" ? "Gagal salin" : "Salin harga"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onHideLevel(hoveredLevel.key);
                                    closePopover();
                                }}
                                className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-[#1e252b] px-2.5 font-chakra text-xs font-semibold text-[#f8fafc] shadow-[var(--shadow-button)] hover:bg-[#232a30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] pointer-coarse:h-11"
                            >
                                <EyeSlash size={14} aria-hidden />
                                Sembunyikan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
