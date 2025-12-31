import React from 'react';

import { Button } from "@/components/Button"; // Sesuaikan path jika perlu

export function SectionThree() {
    return (
        <section className="py-12 bg-brand-dark ">
            <div className="w-full max-w-[1600px] mx-auto py-6 pb-0">
                {/* Header Section */}
                <div className="mb-12">
                    <span className="bg-[#B7FB5B]/10 text-[#B7FB5B] px-6  py-2.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Nebulica, serif' }}>
                        Key Features
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-2 text-white" style={{ fontFamily: 'Nebulica, serif' }}>
                        Apa yang Terjadi di Dalam <br /> Sebuah Komunitas?
                    </h2>
                    <p className="text-gray-400">Aktif itu pilihan, Mengamati juga valid</p>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Card 1: Arahan Market */}
                    <div className="rounded-3xl p-6 flex flex-col justify-between overflow-hidden group" style={{ background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(54, 54, 54, 0.43)' }}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Nebulica, serif' }}>Memberikan Arahan market</h3>
                                <div className="bg-brand-secondary p-2 rounded-full -rotate-45 group-hover:rotate-0 transition-transform">
                                    <ArrowIcon />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-6">
                                Kita juga berdiskusi banyak terkait arah market seperti apa, bagaimana arah market kedepannya lewat Live bareng Admin-admin.
                            </p>
                        </div>
                        <div className="mt-2 -mb-42 -mx-6 relative group-hover:scale-[1.02] transition-transform duration-500 px-[24px]">
                            <div className="aspect-[4/3] rounded-t-xl overflow-hidden border-t border-x border-gray-700 bg-gray-900/50">
                                <img
                                    src="/images/insight01.png"
                                    alt="Market Analysis"
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Sinyal (Tinggi) */}
                    <div className="rounded-3xl p-6 flex flex-col justify-between overflow-hidden group row-span-2" style={{ background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(54, 54, 54, 0.43)' }}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Nebulica, serif' }}>Sinyal? Kita juga punya</h3>
                                <div className="bg-brand-secondary p-2 rounded-full -rotate-45 group-hover:rotate-0 transition-transform">
                                    <ArrowIcon />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-6" >
                                Sinyal Futures? Saham? Ada dong. Kita juga memiliki beberapa segment terkait pandangan market, tentunya semua ini FREE. Segala arahan ini bukan sebagai ajakan harus membeli!!
                            </p>
                        </div>
                        <div className="mt-2 -mb-12 -mx-6 relative group-hover:scale-[1.02] transition-transform duration-500 px-[24px]">
                            <div className="aspect-[4/3] rounded-t-xl overflow-hidden border-t border-x border-gray-700 bg-gray-900/50">
                                <img
                                    src="/images/insight02.png"
                                    alt="Market Analysis"
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden group md:row-span-2" style={{ background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(54, 54, 54, 0.43)' }}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Nebulica, serif' }}>Memberikan Insight </h3>
                                <div className="bg-brand-secondary p-2 rounded-full -rotate-45 group-hover:rotate-0 transition-transform flex-shrink-0">
                                    <ArrowIcon />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm md:text-base mb-6 leading-relaxed" >
                                Dimana ada sebuah group, member pasti ada yang memberikan insight untuk tumbuh kembang bersama yang lebih baik
                            </p>
                        </div>
                        <div className="mt-2 -mb-6 md:-mb-12 -mx-6 relative group-hover:scale-[1.02] transition-transform duration-500 px-[24px]">
                            <img src="/images/insight03.png" alt="Signal Group" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                        </div>
                    </div>

                    {/* Card 3: Insight */}
                    <div className="rounded-3xl p-6 flex flex-col justify-between overflow-hidden group" style={{ background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(54, 54, 54, 0.43)' }}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Nebulica, serif' }}>Tips & Trick, FREE</h3>
                                <div className="bg-brand-secondary p-2 rounded-full -rotate-45 group-hover:rotate-0 transition-transform">
                                    <ArrowIcon />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-6">
                                Selama kamu menyimak isi group, otomatis kamu juga akan mendapatkan berbagai insight yang berbobot, tentunya di group ini dan Free, dan selalu kami PIN terkait insight menarik.
                            </p>
                        </div>
                        <div className="relative flex-grow mt-4 md:mt-20 flex justify-center items-end min-h-[220px] md:min-h-[100px]">
                            {/* Left Image */}
                            <div className="absolute left-[5%] md:left-[10%] bottom-0 w-[70%] md:w-[35%] z-20 transform -translate-x-4 md:-translate-x-12 translate-y-4 md:translate-y-8 rotate-[-5deg] group-hover:rotate-0 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-700 ease-out">
                                <img
                                    src="/images/insight04-01.png"
                                    alt="Insight Tip 1"
                                    className="rounded-[1.5rem] border border-white/10 shadow-2xl w-full h-auto opacity-90 group-hover:opacity-100"
                                />
                            </div>

                            {/* Middle Image */}
                            <div className="absolute left-1/2 bottom-0 w-[70%] md:w-[35%] z-30 transform -translate-x-1/2 translate-y-8 md:translate-y-16 group-hover:translate-y-0 transition-all duration-700 ease-out delay-75">
                                <img
                                    src="/images/insight04-02.png"
                                    alt="Insight Tip 2"
                                    className="rounded-[1.5rem] border border-white/10 shadow-2xl w-full h-auto"
                                />
                            </div>

                            {/* Right Image */}
                            <div className="absolute right-[5%] md:right-[10%] bottom-0 w-[70%] md:w-[35%] z-20 transform translate-x-4 md:translate-x-12 translate-y-4 md:translate-y-8 rotate-[5deg] group-hover:rotate-0 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-700 ease-out">
                                <img
                                    src="/images/insight04-03.png"
                                    alt="Insight Tip 3"
                                    className="rounded-[1.5rem] border border-white/10 shadow-2xl w-full h-auto opacity-90 group-hover:opacity-100"
                                />
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </section>
    );
}

// Komponen Icon Panah Sederhana
function ArrowIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="black" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
    );
}

