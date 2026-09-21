"use client";

import { BounceSidebar, type BounceSidebarItem } from "./bounce-sidebar";
import { useNavActive } from "./nav-state";

function hrefOf(item: BounceSidebarItem | undefined) {
  return item !== undefined && typeof item !== "string" && "href" in item ? item.href : undefined;
}

// Liga o BounceSidebar ao estado de navegação do app: o item ativo segue a
// rota (com o clique otimista do nav-state, que antecipa a troca enquanto o
// servidor responde) e a mesma fonte alimenta a barra mobile.
export function SidebarNav({ items }: { items: BounceSidebarItem[] }) {
  const { isActive, startNav } = useNavActive();

  const activeIndex = items.findIndex((item) => {
    const href = hrefOf(item);
    return href !== undefined && isActive(href);
  });

  return (
    <BounceSidebar
      items={items}
      value={activeIndex}
      onChange={(index) => {
        const href = hrefOf(items[index]);
        if (href) startNav(href);
      }}
    />
  );
}
