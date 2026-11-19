import { gaugePosition } from "@/lib/market/bias-factors";
import { biasTone } from "./ui";

const CX = 132;
const CY = 140;
const RADIUS = 110;
// Posisi -1..1 tiap zona. Celah kecil memisahkan ketiganya seperti di Figma.
const ZONES = [
    { bias: "short", from: -1, to: -0.34 },
    { bias: "neutral", from: -0.28, to: 0.28 },
    { bias: "long", from: 0.34, to: 1 },
];

function pointAt(position) {
    const angle = (Math.PI * (1 - position)) / 2;
    return { x: CX + RADIUS * Math.cos(angle), y: CY - RADIUS * Math.sin(angle) };
}

function arcPath(from, to) {
    const start = pointAt(from);
    const end = pointAt(to);
    return `M${start.x.toFixed(2)} ${start.y.toFixed(2)} A${RADIUS} ${RADIUS} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export default function BiasGauge({ bias, score, confidence }) {
    const direction = String(bias || "neutral").toLowerCase();
    const tone = biasTone(direction);
    const knob = pointAt(gaugePosition(score));
    const scaleClass = (zone) => `font-mono text-[10px] leading-[13px] tracking-[0.08em] ${zone === direction ? "font-semibold" : "font-medium text-[#64748b]"}`;

    return (
        <div className="relative h-[166px] w-[264px] shrink-0">
            <svg viewBox="0 0 264 166" className="absolute inset-0 size-full" aria-hidden>
                {ZONES.map((zone) => (
                    <path
                        key={zone.bias}
                        d={arcPath(zone.from, zone.to)}
                        fill="none"
                        stroke={biasTone(zone.bias).hex}
                        strokeOpacity={zone.bias === direction ? 1 : 0.16}
                        strokeWidth="14"
                        strokeLinecap="round"
                    />
                ))}
                <circle cx={knob.x} cy={knob.y} r="10" fill="#f8fafc" stroke="#111417" strokeWidth="4" />
                <circle cx={knob.x} cy={knob.y} r="3.5" fill={tone.hex} />
            </svg>

            <span className={`absolute left-0 top-[150px] ${scaleClass("short")}`} style={direction === "short" ? { color: tone.hex } : undefined}>SHORT</span>
            <span className={`absolute left-1/2 top-0 -translate-x-1/2 ${scaleClass("neutral")}`} style={direction === "neutral" ? { color: tone.hex } : undefined}>NETRAL</span>
            <span className={`absolute right-0 top-[150px] ${scaleClass("long")}`} style={direction === "long" ? { color: tone.hex } : undefined}>LONG</span>

            <div className="absolute inset-x-0 top-[62px] flex flex-col items-center gap-0.5 text-center">
                <span className="font-mono text-[10px] font-medium leading-[13px] tracking-[0.12em] text-[#64748b]">BIAS</span>
                <span className={`font-chakra text-[34px] font-bold leading-10 ${tone.text}`}>{tone.label}</span>
                <span className="font-mono text-xs font-medium leading-4 text-[#94a3b8]">
                    {confidence === null || confidence === undefined ? "Belum ada arah jelas" : `Keyakinan ${confidence}%`}
                </span>
            </div>
        </div>
    );
}
