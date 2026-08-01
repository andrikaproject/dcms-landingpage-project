// Bahasa Indonesia number formatting helpers (comma decimal, dot thousands).

const priceFormatter = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatPrice(value) {
    if (!Number.isFinite(value)) return "—";
    return priceFormatter.format(value);
}

// Absolute distance label, e.g. "0,22%".
export function formatAbsPercent(value) {
    if (!Number.isFinite(value)) return "—";
    return `${priceFormatter.format(Math.abs(value))}%`;
}

// Signed distance for the level table, e.g. "+1,90%" / "-1,91%".
export function formatSignedPercent(value) {
    if (!Number.isFinite(value)) return "—";
    const sign = value >= 0 ? "+" : "-";
    return `${sign}${priceFormatter.format(Math.abs(value))}%`;
}

export const LEVEL_LABEL = {
    do: "DO",
    pdh: "PDH",
    pdl: "PDL",
    pdm: "PDM",
    wo: "WO",
    pwh: "PWH",
    pwl: "PWL",
    pwm: "PWM",
};

export const LEVEL_HELP = {
    do: { name: "Daily Open", description: "Harga pembukaan hari ini." },
    pdh: { name: "Previous Day High", description: "Harga tertinggi pada hari sebelumnya." },
    pdl: { name: "Previous Day Low", description: "Harga terendah pada hari sebelumnya." },
    pdm: { name: "Previous Day Mid", description: "Titik tengah antara PDH dan PDL." },
    wo: { name: "Weekly Open", description: "Harga pembukaan minggu berjalan." },
    pwh: { name: "Previous Week High", description: "Harga tertinggi pada minggu sebelumnya." },
    pwl: { name: "Previous Week Low", description: "Harga terendah pada minggu sebelumnya." },
    pwm: { name: "Previous Week Mid", description: "Titik tengah antara PWH dan PWL." },
};

// Short accessible chart summary text.
export function buildChartSummary(payload) {
    if (!payload) return "";
    const { symbol, currentPrice, levels, alertState } = payload;
    const parts = [`${symbol} ${alertState || ""}`.trim() + "."];
    parts.push(`Harga saat ini ${formatPrice(currentPrice)}.`);
    for (const key of ["do", "pdl", "pdh", "pdm", "wo", "pwl", "pwh", "pwm"]) {
        if (Number.isFinite(levels?.[key])) {
            parts.push(`${LEVEL_LABEL[key]} ${formatPrice(levels[key])}.`);
        }
    }
    return parts.join(" ");
}
