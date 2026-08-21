-- ==========================================================================
-- Fase 3: central de pedidos externos.
-- O schema/roteamento automatico (external_requests, request_categories,
-- trigger route_external_request, get_request_by_token) ja existe desde
-- a Fase 1. Falta so:
--
-- 1. events legivel por anon (o form publico pede "evento relacionado",
--    que e uma FK de verdade pra events.id - hoje so authenticated le
--    essa tabela).
-- 2. um RPC pra inserir o pedido E devolver o tracking_token pro
--    solicitante anonimo, sem precisar abrir SELECT em
--    external_requests pro anon (isso vazaria os pedidos de todo mundo -
--    o mesmo motivo pelo qual get_request_by_token existe).
-- ==========================================================================

create policy "events: leitura publica" on events
  for select to anon using (true);

create function submit_external_request(
  p_category_id uuid,
  p_description text,
  p_requester_name text,
  p_requester_contact text,
  p_deadline date default null,
  p_event_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  insert into external_requests (category_id, description, requester_name, requester_contact, deadline, event_id)
  values (p_category_id, p_description, p_requester_name, p_requester_contact, p_deadline, p_event_id)
  returning tracking_token into v_token;

  return v_token;
end;
$$;

grant execute on function submit_external_request(uuid, text, text, text, date, uuid) to anon, authenticated;
