"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    addIndicator, moveIndicatorUp, promoteDraft, removeIndicatorEntry, setPaneMode, updateIndicatorEntry,
} from "@/lib/charting/chart-preferences";
import { builtinById, DEFAULT_SCRIPT } from "@/lib/pine/builtin-indicators";
import { compileScript, inferMintick } from "@/lib/pine/index";
import { toEngineBars, useIndicatorRuns } from "./useIndicatorRuns";
import { useChartWorkspace } from "./useChartWorkspace";

const NEW_PANE_BADGE_MS = 6000;
let tabCounter = 0;

function newTab(fields = {}) {
    tabCounter += 1;
    return { id: `tab-${tabCounter}`, title: "", source: DEFAULT_SCRIPT, savedId: null, dirty: true, checked: false, chartUid: null, ...fields };
}

export function useIndicatorController({ candles, volume, timeframe, symbol, showToast }) {
    const workspace = useChartWorkspace();
    const { preferences, updatePreferences, saved } = workspace;
    const [editorOpen, setEditorOpen] = useState(false);
    const [tabs, setTabs] = useState(() => [newTab()]);
    const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
    const [saving, setSaving] = useState(false);
    const [settingsUid, setSettingsUid] = useState(null);
    const [newPaneUid, setNewPaneUid] = useState(null);
    const metaCacheRef = useRef(new Map());

    useEffect(() => {
        if (!newPaneUid) return undefined;
        const timer = window.setTimeout(() => setNewPaneUid(null), NEW_PANE_BADGE_MS);
        return () => window.clearTimeout(timer);
    }, [newPaneUid]);

    const metaOf = useCallback((source) => {
        if (!source) return { title: "Indikator", overlay: true };
        const cache = metaCacheRef.current;
        if (!cache.has(source)) {
            const result = compileScript(source);
            cache.set(source, result.meta || { title: "Indikator", overlay: true });
            if (cache.size > 40) cache.delete(cache.keys().next().value);
        }
        return cache.get(source);
    }, []);

    // Setiap indikator aktif diselesaikan menjadi script yang bisa dijalankan.
    // `entry.source` adalah kode yang sedang diedit (hanya untuk sesi ini); tanpa
    // itu, script diambil dari indikator bawaan atau tersimpan yang dirujuk.
    const entries = useMemo(() => preferences.activeIndicators.map((entry) => {
        let source = entry.source || null;
        if (!source && entry.kind === "builtin") source = builtinById(entry.refId)?.source || null;
        if (!source && entry.kind === "saved") source = saved.find((item) => item.id === entry.refId)?.source || null;
        return { ...entry, source };
    }).filter((entry) => entry.source), [preferences.activeIndicators, saved]);

    const mintick = useMemo(() => inferMintick(toEngineBars(candles, volume)), [candles, volume]);
    const runs = useIndicatorRuns({ entries, candles, volume, timeframe, symbol, mintick });

    const chartIndicators = useMemo(() => entries.map((entry) => {
        const run = runs[entry.uid];
        const output = run?.result?.ok ? run.result.output : null;
        const meta = metaOf(entry.source);
        return {
            uid: entry.uid,
            kind: entry.kind,
            refId: entry.refId,
            title: output?.meta.shorttitle || output?.meta.title || meta.title,
            overlay: output ? output.meta.overlay : meta.overlay,
            output,
            status: run?.status || "running",
            error: run?.result && !run.result.ok ? run.result.errors?.[0] : null,
            visible: entry.visible,
            style: entry.style,
            pane: entry.pane,
            inputs: entry.inputs,
        };
    }), [entries, runs, metaOf]);

    const activeKeys = useMemo(() => Object.fromEntries(preferences.activeIndicators
        .filter((entry) => entry.kind !== "draft")
        .map((entry) => [`${entry.kind}:${entry.refId}`, entry.uid])), [preferences.activeIndicators]);

    // Entri baru dihitung dari preferensi render ini supaya uid-nya langsung
    // tersedia untuk tab editor dan penanda "PANEL BARU".
    const addEntry = useCallback((spec) => {
        const result = addIndicator(preferences, spec);
        if (result.error) {
            showToast("error", result.error);
            return null;
        }
        updatePreferences(result.preferences);
        const source = spec.source || (spec.kind === "builtin" ? builtinById(spec.refId)?.source : saved.find((item) => item.id === spec.refId)?.source);
        if (!metaOf(source).overlay) setNewPaneUid(result.entry.uid);
        return result.entry;
    }, [preferences, updatePreferences, showToast, metaOf, saved]);

    const removeEntry = useCallback((uid) => {
        updatePreferences((current) => removeIndicatorEntry(current, uid));
        setTabs((current) => current.map((tab) => (tab.chartUid === uid ? { ...tab, chartUid: null } : tab)));
    }, [updatePreferences]);

    const indicatorAction = useCallback((uid, action) => {
        if (action === "settings") {
            setSettingsUid(uid);
            return;
        }
        if (action === "remove") {
            removeEntry(uid);
            return;
        }
        updatePreferences((current) => {
            if (action === "toggle-visible") return updateIndicatorEntry(current, uid, (entry) => ({ visible: !entry.visible }));
            if (action === "move-up") {
                const isPane = (entry) => !chartIndicators.find((item) => item.uid === entry.uid)?.overlay;
                return moveIndicatorUp(current, uid, isPane);
            }
            if (action === "maximize") return setPaneMode(current, uid, "maximized");
            if (action === "collapse") return setPaneMode(current, uid, "collapsed");
            return current;
        });
    }, [updatePreferences, removeEntry, chartIndicators]);

    // ----- Editor ---------------------------------------------------------------

    const openEditorFor = useCallback((savedIndicator) => {
        setEditorOpen(true);
        if (!savedIndicator) return;
        const existing = tabs.find((tab) => tab.savedId === savedIndicator.id);
        if (existing) {
            setActiveTabId(existing.id);
            return;
        }
        const tab = newTab({ title: savedIndicator.name, source: savedIndicator.source, savedId: savedIndicator.id, dirty: false, chartUid: activeKeys[`saved:${savedIndicator.id}`] || null });
        setTabs((current) => {
            // Tab kosong bawaan yang belum disentuh diganti, bukan ditambah.
            const untouched = current.length === 1 && !current[0].savedId && current[0].source === DEFAULT_SCRIPT && !current[0].chartUid;
            return untouched ? [tab] : [...current, tab];
        });
        setActiveTabId(tab.id);
    }, [tabs, activeKeys]);

    const createTab = useCallback(() => {
        const tab = newTab();
        setTabs((current) => [...current, tab]);
        setActiveTabId(tab.id);
        setEditorOpen(true);
    }, []);

    const closeTab = useCallback((id) => {
        setTabs((current) => {
            const next = current.filter((tab) => tab.id !== id);
            if (!next.length) {
                const fresh = newTab();
                setActiveTabId(fresh.id);
                return [fresh];
            }
            if (id === activeTabId) setActiveTabId(next[next.length - 1].id);
            return next;
        });
    }, [activeTabId]);

    const changeSource = useCallback((id, source) => {
        setTabs((current) => current.map((tab) => (tab.id === id ? { ...tab, source, dirty: true } : tab)));
    }, []);

    const markChecked = useCallback((id, title) => {
        setTabs((current) => {
            const target = current.find((tab) => tab.id === id);
            if (!target || (target.checked && target.title === (title || target.title))) return current;
            return current.map((tab) => (tab.id === id ? { ...tab, checked: true, title: title || tab.title } : tab));
        });
    }, []);

    const addToChart = useCallback((tab, meta) => {
        if (tab.chartUid && preferences.activeIndicators.some((entry) => entry.uid === tab.chartUid)) {
            // Indikator tersimpan tetap dirujuk di preferensi akun; kode yang belum
            // disimpan hanya menimpa script-nya selama sesi ini.
            updatePreferences((current) => updateIndicatorEntry(current, tab.chartUid, (entry) => (entry.kind === "saved"
                ? { source: tab.dirty ? tab.source : undefined }
                : { source: tab.source })));
            return;
        }
        const created = tab.savedId
            ? addEntry({ kind: "saved", refId: tab.savedId, source: tab.dirty ? tab.source : undefined })
            : addEntry({ kind: "draft", refId: tab.id, source: tab.source });
        if (!created) return;
        if (!meta.overlay) setNewPaneUid(created.uid);
        setTabs((current) => current.map((item) => (item.id === tab.id ? { ...item, chartUid: created.uid } : item)));
    }, [preferences.activeIndicators, updatePreferences, addEntry]);

    const save = useCallback(async (tab) => {
        const meta = metaOf(tab.source);
        const name = (tab.title || meta.title || "Indikator tanpa judul").slice(0, 120);
        setSaving(true);
        try {
            const { indicator, mode } = await workspace.saveIndicator({ id: tab.savedId, name, source: tab.source });
            setTabs((current) => current.map((item) => (item.id === tab.id ? { ...item, savedId: indicator.id, dirty: false, title: name } : item)));
            if (tab.chartUid) updatePreferences((current) => promoteDraft(current, tab.chartUid, indicator.id));
            showToast("success", mode === "account"
                ? "Tersimpan ke Indikator saya. Tersinkron ke akunmu, bisa dipakai di semua koin dan timeframe."
                : "Tersimpan di browser ini. Sinkron ke akun belum tersedia karena tabel indikator belum ada di database.");
        } catch (error) {
            showToast("error", error?.message || "Indikator gagal disimpan.");
        } finally {
            setSaving(false);
        }
    }, [metaOf, workspace, updatePreferences, showToast]);

    // ----- Menu -----------------------------------------------------------------

    const menuHandlers = {
        onToggleEma: () => updatePreferences((current) => {
            const on = current.toggles.ema21 || current.toggles.ema50;
            return { ...current, toggles: { ...current.toggles, ema21: !on, ema50: !on } };
        }),
        onAddBuiltin: (id) => addEntry({ kind: "builtin", refId: id }),
        onRemoveActive: removeEntry,
        onAddSaved: (item) => addEntry({ kind: "saved", refId: item.id }),
        onEditSaved: openEditorFor,
        onDuplicateSaved: async (item) => {
            try {
                await workspace.saveIndicator({ name: `${item.name} (salinan)`.slice(0, 120), source: item.source });
                showToast("success", `${item.name} diduplikat.`);
            } catch (error) {
                showToast("error", error?.message || "Duplikat gagal.");
            }
        },
        onCopySource: async (item) => {
            try {
                await navigator.clipboard.writeText(item.source);
                showToast("success", `Kode ${item.name} disalin.`);
            } catch {
                showToast("error", "Clipboard tidak bisa diakses browser ini.");
            }
        },
        onDeleteSaved: async (item) => {
            if (!window.confirm(`Hapus ${item.name} dari Indikator saya? Indikator ini juga dilepas dari chart.`)) return;
            try {
                const uid = activeKeys[`saved:${item.id}`];
                if (uid) removeEntry(uid);
                await workspace.deleteIndicator(item.id);
                setTabs((current) => current.map((tab) => (tab.savedId === item.id ? { ...tab, savedId: null, dirty: true } : tab)));
                showToast("success", `${item.name} dihapus.`);
            } catch (error) {
                showToast("error", error?.message || "Indikator gagal dihapus.");
            }
        },
        onCreate: createTab,
    };

    // ----- Pengaturan -----------------------------------------------------------

    const settingsIndicator = chartIndicators.find((item) => item.uid === settingsUid && item.output) || null;
    const settingsSource = entries.find((entry) => entry.uid === settingsUid)?.source || "";
    const applySettings = useCallback(({ inputs, style }) => {
        updatePreferences((current) => updateIndicatorEntry(current, settingsUid, { inputs, style }));
        setSettingsUid(null);
    }, [updatePreferences, settingsUid]);

    return {
        workspace,
        preferences,
        updatePreferences,
        chartIndicators,
        runs,
        activeKeys,
        newPaneUid,
        indicatorAction,
        menuHandlers,
        editor: {
            open: editorOpen,
            setOpen: setEditorOpen,
            tabs,
            activeTabId,
            setActiveTabId,
            createTab,
            closeTab,
            changeSource,
            markChecked,
            addToChart,
            save,
            saving,
        },
        settings: {
            uid: settingsUid,
            indicator: settingsIndicator,
            source: settingsSource,
            close: () => setSettingsUid(null),
            apply: applySettings,
        },
    };
}
