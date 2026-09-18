-- ==========================================================================
-- Ajustes pós-Fase 6 (item 4) — cor da etiqueta do evento no calendário.
-- Restrito às 5 cores semânticas do design system (verde/azul/âmbar/
-- vermelho/neutro), não hex livre - por isso enum, não text.
-- ==========================================================================

create type event_color as enum ('verde', 'azul', 'ambar', 'vermelho', 'neutro');

alter table events
  add column color event_color not null default 'azul';
