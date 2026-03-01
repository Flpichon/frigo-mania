import type { NextConfig } from "next";

const backUrl =
  process.env.BACKEND_INTERNAL_URL ?? "http://back:3001";

const nextConfig: NextConfig = {
  // next-pwa n'est pas encore compatible Turbopack (Next 16).
  // Le Service Worker est géré manuellement via public/sw.js
  turbopack: {},
  // Génère un build standalone optimisé pour les conteneurs Docker
  output: "standalone",
  // Proxy /api/* → backend NestJS (résout le problème NEXT_PUBLIC_* build-time)
  // En local, définir BACKEND_INTERNAL_URL=http://localhost:3001 dans front/.env.local
  async rewrites() {
    return [
      {
        // /api/auth/** est géré par NextAuth — ne pas proxifier
        source: "/api/:path((?!auth).*)",
        destination: `${backUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
