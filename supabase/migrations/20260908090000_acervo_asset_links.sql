-- ==========================================================================
-- Acervo (/acervo) — blocos com link de referência pra pastas do Google
-- Drive (logo da paróquia, logo da Pascom, diretrizes, templates, modelo
-- de camiseta etc). Mesma forma de social_media_accounts, tabela separada
-- porque é outro domínio (arquivo institucional, não credencial de rede
-- social) e a página é de leitura aberta a qualquer autenticado, não só
-- Coordenação.
-- ==========================================================================

create table asset_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reference_link text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table asset_links enable row level security;

create policy "asset_links: leitura para autenticados" on asset_links
  for select to authenticated using (true);

create policy "asset_links: escrita só coordenação" on asset_links
  for all to authenticated
  using (is_coordenacao()) with check (is_coordenacao());
