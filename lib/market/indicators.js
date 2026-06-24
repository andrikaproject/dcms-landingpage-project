function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
}

export function calcEMA(data, period) {
    if (!Array.isArray(data) || data.length === 0) return [];

    const k = 2 / (period + 1);
    const ema = [data[0]];

    for (let i = 1; i < data.length; i += 1) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }

    return ema;
}

export function calcRSI(closes, period = 14) {
    if (!Array.isArray(closes) || closes.length <= period) return [];

    const rsi = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i += 1) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));

    for (let i = period + 1; i < closes.length; i += 1) {
        const diff = closes[i] - closes[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
        rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));
    }

    return rsi;
}

function calcSMA(data, period) {
    return data.map((value, index) => {
        if (index < period - 1) return value;

        const window = data.slice(index - period + 1, index + 1);
        return window.reduce((sum, item) => sum + item, 0) / period;
    });
}

export function calcStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, smoothK = 3, smoothD = 3) {
    const rsi = calcRSI(closes, rsiPeriod);

    if (rsi.length === 0) {
        return {
            k: 50,
            d: 50,
            previousK: 50,
            previousD: 50,
        };
    }

    const stochRaw = [];

    for (let i = 0; i < rsi.length; i += 1) {
        if (i < stochPeriod) {
            stochRaw.push(50);
            continue;
        }

        const window = rsi.slice(i - stochPeriod + 1, i + 1);
        const min = Math.min(...window);
        const max = Math.max(...window);
        stochRaw.push(max === min ? 50 : 100 * (rsi[i] - min) / (max - min));
    }

    const k = calcSMA(stochRaw, smoothK);
    const d = calcSMA(k, smoothD);
    const lastIndex = k.length - 1;
    const previousIndex = Math.max(0, lastIndex - 1);

    return {
        k: k[lastIndex],
        d: d[lastIndex],
        previousK: k[previousIndex],
        previousD: d[previousIndex],
    };
}

export function getStochRsiScore({ k, d, previousK, previousD }) {
    if (![k, d, previousK, previousD].every(isFiniteNumber)) return 0;

    const currentK = Number(k);
    const currentD = Number(d);
    const priorK = Number(previousK);
    const priorD = Number(previousD);
    const overbought = 80;
    const oversold = 20;
    const midline = 50;
    const middleRangeLow = 35;
    const middleRangeHigh = 65;
    const chopSpread = 3;
    const bullishCross = priorK <= priorD && currentK > currentD;
    const bearishCross = priorK >= priorD && currentK < currentD;
    const crossedUpFromOversold = priorK <= oversold && currentK > oversold;
    const crossedDownFromOverbought = priorK >= overbought && currentK < overbought;
    const isMiddleRange = currentK >= middleRangeLow
        && currentK <= middleRangeHigh
        && currentD >= middleRangeLow
        && currentD <= middleRangeHigh;
    const isChoppyMiddle = isMiddleRange && Math.abs(currentK - currentD) < chopSpread;

    if (isChoppyMiddle) return 0;

    const bullishReversal = (bullishCross && (priorK <= oversold || priorD <= oversold || currentK <= middleRangeLow))
        || (crossedUpFromOversold && currentK > currentD);
    const bearishReversal = (bearishCross && (priorK >= overbought || priorD >= overbought || currentK >= middleRangeHigh))
        || (crossedDownFromOverbought && currentK < currentD);
    const bullishMomentum = currentK > currentD && currentK >= midline && currentK < overbought && currentD >= midline;
    const bearishMomentum = currentK < currentD && currentK <= midline && currentK > oversold && currentD <= midline;

    if (bullishReversal || bullishMomentum) return 1;
    if (bearishReversal || bearishMomentum) return -1;

    return 0;
}

export function calcATR(highs, lows, closes, period = 14) {
    if (!Array.isArray(highs) || highs.length === 0) return [];

    const tr = [highs[0] - lows[0]];

    for (let i = 1; i < highs.length; i += 1) {
        tr.push(
            Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            )
        );
    }

    const atr = [tr[0]];

    for (let i = 1; i < tr.length; i += 1) {
        atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
    }

    return atr;
}

export function calcVPVR(closes, highs, lows, volumes, bins = 24) {
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const step = (maxPrice - minPrice) / bins;
    const fallback = closes[closes.length - 1];

    if (step === 0) return { poc: fallback, vah: fallback, val: fallback, volumeProfile: [] };

    const profile = new Array(bins).fill(0);

    for (let i = 0; i < closes.length; i += 1) {
        const startBin = Math.max(0, Math.min(bins - 1, Math.floor((lows[i] - minPrice) / step)));
        const endBin = Math.max(0, Math.min(bins - 1, Math.floor((highs[i] - minPrice) / step)));
        const volumePerBin = volumes[i] / (endBin - startBin + 1);

        for (let bin = startBin; bin <= endBin; bin += 1) {
            profile[bin] += volumePerBin;
        }
    }

    const pocBin = profile.reduce((best, v, i) => (v > profile[best] ? i : best), 0);
    const poc = minPrice + pocBin * step + step / 2;

    // Value Area: expand from POC until 70% of total volume is covered
    const totalVolume = profile.reduce((sum, v) => sum + v, 0);
    const targetVolume = totalVolume * 0.7;
    let lo = pocBin;
    let hi = pocBin;
    let accumulated = profile[pocBin];

    while (accumulated < targetVolume && (lo > 0 || hi < bins - 1)) {
        const nextLo = lo > 0 ? profile[lo - 1] : -1;
        const nextHi = hi < bins - 1 ? profile[hi + 1] : -1;
        if (nextHi >= nextLo) {
            hi += 1;
            accumulated += profile[hi];
        } else {
            lo -= 1;
            accumulated += profile[lo];
        }
    }

    const vah = minPrice + (hi + 1) * step;
    const val = minPrice + lo * step;

    // Normalize profile to 0-100 for UI visualization
    const maxVol = Math.max(...profile);
    const volumeProfile = profile.map((v) => Math.round((v / maxVol) * 100));

    return { poc, vah, val, volumeProfile, profileMin: minPrice, profileMax: maxPrice };
}

export function calcTrendline(closes, period = 30) {
    const data = closes.slice(-period);
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i += 1) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope > 0 ? "BULLISH" : "BEARISH";
}

export function calcKeyLevel(highs, lows) {
    const recentHighs = highs.slice(-30);
    const recentLows = lows.slice(-30);
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);

    return {
        resistance,
        support,
        mid: (resistance + support) / 2,
    };
}
