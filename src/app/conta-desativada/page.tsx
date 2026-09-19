import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/inicio/actions";

export default async function ContaDesativadaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("account_status")
    .eq("id", user.id)
    .single();

  if (profile?.account_status === "active") redirect("/inicio");
  if (profile?.account_status === "pending") redirect("/aguardando-aprovacao");

  return (
    <div
      className="flex justify-center items-center"
      style={{ background: "var(--color-bg-subtle)", minHeight: "100vh", padding: "var(--space-9)" }}
    >
      <div
        className="card flex flex-col items-center"
        style={{ maxWidth: 440, padding: "var(--space-9)", gap: "var(--space-5)", textAlign: "center" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Conta desativada</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Seu acesso à plataforma foi desativado. Se acha que isso é um engano, fale com a Coordenação da
          Pascom.
        </p>
        <form action={signOut}>
          <button type="submit" className="btn btn-outline btn-md">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
