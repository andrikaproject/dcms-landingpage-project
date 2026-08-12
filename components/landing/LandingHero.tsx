'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { HeroNavbar } from './HeroNavbar';
import { HeroDashboardPreview } from './HeroDashboardPreview';
import { HeroPnlCards } from './HeroPnlCards';

const ROTATING_WORDS = ['KERAS', 'ANOMALI', 'BERISIKO', 'LIAR'];
const TYPE_SPEED_MS = 80;
const DELETE_SPEED_MS = 50;
const HOLD_FULL_WORD_MS = 1200;
const PAUSE_AFTER_DELETE_MS = 250;

/* Longest word reserves the container width so the headline never shifts */
const LONGEST_WORD = 'BERISIKO';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

function RotatingTypewriter() {
  const [text, setText] = useState(ROTATING_WORDS[0]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    let wordIndex = 0;
    let charIndex = ROTATING_WORDS[0].length;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const word = ROTATING_WORDS[wordIndex];
      if (!deleting) {
        if (charIndex < word.length) {
          charIndex += 1;
          setText(word.slice(0, charIndex));
          timer = setTimeout(tick, TYPE_SPEED_MS);
        } else {
          deleting = true;
          timer = setTimeout(tick, HOLD_FULL_WORD_MS);
        }
      } else if (charIndex > 0) {
        charIndex -= 1;
        setText(word.slice(0, charIndex));
        timer = setTimeout(tick, DELETE_SPEED_MS);
      } else {
        deleting = false;
        wordIndex = (wordIndex + 1) % ROTATING_WORDS.length;
        timer = setTimeout(tick, PAUSE_AFTER_DELETE_MS);
      }
    };

    timer = setTimeout(tick, HOLD_FULL_WORD_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  if (reducedMotion) {
    return <span style={{ color: '#b7fb5b' }}>KERAS.</span>;
  }

  return (
    <span
      style={{
        color: '#b7fb5b',
        position: 'relative',
        display: 'inline-block',
        textAlign: 'left',
      }}
    >
      {/* Invisible sizer keeps width stable at the longest word */}
      <span style={{ visibility: 'hidden' }} aria-hidden="true">
        {LONGEST_WORD}.
      </span>
      <span style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap' }} aria-hidden="true">
        {text}.<span className="dcms-caret" />
      </span>
      <span className="sr-only">KERAS.</span>
    </span>
  );
}

type LandingUser = {
  name: string | null;
  email: string | null;
  role: string | null;
  uuidBitunix: string | null;
};

function scrollToCommunity(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  document.getElementById('community-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingHero({
  user,
  logoutSlot,
}: {
  user: LandingUser | null;
  logoutSlot: ReactNode;
}) {
  const isLoggedIn = Boolean(user);

  return (
    <>
      {/* ── Fixed floating navbar ── */}
      {/* Positioned outside overflow:hidden so it stays sticky on scroll */}
      <div
        style={{
          position: 'fixed',
          top: 18,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 1560,
          }}
        >
          <HeroNavbar user={user} logoutSlot={logoutSlot} />
        </div>
      </div>

      {/* ── Hero section — full bleed, no card box ── */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          /* Mobile: compact (no dashboard preview space needed)
             Tablet: medium — preview is smaller
             Desktop: full 760px for dashboard preview  */
          minHeight: 'clamp(580px, 82vh, 760px)',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 50% 82%,rgba(183,251,91,.18),transparent 34%),' +
            'radial-gradient(circle at 18% 31%,rgba(125,211,252,.08),transparent 26%),' +
            '#08090b',
        }}
      >
        {/* Lime-tinted grid lines */}
        <div
          className="dcms-grid-drift"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(183,251,91,.08) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(183,251,91,.045) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
            opacity: 0.28,
            maskImage: 'linear-gradient(180deg,#000,rgba(0,0,0,.72),transparent 95%)',
            WebkitMaskImage: 'linear-gradient(180deg,#000,rgba(0,0,0,.72),transparent 95%)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        {/* Market scanline — slow vertical sweep */}
        <div className="dcms-hero-scanline" aria-hidden="true" />

        {/* Lime dashed technical frame */}
        <div
          style={{
            position: 'absolute',
            inset: '72px 26px 98px',
            border: '1px dashed rgba(183,251,91,.20)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        {/* Bottom fade — masks dashboard bottom edge */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            /* Mobile: thinner fade so dashboard preview isn't buried;
               tablet+: taller fade to dissolve the larger preview */
            height: 'clamp(100px, 20vh, 236px)',
            background: 'linear-gradient(180deg,transparent,#08090b 75%)',
            zIndex: 4,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        {/* PnL floating cards */}
        <HeroPnlCards />

        {/* Text content — paddingTop accounts for fixed navbar */}
        <div
          style={{
            position: 'relative',
            zIndex: 8,
            textAlign: 'center',
            /* Scales with viewport: less padding on mobile (nav is fixed, 74px),
               more on desktop where dashboard preview needs breathing room */
            paddingTop: 'clamp(88px, 14vh, 140px)',
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {/* Kicker — lime */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: '#b7fb5b',
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 18,
              background: 'rgba(183,251,91,.08)',
              border: '1px solid rgba(183,251,91,.20)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              borderRadius: 999,
              padding: '8px 14px',
              fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif',
              letterSpacing: '0.06em',
            }}
          >
            {isLoggedIn ? 'MEMBER ACCESS ACTIVE' : 'FREE RISK-AWARE CRYPTO COMMUNITY'}
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif',
              fontSize: 'clamp(2.6rem, 6vw, 4.5rem)',
              lineHeight: 0.92,
              fontWeight: 900,
              letterSpacing: 0,
              margin: 0,
            }}
          >
            <span style={{ color: '#ffffff', display: 'block' }}>
              CRYPTO ITU <RotatingTypewriter />
            </span>
            <span style={{ color: 'rgba(255,255,255,.20)', display: 'block', marginTop: 8 }}>
              {isLoggedIn ? 'CEK DASHBOARD DULU.' : 'BELAJAR JANGAN SENDIRIAN.'}
            </span>
          </h1>

          {/* Supporting copy */}
          <p
            style={{
              fontFamily: 'Chakra Petch, Arial, sans-serif',
              color: '#d7deea',
              fontSize: 16,
              lineHeight: 1.58,
              margin: '20px auto 0',
              maxWidth: 680,
            }}
          >
            {isLoggedIn
              ? 'Akun kamu sudah aktif. Langsung masuk dashboard untuk pantau market, signal board, dan reminder risk.'
              : 'Pantau market, baca sinyal, dan cek risk dari dashboard DCMS. Free, aktif, dan tanpa janji profit instan.'}
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 24,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="dcms-cta-pulse"
                  style={{
                    background: '#b7fb5b',
                    color: '#111315',
                    padding: '13px 22px',
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'Chakra Petch, Arial, sans-serif',
                    boxShadow: '0 18px 48px rgba(183,251,91,.22)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  Buka Dashboard
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <a
                  href="#community-section"
                  onClick={scrollToCommunity}
                  className="dcms-glass-breathe"
                  style={{
                    background: 'rgba(255,255,255,.065)',
                    border: '1px solid rgba(255,255,255,.15)',
                    backdropFilter: 'blur(24px) saturate(155%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(155%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.16)',
                    color: '#fff',
                    padding: '13px 22px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontFamily: 'Chakra Petch, Arial, sans-serif',
                    textDecoration: 'none',
                  }}
                >
                  Lihat komunitas
                </a>
              </>
            ) : (
              <>
                <Link
                  href="https://discord.gg/n58Hfr3EV6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dcms-cta-pulse"
                  style={{
                    background: '#b7fb5b',
                    color: '#111315',
                    padding: '13px 22px',
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'Chakra Petch, Arial, sans-serif',
                    boxShadow: '0 18px 48px rgba(183,251,91,.22)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  Join Discord
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <a
                  href="#community-section"
                  onClick={scrollToCommunity}
                  className="dcms-glass-breathe"
                  style={{
                    background: 'rgba(255,255,255,.065)',
                    border: '1px solid rgba(255,255,255,.15)',
                    backdropFilter: 'blur(24px) saturate(155%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(155%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.16)',
                    color: '#fff',
                    padding: '13px 22px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontFamily: 'Chakra Petch, Arial, sans-serif',
                    textDecoration: 'none',
                  }}
                >
                  Lihat isi komunitas
                </a>
              </>
            )}
          </div>

          {/* Guest helper text */}
          {!isLoggedIn && (
            <p
              style={{
                margin: '13px 0 0',
                color: '#7f8a9a',
                fontSize: 12,
                fontFamily: 'Chakra Petch, Arial, sans-serif',
              }}
            >
              Mau akses dashboard? Daftar Member ada di kanan atas.
            </p>
          )}
        </div>

        {/* Dashboard preview */}
        <HeroDashboardPreview />
      </section>
    </>
  );
}
