'use client';

import React, { useState, useEffect } from 'react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberSince: string;
    feedback: string;
    fullFeedback?: string;
    telegramId: string;
    username: string;
    displayName: string;
    profileImage?: string;
}

export function FeedbackModal({
    isOpen,
    onClose,
    memberSince,
    feedback,
    fullFeedback,
    telegramId,
    username,
    displayName,
    profileImage
}: FeedbackModalProps) {
    const [isClosing, setIsClosing] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300); // Match animation duration
    };

    const handleDragStart = (clientY: number) => {
        setDragStartY(clientY);
        setIsDragging(true);
    };

    const handleDragMove = (clientY: number) => {
        if (!isDragging) return;
        const offset = clientY - dragStartY;
        if (offset > 0) { // Only allow dragging down
            setDragOffset(offset);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        if (dragOffset > 100) { // If dragged more than 100px, close
            handleClose();
        }
        setDragOffset(0);
    };

    // Reset closing state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    if (!isOpen && !isClosing) return null;

    return (
        <>
            {/* Backdrop with fade animation */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300 ease-out ${isClosing ? 'opacity-0' : 'opacity-100'
                    }`}
                style={{
                    animation: isClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
                }}
                onClick={handleClose}
            />

            {/* Modal with scale and fade animation */}
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
                <div
                    className="bg-[#111315] border-t md:border border-[#181D27] rounded-t-3xl md:rounded-2xl max-w-4xl w-full md:max-h-[90vh] h-[85vh] md:h-auto overflow-y-auto md:overflow-hidden relative transition-all duration-300 ease-out"
                    style={{
                        animation: isClosing
                            ? 'modalSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            : 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
                        transition: isDragging ? 'none' : 'all 0.3s ease-out'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Fixed Drag Handle at Top (Mobile Only) */}
                    <div
                        className="md:hidden absolute top-0 left-0 right-0 z-20 bg-[#1a1a1a] rounded-t-3xl cursor-grab active:cursor-grabbing"
                        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
                        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
                        onTouchEnd={handleDragEnd}
                        onMouseDown={(e) => handleDragStart(e.clientY)}
                        onMouseMove={(e) => isDragging && handleDragMove(e.clientY)}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-3">
                            <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                        </div>
                    </div>

                    {/* Close Button - Fixed position */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-all duration-200 z-30 hover:rotate-90"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Content */}
                    <div className="pt-[32px] md:pt-[32px] px-[32px] pb-[32px] md:px-[32px] md:pb-[32px]">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Left Side - Text Content */}
                            <div className="flex-1">
                                {/* Member Since Badge */}
                                <div className="mb-6">
                                    <span
                                        className="text-gray-400 text-md"
                                        style={{ fontFamily: 'Nebulica, serif' }}
                                    >
                                        {memberSince}
                                    </span>
                                </div>

                                {/* Full Feedback Text */}
                                <p
                                    className="text-gray-300 text-base md:text-lg leading-relaxed mb-8"
                                    style={{ fontFamily: 'Chakra Petch, sans-serif' }}
                                >
                                    {fullFeedback || feedback}
                                </p>

                                {/* User Info */}
                                <div className="flex items-center gap-4 pt-6 border-t border-gray-800">
                                    {/* Avatar */}
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-lg font-bold">
                                            {username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Username & Telegram ID */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[#B7FB5B] text-sm font-mono">
                                                {telegramId}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm">
                                            as @{username}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Profile Image Placeholder (Desktop Only - Clipped) */}
                            <div className="hidden md:flex flex-shrink-0 items-center justify-center ml-8 -mr-24">
                                {/* Image Container - Clipped by modal overflow */}
                                <div className="w-64 h-48 rounded-2xl overflow-hidden bg-gray-700 flex items-center justify-center">
                                    {profileImage ? (
                                        <img
                                            src={profileImage}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-gray-400 text-sm font-medium">
                                            Placeholder Image
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Image - Below Content */}
                        {profileImage && (
                            <div className="md:hidden mt-6">
                                <div className="w-full rounded-2xl overflow-hidden bg-gray-700">
                                    <img
                                        src={profileImage}
                                        alt={displayName}
                                        className="w-full h-auto object-cover"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes fadeOut {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }

                /* Desktop: Center modal with scale */
                @media (min-width: 768px) {
                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: scale(0.95) translateY(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                    }

                    @keyframes modalSlideOut {
                        from {
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                        to {
                            opacity: 0;
                            transform: scale(0.95) translateY(-20px);
                        }
                    }
                }

                /* Mobile: Bottom sheet slide up */
                @media (max-width: 767px) {
                    @keyframes modalSlideIn {
                        from {
                            transform: translateY(100%);
                        }
                        to {
                            transform: translateY(0);
                        }
                    }

                    @keyframes modalSlideOut {
                        from {
                            transform: translateY(0);
                        }
                        to {
                            transform: translateY(100%);
                        }
                    }
                }
            `}</style >
        </>
    );
}
