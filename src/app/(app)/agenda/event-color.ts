import type { EventColor } from "./actions";

export const EVENT_COLOR_LABELS: Record<EventColor, string> = {
  verde: "Verde",
  azul: "Azul",
  ambar: "Âmbar",
  vermelho: "Vermelho",
  neutro: "Neutro",
};

// Preenchimento sólido dos 5 tokens semânticos do design system (nunca
// hex livre). Âmbar (--color-accent) é claro demais pra texto branco em
// cima, e o verde de marca (--color-secondary) também: com branco dá só
// 2,29:1, e com --color-text dá 7,12:1. Contraste medido do texto: azul
// 4,57:1, vermelho 5,29:1 (por isso --color-danger-solid, e não
// --color-danger, que dava 3,98:1), neutro (--color-dark-bg, o mesmo
// cinza-quase-preto do badge "Urgente") 16,30:1 e âmbar 9,22:1.
export const EVENT_COLOR_STYLE: Record<EventColor, { background: string; color: string }> = {
  verde: { background: "var(--color-secondary)", color: "var(--color-text)" },
  azul: { background: "var(--color-primary)", color: "#fff" },
  ambar: { background: "var(--color-accent)", color: "var(--color-text)" },
  vermelho: { background: "var(--color-danger-solid)", color: "#fff" },
  neutro: { background: "var(--color-dark-bg)", color: "#fff" },
};
