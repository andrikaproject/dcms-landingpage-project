'use client';

import React, { useState } from 'react';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackModal } from './FeedbackModal';

// Sample feedback data - kolom kiri
const leftColumnFeedbacks = [
    {
        memberSince: "Member Since, 2025",
        feedback: "September awal, Tahun 2025 di sini awalnya nya saya masuk di perkenalkan sama pak RT, sebelumnya saya cuma bermain saham dan obligasi trus saya di ajak balajar crypto sama teman seangkatan di kampus lalu balajarlah..",
        fullFeedback: "September awal, Tahun 2025 di sini awalnya nya saya masuk di perkenalkan sama pak RT, sebelumnya saya cuma bermain saham dan obligasi trus saya di ajak balajar crypto sama teman seangkatan di kampus lalu balajarlah daftar indodax dan binance awalnya main spot di sana lama2 kok temen memperlihatkan future yg begitu menggiurkan roi dan pnl yg bener2 menggiurkan akhirnya aku belajar dr dia pertama belajar mengenal pola candle dan jg karakteristik candle serta pada akhir di ajari bb dan memanfaatkan karakteristik candle lalu di ajari kombinasi berita dan market trend. . . Trus karena dia punya usaha banyak lalu group sepi hanya 3x seminggu ngasih wejangan. . . Trus akhirnya aku bertemu Pak RT ternyata main crypto jg trus di kenalkanlah bitunix yg keren dan komunitas  banyak ilmu jg buanyak semakin banyak ilmu dan kombinasi teknik yg di ajarkan di bitunix semakin membuat matang awalnya nyari koin sering salah dan salah entri bahkan kurang pas kadang minus dan plus yg bergantian tp semakin hari kematangan dalam berfikir mulai terasah dan mental semakin kebentuk",
        telegramId: "446634332279406592",
        username: "xsetsugax",
        displayName: "xsetsugax",
        profileImage: "/images/profiles/xsetsugax.jpg"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Kurang lebih setahun saya disini, dari awal grup di Telegram, semakin banyak perkembangan disini. Semakin banyak juga pengetahuan yg saya bisa ambil. Terimakasih banyak untuk para @Admin..",
        fullFeedback: "Kurang lebih setahun saya disini, dari awal grup di Telegram, semakin banyak perkembangan disini. Semakin banyak juga pengetahuan yg saya bisa ambil. Terimakasih banyak untuk para @Admin..",
        telegramId: "8938749347231906",
        username: "awlin.raf",
        displayName: "awlin.raf",
        profileImage: "/images/profiles/babaqia.png"
    },
    {
        memberSince: "Member Since, 2024",
        feedback: "Kurang lebih setahun saya disini, dan awal grup is Telegram, samaku kita belajar bersama berkembang disini. Semakan banyak ilpa pengetahuan yg saya bisa ambil rejeki/rezeki sejauh untuk para @Admin u...",
        telegramId: "3828049834082856",
        username: "Gandi_raf"
    },
    {
        memberSince: "Member Since, 2024",
        feedback: "Awal masuk DCMS kira gasan ingat di Bulan Februari atau Maret... Tau dari Telegram DCMS, sama telegram meme coin masuk ke Telegram DCMS, ya karna bersedia undian ke DC, Sn...",
        telegramId: "4667852477267951852",
        username: "Banduvc37"
    }
];

// Sample feedback data - kolom tengah
const centerColumnFeedbacks = [
    {
        memberSince: "Member Since, 2025",
        feedback: "Kenal grup ini, dari salah satu admin DCMS di grup seminar Crypto di mojokerto bukan juri saja di. Awalnya cuman free spot dia sama dengan selingkuh trus saya di ajak belajar crypto saminar ini, jadi dapat tertarik bermain fu...",
        telegramId: "12720819685356949716",
        username: "Hrisep"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Masuk dcms awal trus 2025, ingat bgt dulu trade sdr ngapapin list di thread sama di twitter dikelutin, kadang gua paling ya samangat diri itu, dan mau anjay disini hi...",
        telegramId: "9792778978585419",
        username: "sumiRD3"
    },
    {
        memberSince: "Member Since, 2024",
        feedback: "Awal masuk grup ini sejak jaman telanjang tahun kira Om ingat javier nuju es.mau cicipan Jadi demi semu aja upto samangat diri itu, dan mau anjay disini hi...",
        telegramId: "13260419532877267874",
        username: "Ingri_magnum86"
    },
    {
        memberSince: "Member Since, 2024",
        feedback: "Masuk Mei 2024 awalnya cuma jual member kecanggihan harapan ada guna cuma kue menjadi sendi rujimes. Di anjing, karna bersedia undian ke DC, Sn...",
        telegramId: "5586781411658565178",
        username: "superTas"
    }
];

// Sample feedback data - kolom kanan
const rightColumnFeedbacks = [
    {
        memberSince: "Member Since, 2025",
        feedback: "awal masuk dcms aku tau di sela kamera terarik mich dan inves threads sama di twitter dikelutin, kadang gua paling ya samangat diri itu, dan mau anjay disini hi... Awalnya ikur disiplin, masa iya ada grup belajar Kripto gratis tapi beneran mah ngg...",
        telegramId: "13337803426825595815",
        username: "nchenn03"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "awal sejak dcms serena pas lagi scroll threads lewat postingan besar di akamemua, dcms pun waktu itu dcms masih ada di tele saja ingat banget wakutu, awal saya ngliat call tanpa dian ri...",
        telegramId: "12430965349825162294",
        username: "mrsBlin_"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Mengulangerakan ism karna panjang di dasar dengan waktu yang dibutuhkan untuk analisis dcms trading sesuai dengan tantangan terbesar... Masa ingin calam adalah sama, saya tiga biru... di maksudny...",
        telegramId: "13298829035935959333",
        username: "veddiTULIB78"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Awalnya join DCMS benar-benar sebagai newbie di crypto. Banyak hal yang saya pelajari dari komunitas ini. Serum paham, pering mengajari, dan masih banyak lagi. Tapi dari itu justru jalan saya sega menjor bangkit, bukan cuma snar tek...",
        telegramId: "13287126042127876884",
        username: "mwanDada"
    }
];

export function FeedbackSection() {
    const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCardClick = (feedback: any) => {
        setSelectedFeedback(feedback);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedFeedback(null), 300);
    };

    return (
        <section className="w-full max-w-[1600px] mx-auto py-12 pb-0 relative overflow-hidden">
            {/* Header Section - Horizontal Layout */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12 pb-6 border-b border-gray-800">
                {/* Left: Logo & Label */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <img
                        src="/images/logo-dcms.svg"
                        alt="Logo DCMS"
                        loading="lazy"
                        className="w-10 h-10 object-cover"
                    />
                    <span
                        className="text-sm md:text-base font-bold text-white uppercase tracking-wider whitespace-nowrap"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        GALERI FEEDBACK KAMI
                    </span>
                </div>

                {/* Center: Main Title */}
                <div className="flex-grow text-left md:text-center">
                    <h2
                        className="text-2xl md:text-3xl lg:text-4xl font-bold text-white"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        Feedback Member Kami
                    </h2>
                </div>

                {/* Right: Description */}
                <div className="w-full md:max-w-xs flex-shrink-0">
                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed" style={{ fontFamily: 'Chakra Petch, serif' }}>
                        Feedback ini hasil dari member yang sudah bergabung dan berlanjutnya di DCMS
                    </p>
                </div>
            </div>

            {/* Scrolling Layout - 1 Column on Mobile, 3 Columns on Desktop */}
            <div className="relative h-[600px] overflow-hidden">
                {/* Mobile: Single Column - Scrolling Down */}
                <div className="md:hidden absolute left-0 right-0 h-full">
                    <div className="animate-scroll-down">
                        {[...leftColumnFeedbacks, ...centerColumnFeedbacks, ...rightColumnFeedbacks, ...leftColumnFeedbacks, ...centerColumnFeedbacks, ...rightColumnFeedbacks].map((feedback, index) => (
                            <FeedbackCard key={`mobile-${index}`} {...feedback} onClick={() => handleCardClick(feedback)} />
                        ))}
                    </div>
                </div>

                {/* Desktop: Left Column - Scrolling Up */}
                <div className="hidden md:block absolute left-0 w-[32%] h-full">
                    <div className="animate-scroll-up">
                        {[...leftColumnFeedbacks, ...leftColumnFeedbacks].map((feedback, index) => (
                            <FeedbackCard key={`left-${index}`} {...feedback} onClick={() => handleCardClick(feedback)} />
                        ))}
                    </div>
                </div>

                {/* Desktop: Center Column - Scrolling Down */}
                <div className="hidden md:block absolute left-[34%] w-[32%] h-full">
                    <div className="animate-scroll-down">
                        {[...centerColumnFeedbacks, ...centerColumnFeedbacks].map((feedback, index) => (
                            <FeedbackCard key={`center-${index}`} {...feedback} onClick={() => handleCardClick(feedback)} />
                        ))}
                    </div>
                </div>

                {/* Desktop: Right Column - Scrolling Up (same as left) */}
                <div className="hidden md:block absolute right-0 w-[32%] h-full">
                    <div className="animate-scroll-up">
                        {[...rightColumnFeedbacks, ...rightColumnFeedbacks].map((feedback, index) => (
                            <FeedbackCard key={`right-${index}`} {...feedback} onClick={() => handleCardClick(feedback)} />
                        ))}
                    </div>
                </div>

                {/* Bottom Gradient Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#111315] via-[#111315]/80 to-transparent pointer-events-none z-10" />
            </div>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes scroll-up {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(-50%);
                    }
                }

                @keyframes scroll-down {
                    0% {
                        transform: translateY(-50%);
                    }
                    100% {
                        transform: translateY(0);
                    }
                }

                @keyframes scroll-down-slow {
                    0% {
                        transform: translateY(-50%);
                    }
                    100% {
                        transform: translateY(0);
                    }
                }

                .animate-scroll-up {
                    animation: scroll-up 40s linear infinite;
                }

                .animate-scroll-up:hover {
                    animation-play-state: paused;
                }

                .animate-scroll-down {
                    animation: scroll-down 35s linear infinite;
                }

                .animate-scroll-down:hover {
                    animation-play-state: paused;
                }

                .animate-scroll-down-slow {
                    animation: scroll-down-slow 45s linear infinite;
                }

                .animate-scroll-down-slow:hover {
                    animation-play-state: paused;
                }
            `}</style>

            {/* Modal */}
            {selectedFeedback && (
                <FeedbackModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    memberSince={selectedFeedback.memberSince}
                    feedback={selectedFeedback.feedback}
                    fullFeedback={selectedFeedback.fullFeedback}
                    telegramId={selectedFeedback.telegramId}
                    username={selectedFeedback.username}
                    displayName={selectedFeedback.displayName || selectedFeedback.username}
                    profileImage={selectedFeedback.profileImage}
                />
            )}
        </section>
    );
}
