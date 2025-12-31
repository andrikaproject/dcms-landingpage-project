/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: "var(--font-geist-sans)",
                mono: "var(--font-geist-mono)",
                nebulica: ["Nebulica", "serif"],
                chakra: "var(--font-chakra-petch)",
            },
            colors: {
                brand: {
                    primary: '#3B82F6',   // Biru Utama
                    secondary: '#10B981', // Hijau Profit
                    danger: '#EF4444',    // Merah Loss
                    dark: '#0F172A',      // Background
                    card: '#1E293B',      // Background Card
                },
            },
            borderRadius: {
                'crypto': '12px',
            }
        },
    },
    plugins: [],
}