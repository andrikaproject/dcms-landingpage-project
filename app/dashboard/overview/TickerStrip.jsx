"use client";

import Image from "next/image";
import { useLivePrices } from "@/lib/market/live-prices";
import { sparklinePath } from "@/lib/market/sparkline";
import { formatPercent } from "./ui";

const TICKERS = [
    { symbol: "BTCUSDT", label: "BTC", name: "Bitcoin" },
    { symbol: "ETHUSDT", label: "ETH", name: "Ethereum" },
    { symbol: "SOLUSDT", label: "SOL", name: "Solana" },
];

function SolanaIcon() {
    return (
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
            <defs>
                <linearGradient id="sol-gradient" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#00ffa3" />
                    <stop offset="1" stopColor="#dc1fff" />
                </linearGradient>
            </defs>
            <circle cx="10" cy="10" r="10" fill="#000" />
            <path d="M6.6 12.4h6.6l-1.5 1.5H5.1zM6.6 6.1h6.6l-1.5 1.5H5.1zM13.2 9.25H6.6l-1.5 1.5h6.6z" fill="url(#sol-gradient)" />
        </svg>
    );
}

function CoinIcon({ label }) {
    if (label === "SOL") return <SolanaIcon />;
    const src = label === "BTC" ? "/bitcoin-btc-logo.svg" : "/ethereum-eth-logo.svg";
    return <Image src={src} alt="" width={20} height={20} className="size-5 object-contain" />;
}

function formatTickerPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return `$${number.toLocaleString("en-US", { maximumFractionDigits: number >= 1000 ? 0 : 2, minimumFractionDigits: number >= 1000 ? 0 : 2 })}`;
}

function Ticker({ config, signal, livePrice, onSelect }) {
    const change = Number(signal?.change);
    const hasChange = Number.isFinite(change);
    const color = !hasChange ? "#94a3b8" : change >= 0 ? "#4ade80" : "#f87171";
    const path = sparklinePath(signal?.sparkline);
    const price = livePrice ?? signal?.price;

    return (
        <button
            type="button"
            onClick={() => onSelect(config.label)}
            data-press="surface"
            aria-label={`Analisis ${config.name}, harga ${formatTickerPrice(price)}${hasChange ? `, ${formatPercent(change)} dalam 24 jam` : ""}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3.5 py-2 text-left transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#b8fb5c]"
        >
            <CoinIcon label={config.label} />
            <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium leading-[14px]">
                    <span className="text-[#94a3b8]">{config.label}</span>
                    {hasChange && <span style={{ color }}>{formatPercent(change)}</span>}
                </p>
                <p className="truncate font-mono text-sm font-semibold leading-[18px] text-[#f8fafc]">{formatTickerPrice(price)}</p>
            </div>
            {path && (
                <svg viewBox="0 0 48 18" className="ml-auto hidden h-[18px] w-12 shrink-0 sm:block" aria-hidden>
                    <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </button>
    );
}

export default function TickerStrip({ signals, onSelect }) {
    const bySymbol = new Map((signals || []).map((signal) => [signal.symbol, signal]));
    // Harga bergerak tiap 10 detik; perubahan 24 jam dan sparkline dari data dashboard.
    const live = useLivePrices(TICKERS, { enabled: true });

    return (
        <div className="flex w-full items-center rounded-xl border border-[#232a30] bg-[#111417] px-1 py-0.5 lg:w-auto lg:min-w-[537px]">
            {TICKERS.map((config, index) => (
                <div key={config.symbol} className="flex min-w-0 flex-1 items-center">
                    {index > 0 && <span className="h-7 w-px shrink-0 bg-[#232a30]" aria-hidden />}
                    <Ticker config={config} signal={bySymbol.get(config.symbol)} livePrice={live.prices[config.symbol]} onSelect={onSelect} />
                </div>
            ))}
        </div>
    );
}
