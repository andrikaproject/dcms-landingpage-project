/**
 * Volume Nodes — HVN (High Volume Nodes) & LVN (Low Volume Nodes) detection.
 *
 * Konsep ini meniru fitur "Volume Nodes" di TradingView:
 *   - Volume Peaks  (HVN) → harga dengan volume menumpuk. Berfungsi sebagai
 *     magnet / support-resistance kuat (harga betah di situ).
 *   - Volume Troughs (LVN) → harga dengan volume tipis. Harga lewat cepat di
 *     zona ini → bagus sebagai "runway" / target gerak cepat.
 *
 * Berbeda dari POC (1 node tertinggi) di calcVPVR, modul ini mengekstrak
 * beberapa node sekaligus (top-N peak & bottom-N trough) dari profil volume
 * beresolusi halus, lalu menjadikannya indikator konfluensi entry.
 *
 * Bersifat additive: tidak mengubah output VPVR lama (poc/vah/val/volumeProfile).
 */

/** Pemetaan langsung dari setting "Volume Nodes" di TradingView. */
export const DEFAULT_NODE_CONFIG = {
    bins: 100, // resolusi halus untuk deteksi node (VPVR UI tetap 24 bin)
    peakLookbackPct: 0.12, // Node Detection Percent (Peaks) = 12%
    troughLookbackPct: 0.10, // Node Detection Percent (Troughs) = 10%
    thresholdPct: 0.05, // Volume Node Threshold = 5% (abaikan bin < 5% dari max)
    maxHighNodes: 3, // Highest Volume Nodes
    maxLowNodes: 3, // Lowest Volume Nodes
    proximityPct: 0.02, // jarak max harga↔node agar dianggap konfluensi (2%)
};

const EMPTY_NODES = { hvn: [], lvn: [] };

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function binCenterPrice(minPrice, step, bin) {
    return minPrice + bin * step + step / 2;
}

function buildProfile(highs, lows, volumes, bins) {
    if (!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(volumes)) return null;
    if (highs.length === 0) return null;

    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const step = (maxPrice - minPrice) / bins;

    if (!Number.isFinite(step) || step <= 0) return null;

    const profile = new Array(bins).fill(0);

    for (let i = 0; i < highs.length; i += 1) {
        const low = lows[i];
        const high = highs[i];
        const vol = volumes[i];
        if (![low, high, vol].every(Number.isFinite)) continue;

        const startBin = clamp(Math.floor((low - minPrice) / step), 0, bins - 1);
        const endBin = clamp(Math.floor((high - minPrice) / step), 0, bins - 1);
        const volumePerBin = vol / (endBin - startBin + 1);

        for (let bin = startBin; bin <= endBin; bin += 1) {
            profile[bin] += volumePerBin;
        }
    }

    return { profile, minPrice, step };
}

/**
 * Greedy peak/trough picker dengan separasi minimum agar tidak memilih
 * node yang berdempetan (plateau). `comparator` mengurutkan kandidat dari
 * yang paling layak dipilih duluan.
 */
function pickSeparated(candidates, comparator, separation, limit) {
    const sorted = [...candidates].sort(comparator);
    const picked = [];
    for (const candidate of sorted) {
        if (picked.length >= limit) break;
        const farEnough = picked.every((p) => Math.abs(p.bin - candidate.bin) >= separation);
        if (farEnough) picked.push(candidate);
    }
    return picked;
}

/**
 * Mendeteksi HVN & LVN dari profil volume.
 *
 * @returns {{ hvn: Array<{price:number, strength:number}>,
 *             lvn: Array<{price:number, strength:number}> }}
 *   hvn diurutkan dari yang terkuat, lvn dari yang paling tipis.
 */
export function detectVolumeNodes({ highs, lows, volumes, config } = {}) {
    const cfg = { ...DEFAULT_NODE_CONFIG, ...config };
    const built = buildProfile(highs, lows, volumes, cfg.bins);
    if (!built) return { ...EMPTY_NODES };

    const { profile, minPrice, step } = built;
    const maxVol = Math.max(...profile);
    if (maxVol <= 0) return { ...EMPTY_NODES };

    const threshold = maxVol * cfg.thresholdPct;
    const peakRadius = Math.max(1, Math.round(cfg.peakLookbackPct * cfg.bins));
    const troughRadius = Math.max(1, Math.round(cfg.troughLookbackPct * cfg.bins));
    const toNode = (bin, volume) => ({
        price: binCenterPrice(minPrice, step, bin),
        strength: Math.round((volume / maxVol) * 100),
    });

    // --- HVN: bin yang jadi maksimum lokal dalam radius peakRadius ---
    const peaks = [];
    for (let i = 0; i < cfg.bins; i += 1) {
        const v = profile[i];
        if (v < threshold) continue;
        let isPeak = true;
        for (let j = Math.max(0, i - peakRadius); j <= Math.min(cfg.bins - 1, i + peakRadius); j += 1) {
            if (profile[j] > v) { isPeak = false; break; }
        }
        if (isPeak) peaks.push({ bin: i, volume: v });
    }

    // --- LVN: minimum lokal di dalam rentang aktif (gap antar volume) ---
    let activeLo = 0;
    while (activeLo < cfg.bins && profile[activeLo] < threshold) activeLo += 1;
    let activeHi = cfg.bins - 1;
    while (activeHi >= 0 && profile[activeHi] < threshold) activeHi -= 1;

    const troughs = [];
    for (let i = activeLo + 1; i < activeHi; i += 1) {
        const v = profile[i];
        let isTrough = true;
        for (let j = Math.max(activeLo, i - troughRadius); j <= Math.min(activeHi, i + troughRadius); j += 1) {
            if (profile[j] < v) { isTrough = false; break; }
        }
        if (isTrough) troughs.push({ bin: i, volume: v });
    }

    const hvn = pickSeparated(peaks, (a, b) => b.volume - a.volume, peakRadius, cfg.maxHighNodes)
        .map((p) => toNode(p.bin, p.volume));
    const lvn = pickSeparated(troughs, (a, b) => a.volume - b.volume, troughRadius, cfg.maxLowNodes)
        .map((t) => toNode(t.bin, t.volume));

    return { hvn, lvn };
}

/**
 * Menganalisis posisi harga relatif terhadap node untuk konfluensi entry.
 *
 * Logika (bias-independent untuk nodeScore):
 *   - HVN terdekat di BAWAH harga → support → bullish (+1)
 *   - HVN terdekat di ATAS harga  → resistance → bearish (-1)
 *   Hanya dihitung bila jaraknya <= proximityPct.
 *
 * @returns {{
 *   supportHVN: number|null,
 *   resistanceHVN: number|null,
 *   nearestLVNAbove: number|null,
 *   nearestLVNBelow: number|null,
 *   nodeScore: number
 * }}
 */
export function analyzeVolumeNodes({ price, hvn = [], lvn = [], config } = {}) {
    const cfg = { ...DEFAULT_NODE_CONFIG, ...config };
    const empty = {
        supportHVN: null,
        resistanceHVN: null,
        nearestLVNAbove: null,
        nearestLVNBelow: null,
        nodeScore: 0,
    };
    if (!Number.isFinite(price)) return empty;

    const support = hvn.filter((n) => n.price < price).sort((a, b) => b.price - a.price)[0] || null;
    const resistance = hvn.filter((n) => n.price > price).sort((a, b) => a.price - b.price)[0] || null;
    const lvnAbove = lvn.filter((n) => n.price > price).sort((a, b) => a.price - b.price)[0] || null;
    const lvnBelow = lvn.filter((n) => n.price < price).sort((a, b) => b.price - a.price)[0] || null;

    let nodeScore = 0;
    if (support && (price - support.price) / price <= cfg.proximityPct) nodeScore += 1;
    if (resistance && (resistance.price - price) / price <= cfg.proximityPct) nodeScore -= 1;

    return {
        supportHVN: support?.price ?? null,
        resistanceHVN: resistance?.price ?? null,
        nearestLVNAbove: lvnAbove?.price ?? null,
        nearestLVNBelow: lvnBelow?.price ?? null,
        nodeScore,
    };
}

/**
 * Membangun ringkasan entry berbasis node sesuai bias.
 * `runwayLVN` = LVN searah trade (zona gerak cepat / target).
 * `confluence`:
 *   - "strong"   = ada support/resistance konfluen + runway searah
 *   - "moderate" = ada support/resistance konfluen tanpa runway
 *   - "none"     = tidak ada konfluensi searah bias
 */
export function buildNodeEntry({ bias, context }) {
    if (bias === "neutral" || !context) return null;

    const isLong = bias === "long";
    const guardHVN = isLong ? context.supportHVN : context.resistanceHVN;
    const runwayLVN = isLong ? context.nearestLVNAbove : context.nearestLVNBelow;
    const hasConfluence = isLong ? context.nodeScore > 0 : context.nodeScore < 0;

    let confluence = "none";
    if (hasConfluence) confluence = runwayLVN ? "strong" : "moderate";

    return {
        supportHVN: context.supportHVN,
        resistanceHVN: context.resistanceHVN,
        guardHVN,
        runwayLVN,
        confluence,
    };
}
