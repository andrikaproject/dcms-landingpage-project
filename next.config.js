/** @type {import('next').NextConfig} */
const nextConfig = {
    devIndicators: false,
    swcMinify: true,
    compress: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3000',
                pathname: '/api/trading-cards/**',
            },
        ],
        unoptimized: true, // Disable optimization for API-served images
    },
};

export default nextConfig;