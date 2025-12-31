export const HeroPattern = () => {
    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="dot-pattern"
                    x="0"
                    y="0"
                    width="24"
                    height="24"
                    patternUnits="userSpaceOnUse"
                >
                    <circle cx="2" cy="2" r="1" className="text-white/10" fill="currentColor" />
                </pattern>
                <mask id="fade-mask">
                    <rect width="100%" height="100%" fill="url(#radial-fade)" />
                </mask>
                <radialGradient id="radial-fade" cx="50%" cy="0%" r="80%">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect
                width="100%"
                height="100%"
                fill="url(#dot-pattern)"
                mask="url(#fade-mask)"
            />
        </svg>
    );
};
