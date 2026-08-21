import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./request-form";

export default async function SolicitarPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("request_categories")
    .select("id, name")
    .order("name");

  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .order("date", { ascending: true });

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--color-bg-subtle)", minHeight: "100vh", padding: "var(--space-8)" }}
    >
      <RequestForm categories={categories ?? []} events={events ?? []} />
    </div>
  );
}
