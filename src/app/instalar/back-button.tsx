"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/icon";

// Página é acessada tanto do menu logado quanto do /login (deslogado),
// então "voltar" usa o histórico do navegador em vez de um destino fixo.
export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ alignSelf: "flex-start" }}
      onClick={() => router.back()}
    >
      <Icon icon={ArrowLeft} size={16} />
      Voltar
    </button>
  );
}
