import { HistogramSeries, LineSeries, LineStyle } from "lightweight-charts";
import { ScriptPrimitive } from "./ScriptPrimitive";

// Membangun ulang series dan primitive untuk indikator script. Dipanggil saat
// daftar indikator, hasilnya, atau set candle berubah; jumlahnya kecil jadi
// rebuild penuh lebih sederhana dan aman dibanding diff per series.

const MAIN_STRETCH = 3;
const PANE_STRETCH = 1;
const MAXIMIZED_STRETCH = 6;
const COLLAPSED_STRETCH = 0.12;

function lineStyleOf(style) {
    if (style === "dotted") return LineStyle.Dotted;
    if (style === "dashed") return LineStyle.Dashed;
    return LineStyle.Solid;
}

function plotData(plot, candles, override) {
    const offset = plot.offset || 0;
    const data = [];
    for (let index = 0; index < plot.values.length; index += 1) {
        const target = candles[index + offset];
        if (!target) continue;
        const value = plot.values[index];
        const color = override?.color || plot.colors[index];
        if (value === null || value === undefined || !color) data.push({ time: target.time });
        else data.push({ time: target.time, value, color });
    }
    return data;
}

export function clearIndicatorLayers(chart, layers) {
    for (const layer of layers) {
        layer.priceLines.forEach((line) => {
            try {
                layer.primitiveHost?.removePriceLine(line);
            } catch {
                // Host ikut terhapus.
            }
        });
        layer.primitiveHost?.detachPrimitive?.(layer.primitive);
        for (const series of layer.series) {
            try {
                chart.removeSeries(series);
            } catch {
                // Series sudah dilepas bersama panelnya.
            }
        }
    }
}

export function buildIndicatorLayers({ chart, candleSeries, indicators, candles, fontFamily }) {
    const layers = [];
    let paneIndex = 0;
    const maximized = indicators.some((indicator) => !indicator.overlay && indicator.visible && indicator.pane?.maximized);

    for (const indicator of indicators) {
        const output = indicator.output;
        if (!output) continue;
        const style = indicator.style || {};
        const targetPane = indicator.overlay ? 0 : (paneIndex += 1);
        const layer = { uid: indicator.uid, paneIndex: targetPane, overlay: indicator.overlay, series: [], plotSeries: new Map(), primitive: null, primitiveHost: null, priceLines: [] };
        const hidden = !indicator.visible;

        for (const plot of output.plots) {
            const override = style.plots?.[plot.id];
            const visible = !hidden && override?.visible !== false && (plot.display ?? 15) !== 0 && plot.values.some((value) => value !== null);
            const options = {
                lineWidth: Math.max(1, override?.linewidth ?? plot.linewidth ?? 1),
                color: override?.color || plot.color || "#2196F3",
                lastValueVisible: !indicator.overlay,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
                visible,
                title: "",
            };
            const histogram = plot.style === "histogram" || plot.style === "columns";
            const series = chart.addSeries(histogram ? HistogramSeries : LineSeries, histogram ? options : {
                ...options,
                lineStyle: LineStyle.Solid,
                lineType: plot.style === "stepline" ? 1 : 0,
                pointMarkersVisible: plot.style === "circles" || plot.style === "cross",
            }, targetPane);
            series.setData(plotData(plot, candles, override));
            layer.series.push(series);
            layer.plotSeries.set(plot.id, series);
        }

        // Panel tanpa plot tetap butuh series jangkar supaya punya skala harga.
        let anchor = indicator.overlay ? candleSeries : layer.series[0];
        if (!anchor) {
            const prices = output.hlines.map((line) => line.price).filter(Number.isFinite);
            anchor = chart.addSeries(LineSeries, { color: "rgba(0,0,0,0)", lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false }, targetPane);
            anchor.setData(candles.map((candle, index) => (prices.length ? { time: candle.time, value: prices[index % prices.length] } : { time: candle.time })));
            layer.series.push(anchor);
        }

        if (!hidden) {
            for (const line of output.hlines) {
                if (!line.color || !Number.isFinite(line.price)) continue;
                layer.priceLines.push(anchor.createPriceLine({
                    price: line.price, color: line.color, lineWidth: Math.max(1, line.width || 1), lineStyle: lineStyleOf(line.style),
                    axisLabelVisible: false, title: "",
                }));
            }
        }

        const plotValues = Object.fromEntries(output.plots.map((plot) => [plot.id, plot.values]));
        layer.primitive = new ScriptPrimitive({ output, bars: candles, plotValues, fontFamily, visible: !hidden, show: style.show || {} });
        anchor.attachPrimitive(layer.primitive);
        layer.primitiveHost = anchor;
        layers.push(layer);
    }

    const panes = chart.panes();
    panes[0]?.setStretchFactor(maximized ? PANE_STRETCH : MAIN_STRETCH);
    for (const layer of layers) {
        if (layer.overlay) continue;
        const indicator = indicators.find((item) => item.uid === layer.uid);
        const factor = indicator?.pane?.collapsed ? COLLAPSED_STRETCH : indicator?.pane?.maximized ? MAXIMIZED_STRETCH : maximized ? COLLAPSED_STRETCH * 4 : PANE_STRETCH;
        panes[layer.paneIndex]?.setStretchFactor(factor);
    }
    return layers;
}
