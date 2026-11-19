// Objek gambar Pine: line, label, box, polyline, chart.point. Setiap jenis
// punya batas jumlah; objek terlama dibuang saat batas terlewati, seperti Pine.

import { PineArray } from "./collections.js";
import { isNa, NA } from "./values.js";

export const DEFAULT_LIMITS = { line: 50, label: 50, box: 50, polyline: 50 };
export const MAX_LIMITS = { line: 500, label: 500, box: 500, polyline: 100 };

export class Drawing {
    constructor(kind, props) {
        this.kind = kind;
        this.deleted = false;
        Object.assign(this, props);
    }
}

export class ChartPoint {
    constructor(time, index, price) {
        this.time = time;
        this.index = index;
        this.price = price;
    }
}

export class DrawingStore {
    constructor(limits = {}) {
        this.limits = { ...DEFAULT_LIMITS, ...limits };
        this.lists = { line: [], label: [], box: [], polyline: [] };
        this.seq = 0;
    }

    add(drawing) {
        drawing.seq = this.seq++;
        const list = this.lists[drawing.kind];
        list.push(drawing);
        while (list.length > this.limits[drawing.kind]) {
            const oldest = list.shift();
            oldest.deleted = true;
        }
        return drawing;
    }

    remove(drawing) {
        if (!(drawing instanceof Drawing) || drawing.deleted) return;
        drawing.deleted = true;
        const list = this.lists[drawing.kind];
        const index = list.indexOf(drawing);
        if (index !== -1) list.splice(index, 1);
    }

    snapshot() {
        return {
            lines: this.lists.line.map(plainLine),
            labels: this.lists.label.map(plainLabel),
            boxes: this.lists.box.map(plainBox),
            polylines: this.lists.polyline.map(plainPolyline),
        };
    }
}

function plainLine(line) {
    return { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, xloc: line.xloc, extend: line.extend, color: line.color, style: line.style, width: line.width };
}

function plainLabel(label) {
    return {
        x: label.x, y: label.y, xloc: label.xloc, yloc: label.yloc, text: label.text, color: label.color, style: label.style,
        textcolor: label.textcolor, size: label.size, textalign: label.textalign, tooltip: label.tooltip,
    };
}

function plainBox(box) {
    return {
        left: box.left, top: box.top, right: box.right, bottom: box.bottom, xloc: box.xloc, extend: box.extend,
        borderColor: box.border_color, borderWidth: box.border_width, borderStyle: box.border_style, bgcolor: box.bgcolor,
        text: box.text, textColor: box.text_color, textSize: box.text_size,
    };
}

function plainPolyline(polyline) {
    return {
        points: polyline.points.map((point) => ({ index: point.index, time: point.time, price: point.price })),
        curved: polyline.curved, closed: polyline.closed, xloc: polyline.xloc,
        lineColor: polyline.line_color, fillColor: polyline.fill_color, lineStyle: polyline.line_style, lineWidth: polyline.line_width,
    };
}

function alive(drawing, kind) {
    return drawing instanceof Drawing && drawing.kind === kind && !drawing.deleted;
}

// Fungsi namespace. Objek na (belum dibuat atau sudah dihapus) membuat setter
// menjadi no-op dan getter mengembalikan na, sesuai perilaku Pine.
export function createDrawingFunctions(store, context) {
    const setter = (kind, apply) => (id, ...args) => {
        if (alive(id, kind)) apply(id, ...args);
    };
    const getter = (kind, read) => (id) => (alive(id, kind) ? read(id) : NA);
    const remove = (kind) => (id) => {
        if (alive(id, kind)) store.remove(id);
    };
    const copy = (kind) => (id) => (alive(id, kind) ? store.add(new Drawing(kind, { ...id, deleted: false })) : null);

    return {
        "line.new": (x1, y1, x2, y2, xloc, extend, color, style, width) => {
            if (x1 instanceof ChartPoint && y1 instanceof ChartPoint) {
                const first = x1;
                const second = y1;
                return store.add(new Drawing("line", {
                    x1: first.index, y1: first.price, x2: second.index, y2: second.price,
                    xloc: "bar_index", extend: x2 ?? "none", color: y2 ?? context.defaultLineColor, style: xloc ?? "solid", width: extend ?? 1,
                }));
            }
            return store.add(new Drawing("line", {
                x1, y1, x2, y2, xloc: xloc ?? "bar_index", extend: extend ?? "none",
                color: color === undefined ? context.defaultLineColor : color, style: style ?? "solid", width: isNa(width) ? 1 : width,
            }));
        },
        "line.delete": remove("line"),
        "line.copy": copy("line"),
        "line.get_x1": getter("line", (line) => line.x1),
        "line.get_x2": getter("line", (line) => line.x2),
        "line.get_y1": getter("line", (line) => line.y1),
        "line.get_y2": getter("line", (line) => line.y2),
        "line.get_price": (id, x) => {
            if (!alive(id, "line") || id.x2 === id.x1) return NA;
            return id.y1 + ((id.y2 - id.y1) * (x - id.x1)) / (id.x2 - id.x1);
        },
        "line.set_x1": setter("line", (line, x) => { line.x1 = x; }),
        "line.set_x2": setter("line", (line, x) => { line.x2 = x; }),
        "line.set_y1": setter("line", (line, y) => { line.y1 = y; }),
        "line.set_y2": setter("line", (line, y) => { line.y2 = y; }),
        "line.set_xy1": setter("line", (line, x, y) => { line.x1 = x; line.y1 = y; }),
        "line.set_xy2": setter("line", (line, x, y) => { line.x2 = x; line.y2 = y; }),
        "line.set_color": setter("line", (line, color) => { line.color = color; }),
        "line.set_width": setter("line", (line, width) => { line.width = width; }),
        "line.set_style": setter("line", (line, style) => { line.style = style; }),
        "line.set_extend": setter("line", (line, extend) => { line.extend = extend; }),
        "line.set_xloc": setter("line", (line, x1, x2, xloc) => { line.x1 = x1; line.x2 = x2; line.xloc = xloc; }),

        "label.new": (x, y, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip) => {
            if (x instanceof ChartPoint) {
                const point = x;
                return store.add(new Drawing("label", {
                    x: point.index, y: point.price, text: y ?? "", xloc: text ?? "bar_index", yloc: xloc ?? "price",
                    color: yloc === undefined ? context.defaultLabelColor : yloc, style: color ?? "label_down", textcolor: style === undefined ? context.defaultTextColor : style,
                    size: textcolor ?? "normal", textalign: size ?? "center", tooltip: textalign ?? "",
                }));
            }
            return store.add(new Drawing("label", {
                x, y, text: text ?? "", xloc: xloc ?? "bar_index", yloc: yloc ?? "price",
                color: color === undefined ? context.defaultLabelColor : color, style: style ?? "label_down",
                textcolor: textcolor === undefined ? context.defaultTextColor : textcolor, size: size ?? "normal", textalign: textalign ?? "center", tooltip: tooltip ?? "",
            }));
        },
        "label.delete": remove("label"),
        "label.copy": copy("label"),
        "label.get_x": getter("label", (label) => label.x),
        "label.get_y": getter("label", (label) => label.y),
        "label.get_text": getter("label", (label) => label.text),
        "label.set_x": setter("label", (label, x) => { label.x = x; }),
        "label.set_y": setter("label", (label, y) => { label.y = y; }),
        "label.set_xy": setter("label", (label, x, y) => { label.x = x; label.y = y; }),
        "label.set_point": setter("label", (label, point) => { label.x = point?.index; label.y = point?.price; }),
        "label.set_text": setter("label", (label, text) => { label.text = text; }),
        "label.set_color": setter("label", (label, color) => { label.color = color; }),
        "label.set_textcolor": setter("label", (label, color) => { label.textcolor = color; }),
        "label.set_style": setter("label", (label, style) => { label.style = style; }),
        "label.set_size": setter("label", (label, size) => { label.size = size; }),
        "label.set_tooltip": setter("label", (label, tooltip) => { label.tooltip = tooltip; }),
        "label.set_textalign": setter("label", (label, align) => { label.textalign = align; }),
        "label.set_yloc": setter("label", (label, yloc) => { label.yloc = yloc; }),
        "label.set_xloc": setter("label", (label, x, xloc) => { label.x = x; label.xloc = xloc; }),

        "box.new": (left, top, right, bottom, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color) => {
            if (left instanceof ChartPoint && top instanceof ChartPoint) {
                const topLeft = left;
                const bottomRight = top;
                return store.add(new Drawing("box", {
                    left: topLeft.index, top: topLeft.price, right: bottomRight.index, bottom: bottomRight.price,
                    border_color: right === undefined ? context.defaultBoxBorder : right, border_width: isNa(bottom) ? 1 : bottom,
                    border_style: border_color ?? "solid", extend: border_width ?? "none", xloc: "bar_index",
                    bgcolor: border_style === undefined ? context.defaultBoxBg : border_style, text: "", text_size: "auto", text_color: null,
                }));
            }
            return store.add(new Drawing("box", {
                left, top, right, bottom, border_color: border_color === undefined ? context.defaultBoxBorder : border_color,
                border_width: isNa(border_width) ? 1 : border_width, border_style: border_style ?? "solid", extend: extend ?? "none",
                xloc: xloc ?? "bar_index", bgcolor: bgcolor === undefined ? context.defaultBoxBg : bgcolor,
                text: text ?? "", text_size: text_size ?? "auto", text_color: text_color ?? null,
            }));
        },
        "box.delete": remove("box"),
        "box.copy": copy("box"),
        "box.get_left": getter("box", (box) => box.left),
        "box.get_right": getter("box", (box) => box.right),
        "box.get_top": getter("box", (box) => box.top),
        "box.get_bottom": getter("box", (box) => box.bottom),
        "box.set_left": setter("box", (box, value) => { box.left = value; }),
        "box.set_right": setter("box", (box, value) => { box.right = value; }),
        "box.set_top": setter("box", (box, value) => { box.top = value; }),
        "box.set_bottom": setter("box", (box, value) => { box.bottom = value; }),
        "box.set_lefttop": setter("box", (box, left, top) => { box.left = left; box.top = top; }),
        "box.set_rightbottom": setter("box", (box, right, bottom) => { box.right = right; box.bottom = bottom; }),
        "box.set_bgcolor": setter("box", (box, color) => { box.bgcolor = color; }),
        "box.set_border_color": setter("box", (box, color) => { box.border_color = color; }),
        "box.set_border_width": setter("box", (box, width) => { box.border_width = width; }),
        "box.set_border_style": setter("box", (box, style) => { box.border_style = style; }),
        "box.set_extend": setter("box", (box, extend) => { box.extend = extend; }),
        "box.set_text": setter("box", (box, text) => { box.text = text; }),
        "box.set_text_color": setter("box", (box, color) => { box.text_color = color; }),
        "box.set_text_size": setter("box", (box, size) => { box.text_size = size; }),

        "polyline.new": (points, curved, closed, xloc, line_color, fill_color, line_style, line_width) => {
            // `polyline.new(na)` dipakai skrip sebagai placeholder kosong.
            if (!(points instanceof PineArray)) return null;
            return store.add(new Drawing("polyline", {
                points: points.items.filter((point) => point instanceof ChartPoint).map((point) => new ChartPoint(point.time, point.index, point.price)),
                curved: Boolean(curved), closed: Boolean(closed), xloc: xloc ?? "bar_index",
                line_color: line_color === undefined ? context.defaultLineColor : line_color, fill_color: fill_color ?? null,
                line_style: line_style ?? "solid", line_width: isNa(line_width) ? 1 : line_width,
            }));
        },
        "polyline.delete": remove("polyline"),

        "chart.point.new": (time, index, price) => new ChartPoint(time, index, price),
        "chart.point.from_index": (index, price) => new ChartPoint(context.timeAt(index), index, price),
        "chart.point.from_time": (time, price) => new ChartPoint(time, context.indexAt(time), price),
        "chart.point.now": (price) => new ChartPoint(context.timeAt(context.bar()), context.bar(), price),
        "chart.point.copy": (point) => (point instanceof ChartPoint ? new ChartPoint(point.time, point.index, point.price) : null),
    };
}
