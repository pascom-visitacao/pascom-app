"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// PWA instalado fica aberto muito mais tempo que uma aba normal - o
// SO/navegador pode congelar a aba em segundo plano, deixando os dados
// visivelmente desatualizados quando o usuário volta. Sem isso, a única
// forma de "destravar" era deslogar/logar de novo (força uma navegação
// cheia). Só atualiza depois de um tempo mínimo escondido, pra não gerar
// refresh a cada troca rápida de aba.
const MIN_HIDDEN_MS = 60_000;

export function RevalidateOnFocus() {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt !== null && Date.now() - hiddenAt >= MIN_HIDDEN_MS) {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  return null;
}
