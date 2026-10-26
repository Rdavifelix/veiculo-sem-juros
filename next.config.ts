import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Fotos dos veículos virão do Storage do Supabase; liberar o host ao criar o projeto.
    remotePatterns: [],
  },
};

export default nextConfig;
