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
// cima - único caso com texto escuro; os outros 4 (incluindo neutro, que
// usa --color-dark-bg, o mesmo cinza-quase-preto do badge "Urgente") têm
// contraste suficiente com branco.
export const EVENT_COLOR_STYLE: Record<EventColor, { background: string; color: string }> = {
  verde: { background: "var(--color-secondary)", color: "#fff" },
  azul: { background: "var(--color-primary)", color: "#fff" },
  ambar: { background: "var(--color-accent)", color: "var(--color-text)" },
  vermelho: { background: "var(--color-danger)", color: "#fff" },
  neutro: { background: "var(--color-dark-bg)", color: "#fff" },
};
