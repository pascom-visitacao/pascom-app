import type { Metadata } from "next";
import { Fredoka, Inter, JetBrains_Mono } from "next/font/google";
import "./tokens.css";
import "./ds-styles.css";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka-loaded",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter-loaded",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono-loaded",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PASCOM — Plataforma de Gestão",
  description: "Sistema de gestão da Pastoral da Comunicação",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fredoka.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
