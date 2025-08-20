import webpack from 'next/dist/compiled/webpack/webpack-lib.js';

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
  async rewrites() {
    return [
      {
        source: "/frames/:path*",
        destination: "/games/:path*",
      },
    ];
  },
  logging:
    process.env.NODE_ENV === "development"
      ? {
          fetches: {
            fullUrl: true,
          },
        }
      : {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@xmtp/node-bindings': false,
        '@xmtp/node-bindings/dist': false,
        '@xmtp/node-bindings/dist/index.js': false,
        '@xmtp/node-sdk': false,
        '@xmtp/proto': false,
      };
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /@xmtp\/node-bindings/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /@xmtp\/node-sdk/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /@xmtp\/proto/ })
      );
    }
    return config;
  },
};

export default nextConfig;
