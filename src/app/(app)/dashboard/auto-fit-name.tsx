"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MIN_FONT_SIZE = 18;

/**
 * Encolhe o próprio font-size até caber na largura disponível do
 * container pai, sem quebrar linha nem estourar o layout - só entra em
 * ação quando o nome é longo o bastante pra não caber no tamanho máximo.
 */
export function AutoFitName({ name, maxFontSize }: { name: string; maxFontSize: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const el = spanRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    function fit() {
      let size = maxFontSize;
      el!.style.fontSize = `${size}px`;
      while (el!.scrollWidth > parent!.clientWidth && size > MIN_FONT_SIZE) {
        size -= 1;
        el!.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [name, maxFontSize]);

  return (
    <span ref={spanRef} style={{ fontSize, whiteSpace: "nowrap" }}>
      {name}
    </span>
  );
}
