import { getFreshSignalSnapshot } from "@/lib/market-dashboard.js";

const signal = await getFreshSignalSnapshot({ symbol: "BTCUSDT", timeframe: "4h" });

console.log(JSON.stringify(signal, null, 2));
