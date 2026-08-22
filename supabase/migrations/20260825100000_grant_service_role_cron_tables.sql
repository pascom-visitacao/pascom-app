-- ==========================================================================
-- Concede ao papel service_role o privilegio basico de tabela (GRANT) nas
-- tabelas que as rotas de cron (/api/cron/*) leem/escrevem. Mesmo problema
-- que ja tinha acontecido com anon em areas (ver
-- 20260821090000_grant_table_privileges.sql): service_role tem BYPASSRLS,
-- mas isso so pula a avaliacao das policies - sem o GRANT de tabela, o
-- Postgres nega o acesso antes mesmo de chegar no RLS ("permission denied
-- for table X").
--
-- Escopo restrito as tabelas que os crons realmente usam hoje, em vez de
-- "all tables in schema public": service_role ja ignora RLS, entao limitar
-- o GRANT por tabela e a unica camada de contencao que sobra se essa
-- chave vazar. Uma rota de cron futura que precisar de outra tabela deve
-- ganhar um GRANT explicito, nao herdar automaticamente.
-- ==========================================================================

grant usage on schema public to service_role;

grant select, update on activities to service_role;
grant select, update on schedules to service_role;
grant select on events to service_role;
grant select on areas to service_role;
grant select on users to service_role;
