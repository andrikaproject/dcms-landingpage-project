"use client";

import { useEffect, useRef, useState } from "react";
import { House } from "@phosphor-icons/react";

const ANIMATION_PATH = "/icons-dashboard.json";

function applyCurrentColor(container) {
    container.querySelectorAll("[stroke]").forEach((element) => {
        element.style.setProperty("stroke", "currentColor", "important");
    });
}

export default function AnimatedDashboardIcon({
    playing = false,
    size = 16,
    fallbackWeight = "regular",
    className = "",
}) {
    const containerRef = useRef(null);
    const animationRef = useRef(null);
    const playingRef = useRef(playing);
    const motionAllowedRef = useRef(false);
    const [motionAllowed, setMotionAllowed] = useState(false);
    const [failed, setFailed] = useState(false);

    playingRef.current = playing;
    motionAllowedRef.current = motionAllowed;

    useEffect(() => {
        const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
        const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        const updateMotionPreference = () => {
            setMotionAllowed(hoverQuery.matches && !reducedMotionQuery.matches);
        };

        updateMotionPreference();
        hoverQuery.addEventListener("change", updateMotionPreference);
        reducedMotionQuery.addEventListener("change", updateMotionPreference);

        return () => {
            hoverQuery.removeEventListener("change", updateMotionPreference);
            reducedMotionQuery.removeEventListener("change", updateMotionPreference);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        let animation;

        async function initializeAnimation() {
            try {
                const lottie = (await import("lottie-web")).default;

                if (cancelled || !containerRef.current) return;

                animation = lottie.loadAnimation({
                    container: containerRef.current,
                    renderer: "svg",
                    loop: true,
                    autoplay: false,
                    path: ANIMATION_PATH,
                    rendererSettings: {
                        preserveAspectRatio: "xMidYMid meet",
                    },
                });
                animationRef.current = animation;

                const handleReady = () => {
                    if (!containerRef.current) return;

                    applyCurrentColor(containerRef.current);

                    if (playingRef.current && motionAllowedRef.current) {
                        animation.play();
                    } else {
                        animation.goToAndStop(0, true);
                    }
                };

                const handleFailure = () => {
                    if (!cancelled) setFailed(true);
                };

                animation.addEventListener("DOMLoaded", handleReady);
                animation.addEventListener("data_failed", handleFailure);
            } catch {
                if (!cancelled) setFailed(true);
            }
        }

        initializeAnimation();

        return () => {
            cancelled = true;
            animationRef.current = null;
            animation?.destroy();
        };
    }, []);

    useEffect(() => {
        const animation = animationRef.current;
        if (!animation) return;

        if (playing && motionAllowed) {
            animation.play();
        } else {
            animation.goToAndStop(0, true);
        }
    }, [motionAllowed, playing]);

    if (failed) {
        return (
            <House
                size={size}
                weight={fallbackWeight}
                className={`shrink-0 ${className}`}
                aria-hidden
            />
        );
    }

    return (
        <span
            ref={containerRef}
            className={`block shrink-0 ${className}`}
            style={{ width: size, height: size }}
            aria-hidden="true"
        />
    );
}
