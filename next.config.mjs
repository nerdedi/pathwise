/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["mapbox-gl"],
  },
};

export default nextConfig;
