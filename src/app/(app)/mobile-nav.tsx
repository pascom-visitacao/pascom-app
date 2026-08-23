"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Columns3, Calendar, Image as ImageIcon, Users, Settings, LayoutGrid, X, Camera, User, ChevronRight } from "lucide-react";
import { Icon } from "@/components/icon";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ICONS = {
  home: <Icon icon={Home} />,
  cols: <Icon icon={Columns3} />,
  cal: <Icon icon={Calendar} />,
  photo: <Icon icon={ImageIcon} />,
  users: <Icon icon={Users} />,
  gear: <Icon icon={Settings} />,
  grid: <Icon icon={LayoutGrid} />,
  close: <Icon icon={X} />,
  cam: <Icon icon={Camera} />,
  user: <Icon icon={User} />,
} satisfies Record<string, React.ReactNode>;

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

const BAR_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Início", icon: "home" },
  { href: "/tarefas", label: "Tarefas", icon: "cols" },
  { href: "/agenda", label: "Agenda", icon: "cal" },
];

// "Mais" abre o grid com o catálogo completo — inclui até os 3 itens já
// atalhados na barra, de propósito: tudo está no grid, a barra é só
// atalho pros mais usados.
const GRID_ITEMS_PASCONEIRO: NavItem[] = [
  ...BAR_ITEMS,
  { href: "/equipamentos", label: "Equipamentos", icon: "cam" },
  { href: "/materiais", label: "Enviar fotos", icon: "photo" },
];

const GRID_ITEMS_COORDENACAO: NavItem[] = [
  ...GRID_ITEMS_PASCONEIRO,
  { href: "/areas", label: "Equipe & Áreas", icon: "users" },
  { href: "/configuracoes", label: "Configurações", icon: "gear" },
];

export function MobileNav({
  isCoordenacao,
  userName,
  avatarUrl,
}: {
  isCoordenacao: boolean;
  userName: string;
  avatarUrl: string | null;
}) {
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
        <Link
          href="/perfil"
          className="grid-profile-header"
          onClick={() => setGridOpen(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-bg-subtle)",
          }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              width={40}
              height={40}
              className="avatar-photo"
              style={{ width: 40, height: 40 }}
            />
          ) : (
            <span className="avatar" style={{ width: 40, height: 40, fontSize: "var(--text-sm)", flexShrink: 0 }}>
              {initials(userName)}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: "var(--weight-semibold)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Acessar perfil</div>
          </div>
          <Icon icon={ChevronRight} size={18} style={{ flexShrink: 0, opacity: 0.5 }} />
        </Link>

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
