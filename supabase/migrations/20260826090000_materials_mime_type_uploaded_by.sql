-- ==========================================================================
-- Duas colunas novas em materials, pra suportar a integracao com o
-- Google Drive (Fase 5, parte 2): mime_type pra listar tipo de arquivo
-- sem consultar a API do Drive toda vez, uploaded_by pra saber quem
-- enviou. Ambas opcionais - linhas existentes ficam com NULL.
-- ==========================================================================

alter table materials
  add column mime_type text,
  add column uploaded_by uuid references users(id) on delete set null;
