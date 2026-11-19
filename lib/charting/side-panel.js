// Lebar panel kanan Live Chart yang bisa digeser. Chart selalu menyisakan
// ruang minimum supaya tidak terjepit, dan panel tidak bisa lebih sempit dari
// kartu-kartunya.

export const SIDE_PANEL = {
    min: 280,
    max: 560,
    default: 320,
    step: 16,
    // Lebar kolom pegangan di antara chart dan panel (sekaligus jarak antarkolom).
    handle: 20,
    minChart: 480,
};

export function sidePanelMax(available) {
    if (!Number.isFinite(available) || available <= 0) return SIDE_PANEL.max;
    return Math.max(SIDE_PANEL.min, Math.min(SIDE_PANEL.max, available - SIDE_PANEL.handle - SIDE_PANEL.minChart));
}

export function clampSidePanelWidth(width, available) {
    const value = Number(width);
    if (!Number.isFinite(value) || value <= 0) return SIDE_PANEL.default;
    return Math.round(Math.min(sidePanelMax(available), Math.max(SIDE_PANEL.min, value)));
}

// Panel ada di kanan: geser ke kiri (atau panah kiri) melebarkannya.
export function widthAfterKey(key, width, available) {
    const step = SIDE_PANEL.step;
    if (key === "ArrowLeft") return clampSidePanelWidth(width + step, available);
    if (key === "ArrowRight") return clampSidePanelWidth(width - step, available);
    if (key === "Home") return SIDE_PANEL.min;
    if (key === "End") return sidePanelMax(available);
    return null;
}
