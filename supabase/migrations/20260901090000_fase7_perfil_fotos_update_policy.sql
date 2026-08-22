-- ==========================================================================
-- Fase 7.4 (correção): upload de foto de perfil usa upsert:true, que o
-- Supabase resolve como um UPDATE quando já existe conflito de caminho
-- - a migration anterior só tinha a policy de INSERT, faltando esta.
-- ==========================================================================

create policy "perfil-fotos: atualização restrita à própria pasta"
  on storage.objects
  for update to authenticated
  using (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'perfil-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
