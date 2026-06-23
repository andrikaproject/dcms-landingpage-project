/**
 * Invalidation-Based SL & Structural TP.
 *
 * Mengganti SL/TP flat berbasis ATR dengan level yang bermakna secara teknikal:
 *   - SL ditempatkan di level yang, jika ditembus, membuktikan thesis trade salah
 *     (invalidation). Kandidat diambil dari HVN support, swing S/R, value area, POC.
 *   - TP di-anchor ke resistance / target struktural nyata, bukan rasio ATR.
 *
 * Semua perhitungan punya fallback ke ATR (behavior lama) agar tidak pernah
 * menghasilkan level invalid. Lihat PRD_Invalidation_SL_Structural_TP.md.
 */

export const SL_BUFFER_PCT = 0.003; // 0.3% buffer dari level invalidation
export const MIN_SL_ATR_MULT = 0.5; // SL tidak boleh lebih sempit dari 0.5 ATR
export const MAX_SL_ATR_MULT = 3; // SL tidak boleh lebih lebar dari 3 ATR
export const ATR_FALLBACK_MULT = 2; // jarak SL fallback = 2 ATR (behavior lama)
export const ATR_FLOOR_PCT = 0.005; // ATR minimum = 0.5% dari entry saat ATR invalid

export const MIN_TP1_ATR_MULT = 0.5; // TP1 minimal 0.5 ATR dari entry agar bermakna
export const TP1_ATR_FALLBACK_MULT = 2.4; // jarak TP1 fallback (behavior lama)
export const TP2_ATR_FALLBACK_MULT = 4; // jarak TP2 fallback (behavior lama)
export const TP2_MIN_GAP_ATR_MULT = 1; // gap minimum tp2 dari tp1 saat dipaksa urut

/**
 * ATR efektif — jaga agar guardrail tetap masuk akal walau ATR mendekati 0
 * (data tipis / harga flat). Edge case Section 6 PRD.
 */
function effectiveAtr(atr, entry) {
    if (Number.isFinite(atr) && atr > 0) return atr;
    return Math.abs(entry) * ATR_FLOOR_PCT;
}

/**
 * Menentukan SL berdasarkan invalidation level terdekat yang lolos guardrail.
 *
 * LONG  → kandidat di BAWAH entry: guardHVN, support, val, poc
 * SHORT → kandidat di ATAS  entry: resistanceHVN, resistance, vah, poc
 *
 * Pilih kandidat valid (jarak 0.5–3 ATR dari entry) yang TERDEKAT ke entry,
 * lalu beri buffer 0.3%. Jika tidak ada → fallback entry ± 2 ATR.
 *
 * @returns {{ sl: number, slSource: string }}
 */
export function calculateInvalidationSL({
    bias,
    entry,
    atr,
    guardHVN,
    resistanceHVN,
    support,
    resistance,
    val,
    vah,
    poc,
} = {}) {
    const atrEff = effectiveAtr(atr, entry);
    const minDist = atrEff * MIN_SL_ATR_MULT;
    const maxDist = atrEff * MAX_SL_ATR_MULT;
    const isShort = bias === "short";

    const fallback = () => ({
        sl: isShort ? entry + atrEff * ATR_FALLBACK_MULT : entry - atrEff * ATR_FALLBACK_MULT,
        slSource: "atr-fallback",
    });

    // Neutral: tidak ada thesis untuk diinvalidasi → langsung fallback ATR.
    if (bias === "neutral" || !Number.isFinite(entry)) return fallback();

    // Kandidat dalam urutan prioritas (tie-breaker bila jarak sama).
    const candidates = isShort
        ? [
            { level: resistanceHVN, source: "resistanceHVN" },
            { level: resistance, source: "resistance" },
            { level: vah, source: "vah" },
            { level: poc, source: "poc" },
        ]
        : [
            { level: guardHVN, source: "guardHVN" },
            { level: support, source: "support" },
            { level: val, source: "val" },
            { level: poc, source: "poc" },
        ];

    let best = null;
    for (const { level, source } of candidates) {
        if (!Number.isFinite(level)) continue;
        // Harus di sisi yang benar relatif entry.
        const onCorrectSide = isShort ? level > entry : level < entry;
        if (!onCorrectSide) continue;

        const dist = Math.abs(entry - level);
        if (dist < minDist || dist > maxDist) continue;

        // Pilih yang terdekat ke entry; urutan prioritas jadi tie-breaker.
        if (best === null || dist < best.dist) {
            best = { level, source, dist };
        }
    }

    if (best === null) return fallback();

    const sl = isShort
        ? best.level * (1 + SL_BUFFER_PCT)
        : best.level * (1 - SL_BUFFER_PCT);

    return { sl, slSource: best.source };
}

/**
 * Menentukan TP1 & TP2 dengan anchor ke level struktural.
 *
 * LONG  → kandidat di ATAS  entry: resistanceHVN, resistance, vah
 * SHORT → kandidat di BAWAH entry: supportHVN, support, val
 *
 * TP1 = level struktural terdekat searah profit (jarak >= 0.5 ATR).
 * TP2 = level struktural berikutnya setelah TP1, atau runwayLVN (searah).
 * Tanpa kandidat → fallback entry ± 2.4 / 4 ATR. Urutan tp1<tp2 dijaga.
 *
 * Catatan: `runwayLVN` sudah directional (LVN di atas untuk long, di bawah
 * untuk short) — lihat buildNodeEntry di volume-nodes.js.
 *
 * @returns {{ tp1: number, tp2: number, tp1Source: string, tp2Source: string }}
 */
export function calculateStructuralTP({
    bias,
    entry,
    atr,
    resistanceHVN,
    supportHVN,
    resistance,
    support,
    vah,
    val,
    runwayLVN,
} = {}) {
    const atrEff = effectiveAtr(atr, entry);
    const isShort = bias === "short";
    const dir = isShort ? -1 : 1; // arah profit

    const tp1Fallback = entry + dir * atrEff * TP1_ATR_FALLBACK_MULT;
    const tp2Fallback = entry + dir * atrEff * TP2_ATR_FALLBACK_MULT;

    const fallback = () => ({
        tp1: tp1Fallback,
        tp2: tp2Fallback,
        tp1Source: "atr-fallback",
        tp2Source: "atr-fallback",
    });

    if (bias === "neutral" || !Number.isFinite(entry)) return fallback();

    // Jarak searah profit (positif = berada di arah yang benar).
    const profitDist = (level) => dir * (level - entry);
    const minTp1Dist = atrEff * MIN_TP1_ATR_MULT;

    const structural = isShort
        ? [
            { level: supportHVN, source: "supportHVN" },
            { level: support, source: "support" },
            { level: val, source: "val" },
        ]
        : [
            { level: resistanceHVN, source: "resistanceHVN" },
            { level: resistance, source: "resistance" },
            { level: vah, source: "vah" },
        ];

    // Kandidat valid: searah profit & cukup jauh, diurut dari yang terdekat.
    const valid = structural
        .filter((c) => Number.isFinite(c.level) && profitDist(c.level) >= minTp1Dist)
        .sort((a, b) => profitDist(a.level) - profitDist(b.level));

    let tp1;
    let tp1Source;
    if (valid.length > 0) {
        tp1 = valid[0].level;
        tp1Source = valid[0].source;
    } else {
        tp1 = tp1Fallback;
        tp1Source = "atr-fallback";
    }

    // TP2: level struktural berikutnya setelah TP1, atau runwayLVN.
    const nextLabel = isShort ? "nextSupport" : "nextResistance";
    const tp2Candidates = valid
        .filter((c) => profitDist(c.level) > profitDist(tp1))
        .map((c) => ({ level: c.level, source: nextLabel }));

    if (Number.isFinite(runwayLVN) && profitDist(runwayLVN) > profitDist(tp1)) {
        tp2Candidates.push({ level: runwayLVN, source: "runwayLVN" });
    }

    tp2Candidates.sort((a, b) => profitDist(a.level) - profitDist(b.level));

    let tp2;
    let tp2Source;
    if (tp2Candidates.length > 0) {
        tp2 = tp2Candidates[0].level;
        tp2Source = tp2Candidates[0].source;
    } else {
        tp2 = tp2Fallback;
        tp2Source = "atr-fallback";
    }

    // Jaga urutan: tp2 harus lebih jauh dari tp1 searah profit.
    if (profitDist(tp2) <= profitDist(tp1)) {
        tp2 = tp1 + dir * atrEff * TP2_MIN_GAP_ATR_MULT;
        tp2Source = "atr-fallback";
    }

    return { tp1, tp2, tp1Source, tp2Source };
}
