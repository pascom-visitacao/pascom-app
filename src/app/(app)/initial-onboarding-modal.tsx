"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOnboardingFlag } from "./onboarding-actions";

type Screen = {
  title: string;
  body: string;
};

// Regra do spec-onboarding.md 4.1: contexto conceitual do que o app é,
// nunca um mapa da interface - sem citar nomes de páginas nem apontar
// pra elementos da UI.
function buildScreens(firstName: string): Screen[] {
  return [
    {
      title: `Olá, ${firstName}!`,
      body: "O PASCOM App é o ponto de encontro da Pastoral da Comunicação: onde o trabalho da equipe acontece, do primeiro rascunho até a entrega.",
    },
    {
      title: "Tudo organizado num lugar só",
      body: "O app centraliza as tarefas, a agenda e os materiais da Pascom - cada coisa no seu lugar, sem depender de mensagem espalhada.",
    },
    {
      title: "Feito pra equipe",
      body: "Ele facilita a participação de todo mundo, o compartilhamento de materiais e a comunicação entre a Pascom e o resto da paróquia.",
    },
  ];
}

export function InitialOnboardingModal({ firstName }: { firstName: string }) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const screens = buildScreens(firstName);
  const isLast = step === screens.length - 1;

  function finish() {
    startTransition(async () => {
      await setOnboardingFlag("initial");
      router.refresh();
    });
  }

  return (
    <div className="modal-overlay is-open">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="initial-onboarding-title">
        <div className="modal-body" style={{ paddingTop: "var(--space-9)", paddingBottom: "var(--space-7)" }}>
          <div className="flex items-center justify-center" style={{ gap: "var(--space-2)", marginBottom: "var(--space-7)" }}>
            {screens.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "var(--radius-full)",
                  background: i === step ? "var(--color-primary)" : "var(--color-border)",
                  transition: "background var(--duration-fast) var(--ease-out)",
                }}
              />
            ))}
          </div>

          <h3
            id="initial-onboarding-title"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              textAlign: "center",
              marginBottom: "var(--space-4)",
            }}
          >
            {screens[step].title}
          </h3>
          <p style={{ textAlign: "center", lineHeight: "var(--leading-loose)" }}>{screens[step].body}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-ghost btn-md" disabled={isPending} onClick={finish}>
            Pular
          </button>
          {isLast ? (
            <button type="button" className="btn btn-primary btn-md" disabled={isPending} onClick={finish}>
              {isPending ? "Só um instante..." : "Começar"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-md"
              disabled={isPending}
              onClick={() => setStep((s) => s + 1)}
            >
              Próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
