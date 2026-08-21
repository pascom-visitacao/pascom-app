-- ==========================================================================
-- Fecha o mesmo tipo de gap que corrigimos na reatribuicao, mas na
-- criacao: pasconeiro podia criar uma activity ja atribuida a
-- QUALQUER colega (a policy de INSERT so checava area_id, nunca
-- assignee_id). Diferente da reatribuicao, aqui nao precisa de
-- trigger - INSERT nao tem OLD row pra comparar, entao da pra
-- resolver direto no WITH CHECK da propria policy.
-- ==========================================================================

drop policy "activities: criação coordenação ou área dona" on activities;

create policy "activities: criação coordenação ou área dona" on activities
  for insert to authenticated
  with check (
    is_coordenacao()
    or (area_id = my_area_id() and (assignee_id is null or assignee_id = auth.uid()))
  );
