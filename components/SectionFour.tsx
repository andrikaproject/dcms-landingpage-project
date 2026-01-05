import React from 'react';
import { GalleryCard } from './GalleryCard';

export function SectionFour() {
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
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                    />

                    {/* Label */}
                    <span
                        className="text-sm md:text-base font-bold text-white uppercase tracking-wider whitespace-nowrap"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        GALERI FLEXING KAMI
                    </span>
                </div>

                {/* Center - Main Title */}
                <div className="md:flex-grow text-left md:text-center w-full md:w-auto">
                    <h2
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        Dari Member Untuk Member
                    </h2>
                </div>

                {/* Right Side - Description */}
                <div className="w-full md:max-w-xs md:flex-shrink-0">
                    <p className="text-gray-400 text-xs md:text-sm leading-relaxed text-left">
                        Semua Galeri PnL ini di dapatkan dari member yang mau berusaha sendiri dan menerapkan hasil ilmu yang di dapat dari group DCMS
                    </p>
                </div>
            </div>

            {/* Gallery Grid - Menggunakan GalleryCard Component dengan style macOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1 - Short */}
                <GalleryCard
                    label="Short"
                // image="/images/gallery-1.jpg" // Uncomment dan ganti dengan path gambar Anda
                />

                {/* Card 2 - Long */}
                <GalleryCard
                    label="Long"
                // image="/images/gallery-2.jpg"
                />

                {/* Card 3 - Short */}
                <GalleryCard
                    label="Short"
                // image="/images/gallery-3.jpg"
                />

                {/* Card 4 - Long */}
                <GalleryCard
                    label="Long"
                // image="/images/gallery-4.jpg"
                />

                {/* Card 5 - Short */}
                <GalleryCard
                    label="Short"
                // image="/images/gallery-5.jpg"
                />

                {/* Card 6 - Long */}
                <GalleryCard
                    label="Long"
                // image="/images/gallery-6.jpg"
                />
            </div>
        </section>
    );
}
