import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Fotos vêm dos CDNs dos leiloeiros (coletadas em scripts/coleta); os cards usam `unoptimized`
    // para não passar milhares de imagens de terceiros pelo otimizador da Vercel.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
