"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useNavActive } from "./nav-state";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const { isActive, startNav } = useNavActive();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // clique com modificador abre em outra aba/janela - não navega aqui
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    startNav(href);
  }

  return (
    <Link href={href} className={`ds-nav-link${isActive(href) ? " is-active" : ""}`} onClick={handleClick}>
      {children}
    </Link>
  );
}
