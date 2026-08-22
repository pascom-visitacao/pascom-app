import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // foto de perfil devolvida pelo Google OAuth
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // foto de perfil enviada pelo usuário (bucket público perfil-fotos)
      { protocol: "https", hostname: "okreebpdofmhtomdmzcz.supabase.co" },
    ],
  },
  experimental: {
    serverActions: {
      // padrão do Next é 1MB, bem abaixo do que fotos reais (equipamento,
      // perfil, materiais) precisam. Alinhado ao teto real da própria
      // Vercel pra corpo de function (~4,5MB) - não adianta liberar mais
      // que isso aqui, a Vercel rejeitaria de qualquer forma.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
