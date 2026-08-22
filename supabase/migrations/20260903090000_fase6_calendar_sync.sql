-- ==========================================================================
-- Fase 6 (2/3) — Sincronização com Google Calendar, Etapa 1 (mão única:
-- app -> Google Calendar). Guarda o id do evento correspondente no Google
-- Calendar pra permitir editar/excluir no futuro, quando essa
-- funcionalidade existir no app. Sem mudança de RLS: é só mais uma
-- coluna na mesma tabela que Coordenação geral já escreve.
-- ==========================================================================

alter table events
  add column google_calendar_event_id text;
