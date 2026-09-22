// Aturan pemicu dan asumsi fill dikirim backend sebagai kode. Menampilkannya
// mentah membuat pengguna membacanya sebagai status; misalnya `TOUCH` terbaca
// "sudah tersentuh" padahal artinya "aktif bila tersentuh".

const TRIGGER_RULES = {
    TOUCH: {
        short: "Harga menyentuh level ini",
        long: "Rencana aktif ketika harga menyentuh level entry. Selama belum tersentuh, statusnya tetap Menunggu Entry.",
    },
};

const FILL_RULES = {
    PLANNED_LEVEL_ADVERSE_STOP_GAP: {
        short: "Isi di harga rencana",
        long: "Simulasi mengisi di harga rencana. Bila harga meloncat ke arah yang merugikan, harga loncatan itu yang dipakai, bukan harga rencana.",
    },
};

function describe(map, code, fallbackPrefix) {
    const key = String(code || "").trim().toUpperCase();
    if (!key) return null;
    const known = map[key];
    if (known) return { code: key, isKnown: true, ...known };

    // Aturan baru dari backend tetap ditampilkan apa adanya, tetapi diberi konteks
    // supaya tidak terbaca sebagai status.
    return { code: key, isKnown: false, short: `${fallbackPrefix} ${key}`, long: `${fallbackPrefix} ${key}. Keterangannya belum dikenal frontend.` };
}

export function describeTriggerRule(code) {
    return describe(TRIGGER_RULES, code, "Aturan pemicu");
}

export function describeFillRule(code) {
    return describe(FILL_RULES, code, "Asumsi fill");
}
