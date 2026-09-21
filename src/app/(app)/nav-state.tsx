"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getPendingApprovalsCount } from "./nav-actions";

// Estado compartilhado entre a sidebar e a barra mobile:
// 1) item "ativo" otimista - o pathname só muda quando o servidor responde
//    (~0,3-1s), e até lá o clique parecia não ter feito nada;
// 2) contagem do selo de aprovações pendentes, que se atualiza sozinha
//    (o layout não é reenviado pelo servidor em navegações por clique).

const POLL_MS = 60_000;

type NavState = {
  isActive: (href: string) => boolean;
  startNav: (href: string) => void;
  approvalsCount: number;
};

const NavStateContext = createContext<NavState | null>(null);

function useNavState() {
  const ctx = useContext(NavStateContext);
  if (!ctx) throw new Error("useNavState fora do NavStateProvider");
  return ctx;
}

export function useNavActive() {
  const { isActive, startNav } = useNavState();
  return { isActive, startNav };
}

export function NavStateProvider({
  initialApprovals,
  isCoordenacao,
  children,
}: {
  initialApprovals: number;
  isCoordenacao: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setPendingHref(null);
  }

  const activePath = pendingHref ?? pathname;
  const isActive = useCallback(
    (href: string) => activePath === href || activePath.startsWith(`${href}/`),
    [activePath],
  );
  const startNav = useCallback((href: string) => setPendingHref(href), []);

  // Valor do servidor (initialApprovals) sempre ganha quando muda - vem
  // fresco depois de aprovar/recusar ou de um router.refresh().
  const [live, setLive] = useState({ base: initialApprovals, value: initialApprovals });
  const approvalsCount = live.base === initialApprovals ? live.value : initialApprovals;

  useEffect(() => {
    if (!isCoordenacao) return;
    let cancelled = false;

    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const value = await getPendingApprovalsCount();
        if (!cancelled) setLive({ base: initialApprovals, value });
      } catch {
        // falha de rede momentânea: mantém o valor atual
      }
    }

    const interval = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [isCoordenacao, initialApprovals]);

  return <NavStateContext.Provider value={{ isActive, startNav, approvalsCount }}>{children}</NavStateContext.Provider>;
}

export function ApprovalsBadge() {
  const { approvalsCount } = useNavState();
  if (approvalsCount <= 0) return null;

  return (
    <span
      style={{
        marginLeft: "var(--space-2)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: "var(--radius-full)",
        background: "var(--color-green-700)",
        color: "#fff",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-semibold)",
      }}
    >
      {approvalsCount}
    </span>
  );
}
