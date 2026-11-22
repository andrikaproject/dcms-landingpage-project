"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, DotsThree, LockSimple } from "@phosphor-icons/react";
import { formatRelativeTime } from "@/lib/signals/format";
import { describeLockedMovement } from "@/lib/signals/locked";
import { lockedTrackProgress, SEGMENT_STATE, TRACK_LEVEL } from "@/lib/signals/locked-track";
import { EDGE_MASK_Y_STYLE, scrollBehavior, useEdgeMask } from "./ScrollRail";
import { BiasPill, CoinAvatar, formatPercent, formatPrice, formatTimeframe, pairLabel, Panel } from "./ui";

// Isi parsial lebih redup dari isi penuh: "mendekati" tidak boleh terbaca
// sebagai "tersentuh". Penuh hanya saat level itu benar-benar tercapai.
const FILL_CLASS = {
    loss: { [SEGMENT_STATE.APPROACH]: "bg-[#f87171]/55", [SEGMENT_STATE.HIT]: "bg-[#f87171]" },
    profit: { [SEGMENT_STATE.APPROACH]: "bg-[#4ade80]/55", [SEGMENT_STATE.HIT]: "bg-[#4ade80]" },
};
const LEVEL_NAME = { [TRACK_LEVEL.SL]: "SL", [TRACK_LEVEL.TP1]: "TP1", [TRACK_LEVEL.TP2]: "TP2" };

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

function formatRemaining(percent) {
    if (percent < 0.1) return "<0.1%";
    return `${percent.toFixed(percent < 10 ? 1 : 0)}%`;
}

const LEVEL_TONE = { [TRACK_LEVEL.SL]: "text-[#f87171]", [TRACK_LEVEL.TP1]: "text-[#4ade80]", [TRACK_LEVEL.TP2]: "text-[#4ade80]" };

// Satu kalimat posisi harga: level yang sudah tercapai, lalu level berikutnya
// yang dituju dengan sisa jaraknya. Kosong bila belum entry atau data kurang.
function TrackCaption({ segments, target }) {
    const reached = [];
    if (segments[0].state === SEGMENT_STATE.HIT) reached.push({ level: TRACK_LEVEL.SL, text: "SL tersentuh" });
    if (segments[1].state === SEGMENT_STATE.HIT) reached.push({ level: TRACK_LEVEL.TP1, text: "TP1 tercapai" });
    if (segments[2].state === SEGMENT_STATE.HIT) reached.push({ level: TRACK_LEVEL.TP2, text: "TP2 tercapai" });
    if (!reached.length && !target) return null;
    return (
        <p className="font-chakra text-[11px] leading-4 text-[#94a3b8]">
            {reached.map((item, index) => (
                <span key={item.level}>
                    {index > 0 && " · "}
                    <span className={LEVEL_TONE[item.level]}>{item.text}</span>
                </span>
            ))}
            {target && (
                <>
                    {reached.length > 0 ? " · menuju " : "Menuju "}
                    <span className={LEVEL_TONE[target.level]}>{LEVEL_NAME[target.level]}</span>, sisa{" "}
                    <span className="font-mono text-[#cbd5e1]">{formatRemaining(target.remainingPercent)}</span>
                </>
            )}
        </p>
    );
}

// Nama level di bawah track: berwarna saat dituju atau tercapai, centang saat tercapai.
function LevelLabel({ level, progress }) {
    const hit = progress.segments[level === TRACK_LEVEL.SL ? 0 : level === TRACK_LEVEL.TP1 ? 1 : 2].state === SEGMENT_STATE.HIT;
    const active = hit || progress.target?.level === level;
    return (
        <span className={`inline-flex items-center gap-0.5 ${active ? LEVEL_TONE[level] : ""}`}>
            {LEVEL_NAME[level]}
            {hit && <Check size={10} weight="bold" aria-hidden />}
        </span>
    );
}

function LockedTrack({ signal }) {
    const progress = lockedTrackProgress(signal);
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex h-1 gap-[3px]" aria-hidden>
                {progress.segments.map((segment, index) => (
                    <span key={index} className="relative h-full flex-1">
                        <span className="absolute inset-0 overflow-hidden rounded-sm bg-[#334155]">
                            {segment.state !== SEGMENT_STATE.IDLE && (
                                // Segmen SL terisi dari sisi Entry (kanan) ke arah SL.
                                <span
                                    className={`absolute inset-y-0 ${index === 0 ? "right-0" : "left-0"} ${FILL_CLASS[index === 0 ? "loss" : "profit"][segment.state]}`}
                                    style={{ width: `${segment.fill * 100}%` }}
                                />
                            )}
                        </span>
                        {progress.marker?.segment === index && (
                            <span
                                className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f8fafc] shadow-[0_0_0_2px_#161a1e]"
                                style={{ left: `${progress.marker.position * 100}%` }}
                            />
                        )}
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-[3px] font-mono text-[10px] font-medium leading-[13px] text-[#94a3b8]" aria-hidden>
                <LevelLabel level={TRACK_LEVEL.SL} progress={progress} />
                <span className="text-[#cbd5e1]">Entry</span>
                <span className="flex justify-between gap-1">
                    <LevelLabel level={TRACK_LEVEL.TP1} progress={progress} />
                    <LevelLabel level={TRACK_LEVEL.TP2} progress={progress} />
                </span>
            </div>
            <TrackCaption segments={progress.segments} target={progress.target} />
        </div>
    );
}

function movementText(movement) {
    if (movement.kind === "return") {
        return { text: formatPercent(movement.percent), tone: movement.percent >= 0 ? "text-[#4ade80]" : "text-[#f87171]" };
    }
    if (movement.kind === "distance") return { text: "Menunggu entry", tone: "text-sky-300 text-xs" };
    return { text: "–", tone: "text-[#64748b]" };
}

// Tinggi menu aksi (4 item 36px + pemisah + padding), untuk memilih arah buka.
const MENU_HEIGHT = 170;

function ItemMenu({ signal, onOpen, onCopy, onDelete }) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
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
                onClick={(event) => {
                    // Daftar bisa digulir; di kartu bawah menu dibuka ke atas supaya tidak terpotong.
                    const area = event.currentTarget.closest("[data-scroll-area]")?.getBoundingClientRect();
                    const trigger = event.currentTarget.getBoundingClientRect();
                    setDropUp(Boolean(area) && area.bottom - trigger.bottom < MENU_HEIGHT && trigger.top - area.top > area.bottom - trigger.bottom);
                    setOpen((value) => !value);
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={`Aksi untuk ${pair}`}
                className="grid size-7 place-items-center rounded-md text-[#94a3b8] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8fb5c]"
            >
                <DotsThree size={18} weight="bold" aria-hidden />
            </button>
            {open && (
                <div id={menuId} role="menu" aria-label={`Aksi ${pair}`} className={`tactile-pop absolute right-0 z-30 w-56 ${dropUp ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"} rounded-lg bg-[#161a1e] p-1 shadow-[var(--shadow-menu)]`}>
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
        <li data-press="card" data-signal-id={signal.id} className={`group relative flex flex-col gap-3 rounded-xl border bg-[#161a1e] p-3.5 shadow-[var(--shadow-table)] hover:border-[#334155] ${highlighted ? "border-[#b8fb5c]/70 shadow-[0_0_0_3px_rgba(184,251,92,0.08)]" : "border-[#232a30]"}`}>
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

export default function LockedSignalsPanel({ items, meta, loading, error, highlightId, onRetry, onOpenItem, onCopyItem, onDeleteItem, className = "" }) {
    const now = useNow();
    const listRef = useRef(null);
    useEdgeMask(listRef);

    // Sinyal yang baru dikunci disorot; geser daftar sampai kartunya terlihat.
    useEffect(() => {
        const list = listRef.current;
        if (highlightId === null || highlightId === undefined || !list) return;
        const card = list.querySelector(`[data-signal-id="${CSS.escape(String(highlightId))}"]`);
        if (!card) return;
        const view = list.getBoundingClientRect();
        const box = card.getBoundingClientRect();
        if (box.top < view.top || box.bottom > view.bottom) {
            list.scrollBy({ top: box.top < view.top ? box.top - view.top - 8 : box.bottom - view.bottom + 8, behavior: scrollBehavior() });
        }
    }, [highlightId, items]);
    // Halaman pertama memuat 20 sinyal aktif, lebih dari batas slot, jadi jumlah
    // item di klien tetap akurat setelah lock baru atau hapus tanpa refetch.
    const used = items.length;
    const limit = Number(meta?.slotLimit) || null;

    return (
        <Panel id="lock-signal-list" className={`flex scroll-mt-6 flex-col ${className}`} aria-labelledby="locked-signals-title">
            <div className="px-5 pb-3.5 pt-5">
                <div className="flex items-center gap-2">
                    <h2 id="locked-signals-title" className="font-chakra text-base font-bold leading-[22px] text-[#f8fafc]">Sinyal Terkunci</h2>
                    <span className="rounded-full border border-[#232a30] bg-[#161a1e] px-[7px] py-px font-mono text-[11px] font-semibold leading-[14px] text-[#94a3b8]">
                        {used}
                    </span>
                </div>
                <p className="mt-1 font-chakra text-xs leading-4 text-[#94a3b8]">Dipantau sampai TP atau SL tersentuh.</p>
            </div>

            {/* Di layar lebar tinggi panel mengikuti Hasil Analisis; daftar digulir di sini. */}
            <div ref={listRef} data-scroll-area style={EDGE_MASK_Y_STYLE} className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-3.5 pt-1 ${used > 0 ? "pb-2.5" : "pb-3.5"}`}>
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
                )}
            </div>
            {used > 0 && (
                <div className="px-3.5 pb-3.5">
                    <SlotHint used={used} limit={limit} />
                </div>
            )}
        </Panel>
    );
}
