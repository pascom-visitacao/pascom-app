-- ==========================================================================
-- Onboarding inicial (spec-onboarding.md, seção 5) — Camada 1 (modal
-- conceitual de 3 telas) + aviso de promoção a Coordenação geral (4.3).
-- Uma única coluna jsonb pra ambas as flags, em vez de colunas booleanas
-- separadas, pra permitir novas chaves futuras sem migration nova.
-- ==========================================================================

alter table users
  add column onboarding_seen jsonb not null default '{}'::jsonb;

-- Backfill: quem já usa o app não deve ver o onboarding conceitual nem o
-- aviso de promoção retroativamente — só quem se cadastrar depois desta
-- migration nasce com onboarding_seen = {} de verdade (dispara os dois
-- quando fizer sentido pra cada um).
update users
set onboarding_seen = jsonb_build_object('initial', true)
  || case when role = 'coordenacao_geral'
       then jsonb_build_object('coordenacao_promovido', true)
       else '{}'::jsonb
     end;

-- users usa grant por coluna desde 20260830090000 (revoke update on users
-- from authenticated + grant update (coluna) por campo) - sem isso, RLS
-- permitiria mas o GRANT de Postgres ainda bloquearia o UPDATE direto.
grant update (onboarding_seen) on users to authenticated;
