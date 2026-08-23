"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Chaves de onboarding_seen (jsonb) - "initial" é o modal conceitual de
// 3 telas (spec-onboarding.md 4.1), "coordenacao_promovido" é o aviso
// de promoção a Coordenação geral (spec-onboarding.md 4.3). Lê e faz
// merge no objeto em vez de sobrescrever, pra não apagar a outra chave.
export async function setOnboardingFlag(key: "initial" | "coordenacao_promovido") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile, error: fetchError } = await supabase
    .from("users")
    .select("onboarding_seen")
    .eq("id", user.id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const current = (profile.onboarding_seen ?? {}) as Record<string, boolean>;

  const { error } = await supabase
    .from("users")
    .update({ onboarding_seen: { ...current, [key]: true } })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
