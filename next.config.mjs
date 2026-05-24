// Agent service is proxied via the route handler at app/agent-api/[...path]/route.ts
// (long timeout for slow Arkiv writes). No rewrite needed.

/** @type {import('next').NextConfig} */
export default {
  webpack: (config) => {
    // Privy (@privy-io/react-auth) declares optional Solana/Farcaster peer deps it
    // imports lazily. We are Ethereum-only (Braga + Sepolia), so alias the unused
    // optional modules to `false` to keep the bundle from failing to resolve them.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@farcaster/mini-app-solana": false,
      "@solana-program/memo": false,
    };
    // ox/tempo (pulled transitively by viem/Privy) uses a dynamic require webpack
    // flags as "Critical dependency". It's runtime-harmless — suppress the noise.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /ox[\\/]_esm[\\/]tempo/ },
    ];
    return config;
  },
};
