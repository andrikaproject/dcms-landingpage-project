import { NextResponse } from "next/server";

const allowedMetrics = new Set(["LCP", "CLS", "INP"]);

export async function POST(request) {
    const payload = await request.json().catch(() => null);

    if (!payload || !allowedMetrics.has(payload.metric) || typeof payload.value !== "number") {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (process.env.NODE_ENV !== "production") {
        console.info("[web-vitals]", {
            metric: payload.metric,
            value: Math.round(payload.value * 100) / 100,
            path: payload.path,
        });
    }

    return NextResponse.json({ ok: true });
}
