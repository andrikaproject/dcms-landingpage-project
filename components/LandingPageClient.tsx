'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeroPattern } from './HeroPattern';
import { LoadingScreen } from './LoadingScreen';

// Dynamic imports for below-the-fold components to reduce initial JS execution
const SectionThree = dynamic(() => import('./SectionThree').then(mod => mod.SectionThree));
const SectionFour = dynamic(() => import('./SectionFour').then(mod => mod.SectionFour));
const FeedbackSection = dynamic(() => import('./FeedbackSection').then(mod => mod.FeedbackSection));
const Footer = dynamic(() => import('./Footer').then(mod => mod.Footer));

type LandingUser = {
  name: string | null;
  email: string | null;
  role: string | null;
  uuidBitunix: string | null;
};

function MemberStatus({ user, logoutSlot }: { user: LandingUser; logoutSlot: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = user.name || user.email || 'Member';
  const detail = user.uuidBitunix ? `UID ${user.uuidBitunix}` : user.role || 'Member';

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex min-w-0 items-center gap-3 rounded-full border px-3 py-2 text-left backdrop-blur-sm shadow-2xl transition hover:bg-white/10 ${isOpen ? 'border-[#B7FB5B]/40 bg-white/10' : 'border-white/10 bg-white/5'}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#B7FB5B] text-sm font-black text-[#111315]">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 pr-1 text-left" style={{ fontFamily: 'Chakra Petch, serif' }}>
          <p className="max-w-[150px] truncate text-sm font-bold text-white">{displayName}</p>
          <p className="max-w-[150px] truncate text-xs text-gray-400">{detail}</p>
        </div>
        <svg className={`size-4 shrink-0 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-[100] w-56 rounded-2xl border border-white/10 bg-[#15161b]/95 p-2 shadow-2xl backdrop-blur-xl"
          role="menu"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="truncate text-sm font-bold text-white">{displayName}</p>
            <p className="truncate text-xs text-gray-400">{detail}</p>
          </div>
          <div className="pt-2">{logoutSlot}</div>
        </div>
      )}
      </div>
      <Link
        href="/dashboard"
        className="flex h-11 items-center gap-2 rounded-full border border-[#B7FB5B]/30 bg-[#B7FB5B] px-5 text-sm font-bold text-[#111315] transition hover:bg-[#a8ec4c] hover:scale-105"
      >
        <span>Dashboard</span>
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </Link>
    </div>
  );
}

function GuestActions() {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto sm:justify-end">
      <div className="group relative inline-block">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#B7FB5B] to-green-500 opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
        <Link
          href="/register"
          className="relative flex min-h-11 items-center rounded-full border border-[#B7FB5B]/45 bg-[#111315]/70 px-5 text-sm font-semibold text-[#B7FB5B] transition-all duration-300 hover:border-[#B7FB5B] hover:bg-[#B7FB5B]/10 hover:text-white"
        >
          <span className="mr-2">Daftar Member</span>
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>

      <div className="group relative inline-block">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#B7FB5B] to-green-500 opacity-30 blur transition duration-500 group-hover:opacity-60"></div>
        <Link
          href="/login"
          className="relative flex min-h-11 items-center rounded-full border border-[#B7FB5B]/20 bg-[#B7FB5B] px-5 text-sm font-semibold text-[#111315] transition-all duration-300 hover:scale-105 hover:bg-[#a8ec4c]"
        >
          <span className="mr-2">Login Member</span>
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export function LandingPageClient({ user, logoutSlot }: { user: LandingUser | null; logoutSlot: ReactNode }) {
  const [showLoading, setShowLoading] = useState(true);
  const isLoggedIn = Boolean(user);

  return (
    <>
      {showLoading && <LoadingScreen onComplete={() => setShowLoading(false)} />}
      <div
        className={`min-h-screen text-white font-sans selection:bg-blue-500/30 overflow-hidden relative flex flex-col items-center transition-opacity duration-1000 ${showLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: 'linear-gradient(180deg, #23252A 0%, #111315 100%), #191919'
        }}
      >

        {/* Navbar / Header */}
        <nav className="relative z-[80] w-full max-w-[1600px] px-4 pt-8 pb-0 sm:px-6 md:px-8 lg:px-[40px]">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="hidden sm:block" />
          <div className="justify-self-center px-6 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo-dcms.svg"
                alt="DCMS Logo"
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="text-sm font-medium tracking-widest text-gray-400 uppercase" style={{ fontFamily: 'Nebulica, serif' }}>
                DCMS • Community
              </span>
            </div>
          </div>
            <div className="justify-self-center sm:justify-self-end">
              {user ? <MemberStatus user={user} logoutSlot={logoutSlot} /> : <GuestActions />}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 flex flex-col items-center flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[40px] mt-6 sm:mt-8 md:mt-[48px]">

          {/* Hero Card */}
          <div
            className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[800px] flex flex-col items-center rounded-xl sm:rounded-2xl md:rounded-[2rem] border border-[#333] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #23252A 0%, #111315 100%)'
            }}
          >
            {/* Internal Grid/Dot Pattern for Card */}
            <HeroPattern />

            {/* Text Content Wrapper */}
            <div className="relative z-10 flex-grow flex flex-col justify-center items-center pt-6 px-4 pb-2 sm:pt-8 sm:px-6 md:pt-12 md:px-12 lg:pt-20 lg:px-20 lg:pb-10 text-center">

              <h1
                className="font-nebulica text-5xl sm:text-7xl md:text-8xl lg:text-[100px] xl:text-[120px] font-bold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-600 leading-[1.1]"
                style={{ fontFamily: 'Nebulica, serif' }}
              >
                Diskusi Crypto<br />
                Micin Saham
              </h1>

              <p className="text-gray-400 text-lg sm:text-xl md:text-2xl lg:text-3xl font-light max-w-3xl leading-relaxed" style={{ fontFamily: 'Chakra Petch, serif' }}>
                Tempat para trader yang sadar risiko, ego dan realita market. Fokus pada proses, disiplin, dan bertahan lama.
              </p>

              {!isLoggedIn && (
              <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center">
                {/* Kenali Komunitas Dulu Button - Smooth Scroll */}
                <div className="group relative inline-block">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
                  <a
                    href="#community-section"
                    className="relative flex items-center bg-[#1A1C20] text-gray-200 px-8 py-3 rounded-full border border-white/10 hover:border-white/20 hover:text-white transition-all duration-300"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('community-section')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }}
                  >
                    <span className="mr-2 font-medium">Kenali Komunitasnya Dulu</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>

                {/* Join Sekarang Button - Discord Link */}
                <div className="group relative inline-block">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#B7FB5B] to-green-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                  <Link
                    href="https://discord.gg/dcms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center bg-[#B7FB5B] text-[#111315] px-8 py-3 rounded-full border border-[#B7FB5B]/20 hover:bg-[#a8ec4c] hover:scale-105 transition-all duration-300 font-semibold"
                  >
                    <span className="mr-2">Join Discord</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
              )}
            </div>

            {/* Trading Cards Section */}
            <div className="relative z-10 flex justify-center items-end md:grid md:grid-cols-3 gap-0 md:gap-6 w-full max-w-5xl px-0 md:px-4 -translate-y-8 md:translate-y-0">
              {/* Card 1 */}
              <div className="w-[25%] md:w-auto group relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:brightness-110 hover:border-brand-primary/50 cursor-pointer">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/trading-card-1.webp"
                    alt="Trading Signal 1"
                    fill
                    priority
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Card 2 */}
              <div className="w-[70%] md:w-auto group relative z-30 -ml-14 md:ml-0 md:-mt-8 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:brightness-110 hover:border-brand-primary/50 cursor-pointer">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/trading-card-2.webp"
                    alt="Trading Signal 2"
                    fill
                    priority
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Card 3 */}
              <div className="w-[25%] md:w-auto group relative z-10 -ml-14 md:ml-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:brightness-110 hover:border-brand-primary/50 cursor-pointer">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/trading-card-3.webp"
                    alt="Trading Signal 3"
                    fill
                    loading="lazy"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* <SectionTwo /> */}
          <SectionThree />
          <SectionFour />
          <FeedbackSection />


        </main>

        <Footer />
      </div>
    </>
  );
}
