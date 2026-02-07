'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export function Cursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const followerRef = useRef<HTMLDivElement>(null);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // Check if device is desktop (not touch and large screen)
        const checkDevice = () => {
            const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
            const isLargeScreen = window.innerWidth >= 1024;
            setIsDesktop(!isTouchDevice && isLargeScreen);
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);

        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    useEffect(() => {
        if (!isDesktop) return;

        const cursor = cursorRef.current;
        const follower = followerRef.current;
        if (!cursor || !follower) return;

        // Mouse positions
        const pos = { x: 0, y: 0 };
        const mouse = { x: 0, y: 0 };

        // GSAP Setters for performance
        const xSetCursor = gsap.quickSetter(cursor, "x", "px");
        const ySetCursor = gsap.quickSetter(cursor, "y", "px");
        const xSetFollower = gsap.quickSetter(follower, "x", "px");
        const ySetFollower = gsap.quickSetter(follower, "y", "px");

        const onMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        window.addEventListener("mousemove", onMouseMove);

        // Smooth following logic
        gsap.ticker.add(() => {
            const dt = 1.0 - Math.pow(1.0 - 0.2, gsap.ticker.deltaRatio());
            const dtFollower = 1.0 - Math.pow(1.0 - 0.1, gsap.ticker.deltaRatio());

            pos.x += (mouse.x - pos.x) * dt;
            pos.y += (mouse.y - pos.y) * dt;

            xSetCursor(mouse.x);
            ySetCursor(mouse.y);

            xSetFollower(pos.x);
            ySetFollower(pos.y);
        });

        // Hide default cursor on interactive elements or globally
        document.body.style.cursor = 'none';
        const links = document.querySelectorAll('a, button');
        const onEnter = () => {
            gsap.to(cursor, { scale: 1.5, duration: 0.3 });
            gsap.to(follower, { scale: 2, duration: 0.3, backgroundColor: 'rgba(183, 251, 91, 0.4)' });
        };
        const onLeave = () => {
            gsap.to(cursor, { scale: 1, duration: 0.3 });
            gsap.to(follower, { scale: 1, duration: 0.3, backgroundColor: 'rgba(183, 251, 91, 0.2)' });
        };

        links.forEach(link => {
            link.addEventListener('mouseenter', onEnter);
            link.addEventListener('mouseleave', onLeave);
        });

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            document.body.style.cursor = 'auto';
            links.forEach(link => {
                link.removeEventListener('mouseenter', onEnter);
                link.removeEventListener('mouseleave', onLeave);
            });
        };
    }, [isDesktop]);

    if (!isDesktop) return null;

    return (
        <>
            {/* SVG Filter for Gooey/Liquid effect */}
            <svg className="hidden">
                <defs>
                    <filter id="liquid">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="liquid" />
                        <feBlend in="SourceGraphic" in2="liquid" />
                    </filter>
                </defs>
            </svg>

            <div className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference" style={{ filter: 'url(#liquid)' }}>
                {/* Main Cursor Point */}
                <div
                    ref={cursorRef}
                    className="w-4 h-4 bg-[#B7FB5B] rounded-full absolute -ml-2 -mt-2"
                />
                {/* Liquid Follower */}
                <div
                    ref={followerRef}
                    className="w-12 h-12 bg-[#B7FB5B]/20 rounded-full absolute -ml-6 -mt-6 backdrop-blur-sm"
                />
            </div>

            <style jsx global>{`
                body, a, button {
                    cursor: none !important;
                }
            `}</style>
        </>
    );
}
