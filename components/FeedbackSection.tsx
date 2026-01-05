import React from 'react';
import { FeedbackCard } from './FeedbackCard';

export function FeedbackSection() {
    return (
        <section className="w-full max-w-[1600px] mx-auto py-12 pb-0">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-12 gap-6">
                {/* Left Side - Logo & Label */}
                <div className="flex items-center gap-4 flex-shrink-0 justify-start">
                    {/* Logo Icon */}
                    <img
                        src="/images/logo-dcms.svg"
                        alt="Logo DCMS"
                        loading="lazy"
                        className="w-12 h-12 object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                    />

                    {/* Label */}
                    <span
                        className="text-sm md:text-base font-bold text-white uppercase tracking-wider whitespace-nowrap"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        TESTIMONI MEMBER
                    </span>
                </div>

                {/* Center - Main Title */}
                <div className="md:flex-grow text-left md:text-center w-full md:w-auto">
                    <h2
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        Apa Kata Mereka?
                    </h2>
                </div>

                {/* Right Side - Description */}
                <div className="w-full md:max-w-xs md:flex-shrink-0">
                    <p className="text-gray-400 text-xs md:text-sm leading-relaxed text-left">
                        Dengarkan pengalaman nyata dari member DCMS yang telah merasakan transformasi dalam trading mereka
                    </p>
                </div>
            </div>

            {/* Feedback Grid - 3 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Feedback Card 1 */}
                <FeedbackCard
                    name="Budi Santoso"
                    role="Full-time Trader"
                    avatar="/images/avatar-1.jpg"
                    rating={5}
                    feedback="DCMS benar-benar mengubah cara saya trading. Dari yang awalnya loss terus, sekarang sudah konsisten profit. Mentornya sangat membantu dan komunitasnya solid!"
                />

                {/* Feedback Card 2 */}
                <FeedbackCard
                    name="Siti Rahmawati"
                    role="Part-time Trader"
                    avatar="/images/avatar-2.jpg"
                    rating={5}
                    feedback="Sebagai pemula, saya sangat terbantu dengan materi yang diberikan. Sistemnya jelas, mudah dipahami, dan yang paling penting hasilnya terlihat nyata di akun saya."
                />

                {/* Feedback Card 3 */}
                <FeedbackCard
                    name="Ahmad Fauzi"
                    role="Swing Trader"
                    avatar="/images/avatar-3.jpg"
                    rating={5}
                    feedback="Komunitas DCMS sangat supportive. Setiap pertanyaan selalu dijawab dengan detail. Ilmu yang dibagikan juga up-to-date dengan kondisi market terkini."
                />

                {/* Feedback Card 4 */}
                <FeedbackCard
                    name="Dewi Lestari"
                    role="Day Trader"
                    avatar="/images/avatar-4.jpg"
                    rating={5}
                    feedback="Risk management yang diajarkan di DCMS sangat membantu saya menjaga akun tetap aman. Sekarang saya lebih percaya diri dalam mengambil keputusan trading."
                />

                {/* Feedback Card 5 */}
                <FeedbackCard
                    name="Rudi Hartono"
                    role="Scalper"
                    avatar="/images/avatar-5.jpg"
                    rating={5}
                    feedback="Strategi yang diajarkan simple tapi powerful. Tidak perlu ribet dengan banyak indikator. Focus pada price action dan hasilnya luar biasa!"
                />

                {/* Feedback Card 6 */}
                <FeedbackCard
                    name="Linda Wijaya"
                    role="Investor"
                    avatar="/images/avatar-6.jpg"
                    rating={5}
                    feedback="Bergabung dengan DCMS adalah keputusan terbaik tahun ini. Dari yang tadinya ragu-ragu, sekarang sudah bisa trading dengan confidence dan profit konsisten."
                />
            </div>
        </section>
    );
}
