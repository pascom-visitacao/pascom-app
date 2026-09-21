import { cache } from "react";
import { createClient } from "./server";

// cache() do React vale por request: layout e página compartilham o mesmo
// cliente, a mesma identidade e o mesmo perfil, em vez de cada um refazer
// as chamadas (cada uma era uma ida à rede).
export const getSupabase = cache(createClient);

// getClaims valida a assinatura do JWT localmente (chave pública ES256 do
// projeto, cacheada), sem ir ao Supabase Auth. Se o token fosse de chave
// simétrica, o próprio SDK cai de volta pra getUser. Ações que ESCREVEM
// continuam usando getUser (validação de rede) por segurança.
export const getCurrentUser = cache(async () => {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

// Superconjunto das colunas de perfil que layout e páginas usam - assim
// uma única ida ao banco atende os dois.
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("users")
    .select("role, name, avatar_url, onboarding_seen, account_status, area_ids, pending_area_ids, areas_submitted_at")
    .eq("id", user.id)
    .single();
  return data;
});
