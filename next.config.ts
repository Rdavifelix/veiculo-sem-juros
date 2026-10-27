import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 gera um AGENTS.md a cada `next dev`; as instruções do projeto ficam no CLAUDE.md.
  agentRules: false,
  images: {
    // Fotos vêm dos CDNs dos leiloeiros (coletadas em scripts/coleta); os cards usam `unoptimized`
    // para não passar milhares de imagens de terceiros pelo otimizador da Vercel.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
