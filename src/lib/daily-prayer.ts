// Sorteio da intenção de oração do dia: função pura, sem banco nem cron.
// Mesma data + mesmo pool = mesmo resultado pra todo mundo.
//
// Usa "rendezvous hashing" ponderado (cada entrada recebe uma nota
// derivada de hash(data + chave) e a maior nota vence) em vez de
// hash % tamanho: se o pool mudar no meio do dia (alguém aprovado ou
// excluído), o sorteio só muda se a entrada nova tirar a maior nota ou se
// a sorteada sair do pool - não embaralha tudo como faria o módulo.

export type PrayerEntry = {
  key: string;
  label: string;
  weight: number;
  userId?: string;
};

// Entradas fixas (padre, Papa) contam como 3 no pool, pra aparecerem mais
// que o sorteio uniforme daria.
export const FIXED_ENTRY_WEIGHT = 3;

// Data do dia em Brasília (não UTC - senão o dia viraria às 21h).
export function saoPauloDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// cyrb53: hash de 53 bits, determinístico e bem distribuído.
function hash53(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function pickDailyEntry(dateKey: string, entries: PrayerEntry[]): PrayerEntry | null {
  let best: PrayerEntry | null = null;
  let bestScore = -Infinity;

  for (const entry of entries) {
    // u em (0, 1): -weight / ln(u) dá probabilidade proporcional ao peso
    const u = (hash53(`${dateKey}|${entry.key}`) + 0.5) / 2 ** 53;
    const score = -entry.weight / Math.log(u);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best;
}
