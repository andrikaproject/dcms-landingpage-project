'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { LandingHero } from './landing/LandingHero';
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

export function LandingPageClient({ user, logoutSlot }: { user: LandingUser | null; logoutSlot: ReactNode }) {
  const [showLoading, setShowLoading] = useState(true);

  return (
    <>
      {showLoading && <LoadingScreen onComplete={() => setShowLoading(false)} />}
      <div
        className={`min-h-screen text-white font-sans selection:bg-blue-500/30 overflow-hidden relative flex flex-col items-center transition-opacity duration-1000 ${showLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: '#08090b'
        }}
      >

        {/* Hero section */}
        <LandingHero user={user} logoutSlot={logoutSlot} />

        {/* Main Content */}
        <main className="relative z-10 flex flex-col items-center flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[40px] mt-6 sm:mt-8 md:mt-[48px]">

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
