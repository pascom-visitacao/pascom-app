import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/inicio/actions";

export default async function AguardandoAprovacaoPage() {
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

  // Já foi aprovado ou excluído entre o momento do login e agora -
  // manda pro lugar certo em vez de deixar preso numa tela que não se
  // aplica mais.
  if (profile?.account_status === "active") redirect("/inicio");
  if (profile?.account_status === "deleted") redirect("/conta-desativada");

  return (
    <div
      className="flex justify-center items-center"
      style={{ background: "var(--color-bg-subtle)", minHeight: "100vh", padding: "var(--space-9)" }}
    >
      <div
        className="card flex flex-col items-center"
        style={{ maxWidth: 440, padding: "var(--space-9)", gap: "var(--space-5)", textAlign: "center" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Sua conta foi criada</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Está aguardando aprovação de um coordenador. Assim que for aprovada, você já consegue acessar a
          plataforma normalmente — não precisa fazer nada, é só aguardar.
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
