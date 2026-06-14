import {
    calcATR,
    calcEMA,
    calcKeyLevel,
    calcRSI,
    calcStochRSI,
    calcTrendline,
    calcVPVR,
    getStochRsiScore,
} from "@/lib/market/indicators";

export const ENGINE_VERSION = "adaptive-gate-v1";

function isValidCandle(candle) {
    return Number.isFinite(candle?.openTime)
        && Number.isFinite(candle?.closeTime)
        && Number.isFinite(candle?.high)
        && Number.isFinite(candle?.low)
        && Number.isFinite(candle?.close)
        && Number.isFinite(candle?.volume);
}

function getAnalysisCandles(candles) {
    const normalizedCandles = Array.isArray(candles) ? candles.filter(isValidCandle) : [];
    const closedCandles = normalizedCandles.filter((candle) => candle.isClosed);

    return closedCandles.length >= 30 ? closedCandles : normalizedCandles;
}

export function normalizeSymbol(symbol) {
    const cleanSymbol = String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanSymbol) return null;
    return cleanSymbol.endsWith("USDT") ? cleanSymbol : `${cleanSymbol}USDT`;
}

export function generateSignalFromCandles({
    symbol,
    timeframe,
    source,
    candles,
    marketContext = {},
    ticker = {},
}) {
    const analysisCandles = getAnalysisCandles(candles);

    if (analysisCandles.length < 30) {
        throw new Error("Not enough closed candle data for signal generation");
    }

    const closes = analysisCandles.map((candle) => candle.close);
    const highs = analysisCandles.map((candle) => candle.high);
    const lows = analysisCandles.map((candle) => candle.low);
    const volumes = analysisCandles.map((candle) => candle.volume);
    const identityCandle = analysisCandles[analysisCandles.length - 1];
    const price = closes[closes.length - 1];
    const isHighTimeframe = ["4h", "1d"].includes(timeframe);
    const fastPeriod = isHighTimeframe ? 50 : 21;
    const slowPeriod = isHighTimeframe ? 200 : 50;
    const rsiArr = calcRSI(closes, 14);
    const rsi = rsiArr[rsiArr.length - 1];
    const emaFast = calcEMA(closes, fastPeriod).pop();
    const emaSlow = calcEMA(closes, slowPeriod).pop();
    const stoch = calcStochRSI(closes);
    const vpvr = calcVPVR(closes, highs, lows, volumes);
    const trendline = calcTrendline(closes);
    const keyLevel = calcKeyLevel(highs, lows);
    const atr = calcATR(highs, lows, closes, 14).pop();
    let score = Number(marketContext.usdtDomScore || 0);

    if (price > emaFast) score += 1;
    else score -= 1;
    if (price > emaSlow) score += 1;
    else score -= 1;
    if (emaFast > emaSlow) score += 1;
    else score -= 1;
    score += getStochRsiScore(stoch);
    if (price > vpvr.poc) score += 1;
    else score -= 1;
    if (trendline === "BULLISH") score += 1;
    else score -= 1;
    if (price > keyLevel.mid) score += 1;
    else score -= 1;

    const bias = score >= 4 ? "long" : score <= -4 ? "short" : "neutral";
    const stopLossDistance = atr * 2;
    const entry = closes[closes.length - 2] || price;
    const tp1 = bias === "short" ? entry - stopLossDistance * 1.2 : entry + stopLossDistance * 1.2;
    const tp2 = bias === "short" ? entry - stopLossDistance * 2 : entry + stopLossDistance * 2;
    const tp = tp2;
    const sl = bias === "short" ? entry + stopLossDistance : entry - stopLossDistance;
    const riskPercent = Math.abs(price - sl) / price * 100;
    const rewardPercent = Math.abs(tp2 - price) / price * 100;
    const tp1RewardPercent = Math.abs(tp1 - price) / price * 100;
    const riskReward = rewardPercent / (riskPercent || 1);
    const tp1RiskReward = tp1RewardPercent / (riskPercent || 1);
    const sinceEntryPercent = (price - entry) / entry * 100;
    const progressPercent = Math.max(8, Math.min(100, rewardPercent / ((riskPercent + rewardPercent) || 1) * 100));

    return {
        symbol,
        timeframe,
        base: symbol.replace("USDT", ""),
        price,
        change: Number(ticker.change || 0),
        volume24h: Number(ticker.volume24h || 0),
        source,
        marketType: "CEX",
        indicatorAvailable: true,
        engineVersion: ENGINE_VERSION,
        candleOpenTime: identityCandle.openTime,
        candleCloseTime: identityCandle.closeTime,
        isClosedCandle: Boolean(identityCandle.isClosed),
        tradePlanValidForConservative: bias !== "neutral" && Boolean(identityCandle.isClosed),
        support: keyLevel.support,
        resistance: keyLevel.resistance,
        rsi,
        emaFast,
        emaSlow,
        fastPeriod,
        slowPeriod,
        stochK: stoch.k,
        stochD: stoch.d,
        poc: vpvr.poc,
        trendline,
        keyMid: keyLevel.mid,
        bias,
        score,
        entry,
        tp1,
        tp2,
        tp,
        sl,
        atr,
        riskPercent,
        rewardPercent,
        riskReward,
        tp1RiskReward,
        sinceEntryPercent,
        progressPercent,
    };
}
