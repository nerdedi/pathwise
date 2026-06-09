/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lucide-react"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Add allowedDevOrigins at the root level, not inside experimental
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0"],
};

export default nextConfig;
