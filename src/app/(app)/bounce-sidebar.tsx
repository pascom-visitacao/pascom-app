"use client";

// Lista vertical de navegação com um marcador que "quica" até o item ativo.
//
// Adaptado do BounceSidebar do RareUI (MIT, (c) 2026 Swami Malode):
// https://www.rareui.com/components/bouncesidebar - o aviso da licença está
// em THIRD_PARTY_NOTICES.md, na raiz do projeto.
//
// O que mudou em relação ao original:
// - Tailwind saiu: o visual vive em bounce-sidebar.css, só com tokens do
//   design system (o `cn` do shadcn também saiu).
// - dotColor padrão é o var(--color-primary), e o título de grupo usa
//   --color-dark-text-muted (o marcador azul em texto de 12px sobre o fundo
//   escuro da sidebar não chega a 4,5:1 de contraste).
// - Item ativo -1 (rota fora do menu): o marcador some em vez de ficar
//   parado no último item.
// - Item aceita `trailing` (ex: selo de aprovações pendentes) e o link marca
//   aria-current="page".
// - Respeita prefers-reduced-motion (o marcador só troca de lugar, sem arco)
//   e reposiciona o marcador quando a lista muda de tamanho.
// - O MotionLink/motion.button do original não animavam nada, então viraram
//   Link/button comuns; o movimento vem só do useAnimate + arc.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useAnimate, useReducedMotion } from "motion/react";
import { arc } from "motion";
import "./bounce-sidebar.css";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type BounceSidebarItem =
  | string
  | { label: string; href?: string; trailing?: ReactNode }
  | { label: string; heading: true };

export type BounceSidebarProps = Omit<ComponentProps<"ul">, "onChange"> & {
  items: BounceSidebarItem[];
  value?: number;
  defaultValue?: number;
  onChange?: (index: number) => void;
  dotColor?: string;
};

const DOT_SIZE = 6;

// Alinha ao pixel físico: em telas com devicePixelRatio fracionado, um
// marcador de 6px meio pixel fora da grade fica borrado.
function snapToDevicePixel(value: number) {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(value * dpr) / dpr;
}

export function BounceSidebar({
  items,
  value,
  defaultValue = 0,
  onChange,
  dotColor = "var(--color-primary)",
  className,
  ...props
}: BounceSidebarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeIndex = value ?? internalValue;

  const [dot, animate] = useAnimate<HTMLSpanElement>();
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const prevY = useRef<number | null>(null);
  const activeRef = useRef(activeIndex);
  const reduceMotion = useReducedMotion();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    activeRef.current = activeIndex;
  });

  // Centro vertical do item, com o marcador centralizado nele.
  function targetY(index: number) {
    const el = itemRefs.current[index];
    if (!el) return null;
    return snapToDevicePixel(el.offsetTop + el.offsetHeight / 2 - snapToDevicePixel(DOT_SIZE) / 2);
  }

  // Posição inicial sem animar. Roda de novo no próximo frame, quando as
  // fontes terminam de carregar e quando a lista muda de tamanho: o layout
  // ainda pode se mexer depois do primeiro render, e o marcador ficaria
  // torto até a próxima navegação.
  useIsomorphicLayoutEffect(() => {
    let cancelled = false;

    // O CSS já dá 6px ao marcador; aqui ele é alinhado à grade de pixels
    // físicos (fora do render, pra não divergir entre servidor e cliente).
    if (dot.current) {
      const size = `${snapToDevicePixel(DOT_SIZE)}px`;
      animate(dot.current, { width: size, height: size }, { duration: 0 });
    }

    const snap = () => {
      if (cancelled || !dot.current || activeRef.current < 0) return;
      const toY = targetY(activeRef.current);
      if (toY === null) return;
      animate(dot.current, { x: 0, y: toY }, { duration: 0 });
      prevY.current = toY;
      setReady(true);
    };

    snap();
    const raf = requestAnimationFrame(snap);
    document.fonts?.ready.then(snap);
    const resizeObserver = new ResizeObserver(snap);
    if (listRef.current) resizeObserver.observe(listRef.current);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeIndex < 0 || !dot.current) return;
    const toY = targetY(activeIndex);
    if (toY === null) return;

    if (prevY.current === null || reduceMotion) {
      animate(dot.current, { x: 0, y: toY }, { duration: 0 });
      prevY.current = toY;
      return;
    }

    const fromY = prevY.current;
    const delta = toY - fromY;
    prevY.current = toY;
    if (delta === 0) return;

    // O arco abre mais quando a distância é curta: ir de um item ao vizinho
    // precisa de um "pulo" visível, ir do topo ao fim quase não curva.
    const distance = Math.abs(delta);
    const path = arc({
      strength: Math.min(0.8, 14 / distance),
      direction: delta > 0 ? "ccw" : "cw",
    });

    animate(dot.current, { x: 0, y: toY }, { duration: 0.25, ease: "easeOut", path });
  }, [activeIndex, animate, dot, reduceMotion]);

  const select = (index: number) => {
    if (value === undefined) setInternalValue(index);
    onChange?.(index);
  };

  // Clique com modificador abre em outra aba/janela: não conta como navegar.
  function handleClick(event: MouseEvent<HTMLElement>, index: number) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    select(index);
  }

  return (
    <ul
      ref={listRef}
      data-slot="bounce-sidebar"
      className={className ? `bounce-sidebar ${className}` : "bounce-sidebar"}
      {...props}
    >
      <span
        ref={dot}
        aria-hidden
        className="bounce-sidebar-dot"
        style={{ backgroundColor: dotColor, opacity: ready && activeIndex >= 0 ? 1 : 0 }}
      />

      {items.map((item, index) => {
        const label = typeof item === "string" ? item : item.label;

        if (typeof item !== "string" && "heading" in item) {
          return (
            <li
              key={`${index}-${label}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="presentation"
              data-slot="bounce-sidebar-heading"
              className="bounce-sidebar-heading"
            >
              {label}
            </li>
          );
        }

        const href = typeof item === "string" ? undefined : item.href;
        const trailing = typeof item === "string" ? undefined : item.trailing;
        const isActive = index === activeIndex;

        return (
          <li
            key={`${index}-${label}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
          >
            {href ? (
              <Link
                href={href}
                data-slot="bounce-sidebar-item"
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => handleClick(event, index)}
                className="bounce-sidebar-item"
              >
                {label}
                {trailing}
              </Link>
            ) : (
              <button
                type="button"
                data-slot="bounce-sidebar-item"
                data-active={isActive}
                onClick={(event) => handleClick(event, index)}
                className="bounce-sidebar-item"
              >
                {label}
                {trailing}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
