// Fungsi ta.* dan math.sum. Setiap titik panggil punya `state` sendiri yang
// menyimpan riwayat argumennya; dipanggil dua kali dalam satu bar berarti
// nilai bar itu ditimpa, bukan bar baru.

import { isNa, NA } from "./values.js";

function track(state, key, value, bar) {
    let entry = state[key];
    if (!entry) {
        entry = { values: [], bar: -1 };
        state[key] = entry;
    }
    if (entry.bar === bar) entry.values[entry.values.length - 1] = value;
    else {
        entry.values.push(value);
        entry.bar = bar;
    }
    return entry.values;
}

function window(values, length) {
    const size = Math.max(1, Math.trunc(length));
    if (values.length < size) return null;
    return values.slice(values.length - size);
}

function windowHasNa(slice) {
    return slice.some((value) => typeof value !== "number" || Number.isNaN(value));
}

function sma(values, length) {
    const slice = window(values, length);
    if (!slice || windowHasNa(slice)) return NA;
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

// Langkah rekursif (EMA/RMA): nilai bar sebelumnya disimpan supaya pemanggilan
// ulang di bar yang sama menghitung dari titik yang benar.
function recursive(state, key, bar, compute) {
    let entry = state[key];
    if (!entry) {
        entry = { prev: NA, cur: NA, bar: -1 };
        state[key] = entry;
    }
    if (entry.bar !== bar) {
        entry.prev = entry.cur;
        entry.bar = bar;
    }
    entry.cur = compute(entry.prev);
    return entry.cur;
}

function smoothed(state, key, value, length, bar, alpha) {
    const values = track(state, `${key}:src`, value, bar);
    return recursive(state, key, bar, (prev) => {
        if (isNa(value)) return NA;
        if (isNa(prev)) return sma(values, length);
        return alpha * value + (1 - alpha) * prev;
    });
}

export function emaStep(state, key, value, length, bar) {
    return smoothed(state, key, value, length, bar, 2 / (Math.max(1, length) + 1));
}

export function rmaStep(state, key, value, length, bar) {
    return smoothed(state, key, value, length, bar, 1 / Math.max(1, length));
}

function extreme(values, length, pick) {
    const slice = window(values, length);
    if (!slice) return NA;
    const numbers = slice.filter((value) => !isNa(value));
    return numbers.length ? pick(...numbers) : NA;
}

function extremeOffset(values, length, better) {
    const slice = window(values, length);
    if (!slice) return NA;
    let bestIndex = -1;
    for (let index = 0; index < slice.length; index += 1) {
        if (isNa(slice[index])) continue;
        // Nilai sama: bar terbaru menang.
        if (bestIndex === -1 || better(slice[index], slice[bestIndex]) || slice[index] === slice[bestIndex]) bestIndex = index;
    }
    return bestIndex === -1 ? NA : -(slice.length - 1 - bestIndex);
}

function stdevOf(slice, biased = true) {
    const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    const squares = slice.reduce((sum, value) => sum + (value - average) ** 2, 0);
    const divisor = biased ? slice.length : slice.length - 1;
    return divisor > 0 ? Math.sqrt(squares / divisor) : NA;
}

function wmaOf(values, length) {
    const slice = window(values, length);
    if (!slice || windowHasNa(slice)) return NA;
    let numerator = 0;
    let denominator = 0;
    slice.forEach((value, index) => {
        const weight = index + 1;
        numerator += value * weight;
        denominator += weight;
    });
    return numerator / denominator;
}

function pivot(values, left, right, isHigh) {
    const leftBars = Math.trunc(left);
    const rightBars = Math.trunc(right);
    const total = leftBars + rightBars + 1;
    if (values.length < total) return NA;
    const slice = values.slice(values.length - total);
    const center = slice[leftBars];
    if (isNa(center)) return NA;
    for (let index = 0; index < slice.length; index += 1) {
        if (index === leftBars) continue;
        const value = slice[index];
        if (isNa(value)) return NA;
        const beaten = isHigh ? value > center : value < center;
        const tiedLeft = index < leftBars && value === center;
        if (beaten || tiedLeft) return NA;
    }
    return center;
}

export function createTa(ctx) {
    const bar = () => ctx.bar;
    const series = (name, offset = 0) => ctx.seriesValue(name, offset);
    const trueRange = (handleNa = false) => {
        const high = series("high");
        const low = series("low");
        const prevClose = series("close", 1);
        if (isNa(prevClose)) return handleNa ? high - low : NA;
        return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    };

    const functions = {
        sma: (state, source, length) => sma(track(state, "src", source, bar()), length),
        ema: (state, source, length) => emaStep(state, "ema", source, length, bar()),
        rma: (state, source, length) => rmaStep(state, "rma", source, length, bar()),
        wma: (state, source, length) => wmaOf(track(state, "src", source, bar()), length),
        swma: (state, source) => {
            const slice = window(track(state, "src", source, bar()), 4);
            if (!slice || windowHasNa(slice)) return NA;
            return (slice[0] + 2 * slice[1] + 2 * slice[2] + slice[3]) / 6;
        },
        hma: (state, source, length) => {
            const half = wmaOf(track(state, "src", source, bar()), Math.floor(length / 2));
            const full = wmaOf(state.src.values, length);
            const raw = 2 * half - full;
            return wmaOf(track(state, "raw", raw, bar()), Math.floor(Math.sqrt(length)));
        },
        vwma: (state, source, length) => {
            const volume = series("volume");
            const weighted = sma(track(state, "pv", source * volume, bar()), length);
            const volumeAverage = sma(track(state, "v", volume, bar()), length);
            return volumeAverage ? weighted / volumeAverage : NA;
        },
        rsi: (state, source, length) => {
            const values = track(state, "src", source, bar());
            const previous = values.length > 1 ? values[values.length - 2] : NA;
            const change = source - previous;
            const up = rmaStep(state, "up", isNa(change) ? NA : Math.max(change, 0), length, bar());
            const down = rmaStep(state, "down", isNa(change) ? NA : -Math.min(change, 0), length, bar());
            if (isNa(up) || isNa(down)) return NA;
            if (down === 0) return 100;
            if (up === 0) return 0;
            return 100 - 100 / (1 + up / down);
        },
        macd: (state, source, fastLength, slowLength, signalLength) => {
            const fast = emaStep(state, "fast", source, fastLength, bar());
            const slow = emaStep(state, "slow", source, slowLength, bar());
            const line = fast - slow;
            const signal = emaStep(state, "signal", line, signalLength, bar());
            return [line, signal, line - signal];
        },
        stoch: (state, source, high, low, length) => {
            track(state, "src", source, bar());
            const highest = extreme(track(state, "high", high, bar()), length, Math.max);
            const lowest = extreme(track(state, "low", low, bar()), length, Math.min);
            const range = highest - lowest;
            return range ? (100 * (source - lowest)) / range : NA;
        },
        atr: (state, length) => rmaStep(state, "atr", trueRange(true), length, bar()),
        tr: (state, handleNa = false) => trueRange(handleNa),
        bb: (state, source, length, mult) => {
            const values = track(state, "src", source, bar());
            const basis = sma(values, length);
            const slice = window(values, length);
            if (isNa(basis) || !slice) return [NA, NA, NA];
            const deviation = mult * stdevOf(slice);
            return [basis, basis + deviation, basis - deviation];
        },
        stdev: (state, source, length, biased = true) => {
            const slice = window(track(state, "src", source, bar()), length);
            return !slice || windowHasNa(slice) ? NA : stdevOf(slice, biased);
        },
        variance: (state, source, length, biased = true) => {
            const slice = window(track(state, "src", source, bar()), length);
            if (!slice || windowHasNa(slice)) return NA;
            const deviation = stdevOf(slice, biased);
            return deviation * deviation;
        },
        dev: (state, source, length) => {
            const slice = window(track(state, "src", source, bar()), length);
            if (!slice || windowHasNa(slice)) return NA;
            const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
            return slice.reduce((sum, value) => sum + Math.abs(value - average), 0) / slice.length;
        },
        vwap: (state, source = series("hlc3")) => {
            const day = Math.floor(series("time") / 86_400_000);
            const volume = series("volume");
            let entry = state.vwap;
            if (!entry) {
                entry = { day: null, pv: 0, v: 0, prevPv: 0, prevV: 0, bar: -1 };
                state.vwap = entry;
            }
            if (entry.bar !== bar()) {
                if (entry.day !== day) {
                    entry.pv = 0;
                    entry.v = 0;
                    entry.day = day;
                }
                entry.prevPv = entry.pv;
                entry.prevV = entry.v;
                entry.bar = bar();
            }
            entry.pv = entry.prevPv + source * volume;
            entry.v = entry.prevV + volume;
            return entry.v ? entry.pv / entry.v : NA;
        },
        highest: (state, sourceOrLength, length) => (length === undefined
            ? extreme(track(state, "src", series("high"), bar()), sourceOrLength, Math.max)
            : extreme(track(state, "src", sourceOrLength, bar()), length, Math.max)),
        lowest: (state, sourceOrLength, length) => (length === undefined
            ? extreme(track(state, "src", series("low"), bar()), sourceOrLength, Math.min)
            : extreme(track(state, "src", sourceOrLength, bar()), length, Math.min)),
        highestbars: (state, sourceOrLength, length) => (length === undefined
            ? extremeOffset(track(state, "src", series("high"), bar()), sourceOrLength, (a, b) => a > b)
            : extremeOffset(track(state, "src", sourceOrLength, bar()), length, (a, b) => a > b)),
        lowestbars: (state, sourceOrLength, length) => (length === undefined
            ? extremeOffset(track(state, "src", series("low"), bar()), sourceOrLength, (a, b) => a < b)
            : extremeOffset(track(state, "src", sourceOrLength, bar()), length, (a, b) => a < b)),
        change: (state, source, length = 1) => {
            const values = track(state, "src", source, bar());
            const previous = values.length > length ? values[values.length - 1 - length] : NA;
            if (typeof source === "boolean") return source !== previous;
            return source - previous;
        },
        mom: (state, source, length) => {
            const values = track(state, "src", source, bar());
            return values.length > length ? source - values[values.length - 1 - length] : NA;
        },
        crossover: (state, a, b) => {
            const as = track(state, "a", a, bar());
            const bs = track(state, "b", b, bar());
            if (as.length < 2) return false;
            return a > b && as[as.length - 2] <= bs[bs.length - 2];
        },
        crossunder: (state, a, b) => {
            const as = track(state, "a", a, bar());
            const bs = track(state, "b", b, bar());
            if (as.length < 2) return false;
            return a < b && as[as.length - 2] >= bs[bs.length - 2];
        },
        cross: (state, a, b) => {
            const as = track(state, "a", a, bar());
            const bs = track(state, "b", b, bar());
            if (as.length < 2) return false;
            const prevA = as[as.length - 2];
            const prevB = bs[bs.length - 2];
            return (a > b && prevA <= prevB) || (a < b && prevA >= prevB);
        },
        rising: (state, source, length) => {
            const values = track(state, "src", source, bar());
            if (values.length <= length) return false;
            for (let offset = 1; offset <= length; offset += 1) {
                if (!(source > values[values.length - 1 - offset])) return false;
            }
            return true;
        },
        falling: (state, source, length) => {
            const values = track(state, "src", source, bar());
            if (values.length <= length) return false;
            for (let offset = 1; offset <= length; offset += 1) {
                if (!(source < values[values.length - 1 - offset])) return false;
            }
            return true;
        },
        pivothigh: (state, sourceOrLeft, leftOrRight, right) => (right === undefined
            ? pivot(track(state, "src", series("high"), bar()), sourceOrLeft, leftOrRight, true)
            : pivot(track(state, "src", sourceOrLeft, bar()), leftOrRight, right, true)),
        pivotlow: (state, sourceOrLeft, leftOrRight, right) => (right === undefined
            ? pivot(track(state, "src", series("low"), bar()), sourceOrLeft, leftOrRight, false)
            : pivot(track(state, "src", sourceOrLeft, bar()), leftOrRight, right, false)),
        linreg: (state, source, length, offset = 0) => {
            const slice = window(track(state, "src", source, bar()), length);
            if (!slice || windowHasNa(slice)) return NA;
            const count = slice.length;
            let sumX = 0;
            let sumY = 0;
            let sumXY = 0;
            let sumXX = 0;
            slice.forEach((value, index) => {
                sumX += index;
                sumY += value;
                sumXY += index * value;
                sumXX += index * index;
            });
            const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / count;
            return intercept + slope * (count - 1 - offset);
        },
        cci: (state, source, length) => {
            const slice = window(track(state, "src", source, bar()), length);
            if (!slice || windowHasNa(slice)) return NA;
            const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
            const deviation = slice.reduce((sum, value) => sum + Math.abs(value - average), 0) / slice.length;
            return deviation ? (source - average) / (0.015 * deviation) : NA;
        },
        mfi: (state, source, length) => {
            const values = track(state, "src", source, bar());
            const previous = values.length > 1 ? values[values.length - 2] : NA;
            const flow = series("volume") * source;
            const change = source - previous;
            const upper = track(state, "up", isNa(change) ? NA : change > 0 ? flow : 0, bar());
            const lower = track(state, "down", isNa(change) ? NA : change < 0 ? flow : 0, bar());
            const upSlice = window(upper, length);
            const downSlice = window(lower, length);
            if (!upSlice || !downSlice || windowHasNa(upSlice) || windowHasNa(downSlice)) return NA;
            const up = upSlice.reduce((sum, value) => sum + value, 0);
            const down = downSlice.reduce((sum, value) => sum + value, 0);
            if (down === 0) return 100;
            return 100 - 100 / (1 + up / down);
        },
        cum: (state, source) => recursive(state, "cum", bar(), (prev) => (isNa(prev) ? 0 : prev) + (isNa(source) ? 0 : source)),
        barssince: (state, condition) => recursive(state, "since", bar(), (prev) => {
            if (condition) return 0;
            return isNa(prev) ? NA : prev + 1;
        }),
        valuewhen: (state, condition, source, occurrence = 0) => {
            const conditions = track(state, "cond", Boolean(condition), bar());
            const values = track(state, "src", source, bar());
            let seen = -1;
            for (let index = conditions.length - 1; index >= 0; index -= 1) {
                if (conditions[index]) {
                    seen += 1;
                    if (seen === occurrence) return values[index];
                }
            }
            return NA;
        },
        median: (state, source, length) => {
            const slice = window(track(state, "src", source, bar()), length);
            if (!slice || windowHasNa(slice)) return NA;
            const sorted = [...slice].sort((a, b) => a - b);
            const middle = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
        },
        "math.sum": (state, source, length) => {
            const slice = window(track(state, "src", source, bar()), length);
            if (!slice || windowHasNa(slice)) return NA;
            return slice.reduce((sum, value) => sum + value, 0);
        },
    };

    return functions;
}

// Seri bawaan yang dihitung sekali dari data bar: ta.obv, ta.tr, ta.vwap.
export function precomputeSeries(bars) {
    const obv = [];
    const tr = [];
    const vwap = [];
    let running = 0;
    let day = null;
    let pv = 0;
    let volumeSum = 0;
    bars.forEach((bar, index) => {
        const previous = bars[index - 1];
        if (previous) running += Math.sign(bar.close - previous.close) * bar.volume;
        obv.push(previous ? running : 0);
        tr.push(previous
            ? Math.max(bar.high - bar.low, Math.abs(bar.high - previous.close), Math.abs(bar.low - previous.close))
            : bar.high - bar.low);
        const barDay = Math.floor(bar.time / 86_400_000);
        if (barDay !== day) {
            day = barDay;
            pv = 0;
            volumeSum = 0;
        }
        const typical = (bar.high + bar.low + bar.close) / 3;
        pv += typical * bar.volume;
        volumeSum += bar.volume;
        vwap.push(volumeSum ? pv / volumeSum : NA);
    });
    return { obv, tr, vwap };
}
