// Cliente server-only pro Google Calendar, autenticado pela mesma conta
// institucional (pascomvisitacao@gmail.com) usada pro Drive - ver
// google-oauth.ts. Sincronização de mão única (Etapa 1): o app cria
// eventos no calendário "primary" dessa conta, nunca lê de volta. Uma
// futura Etapa 2 (Google Calendar -> app) e edição/exclusão de evento no
// app ficam propositalmente fora daqui por enquanto.
//
// Nunca importar isso em código que roda no navegador.

import { getGoogleAccessToken } from "./google-oauth";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type CreatedCalendarEvent = {
  id: string;
  htmlLink: string;
};

/**
 * Cria um evento no Google Calendar da conta institucional. `date` é o
 * horário de início (ISO); a duração é fixa em 1h já que o app hoje não
 * modela hora de término de evento.
 */
export async function createCalendarEvent(params: {
  title: string;
  date: string;
  location: string | null;
  description: string | null;
}): Promise<CreatedCalendarEvent> {
  const accessToken = await getGoogleAccessToken();

  const start = new Date(params.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const res = await fetch(CALENDAR_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: params.title,
      location: params.location ?? undefined,
      description: params.description ?? undefined,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar evento no Google Calendar: ${await res.text()}`);
  }

  return res.json();
}
