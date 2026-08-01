const glassStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.065)',
  border: '1px solid rgba(255,255,255,.15)',
  backdropFilter: 'blur(24px) saturate(155%)',
  WebkitBackdropFilter: 'blur(24px) saturate(155%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.16),0 22px 80px rgba(0,0,0,.38)',
};

export function HeroPnlCards() {
  return (
    <>
      {/* SOL card — left, rotated -8deg */}
      <div
        className="hidden md:block dcms-pnl-drift-left"
        style={{
          ...glassStyle,
          position: 'absolute',
          left: 44,
          top: 228,
          width: 148,
          borderRadius: 20,
          padding: 12,
          opacity: 0.42,
          transform: 'rotate(-8deg)',
          zIndex: 3,
        }}
        aria-hidden="true"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Chakra Petch, Arial, sans-serif' }}>SOLUSDT</span>
          <span style={{ fontSize: 9, color: '#b7fb5b', fontFamily: 'Chakra Petch, Arial, sans-serif', fontWeight: 700 }}>LONG</span>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#8aef5a',
            lineHeight: 1.1,
            marginTop: 10,
            fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif',
          }}
        >
          +182%
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontFamily: 'Chakra Petch, Arial, sans-serif' }}>
          member result
        </div>
        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: '#1f2937',
            borderRadius: 999,
            marginTop: 10,
          }}
        >
          <div
            style={{
              height: 4,
              width: '72%',
              background: '#8aef5a',
              borderRadius: 999,
            }}
          />
        </div>
      </div>

      {/* BTC card — right, rotated +7deg */}
      <div
        className="hidden md:block dcms-pnl-drift-right"
        style={{
          ...glassStyle,
          position: 'absolute',
          right: 58,
          top: 252,
          width: 154,
          borderRadius: 20,
          padding: 12,
          opacity: 0.36,
          transform: 'rotate(7deg)',
          zIndex: 3,
        }}
        aria-hidden="true"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Chakra Petch, Arial, sans-serif' }}>BTCUSDT</span>
          <span style={{ fontSize: 9, color: '#38bdf8', fontFamily: 'Chakra Petch, Arial, sans-serif', fontWeight: 700 }}>SWING</span>
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#8aef5a',
            lineHeight: 1.1,
            marginTop: 10,
            fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif',
          }}
        >
          +47.8%
        </div>
        {/* Placeholder detail boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
          <div style={{ height: 24, background: 'rgba(255,255,255,.06)', borderRadius: 7 }} />
          <div style={{ height: 24, background: 'rgba(255,255,255,.06)', borderRadius: 7 }} />
        </div>
      </div>

      {/* Disclaimer — top-right, near BTC card */}
      <div
        className="hidden md:block"
        style={{
          position: 'absolute',
          right: 60,
          top: 222,
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.14)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 999,
          padding: '7px 10px',
          color: '#cbd5e1',
          fontSize: 10,
          fontFamily: 'Chakra Petch, Arial, sans-serif',
          zIndex: 4,
        }}
        aria-label="Disclaimer: Member result, not guarantee"
      >
        Member result, not guarantee
      </div>
    </>
  );
}
