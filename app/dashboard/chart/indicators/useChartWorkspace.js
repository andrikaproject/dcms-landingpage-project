"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { normalizePreferences, persistablePreferences } from "@/lib/charting/chart-preferences";

const LOCAL_INDICATORS_KEY = "dcms-saved-indicators:v1";
const LOCAL_PREFERENCES_KEY = "dcms-chart-preferences:v1";
const SAVE_DELAY_MS = 600;

function readLocal(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeLocal(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage penuh atau diblokir: data tetap ada selama halaman terbuka.
    }
}

function localId() {
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Indikator tersimpan dan preferensi chart tersinkron ke akun. Bila endpoint
// belum tersedia (migrasi belum dijalankan), keduanya disimpan di browser ini
// dan `syncMode` menjadi "local" supaya UI bisa mengatakannya dengan jujur.
export function useChartWorkspace() {
    const [saved, setSaved] = useState([]);
    const [syncMode, setSyncMode] = useState("loading");
    const [preferences, setPreferencesState] = useState(() => normalizePreferences({}));
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);
    const saveTimerRef = useRef(null);
    const prefsSyncRef = useRef("account");

    useEffect(() => {
        let active = true;
        apiRequest("/indicators", { cache: "no-store" })
            .then((payload) => {
                if (!active) return;
                setSaved(Array.isArray(payload?.items) ? payload.items : []);
                setSyncMode("account");
            })
            .catch(() => {
                if (!active) return;
                setSaved(readLocal(LOCAL_INDICATORS_KEY, []));
                setSyncMode("local");
            });
        apiRequest("/chart-preferences", { cache: "no-store" })
            .then((payload) => {
                if (!active) return;
                setPreferencesState(normalizePreferences(payload?.preferences));
                prefsSyncRef.current = "account";
            })
            .catch(() => {
                if (!active) return;
                setPreferencesState(normalizePreferences(readLocal(LOCAL_PREFERENCES_KEY, {})));
                prefsSyncRef.current = "local";
            })
            .finally(() => {
                if (active) setPreferencesLoaded(true);
            });
        return () => {
            active = false;
            window.clearTimeout(saveTimerRef.current);
        };
    }, []);

    const persistPreferences = useCallback((next) => {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            const payload = persistablePreferences(next);
            // Pilihan lapisan DCMS yang tidak diingat hanya berlaku di sesi ini.
            if (!payload.dcmsLayer.remember) payload.dcmsLayer = { ...payload.dcmsLayer, visible: true, biasCard: true, levels: true, structure: true };
            if (prefsSyncRef.current === "local") {
                writeLocal(LOCAL_PREFERENCES_KEY, payload);
                return;
            }
            apiRequest("/chart-preferences", { method: "PUT", body: { preferences: payload } }).catch(() => {
                prefsSyncRef.current = "local";
                writeLocal(LOCAL_PREFERENCES_KEY, payload);
            });
        }, SAVE_DELAY_MS);
    }, []);

    const updatePreferences = useCallback((updater) => {
        setPreferencesState((current) => {
            const next = typeof updater === "function" ? updater(current) : updater;
            if (next !== current) persistPreferences(next);
            return next;
        });
    }, [persistPreferences]);

    const saveIndicator = useCallback(async ({ id, name, source }) => {
        const isLocalId = !id || String(id).startsWith("local-");
        if (syncMode === "account") {
            try {
                const payload = id && !isLocalId
                    ? await apiRequest(`/indicators/${encodeURIComponent(id)}`, { method: "PUT", body: { name, source } })
                    : await apiRequest("/indicators", { method: "POST", body: { name, source } });
                const indicator = payload.indicator;
                setSaved((current) => [indicator, ...current.filter((item) => item.id !== indicator.id && item.id !== id)]);
                return { indicator, mode: "account" };
            } catch (error) {
                // Error validasi atau kuota diteruskan apa adanya; hanya kegagalan
                // jaringan/server yang dialihkan ke penyimpanan lokal.
                if (error?.status && error.status < 500 && error.status !== 404) throw error;
            }
        }
        const indicator = { id: id || localId(), name, source, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
        setSaved((current) => {
            const next = [indicator, ...current.filter((item) => item.id !== indicator.id)];
            writeLocal(LOCAL_INDICATORS_KEY, next);
            return next;
        });
        setSyncMode("local");
        return { indicator, mode: "local" };
    }, [syncMode]);

    const deleteIndicator = useCallback(async (id) => {
        if (syncMode === "account" && !String(id).startsWith("local-")) {
            await apiRequest(`/indicators/${encodeURIComponent(id)}`, { method: "DELETE" });
        }
        setSaved((current) => {
            const next = current.filter((item) => item.id !== id);
            if (syncMode !== "account") writeLocal(LOCAL_INDICATORS_KEY, next);
            return next;
        });
    }, [syncMode]);

    return { saved, syncMode, preferences, preferencesLoaded, updatePreferences, saveIndicator, deleteIndicator };
}
