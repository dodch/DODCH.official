/** @type {import('next').NextConfig} */
const nextConfig = {
    // Only use static export mode for production builds
    output: process.env.NEXT_PHASE === 'phase-production-build' ? 'export' : undefined,
    trailingSlash: true,
    reactStrictMode: true,
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
