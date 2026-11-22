"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import DashboardToast from "./DashboardToast";
import ScamPumpSection from "./ScamPumpSection";
import AnalysisPanel from "./overview/AnalysisPanel";
import AnalyzeCoinModal from "./overview/AnalyzeCoinModal";
import LockedSignalsPanel, { formatLockedLevels } from "./overview/LockedSignalsPanel";
import TickerStrip from "./overview/TickerStrip";
import { readLastTimeframe, rememberTimeframe } from "./overview/analysis-timeframes";
import { formatPrice, pairLabel } from "./overview/ui";
import { useAnalysisTabs } from "./overview/useAnalysisTabs";
import { analysisKey } from "@/lib/signals/analysis-tabs";
import { lockSignalPlan } from "@/lib/signals/api";
import { LOCKED_ALERT, lockedAlerts } from "@/lib/signals/locked-track";
import { apiRequest } from "@/lib/api/client";
import { useLockedSignals, useMarketDashboard } from "@/lib/market/dashboard";
import { describeDataHealth } from "@/lib/market/dashboard-core";
import { describeLockedMovement } from "@/lib/signals/locked";
import { useAuth } from "@/components/auth/AuthProvider";

// Slideout detail dimuat saat pertama kali dibuka saja.
const SignalDetailSideout = dynamic(() => import("./SignalDetailSideout"), { ssr: false });

function formatSignedPercent(value) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function DashboardIntro({ session, signals, onSelectTicker }) {
    return (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="min-w-0">
                <h1 className="font-chakra text-[22px] font-bold leading-7 text-[#f8fafc]">
                    Selamat datang, {session.user.name || session.user.email}
                </h1>
                <p className="mt-1 font-chakra text-sm leading-5 text-[#94a3b8]">
                    Dashboard ini hanya tools, selalu DYOR dengan segala informasi yang diberikan.
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-chakra text-xs font-semibold">
                    <Link href="/dashboard/signals/history" className="text-[#94a3b8] underline-offset-4 hover:text-[#f8fafc] hover:underline">
                        Riwayat signal
                    </Link>
                    {session.user.role === "ADMIN" && (
                        <Link href="/dashboard/admin" className="text-sky-300 underline-offset-4 hover:underline">
                            Panel admin
                        </Link>
                    )}
                </div>
            </div>
            <TickerStrip signals={signals} onSelect={onSelectTicker} />
        </section>
    );
}

const LOCKED_POLL_MS = 30_000;
const UNDO_LOCK_MS = 8_000;
const HIGHLIGHT_MS = 8_000;

export default function DashboardPage() {
    const { user } = useAuth();
    const isSignedIn = Boolean(user);
    // Data dashboard sekarang hanya mengisi ticker BTC/ETH/SOL (perubahan 24 jam
    // dan sparkline). Hasil analisis berasal dari koin yang dipilih user.
    const market = useMarketDashboard({ enabled: isSignedIn });
    const locked = useLockedSignals({ enabled: isSignedIn, pollMs: LOCKED_POLL_MS });
    const analysis = useAnalysisTabs();
    const [modal, setModal] = useState(null);
    const [detailSignal, setDetailSignal] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [highlightId, setHighlightId] = useState(null);
    // Sinyal yang dihapus user sendiri tidak dilaporkan sebagai "keluar dari pantauan".
    const removedIdsRef = useRef(new Set());
    const alertSnapshotRef = useRef(null);

    const { dashboard, error } = market;
    const dataHealth = describeDataHealth(dashboard?.meta);
    const session = { user: user || {} };
    const lockedKeys = new Set(locked.items.map((item) => analysisKey(item.symbol, item.timeframe)));

    const dismissToast = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
    const showToast = useCallback((type, message, extra = {}) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((current) => [...current.slice(-2), { id, type, message, ...extra }]);
    }, []);

    useEffect(() => {
        if (!highlightId) return undefined;
        const timer = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
        return () => window.clearTimeout(timer);
    }, [highlightId]);

    // Kembali dari Live chart: `open` mengaktifkan tab koin yang sama dan
    // `highlight` menyorot sinyal yang baru dikunci di sana. Dibaca sekali.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const open = params.get("open");
        const timeframe = params.get("timeframe");
        const highlight = params.get("highlight");
        if (!open && !highlight) return;
        if (open && timeframe) {
            const key = analysisKey(open, timeframe);
            if (analysis.tabs.some((tab) => tab.key === key)) analysis.select(key);
            else analysis.analyze(open, timeframe);
        }
        if (highlight) setHighlightId(highlight);
        window.history.replaceState(window.history.state, "", window.location.pathname);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Bandingkan setiap pembacaan daftar aktif dengan sebelumnya untuk
    // memberi tahu TP1 tersentuh atau sinyal yang selesai dipantau.
    const lockedItems = locked.items;
    const lockedLoading = locked.loading;
    useEffect(() => {
        if (lockedLoading) return;
        const { alerts, snapshot } = lockedAlerts(alertSnapshotRef.current, lockedItems, { ignoreIds: removedIdsRef.current });
        alertSnapshotRef.current = snapshot;
        for (const alert of alerts) {
            const pair = pairLabel(alert.signal);
            if (alert.kind === LOCKED_ALERT.TP1) {
                const movement = describeLockedMovement(alert.signal);
                const pnl = movement.kind === "return" ? `PnL ${formatSignedPercent(movement.percent)}. ` : "";
                showToast("success", `${pair} · TP1 tersentuh. ${pnl}Pertimbangkan geser SL ke entry.`, {
                    action: { label: "Lihat", onClick: () => openLockedItem(alert.signal) },
                    autoDismissMs: 15_000,
                });
            } else {
                showToast("info", `${pair} selesai dipantau: TP2, SL, atau masa berlakunya tercapai. Detailnya ada di Riwayat signal.`);
            }
        }
        // openLockedItem cukup diambil dari render terbaru; tidak perlu memicu ulang.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lockedItems, lockedLoading, showToast]);

    function openModal(query = "") {
        setModal({ query, timeframe: readLastTimeframe() });
    }

    function handleAnalyzeSubmit(symbol, timeframe) {
        rememberTimeframe(timeframe);
        setModal(null);
        analysis.analyze(symbol, timeframe);
    }

    function openLockedItem(signal) {
        const key = analysisKey(signal.symbol, signal.timeframe);
        if (analysis.tabs.some((tab) => tab.key === key)) analysis.select(key);
        else analysis.analyze(signal.symbol, signal.timeframe);
        document.getElementById("analysis-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function deleteLocked(signal) {
        removedIdsRef.current.add(signal.id);
        await apiRequest(`/signals/locked/${encodeURIComponent(signal.id)}`, { method: "DELETE" });
        locked.setItems((items) => items.filter((item) => item.id !== signal.id));
    }

    async function handleLock(signal) {
        // Lock mengikuti signalId begitu backend menerbitkannya; hasil analisis
        // per koin mengirim levelnya sendiri.
        const payload = await lockSignalPlan({ signalId: signal.signalId ?? null }, signal);
        const item = payload?.signal;
        if (!item) return;
        locked.setItems((items) => [item, ...items.filter((existing) => existing.id !== item.id)]);
        setHighlightId(item.id);
        showToast("success", `${pairLabel(item)} · ${String(item.bias).toUpperCase()} dikunci. Harga snapshot $${formatPrice(item.currentPrice ?? item.entry)}.`, {
            action: {
                label: "Batalkan",
                onClick: () => deleteLocked(item).catch((undoError) => {
                    removedIdsRef.current.delete(item.id);
                    showToast("error", undoError?.message || "Lock gagal dibatalkan. Hapus lewat menu sinyal.");
                }),
            },
            autoDismissMs: UNDO_LOCK_MS,
        });
    }

    async function handleDeleteItem(signal) {
        const pair = pairLabel(signal);
        // Hapus permanen di server, jadi dikonfirmasi lewat dialog bawaan browser.
        if (!window.confirm(`Hapus ${pair} dari pantauan? Pemantauan harga untuk rencana ini berhenti.`)) return;
        try {
            await deleteLocked(signal);
            showToast("success", `${pair} dihapus dari pantauan.`);
        } catch (deleteError) {
            removedIdsRef.current.delete(signal.id);
            showToast("error", deleteError?.message || `${pair} gagal dihapus. Coba lagi.`);
        }
    }

    async function handleCopyItem(signal) {
        try {
            await navigator.clipboard.writeText(formatLockedLevels(signal));
            showToast("success", `Level ${pairLabel(signal)} disalin.`);
        } catch {
            showToast("error", "Clipboard tidak bisa diakses browser ini.");
        }
    }

    return (
        <DashboardShell>
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:pt-7">
                <DashboardIntro
                    session={session}
                    signals={dashboard?.signals}
                    onSelectTicker={(base) => openModal(base)}
                />

                {/* Ticker gagal dimuat tidak menghalangi analisis; pesannya tetap ditulis. */}
                {error && !dashboard && (
                    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-chakra text-sm text-red-200">
                        <span>Data ticker gagal dimuat: {error}</span>
                        <button type="button" onClick={market.retry} className="font-bold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300">
                            Coba lagi
                        </button>
                    </div>
                )}
                {dataHealth.text && (
                    <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 font-chakra text-sm text-amber-200">
                        {dataHealth.text}
                    </p>
                )}

                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div id="analysis-panel" className="min-w-0 scroll-mt-6">
                        <AnalysisPanel
                            tabs={analysis.tabs}
                            activeTab={analysis.activeTab}
                            lockedKeys={lockedKeys}
                            onSelect={analysis.select}
                            onRemove={analysis.remove}
                            onCancel={analysis.cancel}
                            onRetry={(tab) => analysis.analyze(tab.symbol, tab.timeframe)}
                            onReanalyze={(tab) => analysis.analyze(tab.symbol, tab.timeframe, { reanalyze: true })}
                            onOpenModal={openModal}
                            onLock={handleLock}
                            onOpenDetail={setDetailSignal}
                        />
                    </div>
                    {/* Kolom kanan tidak ikut menentukan tinggi baris: panel mengisi tinggi
                        Hasil Analisis dan daftarnya digulir di dalam. */}
                    <div className="min-w-0 xl:relative xl:self-stretch">
                        <LockedSignalsPanel
                            className="xl:absolute xl:inset-0"
                            items={locked.items}
                            meta={locked.meta}
                            loading={locked.loading}
                            error={locked.error}
                            highlightId={highlightId}
                            onRetry={locked.retry}
                            onOpenItem={openLockedItem}
                            onCopyItem={handleCopyItem}
                            onDeleteItem={handleDeleteItem}
                        />
                    </div>
                </div>

                <ScamPumpSection onToast={showToast} />
            </div>

            <DashboardToast toasts={toasts} onDismiss={dismissToast} />
            {modal && (
                <AnalyzeCoinModal
                    initialQuery={modal.query}
                    defaultTimeframe={modal.timeframe}
                    onClose={() => setModal(null)}
                    onSubmit={handleAnalyzeSubmit}
                />
            )}
            {detailSignal && <SignalDetailSideout signal={detailSignal} onClose={() => setDetailSignal(null)} />}
        </DashboardShell>
    );
}
