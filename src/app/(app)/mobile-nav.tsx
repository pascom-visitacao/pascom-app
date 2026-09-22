"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Columns3, Calendar, Image as ImageIcon, Users, Settings, LayoutGrid, X, Camera, User, ChevronRight, Download, Info, Archive } from "lucide-react";
import { Icon } from "@/components/icon";
import { ApprovalsBadge, useNavActive } from "./nav-state";
import { FloatingNavIndicator } from "./mobile-nav-indicator";

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
  download: <Icon icon={Download} />,
  info: <Icon icon={Info} />,
  archive: <Icon icon={Archive} />,
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
  { href: "/acervo", label: "Acervo", icon: "archive" },
  { href: "/equipe", label: "Equipe", icon: "users" },
  { href: "/instalar", label: "Instalar app", icon: "download" },
  { href: "/sobre", label: "Sobre o app", icon: "info" },
];

const GRID_ITEMS_COORDENACAO: NavItem[] = [
  ...GRID_ITEMS_PASCONEIRO,
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
  const { isActive, startNav } = useNavActive();
  const gridItems = isCoordenacao ? GRID_ITEMS_COORDENACAO : GRID_ITEMS_PASCONEIRO;
  const barItemRefs = useRef<(HTMLElement | null)[]>([]);

  // Índice do item ativo na barra flutuante (as 3 rotas + "Mais"): "Mais"
  // vence quando o grid está aberto (não é uma rota, é um estado local);
  // senão é a rota atual entre as 3, ou -1 se não for nenhuma delas (o
  // indicador some, mesma regra do BounceSidebar de desktop).
  const activeBarIndex = gridOpen ? BAR_ITEMS.length : BAR_ITEMS.findIndex((item) => isActive(item.href));

  return (
    <>
      <div className="mobile-nav-bar">
        <div className="bar">
          <FloatingNavIndicator activeIndex={activeBarIndex} itemRefs={barItemRefs} />
          {BAR_ITEMS.map((item, index) => (
            <Link
              key={item.href}
              ref={(el) => {
                barItemRefs.current[index] = el;
              }}
              href={item.href}
              className={`mobile-nav-item${isActive(item.href) ? " is-active" : ""}`}
              onClick={() => startNav(item.href)}
            >
              {ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            ref={(el) => {
              barItemRefs.current[BAR_ITEMS.length] = el;
            }}
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
              onClick={() => {
                startNav(item.href);
                setGridOpen(false);
              }}
            >
              {ICONS[item.icon]}
              <span>{item.label}</span>
              {item.href === "/configuracoes" && <ApprovalsBadge />}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
