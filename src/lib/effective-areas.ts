// Espelha a lógica de effective_area_ids() (supabase/migrations/...multiplas_areas.sql)
// em TS, pra telas que listam vários usuários de uma vez sem precisar
// de uma chamada à função por linha. Mesma regra: pendente só vale
// depois de 24h desde o envio; antes disso, o conjunto vigente é o
// atual salvo em area_ids.
export function effectiveAreaIds(user: {
  area_ids: string[] | null;
  pending_area_ids: string[] | null;
  areas_submitted_at: string | null;
}): string[] {
  if (
    user.pending_area_ids &&
    user.areas_submitted_at &&
    Date.now() - new Date(user.areas_submitted_at).getTime() >= 24 * 60 * 60 * 1000
  ) {
    return user.pending_area_ids;
  }
  return user.area_ids ?? [];
}
