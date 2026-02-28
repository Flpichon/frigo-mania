import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next-pwa n'est pas encore compatible Turbopack (Next 16).
  // Le Service Worker est géré manuellement via public/sw.js
  turbopack: {},
};

export default nextConfig;
