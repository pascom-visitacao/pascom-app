"use client";

// Pill atrás do item ativo da barra flutuante mobile: mesma mecânica de
// calcular posição/largura pelo item ativo que o marcador do
// BounceSidebar (desktop, ./bounce-sidebar.tsx) usa. O movimento em duas
// fases - "estica" pra cobrir origem e destino, depois "assenta" sobre o
// alvo com leve exagero - e os timings/curvas foram validados em
// docs/preview-menu-mobile.html (opção A, .gnav-ind); aqui a mesma ideia
// entra no ciclo de vida do React (useRef/useEffect) em vez do JS solto
// daquele preview. É CSS transitions comuns, não Framer Motion: o
// indicador é só um pill sólido sem curva de trajeto, uma transição
// declarativa já basta.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Rect = { left: number; width: number };

export function FloatingNavIndicator({
  activeIndex,
  itemRefs,
}: {
  /** -1 quando a rota atual não é nenhum dos itens (o indicador some). */
  activeIndex: number;
  itemRefs: React.RefObject<(HTMLElement | null)[]>;
}) {
  const indRef = useRef<HTMLSpanElement>(null);
  const hasPositioned = useRef(false);
  const [ready, setReady] = useState(false);
  const reduceMotion = useReducedMotion();

  function itemRect(index: number): Rect | null {
    const el = itemRefs.current[index];
    if (!el) return null;
    return { left: el.offsetLeft, width: el.offsetWidth };
  }

  // Posição/largura ATUAIS do indicador (não a última registrada) - lidas
  // do layout, então funcionam mesmo no meio de uma transição, o que
  // importa se a rota mudar de novo antes da animação anterior terminar.
  function currentRect(): Rect | null {
    const ind = indRef.current;
    const bar = ind?.offsetParent;
    if (!ind || !bar) return null;
    const barBox = bar.getBoundingClientRect();
    const indBox = ind.getBoundingClientRect();
    return { left: indBox.left - barBox.left, width: indBox.width };
  }

  function paint(rect: Rect) {
    const ind = indRef.current;
    if (!ind) return;
    ind.style.transform = `translateX(${rect.left}px)`;
    ind.style.width = `${rect.width}px`;
  }

  // Força o navegador a computar o estilo atual antes da próxima mudança.
  // Sem isso, trocar data-phase (que troca a regra de transition) e pintar
  // o novo valor no mesmo tick vira uma atualização atômica sem transição
  // visível - o browser nunca chega a "commitar" o estado anterior como
  // ponto de partida.
  function forceReflow(el: HTMLElement) {
    void el.offsetWidth;
  }

  function snap(rect: Rect) {
    const ind = indRef.current;
    if (!ind) return;
    ind.dataset.phase = "idle";
    paint(rect);
  }

  // Posição inicial sem animar, e de novo quando o layout mudar (fontes
  // carregando, ou cruzar o breakpoint de 960px que mostra/esconde a
  // barra - o ResizeObserver do .bar pega os dois casos, já que ele vai a
  // 0 quando a barra some e volta quando ela reaparece).
  useIsomorphicLayoutEffect(() => {
    const bar = indRef.current?.offsetParent;
    if (!bar) return;

    let cancelled = false;
    const resnap = () => {
      if (cancelled || activeIndex < 0) return;
      const rect = itemRect(activeIndex);
      if (!rect) return;
      snap(rect);
      hasPositioned.current = true;
      setReady(true);
    };

    resnap();
    const raf = requestAnimationFrame(resnap);
    document.fonts?.ready.then(resnap);
    const resizeObserver = new ResizeObserver(resnap);
    resizeObserver.observe(bar);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const ind = indRef.current;
    if (!ind || !hasPositioned.current) return;
    if (activeIndex < 0) return;

    const to = itemRect(activeIndex);
    if (!to) return;

    if (reduceMotion) {
      snap(to);
      return;
    }

    const from = currentRect();
    if (!from) return;

    const left = Math.min(from.left, to.left);
    const right = Math.max(from.left + from.width, to.left + to.width);
    ind.dataset.phase = "stretch";
    forceReflow(ind);
    paint({ left, width: right - left });

    const stretchTimer = setTimeout(() => {
      ind.dataset.phase = "settle";
      forceReflow(ind);
      paint(to);
    }, 222);
    const settleTimer = setTimeout(() => {
      ind.dataset.phase = "idle";
    }, 222 + 491);

    return () => {
      clearTimeout(stretchTimer);
      clearTimeout(settleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemRect/snap só leem indRef e o prop itemRefs (refs, estáveis); recriá-los a cada render não muda o que o efeito faz
  }, [activeIndex, reduceMotion]);

  return (
    <span
      ref={indRef}
      className="gnav-ind"
      aria-hidden="true"
      data-phase="idle"
      style={{ opacity: ready && activeIndex >= 0 ? 1 : 0 }}
    />
  );
}
