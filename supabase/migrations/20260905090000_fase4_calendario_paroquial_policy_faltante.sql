-- ==========================================================================
-- Correção: a policy do bucket calendario-paroquial (definida na
-- migration original 20260822200000_fase4_atividades_calendario.sql)
-- nunca chegou a ser criada de verdade neste banco - só o bucket
-- existia, sem nenhuma policy de storage.objects permitindo escrita.
-- Testado ao vivo: upload de referência falhava com RLS mesmo pra
-- Coordenação. Recria exatamente a policy original.
-- ==========================================================================

create policy "calendario-paroquial: acesso so coordenacao"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'calendario-paroquial' and is_coordenacao())
  with check (bucket_id = 'calendario-paroquial' and is_coordenacao());
