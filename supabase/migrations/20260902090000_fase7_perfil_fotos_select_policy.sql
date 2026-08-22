-- ==========================================================================
-- Fase 7.4 (correção definitiva): upload com upsert:true faz um
-- INSERT ... ON CONFLICT DO UPDATE. Pra resolver o conflito, o Postgres
-- precisa enxergar as linhas existentes do bucket sob RLS - exige uma
-- policy de SELECT aplicável, mesmo sem conflito real. Faltava essa peça
-- (só tínhamos INSERT e UPDATE), causando rejeição do upsert inteiro.
-- ==========================================================================

create policy "perfil-fotos: leitura restrita à própria pasta"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
