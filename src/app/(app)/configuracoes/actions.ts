"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function createSocialMediaAccount(formData: FormData) {
  const platformName = String(formData.get("platform_name") ?? "").trim();
  const referenceLink = String(formData.get("reference_link") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!platformName || !referenceLink) return;

  const supabase = await createClient();
  const { error } = await supabase.from("social_media_accounts").insert({
    platform_name: platformName,
    reference_link: referenceLink,
    notes: notes || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes");
}

export async function deleteSocialMediaAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("social_media_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes");
}

// Aprovação de conta (primeiro login): pending -> active. RLS + o
// trigger enforce_users_self_update já garantem que só coordenação
// consegue - sem checagem extra aqui.
export async function approveUser(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ account_status: "active" }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes");
}

// Recusa uma conta pendente: exclusão real (nunca tem atividade/vaga/
// comentário vinculado, sem risco de órfão). Precisa remover dos dois
// lados - só public.users deixaria a pessoa presa autenticada mas sem
// nenhuma linha de perfil, caso ela tentasse logar de novo (o trigger
// de criação só dispara em INSERT em auth.users, não a cada login).
//
// service_role só é usado aqui, nessa chamada específica
// (auth.admin.deleteUser) - nunca pra leitura/escrita geral de tabela.
// Confirma is_coordenacao() pelo client normal ANTES de tocar nisso.
export async function rejectUser(userId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: actor } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (actor?.role !== "coordenacao_geral") {
    throw new Error("Apenas coordenação geral pode recusar uma conta");
  }

  const { error: deleteRowError } = await supabase.from("users").delete().eq("id", userId);
  if (deleteRowError) throw new Error(deleteRowError.message);

  const admin = createServiceRoleClient();
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
  // "User not found" = já foi excluído (ex: clique duplo) - o resultado
  // final é o mesmo que o esperado, não é uma falha de verdade.
  if (deleteAuthError && !deleteAuthError.message.toLowerCase().includes("not found")) {
    throw new Error(deleteAuthError.message);
  }

  revalidatePath("/configuracoes");
}
