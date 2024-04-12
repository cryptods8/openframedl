/** @type {import('next').NextConfig} */
const nextConfig = {
  // prevent double render on dev mode, which causes 2 frames to exist
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        hostname: "*",
        protocol: "http",
      },
      {
        hostname: "*",
        protocol: "https",
      },
    ],
  },
  logging:
    process.env.NODE_ENV === "development"
      ? {
          fetches: {
            fullUrl: true,
          },
        }
      : {},
};

export default nextConfig;
