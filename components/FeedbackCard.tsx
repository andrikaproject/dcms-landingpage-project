import React from 'react';

interface FeedbackCardProps {
    name: string;
    role: string;
    avatar?: string;
    rating: number;
    feedback: string;
}

export function FeedbackCard({ name, role, avatar, rating, feedback }: FeedbackCardProps) {
    return (
        <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2">
            {/* Glassmorphism Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content */}
            <div className="relative z-10">
                {/* Rating Stars */}
                <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, index) => (
                        <svg
                            key={index}
                            className={`w-5 h-5 ${index < rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600 fill-gray-600'
                                } transition-all duration-300 group-hover:scale-110`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            style={{ transitionDelay: `${index * 50}ms` }}
                        >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    ))}
                </div>

                {/* Feedback Text */}
                <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 min-h-[120px]">
                    "{feedback}"
                </p>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6 group-hover:via-purple-500/50 transition-colors duration-500" />

                {/* User Info */}
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 p-0.5 group-hover:scale-110 transition-transform duration-300">
                        <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt={name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-white font-bold text-lg" style={{ fontFamily: 'Nebulica, serif' }}>
                                    {name.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Name & Role */}
                    <div className="flex-1">
                        <h4 className="text-white font-bold text-base md:text-lg" style={{ fontFamily: 'Nebulica, serif' }}>
                            {name}
                        </h4>
                        <p className="text-gray-400 text-xs md:text-sm">
                            {role}
                        </p>
                    </div>

                    {/* Quote Icon */}
                    <div className="text-purple-500/30 group-hover:text-purple-500/50 transition-colors duration-300">
                        <svg
                            className="w-8 h-8"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Animated Border Gradient on Hover */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 blur-xl opacity-20 animate-pulse" />
            </div>
        </div>
    );
}
