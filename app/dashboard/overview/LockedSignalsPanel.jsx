"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { DotsThree, LockSimple } from "@phosphor-icons/react";
import { formatRelativeTime } from "@/lib/signals/format";
import { describeLockedMovement } from "@/lib/signals/locked";
import { lockedTrackZones, TRACK_ZONE } from "@/lib/signals/locked-track";
import { BiasPill, CoinAvatar, formatPercent, formatPrice, formatTimeframe, pairLabel, Panel } from "./ui";

const ZONE_CLASS = {
    [TRACK_ZONE.IDLE]: "bg-[#334155]",
    [TRACK_ZONE.LOSS]: "bg-[#f87171]",
    [TRACK_ZONE.PROFIT]: "bg-[#4ade80]",
    [TRACK_ZONE.PASSED]: "bg-[#4ade80]/40",
};

function useNow(intervalMs = 60_000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(timer);
    }, [intervalMs]);
    return now;
}

export function formatLockedLevels(signal) {
    const pair = pairLabel(signal);
    return [
        `${pair} ${String(signal.bias || "").toUpperCase()} ${formatTimeframe(signal.timeframe)}`,
        `Entry ${formatPrice(signal.entry)}`,
        `SL ${formatPrice(signal.sl)}`,
        `TP1 ${formatPrice(signal.tp1)}`,
        `TP2 ${formatPrice(signal.tp2)}`,
    ].join("\n");
}

function LockedTrack({ signal }) {
    const zones = lockedTrackZones(signal);
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex h-1 gap-[3px]" aria-hidden>
                {zones.map((zone, index) => (
                    <span key={index} className={`h-full flex-1 rounded-sm ${ZONE_CLASS[zone]}`} />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-[3px] font-mono text-[10px] font-medium leading-[13px] text-[#64748b]" aria-hidden>
                <span>SL</span>
                <span className="text-[#94a3b8]">Entry</span>
                <span className="flex justify-between"><span>TP1</span><span>TP2</span></span>
            </div>
        </div>
    );
}

function movementText(movement) {
    if (movement.kind === "return") {
        return { text: formatPercent(movement.percent), tone: movement.percent >= 0 ? "text-[#4ade80]" : "text-[#f87171]" };
    }
    if (movement.kind === "distance") return { text: "Menunggu entry", tone: "text-sky-300 text-xs" };
    return { text: "—", tone: "text-[#64748b]" };
}

function ItemMenu({ signal, onOpen, onCopy, onDelete }) {
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const wrapperRef = useRef(null);
    const pair = pairLabel(signal);

    useEffect(() => {
        if (!open) return undefined;
        function handlePointer(event) {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        }
        document.addEventListener("pointerdown", handlePointer);
        wrapperRef.current?.querySelector('[role="menuitem"]')?.focus();
        return () => document.removeEventListener("pointerdown", handlePointer);
    }, [open]);

    function handleKeyDown(event) {
        if (!open) return;
        const items = Array.from(wrapperRef.current?.querySelectorAll('[role="menuitem"]') || []);
        const index = items.indexOf(document.activeElement);
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            wrapperRef.current?.querySelector("button")?.focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            items[(index + step + items.length) % items.length]?.focus();
        }
    }

    function run(action) {
        setOpen(false);
        action();
    }

    const itemClass = "flex w-full items-center rounded-md px-3 py-2 text-left font-chakra text-sm text-[#f8fafc] transition hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none";

    return (
        <div ref={wrapperRef} className="relative z-10" onKeyDown={handleKeyDown}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={`Aksi untuk ${pair}`}
                className="grid size-7 place-items-center rounded-md text-[#94a3b8] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]"
            >
                <DotsThree size={18} weight="bold" aria-hidden />
            </button>
            {open && (
                <div id={menuId} role="menu" aria-label={`Aksi ${pair}`} className="tactile-pop absolute right-0 origin-top-right top-full z-30 mt-1 w-56 rounded-lg bg-[#161a1e] p-1 shadow-[var(--shadow-menu)]">
                    <button type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => run(onOpen)}>Buka hasil analisis</button>
                    <Link role="menuitem" tabIndex={-1} className={itemClass} href={`/dashboard/chart?symbol=${encodeURIComponent(signal.symbol)}&timeframe=${signal.timeframe}&locked=${encodeURIComponent(signal.id)}`}>Lihat chart</Link>
                    <button type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => run(onCopy)}>Salin level entry, SL, TP</button>
                    <div className="my-1 h-px bg-[#232a30]" role="separator" />
                    <button type="button" role="menuitem" tabIndex={-1} className={`${itemClass} text-[#f87171]`} onClick={() => run(onDelete)}>Hapus dari pantauan</button>
                </div>
            )}
        </div>
    );
}

function LockedCard({ signal, now, highlighted, onOpen, onCopy, onDelete }) {
    const movement = movementText(describeLockedMovement(signal));
    const lockedAgo = formatRelativeTime(signal.createdAt, { now, placeholder: "" }).toLowerCase();
    const pair = pairLabel(signal);

    return (
        <li data-press="card" className={`group relative flex flex-col gap-3 rounded-xl border bg-[#161a1e] p-3.5 shadow-[var(--shadow-table)] hover:border-[#334155] ${highlighted ? "border-[#b8fb5c]/70 shadow-[0_0_0_3px_rgba(184,251,92,0.08)]" : "border-[#232a30]"}`}>
            {/* Seluruh kartu membuka hasil analisisnya; tombol menu berada di atas lapisan ini. */}
            <button
                type="button"
                onClick={onOpen}
                data-press="overlay"
                aria-label={`Buka hasil analisis ${pair} ${formatTimeframe(signal.timeframe)}`}
                className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]"
            />
            <div className="pointer-events-none flex items-center gap-2.5">
                <CoinAvatar label={signal.base} size="sm" />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-chakra text-sm font-bold leading-[18px] text-[#f8fafc]">
                        {pair}
                        {highlighted && <span className="rounded bg-[#b8fb5c]/15 px-1.5 font-mono text-[10px] font-semibold text-[#b8fb5c]">baru</span>}
                    </p>
                    <p className="truncate font-chakra text-[11px] leading-[14px] text-[#64748b]">
                        {formatTimeframe(signal.timeframe)}{lockedAgo ? ` · dikunci ${lockedAgo}` : ""}
                    </p>
                </div>
                <BiasPill bias={signal.bias} />
                <div className="pointer-events-auto">
                    <ItemMenu signal={signal} onOpen={onOpen} onCopy={onCopy} onDelete={onDelete} />
                </div>
            </div>
            <div className="pointer-events-none flex flex-col gap-3">
                <LockedTrack signal={signal} />
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-mono text-[11px] font-medium leading-[14px] text-[#94a3b8]">
                        Entry {formatPrice(signal.entry)} → {formatPrice(signal.currentPrice)}
                    </p>
                    <p className={`shrink-0 font-mono text-[15px] font-semibold leading-5 ${movement.tone}`}>{movement.text}</p>
                </div>
            </div>
        </li>
    );
}

function SlotHint({ used, limit }) {
    return (
        <div className="rounded-xl border border-dashed border-[#334155] p-3.5">
            <p className="font-chakra text-xs font-semibold leading-4 text-[#94a3b8]">
                {limit ? `${used} dari ${limit} slot terpakai` : `${used} sinyal dipantau`}
            </p>
            <p className="mt-1 font-chakra text-xs leading-4 text-[#64748b]">
                {limit && used >= limit
                    ? "Slot penuh. Hapus sinyal yang tidak dipantau lagi sebelum menambah yang baru."
                    : "Tekan Lock sinyal di Hasil Analisis untuk menambah pantauan."}
            </p>
        </div>
    );
}

function EmptyLocked({ limit }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <LockSimple size={30} className="mb-2 text-[#64748b]" aria-hidden />
            <p className="font-chakra text-sm font-bold text-[#f8fafc]">Belum ada sinyal terkunci</p>
            <p className="max-w-[260px] font-chakra text-xs leading-[18px] text-[#64748b]">
                Tekan Lock sinyal di hasil analisis untuk mulai memantau.{limit ? ` Maksimal ${limit} slot.` : ""}
            </p>
        </div>
    );
}

export default function LockedSignalsPanel({ items, meta, loading, error, highlightId, onRetry, onOpenItem, onCopyItem, onDeleteItem, detailHref = "#lock-signal-list" }) {
    const now = useNow();
    // Halaman pertama memuat 20 sinyal aktif, lebih dari batas slot, jadi jumlah
    // item di klien tetap akurat setelah lock baru atau hapus tanpa refetch.
    const used = items.length;
    const limit = Number(meta?.slotLimit) || null;

    return (
        <Panel className="flex flex-col" aria-labelledby="locked-signals-title">
            <div className="px-5 pb-3.5 pt-5">
                <div className="flex items-center gap-2">
                    <h2 id="locked-signals-title" className="font-chakra text-base font-bold leading-[22px] text-[#f8fafc]">Sinyal Terkunci</h2>
                    <span className="rounded-full border border-[#232a30] bg-[#161a1e] px-[7px] py-px font-mono text-[11px] font-semibold leading-[14px] text-[#94a3b8]">
                        {used}
                    </span>
                    {used > 0 && (
                        <a href={detailHref} className="ml-auto font-chakra text-xs font-semibold leading-4 text-[#a3e635] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c]">
                            Lihat semua
                        </a>
                    )}
                </div>
                <p className="mt-1 font-chakra text-xs leading-4 text-[#94a3b8]">Dipantau sampai TP atau SL tersentuh.</p>
            </div>

            <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-1">
                {loading && items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#334155] p-3.5 font-chakra text-xs text-[#94a3b8]">Memuat sinyal terkunci…</p>
                ) : error && items.length === 0 ? (
                    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 font-chakra text-xs text-red-200">
                        <span>{error}</span>
                        <button type="button" onClick={onRetry} className="font-bold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300">
                            Coba lagi
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <EmptyLocked limit={limit} />
                ) : (
                    <>
                        <ul className="flex flex-col gap-2.5">
                            {items.map((signal) => (
                                <LockedCard
                                    key={signal.id}
                                    signal={signal}
                                    now={now}
                                    highlighted={highlightId !== null && String(highlightId) === String(signal.id)}
                                    onOpen={() => onOpenItem(signal)}
                                    onCopy={() => onCopyItem(signal)}
                                    onDelete={() => onDeleteItem(signal)}
                                />
                            ))}
                        </ul>
                        <SlotHint used={used} limit={limit} />
                    </>
                )}
            </div>
        </Panel>
    );
}
