// Menggambar output script Pine yang tidak punya padanan series di
// lightweight-charts: bgcolor, fill, plotshape/plotchar, line, box, label,
// dan polyline. Posisi x memakai indeks logis bar, jadi objek di kanan bar
// terakhir (seperti volume profile) tetap tergambar.

const FONT_SIZES = { tiny: 9, small: 10, normal: 12, large: 14, huge: 18, auto: 11 };
const SHAPE_SIZES = { tiny: 6, small: 8, normal: 10, large: 14, huge: 18, auto: 8 };

function dashFor(style) {
    if (style === "dashed") return [6, 4];
    if (style === "dotted") return [2, 3];
    return [];
}

function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

export class ScriptPrimitive {
    constructor(options) {
        this._options = options;
        this._chart = null;
        this._series = null;
        this._requestUpdate = null;
        this._views = [
            { zOrder: () => "bottom", renderer: () => this._renderer("bottom") },
            { zOrder: () => "top", renderer: () => this._renderer("top") },
        ];
    }

    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
    }

    detached() {
        this._chart = null;
        this._series = null;
    }

    update(options) {
        this._options = { ...this._options, ...options };
        this._requestUpdate?.();
    }

    paneViews() {
        return this._views;
    }

    _renderer(layer) {
        const { output, visible } = this._options;
        if (!visible || !output || !this._chart || !this._series) return null;
        return {
            draw: (target) => {
                target.useMediaCoordinateSpace(({ context, mediaSize }) => {
                    context.save();
                    try {
                        if (layer === "bottom") {
                            this._drawBackgrounds(context, mediaSize);
                            this._drawFills(context, mediaSize);
                        } else {
                            this._drawDrawings(context, mediaSize);
                            this._drawShapes(context, mediaSize);
                        }
                    } finally {
                        context.restore();
                    }
                });
            },
        };
    }

    _x(index) {
        return this._chart.timeScale().logicalToCoordinate(index);
    }

    _y(price) {
        return isNumber(price) ? this._series.priceToCoordinate(price) : null;
    }

    _barWidth() {
        const a = this._x(0);
        const b = this._x(1);
        return a === null || b === null ? 6 : Math.max(1, Math.abs(b - a));
    }

    _drawBackgrounds(context, mediaSize) {
        const { output, show } = this._options;
        if (show?.bgcolor === false) return;
        const width = this._barWidth();
        for (const entry of output.bgcolors || []) {
            entry.colors.forEach((color, bar) => {
                if (!color) return;
                const x = this._x(bar + (entry.offset || 0));
                if (x === null || x < -width || x > mediaSize.width + width) return;
                context.fillStyle = color;
                context.fillRect(x - width / 2, 0, width, mediaSize.height);
            });
        }
    }

    _levelOf(handle, bar) {
        const { output, plotValues } = this._options;
        if (handle?.hlineId) return output.hlines.find((line) => line.id === handle.hlineId)?.price ?? null;
        if (handle?.plotId) return plotValues?.[handle.plotId]?.[bar] ?? null;
        return null;
    }

    _drawFills(context, mediaSize) {
        const { output, show } = this._options;
        if (show?.fills === false) return;
        for (const fill of output.fills || []) {
            if (fill.a?.hlineId && fill.b?.hlineId) {
                const color = fill.colors.find(Boolean);
                const top = this._y(this._levelOf(fill.a, 0));
                const bottom = this._y(this._levelOf(fill.b, 0));
                if (!color || top === null || bottom === null) continue;
                context.fillStyle = color;
                context.fillRect(0, Math.min(top, bottom), mediaSize.width, Math.abs(bottom - top));
                continue;
            }
            // Fill antar plot: satu poligon per bar supaya warna per bar ikut.
            for (let bar = 1; bar < fill.colors.length; bar += 1) {
                const color = fill.colors[bar];
                if (!color) continue;
                const x0 = this._x(bar - 1);
                const x1 = this._x(bar);
                const a0 = this._y(this._levelOf(fill.a, bar - 1));
                const a1 = this._y(this._levelOf(fill.a, bar));
                const b0 = this._y(this._levelOf(fill.b, bar - 1));
                const b1 = this._y(this._levelOf(fill.b, bar));
                if ([x0, x1, a0, a1, b0, b1].some((value) => value === null)) continue;
                context.fillStyle = color;
                context.beginPath();
                context.moveTo(x0, a0);
                context.lineTo(x1, a1);
                context.lineTo(x1, b1);
                context.lineTo(x0, b0);
                context.closePath();
                context.fill();
            }
        }
    }

    _drawShapes(context, mediaSize) {
        const { output, bars, show } = this._options;
        if (show?.shapes === false) return;
        for (const shape of output.shapes || []) {
            const size = SHAPE_SIZES[shape.size] || SHAPE_SIZES.auto;
            for (const point of shape.points) {
                const bar = point.bar + (shape.offset || 0);
                const x = this._x(bar);
                if (x === null || x < -20 || x > mediaSize.width + 20) continue;
                const candle = bars?.[point.bar];
                let y;
                if (shape.location === "belowbar") y = this._y(candle?.low) + size + 4;
                else if (shape.location === "top") y = size + 4;
                else if (shape.location === "bottom") y = mediaSize.height - size - 4;
                else if (shape.location === "absolute") y = this._y(point.value);
                else y = this._y(candle?.high) - size - 4;
                if (!isNumber(y)) continue;
                this._shape(context, shape.kind === "char" ? "char" : shape.style, x, y, size, point.color, shape.char);
                if (point.text) {
                    context.fillStyle = point.textcolor || point.color || "#d1d4dc";
                    context.font = `500 10px ${this._options.fontFamily}`;
                    context.textAlign = "center";
                    const below = shape.location === "belowbar" || shape.location === "bottom";
                    const lines = String(point.text).split("\n");
                    lines.forEach((line, index) => {
                        const offset = below ? size + 10 + index * 11 : -size - 6 - (lines.length - 1 - index) * 11;
                        context.fillText(line, x, y + offset);
                    });
                }
            }
        }
    }

    _shape(context, style, x, y, size, color, char) {
        if (!color) return;
        context.fillStyle = color;
        context.strokeStyle = color;
        context.lineWidth = 1.5;
        const half = size / 2;
        context.beginPath();
        switch (style) {
            case "triangleup":
            case "arrowup":
            case "labelup":
                context.moveTo(x, y - half);
                context.lineTo(x + half, y + half);
                context.lineTo(x - half, y + half);
                context.closePath();
                context.fill();
                break;
            case "triangledown":
            case "arrowdown":
            case "labeldown":
                context.moveTo(x, y + half);
                context.lineTo(x + half, y - half);
                context.lineTo(x - half, y - half);
                context.closePath();
                context.fill();
                break;
            case "circle":
                context.arc(x, y, half, 0, Math.PI * 2);
                context.fill();
                break;
            case "square":
            case "flag":
                context.fillRect(x - half, y - half, size, size);
                break;
            case "diamond":
                context.moveTo(x, y - half);
                context.lineTo(x + half, y);
                context.lineTo(x, y + half);
                context.lineTo(x - half, y);
                context.closePath();
                context.fill();
                break;
            case "cross":
                context.moveTo(x - half, y);
                context.lineTo(x + half, y);
                context.moveTo(x, y - half);
                context.lineTo(x, y + half);
                context.stroke();
                break;
            case "char":
                context.font = `${size + 4}px ${this._options.fontFamily}`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText(char || "★", x, y);
                break;
            default:
                context.moveTo(x - half, y - half);
                context.lineTo(x + half, y + half);
                context.moveTo(x + half, y - half);
                context.lineTo(x - half, y + half);
                context.stroke();
        }
    }

    _drawDrawings(context, mediaSize) {
        const { output, show } = this._options;
        const drawings = output.drawings || {};
        if (show?.boxes !== false) drawings.boxes?.forEach((box) => this._box(context, box, mediaSize));
        if (show?.lines !== false) {
            drawings.polylines?.forEach((polyline) => this._polyline(context, polyline));
            drawings.lines?.forEach((line) => this._line(context, line, mediaSize));
        }
        if (show?.labels !== false) drawings.labels?.forEach((label) => this._label(context, label, mediaSize));
    }

    _line(context, line, mediaSize) {
        if (!line.color) return;
        let x1 = this._x(line.x1);
        let x2 = this._x(line.x2);
        let y1 = this._y(line.y1);
        let y2 = this._y(line.y2);
        if ([x1, x2, y1, y2].some((value) => value === null || !isNumber(value))) return;
        const slope = x2 === x1 ? 0 : (y2 - y1) / (x2 - x1);
        if ((line.extend === "right" || line.extend === "both") && x2 !== x1) {
            const edge = x2 > x1 ? mediaSize.width : 0;
            y2 += slope * (edge - x2);
            x2 = edge;
        }
        if ((line.extend === "left" || line.extend === "both") && x2 !== x1) {
            const edge = x1 < x2 ? 0 : mediaSize.width;
            y1 += slope * (edge - x1);
            x1 = edge;
        }
        context.strokeStyle = line.color;
        context.lineWidth = Math.max(1, line.width || 1);
        context.setLineDash(dashFor(line.style));
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.setLineDash([]);
    }

    _polyline(context, polyline) {
        const points = polyline.points
            .map((point) => [this._x(point.index), this._y(point.price)])
            .filter(([x, y]) => x !== null && y !== null && isNumber(x) && isNumber(y));
        if (points.length < 2) return;
        context.beginPath();
        points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
        if (polyline.closed) context.closePath();
        if (polyline.fillColor) {
            context.fillStyle = polyline.fillColor;
            context.fill();
        }
        if (polyline.lineColor) {
            context.strokeStyle = polyline.lineColor;
            context.lineWidth = Math.max(1, polyline.lineWidth || 1);
            context.setLineDash(dashFor(polyline.lineStyle));
            context.stroke();
            context.setLineDash([]);
        }
    }

    _box(context, box, mediaSize) {
        const left = this._x(box.left);
        const right = this._x(box.right);
        const top = this._y(box.top);
        const bottom = this._y(box.bottom);
        if ([left, right, top, bottom].some((value) => value === null || !isNumber(value))) return;
        const x0 = box.extend === "left" || box.extend === "both" ? 0 : Math.min(left, right);
        const x1 = box.extend === "right" || box.extend === "both" ? mediaSize.width : Math.max(left, right);
        const y0 = Math.min(top, bottom);
        const height = Math.max(1, Math.abs(bottom - top));
        if (box.bgcolor) {
            context.fillStyle = box.bgcolor;
            context.fillRect(x0, y0, x1 - x0, height);
        }
        if (box.borderColor && box.borderWidth > 0) {
            context.strokeStyle = box.borderColor;
            context.lineWidth = box.borderWidth;
            context.setLineDash(dashFor(box.borderStyle));
            context.strokeRect(x0, y0, x1 - x0, height);
            context.setLineDash([]);
        }
        if (box.text) {
            context.fillStyle = box.textColor || "#d1d4dc";
            context.font = `500 ${FONT_SIZES[box.textSize] || 11}px ${this._options.fontFamily}`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(box.text, (x0 + x1) / 2, y0 + height / 2);
        }
    }

    _label(context, label, mediaSize) {
        let x = this._x(label.x);
        let y = label.yloc === "price" ? this._y(label.y) : null;
        const candle = this._options.bars?.[Math.round(label.x)];
        if (label.yloc === "abovebar") y = this._y(candle?.high);
        if (label.yloc === "belowbar") y = this._y(candle?.low);
        if (x === null || y === null || !isNumber(x) || !isNumber(y)) return;
        if (x < -100 || x > mediaSize.width + 100) return;

        const fontSize = FONT_SIZES[label.size] || FONT_SIZES.normal;
        context.font = `500 ${fontSize}px ${this._options.fontFamily}`;
        const lines = String(label.text ?? "").split("\n");
        const textWidth = Math.max(0, ...lines.map((line) => context.measureText(line).width));
        const padding = 4;
        const width = textWidth + padding * 2;
        const lineHeight = fontSize + 2;
        const height = Math.max(lineHeight, lines.length * lineHeight) + padding * 2;
        const pointer = 5;
        const style = label.style || "label_down";

        let boxX = x - width / 2;
        let boxY = y - height - pointer;
        if (style === "label_up" || style === "label_lower_right" || style === "label_lower_left") boxY = y + pointer;
        if (style === "label_left") {
            boxX = x + pointer;
            boxY = y - height / 2;
        }
        if (style === "label_right") {
            boxX = x - width - pointer;
            boxY = y - height / 2;
        }
        if (style === "label_center" || style === "none" || style === "text_outline") boxY = y - height / 2;

        const drawsBubble = !["none", "text_outline"].includes(style) && label.color;
        if (drawsBubble && !["xcross", "cross", "circle", "square", "diamond", "triangleup", "triangledown", "arrowup", "arrowdown", "flag"].includes(style)) {
            context.fillStyle = label.color;
            context.beginPath();
            context.roundRect(boxX, boxY, width, height, 3);
            context.fill();
            context.beginPath();
            if (style === "label_down" || style === "label_upper_left" || style === "label_upper_right") {
                context.moveTo(x - pointer, boxY + height);
                context.lineTo(x + pointer, boxY + height);
                context.lineTo(x, y);
            } else if (style === "label_up" || style === "label_lower_left" || style === "label_lower_right") {
                context.moveTo(x - pointer, boxY);
                context.lineTo(x + pointer, boxY);
                context.lineTo(x, y);
            } else if (style === "label_left") {
                context.moveTo(boxX, y - pointer);
                context.lineTo(boxX, y + pointer);
                context.lineTo(x, y);
            } else if (style === "label_right") {
                context.moveTo(boxX + width, y - pointer);
                context.lineTo(boxX + width, y + pointer);
                context.lineTo(x, y);
            }
            context.closePath();
            context.fill();
        } else if (drawsBubble) {
            this._shape(context, style, x, y, 8, label.color);
            boxY = y - height - 6;
        }

        context.fillStyle = label.textcolor || "#ffffff";
        context.textAlign = "center";
        context.textBaseline = "top";
        lines.forEach((line, index) => context.fillText(line, boxX + width / 2, boxY + padding + index * lineHeight));
    }
}
