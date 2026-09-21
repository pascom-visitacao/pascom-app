"use server";

import { getCurrentProfile, getSupabase } from "@/lib/supabase/request";

// Leitura pura (nada a revalidar): usada só pelo selo de aprovações
// pendentes, que se atualiza sozinho sem precisar recarregar a página.
export async function getPendingApprovalsCount(): Promise<number> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "coordenacao_geral") return 0;

  const supabase = await getSupabase();
  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("account_status", "pending");
  return count ?? 0;
}
