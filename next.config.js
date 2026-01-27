/** @type {import('next').NextConfig} */
const nextConfig = {
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