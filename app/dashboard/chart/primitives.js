// Primitive lightweight-charts untuk elemen yang tidak ada di library:
// pita zona entry dan garis vertikal penanda waktu lock.

class BasePrimitive {
    constructor(options) {
        this._options = options;
        this._series = null;
        this._chart = null;
        this._requestUpdate = null;
        this._views = [{ zOrder: () => this.zOrder(), renderer: () => this.renderer() }];
    }

    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
    }

    detached() {
        this._chart = null;
        this._series = null;
        this._requestUpdate = null;
    }

    applyOptions(options) {
        this._options = { ...this._options, ...options };
        this._requestUpdate?.();
    }

    paneViews() {
        return this._views;
    }

    zOrder() {
        return "bottom";
    }
}

export class ZoneBandPrimitive extends BasePrimitive {
    renderer() {
        const { low, high, label, visible, fontFamily = "monospace" } = this._options;
        const series = this._series;
        if (!visible || !series) return null;
        const top = series.priceToCoordinate(high);
        const bottom = series.priceToCoordinate(low);
        if (top === null || bottom === null) return null;

        return {
            draw: (target) => {
                target.useMediaCoordinateSpace(({ context, mediaSize }) => {
                    const y = Math.min(top, bottom);
                    const height = Math.max(1, Math.abs(bottom - top));
                    context.fillStyle = "rgba(148, 163, 184, 0.08)";
                    context.fillRect(0, y, mediaSize.width, height);
                    context.font = `500 10px ${fontFamily}`;
                    context.fillStyle = "#94a3b8";
                    context.textBaseline = "middle";
                    context.fillText(label, 6, y + height / 2);
                });
            },
        };
    }
}

export class TimeMarkerPrimitive extends BasePrimitive {
    zOrder() {
        return "top";
    }

    renderer() {
        const { time, label, visible, fontFamily = "monospace" } = this._options;
        const chart = this._chart;
        if (!visible || !chart || time === null || time === undefined) return null;
        const x = chart.timeScale().timeToCoordinate(time);
        if (x === null) return null;

        return {
            draw: (target) => {
                target.useMediaCoordinateSpace(({ context, mediaSize }) => {
                    context.save();
                    context.strokeStyle = "rgba(184, 251, 92, 0.6)";
                    context.setLineDash([3, 3]);
                    context.beginPath();
                    context.moveTo(x, 0);
                    context.lineTo(x, mediaSize.height);
                    context.stroke();
                    context.setLineDash([]);

                    context.font = `600 10px ${fontFamily}`;
                    const width = context.measureText(label).width + 16;
                    const left = Math.min(Math.max(4, x - width / 2), mediaSize.width - width - 4);
                    context.fillStyle = "#b8fb5c";
                    context.beginPath();
                    context.roundRect(left, 52, width, 18, 9);
                    context.fill();
                    context.fillStyle = "#0b0d0f";
                    context.textBaseline = "middle";
                    context.fillText(label, left + 8, 61);
                    context.restore();
                });
            },
        };
    }
}
