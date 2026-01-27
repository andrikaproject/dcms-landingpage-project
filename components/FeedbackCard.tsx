'use client';

import React from 'react';

interface FeedbackCardProps {
    memberSince: string;
    feedback: string;
    telegramId: string;
    username: string;
    onClick?: () => void;
    // Optional props for future use
    name?: string;
    role?: string;
    avatar?: string;
    rating?: number;
}

export function FeedbackCard({ memberSince, feedback, telegramId, username, onClick }: FeedbackCardProps) {
    return (
        <div
            className="bg-[#111315] border border-[#181D27] rounded-xl p-5 mb-4 hover:border-gray-700 transition-colors duration-300 cursor-pointer"
            onClick={onClick}
        >
            {/* Member Since Badge */}
            <div className="mb-3">
                <span className="text-gray-400 text-xs"
                    style={{ fontFamily: 'Nebulica, serif' }}>
                    {memberSince}
                </span>
            </div>

            {/* Feedback Text */}
            <p className="text-gray-300 text-sm leading-relaxed mb-4"
                style={{ fontFamily: 'Chakra Petch, serif' }}>
                {feedback}
            </p>

            {/* User Info */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-800">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                        {username.charAt(0).toUpperCase()}
                    </span>
                </div>

                {/* Username & Telegram ID */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[#B7FB5B] text-xs font-mono">
                            {telegramId}
                        </span>
                    </div>
                    <p className="text-gray-500 text-xs truncate">
                        as @{username}
                    </p>
                </div>
            </div>
        </div>
    );
}
