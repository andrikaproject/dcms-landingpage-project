// Preferensi Live Chart: indikator aktif, lapisan analisis DCMS, dan toggle
// toolbar. Draft yang belum disimpan tidak ikut dipersist karena script-nya bisa
// jauh lebih besar dari batas preferensi; yang disimpan hanya rujukannya.

export const MAX_ACTIVE_INDICATORS = 10;
export const MAX_PANES = 3;

export const DEFAULT_DCMS_LAYER = { visible: true, biasCard: true, levels: true, structure: true, remember: true };
export const DEFAULT_TOGGLES = { ema21: true, ema50: true, volume: true };

export function normalizePreferences(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const active = Array.isArray(source.activeIndicators) ? source.activeIndicators : [];
    return {
        version: 1,
        activeIndicators: active
            .filter((entry) => entry && (entry.kind === "builtin" || entry.kind === "saved") && entry.refId && entry.uid)
            .slice(0, MAX_ACTIVE_INDICATORS)
            .map((entry) => ({
                uid: String(entry.uid),
                kind: entry.kind,
                refId: String(entry.refId),
                inputs: entry.inputs && typeof entry.inputs === "object" ? entry.inputs : {},
                style: entry.style && typeof entry.style === "object" ? entry.style : {},
                visible: entry.visible !== false,
                pane: { collapsed: Boolean(entry.pane?.collapsed), maximized: Boolean(entry.pane?.maximized) },
            })),
        dcmsLayer: { ...DEFAULT_DCMS_LAYER, ...(source.dcmsLayer && typeof source.dcmsLayer === "object" ? source.dcmsLayer : {}) },
        toggles: { ...DEFAULT_TOGGLES, ...(source.toggles && typeof source.toggles === "object" ? source.toggles : {}) },
    };
}

export function persistablePreferences(preferences) {
    return {
        ...preferences,
        activeIndicators: preferences.activeIndicators.filter((entry) => entry.kind !== "draft").map(({ source, ...entry }) => {
            void source;
            return entry;
        }),
    };
}

let uidCounter = 0;
export function createUid(prefix = "ind") {
    uidCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}

export function addIndicator(preferences, entry) {
    if (preferences.activeIndicators.length >= MAX_ACTIVE_INDICATORS) {
        return { preferences, error: `Maksimal ${MAX_ACTIVE_INDICATORS} indikator aktif di satu chart.` };
    }
    const next = {
        uid: entry.uid || createUid(),
        kind: entry.kind,
        refId: entry.refId,
        source: entry.source,
        inputs: entry.inputs || {},
        style: entry.style || {},
        visible: true,
        pane: { collapsed: false, maximized: false },
    };
    return { preferences: { ...preferences, activeIndicators: [...preferences.activeIndicators, next] }, entry: next };
}

export function updateIndicatorEntry(preferences, uid, patch) {
    return {
        ...preferences,
        activeIndicators: preferences.activeIndicators.map((entry) => (entry.uid === uid
            ? { ...entry, ...(typeof patch === "function" ? patch(entry) : patch) }
            : entry)),
    };
}

export function removeIndicatorEntry(preferences, uid) {
    return { ...preferences, activeIndicators: preferences.activeIndicators.filter((entry) => entry.uid !== uid) };
}

// Pindah ke atas hanya di antara indikator panel (overlay=false).
export function moveIndicatorUp(preferences, uid, isPane) {
    const list = [...preferences.activeIndicators];
    const index = list.findIndex((entry) => entry.uid === uid);
    if (index <= 0) return preferences;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        if (isPane(list[cursor])) {
            [list[cursor], list[index]] = [list[index], list[cursor]];
            return { ...preferences, activeIndicators: list };
        }
    }
    return preferences;
}

export function setPaneMode(preferences, uid, mode) {
    return {
        ...preferences,
        activeIndicators: preferences.activeIndicators.map((entry) => {
            if (entry.uid === uid) {
                return { ...entry, pane: { collapsed: mode === "collapsed" ? !entry.pane.collapsed : false, maximized: mode === "maximized" ? !entry.pane.maximized : false } };
            }
            // Hanya satu panel yang boleh dimaksimalkan.
            return mode === "maximized" ? { ...entry, pane: { ...entry.pane, maximized: false } } : entry;
        }),
    };
}

// Ubah draft menjadi rujukan indikator tersimpan setelah disimpan ke akun.
export function promoteDraft(preferences, draftUid, savedId) {
    return updateIndicatorEntry(preferences, draftUid, (entry) => ({ kind: "saved", refId: savedId, source: undefined, inputs: entry.inputs }));
}
