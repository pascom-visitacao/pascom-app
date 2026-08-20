-- ==========================================================================
-- Concede aos papeis anon/authenticated o privilegio basico de tabela
-- (GRANT) que faltou na migration inicial. RLS continua sendo quem
-- realmente decide o que cada um le/escreve linha a linha - esse GRANT
-- so destrava a checagem de privilegio que o Postgres faz ANTES de
-- avaliar as policies (sem ele, toda query cai em
-- "permission denied for table X", como aconteceu com anon em areas).
-- ==========================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated;

-- garante que tabelas criadas por migrations futuras tambem recebam
-- o grant automaticamente, sem precisar lembrar de novo
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
