import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
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
  verification: {
    // Confirma posse do domínio pro Google Search Console — necessário
    // pra tirar o aviso "app não verificado" da tela de consentimento
    // OAuth do Drive, mesmo com escopo drive.file (não-sensível).
    google: "Mei2tOQGCia7OUzDEHhBS5oTSDmYOSru7F0xa25cz7s",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolageGrotesque.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
