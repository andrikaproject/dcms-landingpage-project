// Indikator bawaan menu Indikator. EMA memakai toggle chart yang sudah ada;
// sisanya ditulis sebagai script Pine dan dijalankan engine yang sama.

export const BUILTIN_INDICATORS = [
    { id: "ema", name: "EMA", description: "Exponential Moving Average", toggles: ["ema21", "ema50"] },
    {
        id: "rsi",
        name: "RSI",
        description: "Relative Strength Index",
        source: `//@version=5
indicator("RSI", overlay=false)
len = input.int(14, "Panjang", minval=1)
src = input.source(close, "Sumber")
r = ta.rsi(src, len)
h1 = hline(70, "Overbought", color.new(color.red, 40))
hline(50, "Tengah", color.new(color.gray, 60))
h2 = hline(30, "Oversold", color.new(color.green, 40))
fill(h1, h2, color.new(color.purple, 92))
plot(r, "RSI", color.purple, 2)`,
    },
    {
        id: "macd",
        name: "MACD",
        description: "Moving Average Convergence Divergence",
        source: `//@version=5
indicator("MACD", overlay=false)
fastLen = input.int(12, "Fast", minval=1)
slowLen = input.int(26, "Slow", minval=1)
signalLen = input.int(9, "Signal", minval=1)
[macdLine, signalLine, hist] = ta.macd(close, fastLen, slowLen, signalLen)
plot(hist, "Histogram", hist >= 0 ? color.new(color.teal, 30) : color.new(color.red, 30), style=plot.style_histogram)
plot(macdLine, "MACD", color.blue)
plot(signalLine, "Signal", color.orange)
hline(0, "Nol", color.new(color.gray, 60))`,
    },
    {
        id: "bb",
        name: "Bollinger Bands",
        description: "Pita volatilitas dari SMA",
        source: `//@version=5
indicator("Bollinger Bands", overlay=true)
len = input.int(20, "Panjang", minval=1)
mult = input.float(2.0, "Deviasi", minval=0.1, step=0.1)
[basis, upper, lower] = ta.bb(close, len, mult)
p1 = plot(upper, "Atas", color.new(color.blue, 20))
plot(basis, "Tengah", color.new(color.orange, 20))
p2 = plot(lower, "Bawah", color.new(color.blue, 20))
fill(p1, p2, color.new(color.blue, 92))`,
    },
    {
        id: "vwap",
        name: "VWAP",
        description: "Volume Weighted Average Price",
        source: `//@version=5
indicator("VWAP", overlay=true)
plot(ta.vwap(hlc3), "VWAP", color.fuchsia, 2)`,
    },
];

export function builtinById(id) {
    return BUILTIN_INDICATORS.find((indicator) => indicator.id === id) || null;
}

export const DEFAULT_SCRIPT = `//@version=5
indicator("Indikator tanpa judul", overlay=true)

// Tulis logika indikator di sini
len = input.int(20, "Panjang")
plot(ta.sma(close, len), "SMA", color.orange)`;
