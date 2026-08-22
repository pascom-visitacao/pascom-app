import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com a service_role key — ignora RLS por completo.
 *
 * Só pode ser usado em rotas server-only sem sessão de usuário (cron
 * jobs). Nunca importar isso em código que roda no navegador ou em
 * qualquer caminho que atenda requisição de um usuário logado — para
 * isso, use src/lib/supabase/server.ts (respeita RLS).
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
