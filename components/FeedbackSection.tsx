'use client';

import React, { useState } from 'react';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackModal } from './FeedbackModal';

// feedback data - kolom kiri
const leftColumnFeedbacks = [
    {
        memberSince: "Member Since, 2025",
        feedback: "September awal, Tahun 2025 di sini awalnya nya saya masuk di perkenalkan sama pak RT, sebelumnya saya cuma bermain saham dan obligasi trus saya di ajak balajar crypto sama teman seangkatan di kampus lalu balajarlah..",
        fullFeedback: "September awal, Tahun 2025 di sini awalnya nya saya masuk di perkenalkan sama pak RT, sebelumnya saya cuma bermain saham dan obligasi trus saya di ajak balajar crypto sama teman seangkatan di kampus lalu balajarlah daftar indodax dan binance awalnya main spot di sana lama2 kok temen memperlihatkan future yg begitu menggiurkan roi dan pnl yg bener2 menggiurkan akhirnya aku belajar dr dia pertama belajar mengenal pola candle dan jg karakteristik candle serta pada akhir di ajari bb dan memanfaatkan karakteristik candle lalu di ajari kombinasi berita dan market trend. . . Trus karena dia punya usaha banyak lalu group sepi hanya 3x seminggu ngasih wejangan. . . Trus akhirnya aku bertemu Pak RT ternyata main crypto jg trus di kenalkanlah bitunix yg keren dan komunitas  banyak ilmu jg buanyak semakin banyak ilmu dan kombinasi teknik yg di ajarkan di bitunix semakin membuat matang awalnya nyari koin sering salah dan salah entri bahkan kurang pas kadang minus dan plus yg bergantian tp semakin hari kematangan dalam berfikir mulai terasah dan mental semakin kebentuk",
        discordId: "446634332279406592",
        username: "xsetsugax",
        displayName: "xsetsugax",
        profileImage: "/images/profiles/xsetsugax.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Kurang lebih setahun saya disini, dari awal grup di Telegram, semakin banyak perkembangan disini. Semakin banyak juga pengetahuan yg saya bisa ambil. Terimakasih banyak untuk para @Admin..",
        fullFeedback: "Kurang lebih setahun saya disini, dari awal grup di Telegram, semakin banyak perkembangan disini. Semakin banyak juga pengetahuan yg saya bisa ambil. Terimakasih banyak untuk para @Admin..",
        discordId: "8938749347231906",
        username: "awlin.raf",
        displayName: "awlin.raf",
        profileImage: "/images/profiles/babaqia.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Sebelum tutup buku tahun 2025. jujur aja 2025 tahun pertama di crypto, dan jujur tahun terberat juga karena beberapa kali kena manipulasi trump tarif, iran war, trump vs elon, great reset oktober...",
        fullFeedback: "Sebelum tutup buku tahun 2025. jujur aja 2025 tahun pertama di crypto, dan jujur tahun terberat juga karena beberapa kali kena manipulasi trump tarif, iran war, trump vs elon, great reset oktober. bear bias akhir tahun.   tapi dengan ketemu dcms, rasanya jadi lebih ringan dan ada arah untuk bangkit karena di komunitas bisa ketemu banyak hal gak cuma sinyal, karena sinyal bisa dicari, yang terpenting disini bisa haha hihi, bismillah terimagaji dcms.  menuju 2026 comeback stronger, aamiin bismillah",
        discordId: "1343534802443304982",
        username: "endlesswindfall",
        displayName: "Endlesswindfall",
        profileImage: "/images/profiles/endlesswindfall.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Sebelum 2025 berakhir, awal masuk DCMS itu cuma karena lihat thread Om Bagus di Threads, sekitar tanggal 9 April 2025. Awalnya jujur skeptis—masa iya ada grup belajar kripto gratis tapi beneran niat ngajarin....",
        fullFeedback: "Sebelum 2025 berakhir, awal masuk DCMS itu cuma karena lihat thread Om Bagus di Threads, sekitar tanggal 9 April 2025. Awalnya jujur skeptis—masa iya ada grup belajar kripto gratis tapi beneran niat ngajarin. Akhirnya coba join dan deposit kecil dulu, cuma $10. Alhamdulillah, dari situ saya berhasil ngerasain $100 pertama saya dari trading 😌—itu momen yang bikin percaya kalau ini bukan omong kosong. Sempat WD sebagian, sisanya ya… dibantai market 🤧🤣 Tapi justru dari situ gue belajar: soal risk management, mental, dan pentingnya proses, bukan cuma hasil. Overall, DCMS bukan tempat janji cuan instan, tapi tempat belajar yang real, jujur, dan ngebentuk mindset trader. Worth it buat yang beneran mau belajar dari nol.",
        discordId: "893874143471231056",
        username: "saputraaarezzaa",
        displayName: "FortunaAdiuvat",
        profileImage: "/images/profiles/saputraaarezzaa.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "masuk abis flash sale 10.10 , panik baru aja naro di BTC udah anjlok. nemu iklan dcms di ig langsung join dc nya.  banyak banget ilmu yg saya dapet dari sini mulai dari TA, MM, metode growth 50% pak....",
        fullFeedback: "masuk abis flash sale 10.10 , panik baru aja naro di BTC udah anjlok. nemu iklan dcms di ig langsung join dc nya.  banyak banget ilmu yg saya dapet dari sini mulai dari TA, MM, metode growth 50% pak @BoundlessLuck , metode follow sentimen nya @pctinfus ,  metode “iseng” nya kaisar @Laksamana_Zacx-Corp , sama per memean @BabaQia :v. walaupun belum bisa nutupin minus spot, alhamdulillah nya udah growth dari modal awal .  growth terus ya DCMS buat para admin semangat teruss buat kembangin dcms, bukan admin aja tapi kita semua yg kembangin @everyone   love you all",
        discordId: "1402124106136293437",
        username: "davydxbc_",
        displayName: "xbcdv",
        profileImage: "/images/profiles/davydxbc_.webp"
    },

];

// feedback data - kolom tengah
const centerColumnFeedbacks = [
    {
        memberSince: "Member Since, 2025",
        feedback: "Awal masuk DCMS klo g salah ingat di Bulan Februari atau Maret..  Tau dari Threadsnya Mbah Juru Kunci @Laksamana_Zacx-Corp posting meme coin, masuklah ke Telegram DCMS, g lama berselang pindah ke DC.  Singkat cerita di DCMS banyak banget yang saya dapatkan, mental saya sehat lagi, berani trade.....",
        fullFeedback: "Awal masuk DCMS klo g salah ingat di Bulan Februari atau Maret..  Tau dari Threadsnya Mbah Juru Kunci @Laksamana_Zacx-Corp posting meme coin, masuklah ke Telegram DCMS, g lama berselang pindah ke DC.  Singkat cerita di DCMS banyak banget yang saya dapatkan, mental saya sehat lagi, berani trade lagi dan yang paling utama itu Komunitas di DCMS ini udah berasa kek keluarga dan jangan lupa ( G R A T I S), tapi berasa V AI PI .  Terimakasih banyak Ketua @Admin , dan para Suhu badge merah, kuning maupun ijo yang tidak pernah cape dan lelah berbagi ilmu kepada kami para musang ..  Sehat-sehat selalu kalian semua, dan tidak lupa terimakasih kak @afk Yasmin dengan BITUNIX nya yang sudah banyak kasih bonus ..",
        discordId: "466785247774769152",
        username: "antonnino77",
        displayName: "SionEgis",
        profileImage: "/images/profiles/antonnino77.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Masuk dcms awal taun 2025, inget bgt dulu trade serampangan liat di thread sama di twitter diikutin, kadang loss kadang ya profit....",
        fullFeedback: "Masuk dcms awal taun 2025, inget bgt dulu trade serampangan liat di thread sama di twitter diikutin, kadang loss kadang ya profit, tapi disini bener bener diajarin semuanya dari 0, dan sinyal sinyal disini bisa dibilang ajaib, aku selalu inget kata kata suhu disini yaitu jangan tamak tp seperlunya",
        discordId: "713720775978385419",
        username: "tukimin05",
        displayName: "tukimin05",
        profileImage: "/images/profiles/tukimin05.webp"
    },
    {
        memberSince: "Member Since, 2024",
        feedback: "Awal masuk grup ini sejak jaman tele,lupa tahun brp. Cm ingat owner-nya sampai diculik...",
        fullFeedback: "Awal masuk grup ini sejak jaman tele,lupa tahun brp. Cm ingat owner-nya sampai diculik dari grup tele Dari awal kenal crypto cm di spot kena fomo korban YouTube sampai minus trs, Alhamdulillah ketemu grup ini bs tau future & dapat ilmu screning meski msh pas²an dibanding yg lain.....",
        discordId: "1326901593823772674",
        username: "sego_megono98",
        displayName: "MEE GOO NO",
        profileImage: "/images/profiles/sego_megono98.webp"
    },
    {
        memberSince: "Member Since, 2024",
        feedback: "awal masuk dcms aku tuh di tele karena tertarik micin dan lihat threads juga sih tapi awal awal jadi sider aja dan nanyak soal cara main micin habis itu jadi sider yang jawab kemarin pak andrika inget bet aku typing dia kalok ada member kelihatan baru nanyak wkwk ternyata pindah ke DC join juga...",
        fullFeedback: "awal masuk dcms aku tuh di tele karena tertarik micin dan lihat threads juga sih tapi awal awal jadi sider aja dan nanyak soal cara main micin habis itu jadi sider yang jawab kemarin pak andrika inget bet aku typing dia kalok ada member kelihatan baru nanyak wkwk ternyata pindah ke DC join juga lah jadi sider juga eh pas ada peraturan gak boleh numpang tidur disini kalok bulan ini level gak naik bakal didepak :v yang biasanya aku ikut grup emang hobi jadi sider dipaksa berbaur :v...",
        discordId: "1333799326492659815",
        username: "acheron03",
        displayName: "Acheron",
        profileImage: "/images/profiles/acheron03.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Awal join DCMS karena ketemu FYP TikTok dan langsung masuk. Saya disini masih member baru. Awalnya saya kira grup free biasa aja, ternyata kualitasnya setara grup berbayar mahal. Admin dan membernya aktif serta responsif...",
        fullFeedback: "Awal join DCMS karena ketemu FYP TikTok dan langsung masuk. Saya disini masih member baru. Awalnya saya kira grup free biasa aja, ternyata kualitasnya setara grup berbayar mahal. Admin dan membernya aktif serta responsif. Walaupun membernya 1k+ menurutku grup ini termasuk aktif. Semoga ke depannya DCMS makin berkembang",
        discordId: "1108352346766966905",
        username: "tyxpicas",
        displayName: "NotPicas",
        profileImage: "/images/profiles/tyxpicas.webp"
    }
];

// feedback data - kolom kanan
const rightColumnFeedbacks = [
    {
        memberSince: "Member Since, 2025",
        feedback: "awal kenal dcms karena pas lagi scroll threads lewat postingan kaisar @Laksamana_Zacx-Corp dan waktu itu dcms masih ada di tele saya inget banget wkwkwk. awal awal ngikut call terus dari om bagus terus pelan pelan belajar buat analisa sendiri.. inget banget baca buku micin karyanya om...",
        fullFeedback: "awal kenal dcms karena pas lagi scroll threads lewat postingan kaisar @Laksamana_Zacx-Corp dan waktu itu dcms masih ada di tele saya inget banget wkwkwk. awal awal ngikut call terus dari om bagus terus pelan pelan belajar buat analisa sendiri.. inget banget baca buku micin karyanya om bagus waktu itu saya dikenalin ke dex screener, pumpfun, trojan, dsb pokonya dapet banyak ilmu web3 dari dcms ini. terus saya jarang on tele dan liat lagi postingan mbah @Laksamana_Zacx-Corp eh dcms pindah ke discord akhirnya join dan sampe sekarang terus bertumbuh belajar diajarin pak dosen @BoundlessLuck ko @Lucky Steven om @iAndrikaReeback dan masih banyak lagi suhu yang gabisa saya tag. sukses terus buat dcms terus kasih ilmu ilmu gratis tapi kualitas jutaan...",
        discordId: "1243095314949210204",
        username: "mrsliin_",
        displayName: "0xArdiiw",
        profileImage: "/images/profiles/mrsliin_.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Bismillahirrahmanirrahim Kurang lebih 2 hari saya bergabung disini..  Menyeimbangkan jam kerja panjang di dapur dengan waktu yang dibutuhkan untuk analisis pasar dan eksekusi trading adalah tantangan terbesar .   Maka insight disini adalah koenci segitiga biru.. eh maksudnya...",
        fullFeedback: "Bismillahirrahmanirrahim Kurang lebih 2 hari saya bergabung disini..  Menyeimbangkan jam kerja panjang di dapur dengan waktu yang dibutuhkan untuk analisis pasar dan eksekusi trading adalah tantangan terbesar .   Maka insight disini adalah koenci segitiga biru.. eh maksudnya koenci dapat 100u pertama  .   semoga ilmu para guru guru disini bermanfaat bagi semuanya. Terimakasih banyak...",
        discordId: "1321887603519393833",
        username: "ruddi0110_11916",
        displayName: "ruddi0110_11916",
        profileImage: "/images/profiles/ruddi0110_11916.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Awalnya join DCMS benar-benar sebagai newbie di dunia crypto. Banyak hal yang belum paham, sering bingung, dan masih coba-coba. Tapi dari sini justru pelan-pelan saya belajar banyak, bukan cuma soal teknikal, tapi juga mindset, manajemen risiko, dan kedisiplinan...",
        fullFeedback: "Awalnya join DCMS benar-benar sebagai newbie di dunia crypto. Banyak hal yang belum paham, sering bingung, dan masih coba-coba. Tapi dari sini justru pelan-pelan saya belajar banyak, bukan cuma soal teknikal, tapi juga mindset, manajemen risiko, dan kedisiplinan. Cuma disini saya bisa tanya2 tanpa takut, dan para mastah mau menjawab dengan sabar.  Tidak terasa hampir setahun kebersamaan di keluarga besar DCMS. Banyak suka duka yang dilalui bareng. Mulai dari zonk garap airdrop, salah entry, sampai akhirnya bisa lebih konsisten profit di futures berkat sharing dan bimbingan dari para admin dan mastah di sini.  Terima kasih untuk admin dan seluruh member DCMS atas ilmunya, sharing-nya, dan suasana komunitas yang suportif. Semoga DCMS semakin solid, makin banyak member yang bertumbuh, dan kita semua bisa terus cuan dengan sehat dan berkelanjutan....",
        discordId: "1328712042147876884",
        username: "awan2608",
        displayName: "mPetanibiji",
        profileImage: "/images/profiles/awan2608.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Awal masuk grup DC ini dari @Laksamana_Zacx-Corp , jauh sebelum join DC saya sering liat outlook di  thread kaisar sliweran di beranda, alhasil follow, dan penasaran juga tentang future ini, awal2 masih nonton aja ( kaisar kasih outlook di Thread,saya liat di....",
        fullFeedback: "Awal masuk grup DC ini dari @Laksamana_Zacx-Corp , jauh sebelum join DC saya sering liat outlook di  thread kaisar sliweran di beranda, alhasil follow, dan penasaran juga tentang future ini, awal2 masih nonton aja ( kaisar kasih outlook di Thread,saya liat di chart binen) dalam hati2 ini orang sering bener kasih outlook2 karena penasaran baca2 lah soal future,  selang beberapa hari kaisar share link grup DC , langsung join tapi saya gag aktif bukak DC karena belum terbiasa pakai DC, alhasil di kick dari grup DC , outlook kaisar sliweran lagi di Thread, join DC lagi dan akfif sampai sekarang, Alhamdulillah banyak ilmu yang di dapat,dari cara entry yang tepat,management margin,penggunaan lev,penggunaan indikator,ada ebook tentang future lengkap, sampai take profit, tapi sampai sekarang belum bisa pasang SL+  , tapi jujur karena saya benar pemula di dunia future ini ,saya masih minus   bukan karena teman disini, tapi karena saya sendiri, alhasil 2x mc yg menurutku nominal lumayan, tapi karena itu saya jadi koreksi diri dan belajar lagi, kek mana ini pagi-siang profit 700k,malam propit ilang kadang minus pelajari lagi metode Coumponding dari pak rektor, oke pelan jalan sampai Trade ke 7 , gagal ,emosi ,balas dendam ke market, balik lagi ke trade 1   oke metode compounding ini menurutku bagus, jeleknya disaya misal 2x trade per hari berhasil,tangan gatel pengen entry lagi,alhasil gagal lagi,  dan mulai bulan Desember ini saya sedang mencoba  metode swing yg di ajarkan kaisar, margin mini lev gede , cocok untuk saya,bisa buat terapi kesabaran dan mental, Tapi apapun metodenya itu baik dan bagus di orang yang pas,  trimakasih untuk semua teman DCMS sudah kasih ilmu tentang future ini, semoga semakin lama di grup ini semakin cuan juga kita bersama, Berkah selalu untuk teman dan master disini yang selau memberikan ilmu dan mengingatkan kita yang tolol ini....",
        discordId: "581968289748746251",
        username: "faishalwae",
        displayName: "faishalwae",
        profileImage: "/images/profiles/faishalwae.webp"
    },
    {
        memberSince: "Member Since, 2025",
        feedback: "Kenal grup ini, dari salah satu admin DCMS  di grup seminar crypto di mojokerto bulan juni tahun ini. Awalnya cuman main spot aja, cuma beliau sering share otl di grup seminar itu, jadi sedikit tertarik bermain future...",
        fullFeedback: "Kenal grup ini, dari salah satu admin DCMS  di grup seminar crypto di mojokerto bulan juni tahun ini. Awalnya cuman main spot aja, cuma beliau sering share otl di grup seminar itu, jadi sedikit tertarik bermain future. sama beliau di arahkan buat download aplikasi bitunix dlu, baru nanti di masukkan di discord. tanpa berlama lama, akhirnya download aplikasinya di playstore, walaupun KYCnya cukup lama. Akhirnya akun pertama bitunix saya berhasil dibuat, dan sama beliau di undang ke discord ini. Setelah masuk discord, ternyata akun pertama saya tanpa kode reff dr DCMS, sehingga terbatas akses di discordnya . Setelah beberapa kali ikut livenya dan orang orang yg ada disini pada nggak pelit berbagi ilmunya semakin tertarik buat explore di DCMS ini. Akhirnya, pinjam data orang biar bisa pake kode DCMS buat explore semuanya. Alhamdulillah, berkat ilmu dari sini. Bisa nambah uang jajan.  Sangkyuuu DCMS",
        discordId: "1370010868355694715",
        username: "hasiep",
        displayName: "Hasiep",
        profileImage: "/images/profiles/hasiep.webp"
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12 pb-6">
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
                    discordId={selectedFeedback.discordId}
                    username={selectedFeedback.username}
                    displayName={selectedFeedback.displayName || selectedFeedback.username}
                    profileImage={selectedFeedback.profileImage}
                />
            )}
        </section>
    );
}
