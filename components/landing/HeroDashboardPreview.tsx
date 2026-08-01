'use client';

import { useEffect, useState } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setBp('mobile');
      else if (w < 1024) setBp('tablet');
      else setBp('desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}

/* ── Shared inner content pieces ── */

function DashboardHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        borderRadius: compact ? 10 : 14,
        background: 'linear-gradient(180deg,#222129,#100f15)',
        padding: compact ? '10px 12px' : 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif',
            fontSize: compact ? 15 : 20,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          Dashboard
        </div>
        {!compact && (
          <div style={{ color: '#cfd7e3', fontSize: 11, marginTop: 4, fontFamily: 'Chakra Petch, Arial, sans-serif' }}>
            Selalu DYOR dengan segala informasi.
          </div>
        )}
      </div>
      <span
        className="dcms-tf-breathe"
        style={{
          background: '#d9f99d',
          color: '#16161e',
          borderRadius: compact ? 6 : 8,
          padding: compact ? '5px 8px' : '8px 10px',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'Chakra Petch, Arial, sans-serif',
        }}
      >
        15M
      </span>
    </div>
  );
}

function CoinCard({ sym, price, accent, border }: { sym: string; price: string; accent?: string; border?: boolean }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg,#222129,#100f15)',
        border: border ? '1px solid rgba(183,251,91,.25)' : '1px solid rgba(255,255,255,.06)',
        borderRadius: 12,
        padding: '10px 12px',
        fontFamily: 'Chakra Petch, Arial, sans-serif',
      }}
    >
      <b style={{ fontSize: 10, color: accent ?? '#fff' }}>{sym}</b>
      <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8, color: '#fff' }}>{price}</div>
    </div>
  );
}

function SignalCard({ compact = false }: { compact?: boolean }) {
  return (
    <article
      style={{
        borderRadius: compact ? 10 : 12,
        background: 'linear-gradient(135deg,#374151,#111827)',
        padding: compact ? '10px 12px' : 14,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <span
            className="dcms-signal-pulse"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg,#8aef5a,#4ade80)',
              color: '#052e16',
              borderRadius: 6,
              padding: '3px 7px',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'Chakra Petch, Arial, sans-serif',
            }}
          >
            BIAS LONG
          </span>
          <div
            style={{
              fontSize: compact ? 13 : 16,
              fontWeight: 700,
              marginTop: 6,
              color: '#fff',
              fontFamily: 'Chakra Petch, Arial, sans-serif',
            }}
          >
            BTC/USDT
          </div>
        </div>
        <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: '#fff', fontFamily: 'Chakra Petch, Arial, sans-serif' }}>
          $109,240
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ position: 'relative', marginTop: compact ? 12 : 18, height: 24 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 7, background: '#334155', borderRadius: 999 }} />
        <div
          className="dcms-signal-zone"
          style={{ position: 'absolute', left: '38%', width: '34%', top: 8, height: 7, background: '#8aef5a', borderRadius: 999 }}
        />
        <div
          className="dcms-knob-halo"
          style={{
            position: 'absolute',
            left: '72%',
            top: 3,
            width: 16,
            height: 16,
            background: '#b7fb5b',
            border: '2px solid white',
            borderRadius: 999,
            boxShadow: '0 0 0 5px rgba(183,251,91,.16)',
          }}
        />
      </div>
    </article>
  );
}

/* ── Shared outer shell style ── */
function shellStyle(overrides: React.CSSProperties = {}): React.CSSProperties {
  return {
    position: 'absolute',
    left: '50%',
    background: 'rgba(17,24,32,.58)',
    border: '1px solid rgba(255,255,255,.16)',
    backdropFilter: 'blur(14px) saturate(150%)',
    WebkitBackdropFilter: 'blur(14px) saturate(150%)',
    borderRadius: 28,
    boxShadow: '0 0 120px rgba(183,251,91,.16),0 54px 150px rgba(0,0,0,.70)',
    overflow: 'hidden',
    zIndex: 2,
    ...overrides,
  };
}

/* ── Desktop variant — full 850 × 300 ── */
function DesktopPreview() {
  const baseTransform = 'translateX(-50%) perspective(1000px) rotateX(13deg)';
  return (
    <div
      className="dcms-dashboard-float"
      style={
        {
          ...shellStyle({
            bottom: -92,
            width: 850,
            height: 300,
            opacity: 0.66,
            transform: baseTransform,
          }),
          '--dcms-float-transform': baseTransform,
          '--dcms-float-range': '-8px',
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '88px 1fr', background: 'linear-gradient(180deg,#23252a,#111315)' }}>
        {/* Sidebar */}
        <aside style={{ background: '#07060e', borderRight: '1px solid #14131c', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#b7fb5b', margin: '0 auto' }} />
          <div style={{ height: 36, border: '1px solid #36353d', background: 'linear-gradient(180deg,#25242a,#17161c)', borderRadius: 8 }} />
          <div style={{ height: 36, background: 'rgba(255,255,255,.04)', borderRadius: 8 }} />
          <div style={{ height: 36, background: 'rgba(255,255,255,.04)', borderRadius: 8 }} />
        </aside>

        {/* Main */}
        <main style={{ padding: 16, display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 12 }}>
          <DashboardHeader />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <CoinCard sym="BTC" price="$109,240" border />
            <CoinCard sym="ETH" price="$3,218" border />
            <CoinCard sym="USDT DOM" price="Neutral" accent="#38bdf8" />
          </div>
          <SignalCard />
        </main>
      </div>
    </div>
  );
}

/* ── Tablet variant — no sidebar, 2-col coins, scaled ── */
function TabletPreview() {
  const baseTransform = 'translateX(-50%) perspective(900px) rotateX(10deg)';
  return (
    <div
      className="dcms-dashboard-float"
      style={
        {
          ...shellStyle({
            bottom: -64,
            width: 640,
            height: 260,
            opacity: 0.60,
            transform: baseTransform,
          }),
          '--dcms-float-transform': baseTransform,
          '--dcms-float-range': '-6px',
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <main
        style={{
          height: '100%',
          padding: 14,
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          gap: 10,
          background: 'linear-gradient(180deg,#23252a,#111315)',
        }}
      >
        <DashboardHeader compact />
        {/* 2-col coin cards on tablet */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CoinCard sym="BTC" price="$109,240" border />
          <CoinCard sym="ETH" price="$3,218" border />
        </div>
        <SignalCard compact />
      </main>
    </div>
  );
}

/* ── Mobile variant — single-column, compact ── */
function MobilePreview() {
  const baseTransform = 'translateX(-50%) perspective(700px) rotateX(7deg)';
  return (
    <div
      className="dcms-dashboard-float"
      style={
        {
          ...shellStyle({
            bottom: 16,
            width: 'min(310px, calc(100vw - 40px))',
            height: 186,
            opacity: 0.68,
            transform: baseTransform,
          }),
          '--dcms-float-transform': baseTransform,
          '--dcms-float-range': '-5px',
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <div
        style={{
          height: '100%',
          padding: 12,
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          gap: 8,
          background: 'linear-gradient(180deg,#23252a,#111315)',
        }}
      >
        {/* Compact header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 10,
            background: 'linear-gradient(180deg,#222129,#100f15)',
            padding: '8px 10px',
          }}
        >
          <span
            style={{
              fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Dashboard
          </span>
          <span
            className="dcms-tf-breathe"
            style={{
              background: '#d9f99d',
              color: '#16161e',
              borderRadius: 6,
              padding: '3px 7px',
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'Chakra Petch, Arial, sans-serif',
            }}
          >
            15M
          </span>
        </div>

        {/* Bottom row: 1 coin + signal side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
          {/* Coin card */}
          <div
            style={{
              background: 'linear-gradient(180deg,#222129,#100f15)',
              border: '1px solid rgba(183,251,91,.25)',
              borderRadius: 10,
              padding: '8px 10px',
              fontFamily: 'Chakra Petch, Arial, sans-serif',
            }}
          >
            <b style={{ fontSize: 9, color: '#b7fb5b' }}>BTC</b>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: '#fff', lineHeight: 1 }}>
              $109,240
            </div>
            {/* Mini bar */}
            <div style={{ marginTop: 8, height: 3, background: '#1f2937', borderRadius: 999 }}>
              <div style={{ height: 3, width: '68%', background: '#8aef5a', borderRadius: 999 }} />
            </div>
          </div>

          {/* Signal card */}
          <div
            style={{
              borderRadius: 10,
              background: 'linear-gradient(135deg,#374151,#111827)',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <span
                className="dcms-signal-pulse"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg,#8aef5a,#4ade80)',
                  color: '#052e16',
                  borderRadius: 5,
                  padding: '2px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: 'Chakra Petch, Arial, sans-serif',
                }}
              >
                BIAS LONG
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'Chakra Petch, Arial, sans-serif' }}>
                $109k
              </span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'Chakra Petch, Arial, sans-serif', marginTop: 4 }}>
              BTC/USDT
            </div>
            {/* Progress bar */}
            <div style={{ position: 'relative', height: 16, marginTop: 4 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 5, height: 5, background: '#334155', borderRadius: 999 }} />
              <div
                className="dcms-signal-zone"
                style={{ position: 'absolute', left: '38%', width: '34%', top: 5, height: 5, background: '#8aef5a', borderRadius: 999 }}
              />
              <div
                className="dcms-knob-halo"
                style={{
                  position: 'absolute',
                  left: '72%',
                  top: 1,
                  width: 12,
                  height: 12,
                  background: '#b7fb5b',
                  border: '2px solid white',
                  borderRadius: 999,
                  boxShadow: '0 0 0 4px rgba(183,251,91,.16)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Public component ── */
export function HeroDashboardPreview() {
  const bp = useBreakpoint();

  if (bp === 'mobile') return <MobilePreview />;
  if (bp === 'tablet') return <TabletPreview />;
  return <DesktopPreview />;
}
