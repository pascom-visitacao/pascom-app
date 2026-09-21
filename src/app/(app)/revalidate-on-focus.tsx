"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Ao voltar pro app (aba visível, janela em foco, ou restaurada do
// bfcache), busca dados frescos do servidor - inclusive o layout, que
// não é reenviado nas navegações por clique. Antes só atualizava depois
// de 60s escondido; agora qualquer volta após MIN_INTERVAL_MS refaz a
// renderização (mantém estado de formulários e modais abertos).
// O throttle evita refresh em cascata: visibilitychange + focus disparam
// quase juntos ao trocar de aba.
const MIN_INTERVAL_MS = 30_000;

export function RevalidateOnFocus() {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    lastRefreshRef.current = Date.now();

    function maybeRefresh() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < MIN_INTERVAL_MS) return;
      lastRefreshRef.current = now;
      router.refresh();
    }

    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) maybeRefresh();
    }

    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  return null;
}
