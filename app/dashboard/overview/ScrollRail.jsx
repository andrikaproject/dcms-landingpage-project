"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

// Ambang piksel supaya pembulatan subpiksel tidak dianggap "masih ada isi".
const EPSILON = 2;
const MIN_THUMB = 32;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function scrollBehavior() {
    if (typeof window === "undefined") return "auto";
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export const EDGE_PX = 48;
const EDGE_SIZE = `${EDGE_PX}px`;
const EDGE_GRADIENT = "linear-gradient(to right, transparent, #000 var(--edge-l, 0px), #000 calc(100% - var(--edge-r, 0px)), transparent)";

// Dipasang di elemen yang digeser. Mask hanya aktif di sisi yang masih punya isi;
// lebarnya diatur ScrollRail lewat --edge-l/--edge-r.
export const EDGE_MASK_STYLE = {
    WebkitMaskImage: EDGE_GRADIENT,
    maskImage: EDGE_GRADIENT,
    transition: "--edge-l 200ms var(--ease-out), --edge-r 200ms var(--ease-out)",
};

const EDGE_GRADIENT_Y = "linear-gradient(to bottom, transparent, #000 var(--edge-t, 0px), #000 calc(100% - var(--edge-b, 0px)), transparent)";

// Versi vertikal untuk daftar yang digulir ke bawah; dipakai bersama useEdgeMask.
export const EDGE_MASK_Y_STYLE = {
    WebkitMaskImage: EDGE_GRADIENT_Y,
    maskImage: EDGE_GRADIENT_Y,
    transition: "--edge-t 200ms var(--ease-out), --edge-b 200ms var(--ease-out)",
};

// Memudarkan tepi daftar yang digulir hanya di sisi yang masih punya isi.
// axis "y" mengatur --edge-t/--edge-b (pakai EDGE_MASK_Y_STYLE), axis "x"
// mengatur --edge-l/--edge-r (pakai EDGE_MASK_STYLE) untuk baris tanpa rel.
export function useEdgeMask(scrollerRef, { axis = "y", size = 32 } = {}) {
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return undefined;
        const [start, end] = axis === "x" ? ["--edge-l", "--edge-r"] : ["--edge-t", "--edge-b"];
        let frame = 0;
        const sync = () => {
            const max = axis === "x" ? scroller.scrollWidth - scroller.clientWidth : scroller.scrollHeight - scroller.clientHeight;
            const offset = axis === "x" ? scroller.scrollLeft : scroller.scrollTop;
            scroller.style.setProperty(start, max > EPSILON && offset > EPSILON ? `${size}px` : "0px");
            scroller.style.setProperty(end, max > EPSILON && offset < max - EPSILON ? `${size}px` : "0px");
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(sync);
        };
        scroller.addEventListener("scroll", schedule, { passive: true });
        const resize = new ResizeObserver(schedule);
        resize.observe(scroller);
        const mutation = new MutationObserver(schedule);
        mutation.observe(scroller, { childList: true, subtree: true, characterData: true });
        sync();
        return () => {
            scroller.removeEventListener("scroll", schedule);
            resize.disconnect();
            mutation.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [scrollerRef, axis, size]);
}

const STEP_BUTTON = "inline-grid size-7 shrink-0 place-items-center rounded-full bg-[#1a1f24] text-[#94a3b8] shadow-[var(--shadow-button)] hover:bg-[#1e252b] hover:text-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] disabled:opacity-40";

// Rel untuk baris yang digeser horizontal. Memudarkan tepi di sisi yang masih
// punya isi (lihat EDGE_MASK_STYLE), menggambar penunjuk posisi
// yang bisa diseret atau diketuk, dan tombol geser untuk mouse. Di layar sentuh
// tombol disembunyikan karena baris cukup digeser dengan jari.
export default function ScrollRail({ scrollerRef }) {
    const trackRef = useRef(null);
    const thumbRef = useRef(null);
    const dragRef = useRef(null);
    const frameRef = useRef(0);
    const [state, setState] = useState({ overflow: false, left: false, right: false });

    const sync = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const max = scroller.scrollWidth - scroller.clientWidth;
        const overflow = max > EPSILON;
        const left = overflow && scroller.scrollLeft > EPSILON;
        const right = overflow && scroller.scrollLeft < max - EPSILON;
        scroller.style.setProperty("--edge-l", left ? EDGE_SIZE : "0px");
        scroller.style.setProperty("--edge-r", right ? EDGE_SIZE : "0px");

        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (overflow && track && thumb) {
            const trackWidth = track.clientWidth;
            const thumbWidth = clamp((trackWidth * scroller.clientWidth) / scroller.scrollWidth, MIN_THUMB, trackWidth);
            // Safari memantul melewati tepi; posisi penunjuk tetap di dalam rel.
            const ratio = clamp(scroller.scrollLeft / max, 0, 1);
            thumb.style.width = `${thumbWidth}px`;
            thumb.style.transform = `translateX(${(trackWidth - thumbWidth) * ratio}px)`;
        }
        setState((current) => (current.overflow === overflow && current.left === left && current.right === right ? current : { overflow, left, right }));
    }, [scrollerRef]);

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return undefined;
        const schedule = () => {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = requestAnimationFrame(sync);
        };
        scroller.addEventListener("scroll", schedule, { passive: true });
        const resize = new ResizeObserver(schedule);
        resize.observe(scroller);
        // Chip ditambah atau ditutup mengubah lebar isi tanpa mengubah ukuran baris.
        const mutation = new MutationObserver(schedule);
        mutation.observe(scroller, { childList: true, subtree: true, characterData: true });
        schedule();
        return () => {
            scroller.removeEventListener("scroll", schedule);
            resize.disconnect();
            mutation.disconnect();
            cancelAnimationFrame(frameRef.current);
            scroller.style.removeProperty("--edge-l");
            scroller.style.removeProperty("--edge-r");
        };
    }, [scrollerRef, sync]);

    // Rel baru dirender setelah ada isi yang meluap; ukur penunjuknya sebelum tampil.
    useLayoutEffect(() => {
        if (state.overflow) sync();
    }, [state.overflow, sync]);

    function step(direction) {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: scrollBehavior() });
    }

    function handlePointerDown(event) {
        const scroller = scrollerRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!scroller || !track || !thumb || event.button !== 0) return;
        const max = scroller.scrollWidth - scroller.clientWidth;
        const travel = track.clientWidth - thumb.offsetWidth;
        if (max <= 0 || travel <= 0) return;
        event.preventDefault();
        // Snap dimatikan selama diseret supaya baris tidak melompat melawan jari.
        scroller.style.scrollSnapType = "none";
        const thumbRect = thumb.getBoundingClientRect();
        if (event.clientX < thumbRect.left || event.clientX > thumbRect.right) {
            const trackRect = track.getBoundingClientRect();
            scroller.scrollLeft = clamp((event.clientX - trackRect.left - thumb.offsetWidth / 2) / travel, 0, 1) * max;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { x: event.clientX, start: scroller.scrollLeft, ratio: max / travel };
        track.dataset.dragging = "";
    }

    function handlePointerMove(event) {
        const drag = dragRef.current;
        const scroller = scrollerRef.current;
        if (!drag || !scroller) return;
        scroller.scrollLeft = drag.start + (event.clientX - drag.x) * drag.ratio;
    }

    function endDrag() {
        if (!dragRef.current) return;
        dragRef.current = null;
        if (scrollerRef.current) scrollerRef.current.style.scrollSnapType = "";
        if (trackRef.current) delete trackRef.current.dataset.dragging;
    }

    if (!state.overflow) return null;

    return (
        <div className="flex items-center gap-3">
            {/* Area sentuh 20px (44px di layar sentuh) di sekitar rel 4px. */}
            <div
                className="group/rail flex h-5 min-w-0 flex-1 cursor-pointer touch-pan-y items-center pointer-coarse:-my-3 pointer-coarse:h-11"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
                aria-hidden
            >
                <div ref={trackRef} className="relative h-1 w-full rounded-full bg-[#0b0d0f] shadow-[inset_0_0_0_0.5px_#1e252b]">
                    <div
                        ref={thumbRef}
                        className="absolute inset-y-0 left-0 rounded-full bg-[#334155] transition-colors duration-150 ease-[var(--ease-out)] group-hover/rail:bg-[#475569] in-data-[dragging]:bg-[#64748b]"
                    />
                </div>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 pointer-fine:flex">
                <button type="button" tabIndex={-1} onClick={() => step(-1)} disabled={!state.left} aria-label="Geser ke kiri" className={STEP_BUTTON}>
                    <CaretLeft size={12} weight="bold" aria-hidden />
                </button>
                <button type="button" tabIndex={-1} onClick={() => step(1)} disabled={!state.right} aria-label="Geser ke kanan" className={STEP_BUTTON}>
                    <CaretRight size={12} weight="bold" aria-hidden />
                </button>
            </div>
        </div>
    );
}
