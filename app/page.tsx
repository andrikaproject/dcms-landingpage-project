import Link from 'next/link';
import Image from 'next/image';
import { HeroPattern } from '../components/HeroPattern';
import { SectionTwo } from '../components/SectionTwo';
import { SectionThree } from '../components/SectionThree';
import { SectionFour } from '../components/SectionFour';


export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white font-sans selection:bg-blue-500/30 overflow-hidden relative flex flex-col items-center"
      style={{
        background: 'linear-gradient(180deg, #23252A 0%, #111315 100%), #191919'
      }}
    >

      {/* Navbar / Header */}
      <nav className="relative z-10 pt-8 pb-0">
        <div className="px-6 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm shadow-2xl">
          <span className="text-sm font-medium tracking-widest text-gray-400 uppercase">
            DCMS • Community
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center flex-grow w-full max-w-[1600px] mx-auto px-[40px] mt-[48px]">

        {/* Hero Card */}
        <div
          className="relative w-full h-[800px] flex flex-col items-center rounded-[2rem] border border-[#333] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #23252A 0%, #111315 100%)'
          }}
        >
          {/* Internal Grid/Dot Pattern for Card */}
          <HeroPattern />

          {/* Text Content Wrapper */}
          <div className="relative z-10 flex-grow flex flex-col justify-center items-center pt-12 px-6 pb-2 md:pt-20 md:px-20 md:pb-10 text-center">

            <h1
              className="font-nebulica text-5xl sm:text-7xl md:text-8xl lg:text-[100px] xl:text-[120px] font-bold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-600 leading-[1.1]"
              style={{ fontFamily: 'Nebulica, serif' }}
            >
              Diskusi Crypto<br />
              Micin Saham
            </h1>

            <p className="text-gray-400 text-lg sm:text-xl md:text-2xl lg:text-3xl font-light max-w-3xl leading-relaxed">
              Tempat para trader yang sadar risiko, ego dan realita market. Fokus pada proses, disiplin, dan bertahan lama.
            </p>

            {/* CTA Button (Optional based on image, but kept for UX) */}
            <div className="mt-12 group relative inline-block">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
              <Link
                href="/register"
                className="relative flex items-center bg-[#1A1C20] text-gray-200 px-8 py-3 rounded-full border border-white/10 hover:border-white/20 hover:text-white transition-all duration-300"
              >
                <span className="mr-2 font-medium">Kenali Komunitasnya Dulu</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Trading Cards Section */}
          <div className="relative z-10 flex justify-center items-end md:grid md:grid-cols-3 gap-0 md:gap-6 w-full max-w-5xl px-0 md:px-4 -translate-y-8 md:translate-y-0">
            {/* Card 1 */}
            <div className="w-[25%] md:w-auto group relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:brightness-110 hover:border-brand-primary/50 cursor-pointer">
              <div className="aspect-[4/3] relative">
                <Image
                  src="/images/trading-card-1.jpg"
                  alt="Trading Signal 1"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Card 2 */}
            <div className="w-[70%] md:w-auto group relative z-30 -ml-14 md:ml-0 md:-mt-8 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:brightness-110 hover:border-brand-primary/50 cursor-pointer">
              <div className="aspect-[4/3] relative">
                <Image
                  src="/images/trading-card-2.jpg"
                  alt="Trading Signal 2"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Card 3 */}
            <div className="w-[25%] md:w-auto group relative z-10 -ml-14 md:ml-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:brightness-110 hover:border-brand-primary/50 cursor-pointer">
              <div className="aspect-[4/3] relative">
                <Image
                  src="/images/trading-card-3.png"
                  alt="Trading Signal 3"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        <SectionTwo />
        <SectionThree />
        <SectionFour />


      </main>

      {/* Footer / Bottom Label */}
      <footer className="py-8 text-center pointer-events-none">
        <p className="text-[10px] md:text-xs text-gray-600 uppercase tracking-[0.2em] font-medium">
          Decentralized Community Management System
        </p>
      </footer>
    </div>
  );
}