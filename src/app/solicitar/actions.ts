"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitExternalRequest(formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const requesterName = String(formData.get("requester_name") ?? "").trim();
  const requesterContact = String(formData.get("requester_contact") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");
  const eventId = String(formData.get("event_id") ?? "");

  if (!categoryId || !description || !requesterName || !requesterContact) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_external_request", {
    p_category_id: categoryId,
    p_description: description,
    p_requester_name: requesterName,
    p_requester_contact: requesterContact,
    p_deadline: deadline || null,
    p_event_id: eventId || null,
  });

  if (error) {
    return { error: "Não foi possível enviar o pedido. Tente novamente." };
  }

  return { token: data as string };
}
