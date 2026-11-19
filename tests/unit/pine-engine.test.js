import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, inferMintick, runScript } from "../../lib/pine/index.js";

function bars(count = 120, seed = 3) {
    let state = seed;
    const random = () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
    const rows = [];
    let price = 100;
    for (let index = 0; index < count; index += 1) {
        const open = price;
        const close = Math.max(1, open + (random() - 0.5) * 2);
        rows.push({
            time: Date.UTC(2026, 9, 1) + index * 300_000,
            open,
            high: Math.max(open, close) + random(),
            low: Math.min(open, close) - random(),
            close,
            volume: 1000 + Math.round(random() * 1000),
        });
        price = close;
    }
    return rows;
}

const header = 'indicator("Tes", overlay=true)\n';
const run = (body, options = {}) => runScript(header + body, { bars: bars(options.count || 60), timeframe: "5m", ...options });
const lastPlot = (result, index = 0) => result.output.plots[index].values.at(-1);

test("var hanya diinisialisasi sekali dan history membaca bar sebelumnya", () => {
    const result = run("var count = 0\ncount := count + 1\nplot(count)\nplot(count[1])\nplot(bar_index)");
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(lastPlot(result, 0), 60);
    assert.equal(lastPlot(result, 1), 59);
    assert.equal(lastPlot(result, 2), 59);
});

test("state ta dan var terpisah per titik panggil fungsi buatan", () => {
    const result = run([
        "counter(step) =>",
        "    var total = 0",
        "    total := total + step",
        "    total",
        "plot(counter(1))",
        "plot(counter(10))",
        "avg(src, len) => ta.sma(src, len)",
        "plot(avg(close, 3) - ta.sma(close, 3))",
    ].join("\n"));
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(lastPlot(result, 0), 60);
    assert.equal(lastPlot(result, 1), 600);
    assert.equal(lastPlot(result, 2), 0);
});

test("parameter fungsi punya riwayat sendiri", () => {
    const result = run("prev(src) => src[1]\nplot(prev(close) - close[1])");
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(lastPlot(result), 0);
});

test("ta.sma, ta.ema, dan ta.rsi mengikuti rumus Pine", () => {
    const data = bars(50);
    const closes = data.map((bar) => bar.close);
    const result = runScript(`${header}plot(ta.sma(close, 5))\nplot(ta.ema(close, 5))\nplot(ta.rsi(close, 14))`, { bars: data });
    const sma = closes.slice(-5).reduce((sum, value) => sum + value, 0) / 5;
    let ema = closes.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5;
    for (const value of closes.slice(5)) ema = (2 / 6) * value + (1 - 2 / 6) * ema;
    assert.ok(Math.abs(lastPlot(result, 0) - sma) < 1e-9);
    assert.ok(Math.abs(lastPlot(result, 1) - ema) < 1e-9);
    assert.equal(result.output.plots[1].values[3], null, "EMA na sebelum periode terpenuhi");
    const rsi = lastPlot(result, 2);
    assert.ok(rsi > 0 && rsi < 100);
});

test("for menghitung mundur bila from lebih besar dari to, termasuk 0 to -1", () => {
    const result = run("total = 0\nfor i = 3 to 1\n    total := total * 10 + i\nn = 0\nfor j = 0 to -1\n    n += 1\nplot(total)\nplot(n)");
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(lastPlot(result, 0), 321);
    assert.equal(lastPlot(result, 1), 2);
});

test("if dan switch bisa dipakai sebagai nilai", () => {
    const result = run([
        "pick(x) =>",
        "    switch x",
        "        'a' => 1",
        "        'b' => 2",
        "        => 3",
        "y = if close > 0",
        "    pick('b')",
        "else",
        "    0",
        "z = switch",
        "    close < 0 => 5",
        "    => pick('zz')",
        "plot(y)",
        "plot(z)",
    ].join("\n"));
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(lastPlot(result, 0), 2);
    assert.equal(lastPlot(result, 1), 3);
});

test("type, array, map, tuple, dan for-in", () => {
    const result = run([
        "type point",
        "    float price = 1.5",
        "    int count",
        "var pts = array.new<point>()",
        "pts.push(point.new(count = bar_index))",
        "m = map.new<string, float>()",
        "m.put('x', 2)",
        "total = 0.0",
        "for p in pts",
        "    total += p.price",
        "for [k, v] in m",
        "    total += v",
        "pair() => [1, 2]",
        "[a, b] = pair()",
        "last = pts.last()",
        "last.count := 99",
        "plot(total)",
        "plot(a + b)",
        "plot(pts.get(-1).count)",
        "plot(array.max(array.from(4, 9, 7), 1))",
    ].join("\n"));
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(lastPlot(result, 0), 60 * 1.5 + 2);
    assert.equal(lastPlot(result, 1), 3);
    assert.equal(lastPlot(result, 2), 99);
    assert.equal(lastPlot(result, 3), 7);
});

test("objek gambar mengikuti batas max_lines_count", () => {
    const result = runScript('indicator("G", overlay=true, max_lines_count=5)\nline.new(bar_index, low, bar_index, high, color=color.red)\nvar lb = label.new(0, close, "awal")\nlb.set_text("akhir")', { bars: bars(20) });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.output.drawings.lines.length, 5);
    assert.equal(result.output.drawings.lines[0].x1, 15);
    assert.equal(result.output.drawings.labels[0].text, "akhir");
});

test("input menjadi field pengaturan dan nilai override dipakai", () => {
    const source = `${header}len = input.int(14, "Panjang", minval=1)\nsrc = input.source(close, "Sumber")\nshow = input.bool(true, "Tampil")\nplot(show ? len : na)\nplot(src - open)`;
    const defaults = runScript(source, { bars: bars(10) });
    assert.deepEqual(defaults.output.inputs.map((entry) => [entry.key, entry.kind, entry.defval]), [["Panjang", "int", 14], ["Sumber", "source", "close"], ["Tampil", "bool", true]]);
    const custom = runScript(source, { bars: bars(10), inputs: { Panjang: 30, Sumber: "open" } });
    assert.equal(lastPlot(custom, 0), 30);
    assert.equal(lastPlot(custom, 1), 0);
});

test("fungsi salah ketik ditolak dengan saran perbaikan", () => {
    const result = compileScript(`${header}a = ta.crosover(close, open)\nb = closee + 1`);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors.map((error) => [error.line, error.fix?.replacement]), [[2, "ta.crossover"], [3, "close"]]);
    assert.match(result.errors[0].message, /Maksud kamu ta\.crossover\?/);
});

test("namespace yang belum didukung dan sintaks salah dilaporkan dengan baris", () => {
    assert.match(compileScript(`${header}strategy.entry("L", strategy.long)`).errors[0].message, /strategy/);
    const syntax = compileScript(`${header}x = (1 + 2`);
    assert.equal(syntax.errors[0].kind, "syntax");
    assert.equal(syntax.errors[0].line, 2);
    assert.match(compileScript("plot(close)").errors[0].message, /indicator/);
});

test("error runtime menyebut baris dan loop tak berujung dihentikan batas waktu", () => {
    const runtime = run("a = array.new_float(2)\nplot(array.get(a, 5))");
    assert.equal(runtime.errors[0].kind, "runtime");
    assert.equal(runtime.errors[0].line, 3);
    const timeout = runScript(`${header}i = 0\nwhile true\n    i += 1`, { bars: bars(5), timeoutMs: 50 });
    assert.equal(timeout.errors[0].kind, "timeout");
});

test("tick harga ditebak dari desimal candle", () => {
    assert.equal(inferMintick([{ open: 88.28, high: 88.296, low: 88.058, close: 88.1 }]), 0.001);
});

test("Combined Indicator berjalan penuh pada 1.000 bar", () => {
    const source = readFileSync(new URL("../../Combined Indicator.txt", import.meta.url), "utf8");
    const result = runScript(source, { bars: bars(1000, 11), timeframe: "5m", symbol: "HYPEUSDT", mintick: 0.001, timeoutMs: 30_000 });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    const { output } = result;
    assert.equal(output.meta.overlay, true);
    assert.deepEqual(output.plots.slice(0, 5).map((plot) => plot.title), ["EMA 1", "EMA 2", "EMA 3", "EMA 4", "EMA 6"]);
    assert.ok(output.drawings.labels.length > 0, "label swing dan divergence");
    assert.ok(output.drawings.boxes.length > 0, "zona dan volume profile");
    assert.ok(output.drawings.polylines.length > 0, "VWAP adaptif");
    assert.ok(output.drawings.lines.length > 0, "kanal regresi");
    assert.equal(output.inputs.length, 109);
    assert.equal(output.warnings.length, 1, "request.security_lower_tf memakai bar chart");
});
