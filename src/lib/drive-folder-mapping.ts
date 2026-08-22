// Decide em qual pasta do Drive um material deve ser salvo, seguindo a
// hierarquia "Ano -> Natureza da demanda -> Projeto/Evento -> Tipo de
// material" descrita em docs/ (Diretrizes de Organização do Google Drive
// — PASCOM) e na seção 3.4 da especificação da plataforma.

type ActivityForMapping = {
  event?: { title: string } | null;
  parish_ministry?: { name: string } | null;
  area?: { name: string } | null;
  title: string;
};

// Regra 1 (atividade com evento): subpasta dentro do projeto do evento,
// por área. "Design" tem default ajustável — a spec deixa em aberto entre
// "Identidade Visual" e "Impressos", sem critério objetivo pra decidir
// sozinho; o chamador pode sobrescrever via manualSubfolder.
const AREA_TO_EVENT_SUBFOLDER: Record<string, string> = {
  "Redes sociais": "Redes Sociais",
  Fotografia: "Fotos",
  Transmissão: "Vídeos",
  Vídeo: "Vídeos",
  Design: "Identidade Visual",
};

const MONTH_NAMES = [
  "01 — Janeiro",
  "02 — Fevereiro",
  "03 — Março",
  "04 — Abril",
  "05 — Maio",
  "06 — Junho",
  "07 — Julho",
  "08 — Agosto",
  "09 — Setembro",
  "10 — Outubro",
  "11 — Novembro",
  "12 — Dezembro",
];

function currentYear(): string {
  return String(new Date().getFullYear());
}

function monthFolder(date: Date): string {
  return MONTH_NAMES[date.getMonth()];
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve o caminho de pastas pra um material anexado a uma atividade,
 * seguindo as regras automáticas da seção 3.4 (nessa ordem de prioridade).
 * Retorna null quando nenhuma regra automática se aplica — nesse caso o
 * chamador precisa oferecer o seletor manual (ver resolveManualCategoryPath).
 */
export function resolveActivityFolderPath(
  activity: ActivityForMapping,
  manualSubfolder?: string,
): string[] | null {
  const year = currentYear();

  if (activity.event) {
    const areaName = activity.area?.name ?? "";
    const subfolder = manualSubfolder || AREA_TO_EVENT_SUBFOLDER[areaName] || "Outros Materiais";
    return [year, "01 — Eventos e Campanhas", activity.event.title, subfolder];
  }

  if (activity.parish_ministry) {
    return [year, "03 — Pastorais e Movimentos", activity.parish_ministry.name];
  }

  if (activity.area?.name === "Redes sociais") {
    const now = new Date();
    return [year, "02 — Redes Sociais", monthFolder(now), `${isoDate(now)} — ${activity.title}`];
  }

  return null;
}

export type ManualCategory =
  | "comunicacao_institucional"
  | "fotos_videos_acervo"
  | "pastorais_movimentos"
  | "demandas_avulsas";

/**
 * Caminho de pastas pras categorias que a spec marca como não
 * automatizáveis (exigem julgamento humano) — usado quando
 * resolveActivityFolderPath retorna null, ou na tela "Enviar fotos"
 * sem evento relacionado. Sem categoria escolhida, cai em "Demandas
 * Avulsas" (default explícito da spec).
 */
export function resolveManualCategoryPath(
  category: ManualCategory | undefined,
  ministryName?: string,
): string[] {
  const year = currentYear();
  const now = new Date();

  switch (category) {
    case "comunicacao_institucional":
      return [year, "04 — Comunicação Institucional", "Materiais Institucionais"];
    case "fotos_videos_acervo":
      return [year, "05 — Fotos e Vídeos", monthFolder(now), isoDate(now)];
    case "pastorais_movimentos":
      return [year, "03 — Pastorais e Movimentos", ministryName || "Outros"];
    case "demandas_avulsas":
    default:
      return [year, "06 — Demandas Avulsas"];
  }
}

/**
 * Caminho pro fluxo da tela "Enviar fotos": evento relacionado (opcional)
 * -> pasta do evento; sem evento -> acervo "Fotos e Vídeos" por mês/data.
 */
export function resolveBulkPhotoUploadPath(eventTitle?: string): string[] {
  const year = currentYear();
  const now = new Date();

  if (eventTitle) {
    return [year, "01 — Eventos e Campanhas", eventTitle, "Fotos"];
  }

  return [year, "05 — Fotos e Vídeos", monthFolder(now), isoDate(now)];
}
