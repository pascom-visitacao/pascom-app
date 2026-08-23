import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "./sw-register";
import "./tokens.css";
import "./ds-styles.css";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-loaded",
  subsets: ["latin"],
  axes: ["opsz"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-loaded",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono-loaded",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PASCOM — Plataforma de Gestão",
  description: "Sistema de gestão da Pastoral da Comunicação",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PASCOM",
  },
  verification: {
    // Confirma posse do domínio pro Google Search Console — necessário
    // pra tirar o aviso "app não verificado" da tela de consentimento
    // OAuth do Drive, mesmo com escopo drive.file (não-sensível).
    google: "Mei2tOQGCia7OUzDEHhBS5oTSDmYOSru7F0xa25cz7s",
  },
};

export const viewport: Viewport = {
  themeColor: "#007cba",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolageGrotesque.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
