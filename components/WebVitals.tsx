'use client';

import { useEffect } from 'react';

type VitalName = 'LCP' | 'CLS' | 'INP';

type VitalPayload = {
    metric: VitalName;
    value: number;
    path: string;
    timestamp: number;
};

type LayoutShiftEntry = PerformanceEntry & {
    value: number;
    hadRecentInput: boolean;
};

type InteractionEntry = PerformanceEntry & {
    processingEnd?: number;
    processingStart?: number;
    duration: number;
};

function sendToAnalytics(payload: VitalPayload) {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/vitals', body);
        return;
    }

    fetch('/api/analytics/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
    }).catch(() => {
        // Vitals should never block the interface.
    });
}

export function WebVitals() {
    useEffect(() => {
        if (typeof PerformanceObserver === 'undefined') return;

        const observers: PerformanceObserver[] = [];
        const path = window.location.pathname;

        const report = (metric: VitalName, value: number) => {
            sendToAnalytics({
                metric,
                value,
                path,
                timestamp: Date.now(),
            });
        };

        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) report('LCP', lastEntry.startTime);
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            observers.push(lcpObserver);
        } catch {
            // Some browsers do not support every observer type.
        }

        try {
            let cls = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries() as LayoutShiftEntry[]) {
                    if (!entry.hadRecentInput) cls += entry.value;
                }
                report('CLS', cls);
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
            observers.push(clsObserver);
        } catch {
            // Some browsers do not support every observer type.
        }

        try {
            const inpObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries() as InteractionEntry[]) {
                    const duration =
                        typeof entry.processingEnd === 'number' && typeof entry.processingStart === 'number'
                            ? entry.processingEnd - entry.processingStart
                            : entry.duration;
                    report('INP', duration);
                }
            });
            const interactionOptions = { type: 'event', buffered: true, durationThreshold: 40 };
            inpObserver.observe(interactionOptions as PerformanceObserverInit);
            observers.push(inpObserver);
        } catch {
            // Some browsers do not support every observer type.
        }

        return () => {
            observers.forEach((observer) => observer.disconnect());
        };
    }, []);

    return null;
}
