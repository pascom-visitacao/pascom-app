-- ==========================================================================
-- Audio nos pedidos externos (spec-audio-pedidos.md): o solicitante grava
-- ou anexa um audio no formulario publico; o Pasconeiro ouve no briefing.
-- Custo zero: so Supabase Storage + Vercel, sem transcricao.
--
-- Fluxo: a Server Action de /solicitar sobe o arquivo pro bucket PRIVADO
-- com a service role (anon nunca escreve direto no bucket), depois chama
-- submit_external_request com o caminho. O trigger de roteamento copia o
-- caminho pra activity, que e quem e excluida (e leva o audio junto, ver
-- deleteActivity em tarefas/actions.ts).
-- ==========================================================================

-- ---------------------------------------------------------------------
-- Colunas: no pedido (pra o trigger de roteamento enxergar) e na
-- atividade (o que o app le e o que e excluido).
-- audio_duration_seconds vem do cronometro do navegador (nao do arquivo:
-- webm gravado no Chrome costuma vir sem metadado de duracao).
-- ---------------------------------------------------------------------
alter table external_requests
  add column audio_path text,
  add column audio_mime text,
  add column audio_duration_seconds integer;

alter table activities
  add column audio_path text,
  add column audio_mime text,
  add column audio_duration_seconds integer;

-- ---------------------------------------------------------------------
-- Bucket privado. Sem policy de INSERT pra ninguem: o upload so acontece
-- pelo servidor com a service role (que ignora RLS). Formatos e tamanho
-- (2,5MB) tambem sao validados no servidor - o limite do bucket e so
-- uma segunda rede.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-audios',
  'request-audios',
  false,
  2621440,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura: qualquer usuario logado (mesma regra de visibilidade das
-- atividades, que ja sao legiveis por todo autenticado). anon fica sem
-- acesso nenhum. Assim o app assina URLs curtas com o client normal, sem
-- precisar de service role numa requisicao de usuario logado.
create policy "request-audios: leitura autenticados"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'request-audios');

-- Exclusao: so coordenacao, mesma regra de delete de activities. E por
-- aqui que deleteActivity apaga o arquivo antes de apagar a linha.
create policy "request-audios: exclusao coordenacao"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'request-audios' and is_coordenacao());

-- ---------------------------------------------------------------------
-- RPC publico: ganha os 3 parametros de audio. Drop antes de recriar,
-- senao create or replace deixa o overload velho (7 parametros) sobrando.
-- ---------------------------------------------------------------------
drop function if exists submit_external_request(uuid, text, text, text, date, uuid, text[]);

create function submit_external_request(
  p_category_id uuid,
  p_description text,
  p_requester_name text,
  p_requester_contact text,
  p_deadline date default null,
  p_event_id uuid default null,
  p_attachment_urls text[] default null,
  p_audio_path text default null,
  p_audio_mime text default null,
  p_audio_duration_seconds integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  insert into external_requests (
    category_id, description, requester_name, requester_contact, deadline, event_id,
    attachment_urls, audio_path, audio_mime, audio_duration_seconds
  )
  values (
    p_category_id, p_description, p_requester_name, p_requester_contact, p_deadline, p_event_id,
    p_attachment_urls, p_audio_path, p_audio_mime, p_audio_duration_seconds
  )
  returning tracking_token into v_token;

  return v_token;
end;
$$;

grant execute on function submit_external_request(uuid, text, text, text, date, uuid, text[], text, text, integer)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- Roteamento: a activity criada a partir do pedido herda o audio.
-- Mesma funcao de 20260822200000_fase4_atividades_calendario.sql, so com
-- as 3 colunas novas.
-- ---------------------------------------------------------------------
create or replace function route_external_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activities (
    title, description, status, area_id, source, request_id, due_date, event_id,
    audio_path, audio_mime, audio_duration_seconds
  )
  select
    rc.name || ' — ' || new.requester_name,
    new.description,
    'a_fazer',
    new.area_id,
    'pedido_externo',
    new.id,
    new.deadline,
    new.event_id,
    new.audio_path,
    new.audio_mime,
    new.audio_duration_seconds
  from request_categories rc
  where rc.id = new.category_id;
  return new;
end;
$$;
