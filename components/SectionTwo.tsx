import React from 'react';

const VibeCard = ({ title, subtitle, items, footer }: { title: string, subtitle: string, items: string[], footer: string }) => (
    <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-[2rem] p-8 md:p-12 border border-white/10 flex flex-col h-[450px]">
        <h3 className="font-nebulica text-2xl md:text-3xl font-bold mb-4 text-gray-100" style={{ fontFamily: 'Nebulica, serif' }}>
            {title}
        </h3>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 font-light">
            {subtitle}
        </p>

        <div className="flex flex-col gap-4 mb-8 flex-grow">
            {items.map((item, index) => (
                <div
                    key={index}
                    className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-full px-6 py-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
                >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <svg
                            viewBox="0 0 24 24"
                            className="w-5 h-5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <span className="text-gray-200 font-medium tracking-wide">
                        {item}
                    </span>
                </div>
            ))}
        </div>

        <div className="pt-6 border-t border-white/5">
            <p className="text-gray-500 text-xs md:text-sm uppercase tracking-widest font-medium">
                {footer}
            </p>
        </div>
    </div>
);

export const SectionTwo = () => {
    return (
        <section className="w-full max-w-[1600px] mx-auto py-6 pb-0">
            <div className="flex flex-col lg:flex-row gap-5 items-stretch w-full">

                <VibeCard
                    title="Mari Jujur Sebentar yang Akan Kamu Hadapi"
                    subtitle="Trading Futures itu keras, Bukan karena kamu bodoh, tapi karena market memang Brutal"
                    items={[
                        "FOMO",
                        "Overconfidence",
                        "Keputusan impulsif"
                    ]}
                    footer="Kami tidak menyangkal ini, Kami mulai dari sini"
                />

                <VibeCard
                    title="Komunitas ini tidak cocok untukmu..."
                    subtitle="Jika kamu masih mencari hal hal seperti di bawah, harusnya kamu intropeksi diri dulu deh"
                    items={[
                        "Cari Signal Instan",
                        "Tidak Mau terima Loss",
                        "Lempar tanggung jawab ke orang lain"
                    ]}
                    footer="Percaya deh, Perhatikan hal ini sebelum masuk"
                />
            </div>
        </section>
    );
};
