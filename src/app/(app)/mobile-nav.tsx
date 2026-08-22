"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
  cols: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="5" height="14" rx="1" />
      <rect x="9.5" y="5" width="5" height="9" rx="1" />
      <rect x="16" y="5" width="5" height="11" rx="1" />
    </svg>
  ),
  cal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="2.7" x2="8" y2="6.3" />
      <line x1="16" y1="2.7" x2="16" y2="6.3" />
    </svg>
  ),
  photo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="m21 16-5.5-5.5L5 21" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.5 14.2c2 .2 3.6 1.8 4.2 4.3" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.3" />
      <rect x="13" y="4" width="7" height="7" rx="1.3" />
      <rect x="4" y="13" width="7" height="7" rx="1.3" />
      <rect x="13" y="13" width="7" height="7" rx="1.3" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  ),
  cam: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.3" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1-4 4-6.2 7.5-6.2s6.5 2.2 7.5 6.2" />
    </svg>
  ),
};

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

const BAR_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: "home" },
  { href: "/atividades", label: "Atividades", icon: "cols" },
  { href: "/calendario", label: "Calendário", icon: "cal" },
];

// "Mais" abre o grid com o catálogo completo — inclui até os 3 itens já
// atalhados na barra, de propósito: tudo está no grid, a barra é só
// atalho pros mais usados.
const GRID_ITEMS_PASCONEIRO: NavItem[] = [
  ...BAR_ITEMS,
  { href: "/equipamentos", label: "Equipamentos", icon: "cam" },
  { href: "/materiais", label: "Enviar fotos", icon: "photo" },
  { href: "/perfil", label: "Meu perfil", icon: "user" },
];

const GRID_ITEMS_COORDENACAO: NavItem[] = [
  ...GRID_ITEMS_PASCONEIRO,
  { href: "/areas", label: "Equipe & Áreas", icon: "users" },
  { href: "/configuracoes", label: "Configurações", icon: "gear" },
];

export function MobileNav({ isCoordenacao }: { isCoordenacao: boolean }) {
  const [gridOpen, setGridOpen] = useState(false);
  const pathname = usePathname();
  const gridItems = isCoordenacao ? GRID_ITEMS_COORDENACAO : GRID_ITEMS_PASCONEIRO;

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className="mobile-nav-bar">
        <div className="bar">
          {BAR_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={`mobile-nav-item${isActive(item.href) ? " is-active" : ""}`}>
              {ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            className={`mobile-nav-item${gridOpen ? " is-active" : ""}`}
            onClick={() => setGridOpen(true)}
          >
            {ICONS.grid}
            <span>Mais</span>
          </button>
        </div>
      </div>

      <div className={`mobile-nav-grid${gridOpen ? " is-open" : ""}`}>
        <button type="button" className="close" aria-label="Fechar" onClick={() => setGridOpen(false)}>
          {ICONS.close}
        </button>
        <div className="title">Navegar</div>
        <div className="grid">
          {gridItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`item${isActive(item.href) ? " is-active" : ""}`}
              onClick={() => setGridOpen(false)}
            >
              {ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
