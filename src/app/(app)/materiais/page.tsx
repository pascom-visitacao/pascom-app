import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EnviarFotosForm } from "./enviar-fotos-form";

export default async function MateriaisPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .order("date", { ascending: false });

  return (
    <div style={{ padding: "var(--space-9)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Enviar fotos</h1>
      <EnviarFotosForm events={events ?? []} />
    </div>
  );
}
