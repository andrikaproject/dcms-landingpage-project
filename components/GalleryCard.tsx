import React from 'react';
import Image, { StaticImageData } from 'next/image';

// Interface untuk props GalleryCard dengan style macOS
interface GalleryCardProps {
    image?: string | StaticImageData; // Path ke gambar (optional, akan gunakan placeholder jika kosong)
    label?: string; // Label di pojok kanan atas (contoh: "Short", "Long", dll)
}

export function GalleryCard({ image, label = "Short" }: GalleryCardProps) {
    return (
        <div
            className="rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 shadow-lg"
            style={{
                background: '#1a1a1a',
            }}
        >
            {/* macOS Window Header */}
            <div className="bg-[#2d2d2d] px-4 py-3 flex items-center justify-between">
                {/* Traffic Lights (macOS buttons) */}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>

                {/* Label Button - Dynamic color based on type */}
                <div className="bg-[#3a3a3a] hover:bg-[#4a4a4a] transition-colors px-4 py-1.5 rounded-lg">
                    <span
                        className={`font-semibold text-sm ${label.toLowerCase() === 'short'
                                ? 'text-[#ff5f56]'
                                : 'text-[#27c93f]'
                            }`}
                    >
                        {label}
                    </span>
                </div>
            </div>

            {/* Image Placeholder Area */}
            <div className="relative aspect-[16/10] bg-[#6b7280] flex items-center justify-center">
                {image ? (
                    typeof image === 'string' ? (
                        <img
                            src={image}
                            alt={label}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            style={{ objectPosition: 'center 22%' }}
                        />
                    ) : (
                        <Image
                            src={image}
                            alt={label}
                            fill
                            loading="lazy"
                            className="object-cover"
                            style={{ objectPosition: 'center 60%' }}
                        />
                    )
                ) : (
                    // Placeholder icon jika tidak ada gambar
                    <svg
                        className="w-16 h-16 text-gray-400 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                )}
            </div>
        </div>
    );
}
