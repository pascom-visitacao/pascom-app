-- ==========================================================================
-- Anexos de imagem no formulario publico de pedidos.
-- Usa Supabase Storage por enquanto (disponivel sem configuracao nova);
-- migrar pra Google Drive fica pra Fase 5, sem precisar mudar nada
-- visivel pro usuario - so trocar o que popula attachment_urls.
-- ==========================================================================

-- bucket publico (leitura por URL direta, sem listagem), 5MB por
-- arquivo, só imagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pedidos-anexos',
  'pedidos-anexos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "pedidos-anexos: upload publico"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'pedidos-anexos');

alter table external_requests add column attachment_urls text[];

-- get_request_by_token e submit_external_request precisam de novo
-- shape (coluna/parametro a mais) - drop antes de recriar, senao
-- create or replace deixa um overload velho sobrando.

drop function if exists get_request_by_token(text);

create function get_request_by_token(p_token text)
returns table (
  id uuid,
  category_name text,
  description text,
  deadline date,
  created_at timestamptz,
  request_status request_status,
  activity_status activity_status,
  current_status text,
  attachment_urls text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    er.id,
    rc.name as category_name,
    er.description,
    er.deadline,
    er.created_at,
    er.status as request_status,
    a.status as activity_status,
    coalesce(a.status::text, er.status::text) as current_status,
    er.attachment_urls
  from external_requests er
  join request_categories rc on rc.id = er.category_id
  left join activities a on a.request_id = er.id
  where er.tracking_token = p_token;
$$;

grant execute on function get_request_by_token(text) to anon, authenticated;

drop function if exists submit_external_request(uuid, text, text, text, date, uuid);

create function submit_external_request(
  p_category_id uuid,
  p_description text,
  p_requester_name text,
  p_requester_contact text,
  p_deadline date default null,
  p_event_id uuid default null,
  p_attachment_urls text[] default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  insert into external_requests (category_id, description, requester_name, requester_contact, deadline, event_id, attachment_urls)
  values (p_category_id, p_description, p_requester_name, p_requester_contact, p_deadline, p_event_id, p_attachment_urls)
  returning tracking_token into v_token;

  return v_token;
end;
$$;

grant execute on function submit_external_request(uuid, text, text, text, date, uuid, text[]) to anon, authenticated;
