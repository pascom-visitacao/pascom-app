-- ==========================================================================
-- Fase 7.7 — Comentários em atividades
-- ==========================================================================

create table activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  -- on delete set null (não cascade): preserva o comentário se o autor
  -- sair da equipe, em vez de apagar o histórico da atividade junto
  author_id uuid references users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_activity_comments_activity_id on activity_comments(activity_id);

alter table activity_comments enable row level security;

create policy "comments: leitura para autenticados" on activity_comments
  for select to authenticated using (true);

create policy "comments: criação para autenticados" on activity_comments
  for insert to authenticated with check (author_id = auth.uid());

create policy "comments: exclusão autor ou coordenação" on activity_comments
  for delete to authenticated
  using (author_id = auth.uid() or is_coordenacao());
