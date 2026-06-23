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
import { calculateEntryZone } from "@/lib/market/entry-zone";
import { buildPartialTpPlan } from "@/lib/market/partial-tp";
import { analyzeVolumeNodes, buildNodeEntry, detectVolumeNodes } from "@/lib/market/volume-nodes";
import { calculateInvalidationSL, calculateStructuralTP } from "@/lib/market/sl-tp";

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
    const volumeNodes = detectVolumeNodes({ highs, lows, volumes });
    const nodeContext = analyzeVolumeNodes({ price, hvn: volumeNodes.hvn, lvn: volumeNodes.lvn });
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
    // Volume-node confluence: HVN support di bawah harga → bullish, resistance di atas → bearish.
    score += nodeContext.nodeScore;

    const bias = score >= 4 ? "long" : score <= -4 ? "short" : "neutral";
    const entry = closes[closes.length - 2] || price;
    const nodeEntry = buildNodeEntry({ bias, context: nodeContext });

    // SL berbasis invalidation level (HVN/S-R/value-area), fallback ke ATR.
    const { sl, slSource } = calculateInvalidationSL({
        bias,
        entry,
        atr,
        guardHVN: nodeContext.supportHVN,
        resistanceHVN: nodeContext.resistanceHVN,
        support: keyLevel.support,
        resistance: keyLevel.resistance,
        val: vpvr.val,
        vah: vpvr.vah,
        poc: vpvr.poc,
    });

    // TP di-anchor ke resistance/runway struktural, fallback ke ATR.
    const { tp1, tp2, tp1Source, tp2Source } = calculateStructuralTP({
        bias,
        entry,
        atr,
        resistanceHVN: nodeContext.resistanceHVN,
        supportHVN: nodeContext.supportHVN,
        resistance: keyLevel.resistance,
        support: keyLevel.support,
        vah: vpvr.vah,
        val: vpvr.val,
        runwayLVN: nodeEntry?.runwayLVN,
    });
    const tp = tp2;

    // R:R berbasis entry (fixed) — mencerminkan kualitas trade plan, bukan harga live.
    const riskPercent = Math.abs(entry - sl) / entry * 100;
    const rewardPercent = Math.abs(tp2 - entry) / entry * 100;
    const tp1RewardPercent = Math.abs(tp1 - entry) / entry * 100;
    const riskReward = rewardPercent / (riskPercent || 1);
    const tp1RiskReward = tp1RewardPercent / (riskPercent || 1);

    // R:R live (dari harga sekarang) untuk monitoring progress.
    const liveRiskPct = Math.abs(price - sl) / price * 100;
    const liveRewardPct = Math.abs(tp2 - price) / price * 100;
    const liveRR = liveRewardPct / (liveRiskPct || 1);

    const sinceEntryPercent = (price - entry) / entry * 100;
    const progressPercent = Math.max(8, Math.min(100, liveRewardPct / ((liveRiskPct + liveRewardPct) || 1) * 100));

    const entryZone = calculateEntryZone({
        bias,
        entry,
        atr,
        support: keyLevel.support,
        resistance: keyLevel.resistance,
        price,
    });

    const partialTpPlan = buildPartialTpPlan({ bias, entry, sl, tp1, tp2, atr });

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
        vah: vpvr.vah,
        val: vpvr.val,
        volumeProfile: vpvr.volumeProfile,
        volumeNodes,
        trendline,
        keyMid: keyLevel.mid,
        bias,
        score,
        entry,
        tp1,
        tp2,
        tp,
        sl,
        slSource,
        tp1Source,
        tp2Source,
        atr,
        riskPercent,
        rewardPercent,
        riskReward,
        tp1RiskReward,
        liveRR,
        sinceEntryPercent,
        progressPercent,
        entryZone,
        partialTpPlan,
        nodeEntry,
    };
}
