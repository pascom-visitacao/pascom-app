"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setOnboardingFlag } from "./onboarding-actions";

export function CoordenacaoPromotionBanner() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function dismiss() {
    startTransition(async () => {
      await setOnboardingFlag("coordenacao_promovido");
      router.refresh();
    });
  }

  return (
    <div className="alert alert-info" style={{ margin: "var(--space-6) var(--space-9) 0" }}>
      <div className="flex items-center justify-between flex-wrap" style={{ gap: "var(--space-4)", width: "100%" }}>
        <div>
          <div className="alert-title">Você agora é Coordenação geral</div>
          Isso te dá acesso à área de <Link href="/configuracoes">Configurações</Link>, com o painel de redes
          sociais, referências do calendário paroquial e o gerenciamento de papéis da equipe.
        </div>
        <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={dismiss}>
          Dispensar
        </button>
      </div>
    </div>
  );
}
