'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const circleRef = useRef<HTMLDivElement>(null);
    const progressTextRef = useRef<HTMLSpanElement>(null);
    const progressCircleRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
        const tl = gsap.timeline();

        // Entrance animation
        tl.fromTo(circleRef.current,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 1, ease: "power3.out" }
        );

        // Progress counter logic
        const loadingDuration = 2500; // 2.5 seconds for the feel
        const startTime = Date.now();
        const circumference = 1413; // circumference for the circle

        const updateProgress = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progressValue = Math.min((elapsed / loadingDuration) * 100, 100);

            // Direct DOM manipulation to bypass React re-renders
            if (progressTextRef.current) {
                progressTextRef.current.textContent = `${Math.floor(progressValue)}%`;
            }
            if (progressCircleRef.current) {
                const offset = circumference - (circumference * progressValue) / 100;
                progressCircleRef.current.style.strokeDashoffset = offset.toString();
            }

            if (progressValue < 100) {
                requestAnimationFrame(updateProgress);
            } else {
                // Exit animation
                setTimeout(() => {
                    gsap.to(containerRef.current, {
                        opacity: 0,
                        duration: 0.8,
                        ease: "power2.inOut",
                        onComplete: onComplete
                    });
                }, 500);
            }
        };

        requestAnimationFrame(updateProgress);

        return () => {
            tl.kill();
        };
    }, [onComplete]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111315]"
        >
            <div
                ref={circleRef}
                className="relative flex flex-col items-center justify-center w-[300px] h-[300px] md:w-[450px] md:h-[450px] rounded-full bg-[#1A1C20]/50 border border-white/5 backdrop-blur-sm shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                style={{
                    background: 'radial-gradient(circle, rgba(26,28,32,0.8) 0%, rgba(17,19,21,1) 100%)'
                }}
            >
                {/* Logo */}
                <div className="mb-4">
                    <Image
                        src="/images/logo-dcms.svg"
                        alt="DCMS Logo"
                        width={80}
                        height={80}
                        priority
                        className="w-16 h-16 md:w-20 md:h-20 object-contain brightness-110"
                    />
                </div>

                {/* DCMS Text */}
                <h1
                    className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-[0.2em]"
                    style={{ fontFamily: 'Nebulica, serif' }}
                >
                    DCMS
                </h1>

                {/* Welcome Message */}
                <p
                    className="text-gray-400 text-xs md:text-sm font-medium mb-8 px-8 text-center"
                    style={{ fontFamily: 'Chakra Petch, serif' }}
                >
                    Welcome To Diskusi Crypto Micin Saham
                </p>

                {/* Progress Number */}
                <div className="absolute bottom-12 md:bottom-16">
                    <span
                        ref={progressTextRef}
                        className="text-[#B7FB5B] text-lg md:text-xl font-mono tabular-nums"
                        style={{ textShadow: '0 0 10px rgba(183, 251, 91, 0.3)' }}
                    >
                        0%
                    </span>
                </div>

                {/* Subtle Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="50%"
                        cy="50%"
                        r="calc(50% - 2px)"
                        className="stroke-white/5 fill-none"
                        strokeWidth="1"
                    />
                    <circle
                        ref={progressCircleRef}
                        cx="50%"
                        cy="50%"
                        r="calc(50% - 2px)"
                        className="stroke-[#B7FB5B]/20 fill-none transition-all duration-100 ease-out"
                        strokeWidth="1"
                        strokeDasharray="1413"
                        strokeDashoffset="1413"
                    />
                </svg>
            </div>
        </div>
    );
}
