-- ==========================================================================
-- Fase 4.4 — Tag "urgente" em atividades
-- Manual (não automática por prazo), marcada só internamente (não faz
-- parte do formulário público /solicitar), mesmo nível de acesso que já
-- rege priority hoje: a policy ampla de UPDATE em activities (coordenação,
-- responsável, ou qualquer um da área) já cobre - sem RLS nem trigger
-- novos, mesmo padrão que priority (que também não tem trigger próprio).
-- ==========================================================================

alter table activities
  add column is_urgent boolean not null default false;
