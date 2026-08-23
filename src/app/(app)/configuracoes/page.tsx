import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSocialMediaAccount } from "./actions";
import { DeleteSocialMediaButton } from "./delete-social-media-button";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coordenacao_geral") {
    redirect("/inicio");
  }

  const { data: accounts } = await supabase
    .from("social_media_accounts")
    .select("id, platform_name, reference_link, notes")
    .order("platform_name");

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 880 }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Configurações</h1>

      <section style={{ marginBottom: "var(--space-10)" }}>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Áreas e equipe</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
          Cadastro de áreas, categorias de pedido, e papel/área de cada pessoa da equipe.
        </p>
        <Link href="/areas" className="btn btn-outline btn-md">
          Ir para Equipe &amp; Áreas
        </Link>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Painel de redes sociais</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-5)" }}>
          Só um link de referência pra onde encontrar a credencial (ex: cofre compartilhado do gerenciador de
          senhas da equipe) — o app nunca guarda login/senha real.
        </p>

        <div className="flex flex-col" style={{ gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          {(accounts ?? []).map((account) => (
            <div
              key={account.id}
              className="card flex items-center justify-between flex-wrap"
              style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
            >
              <div>
                <div style={{ fontWeight: "var(--weight-semibold)" }}>{account.platform_name}</div>
                <a
                  href={account.reference_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {account.reference_link}
                </a>
                {account.notes && (
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    {account.notes}
                  </div>
                )}
              </div>
              <DeleteSocialMediaButton id={account.id} />
            </div>
          ))}
          {(accounts ?? []).length === 0 && (
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              Nenhuma rede cadastrada ainda.
            </span>
          )}
        </div>

        <form action={createSocialMediaAccount} className="flex items-end flex-wrap" style={{ gap: "var(--space-3)" }}>
          <div className="field" style={{ maxWidth: 200 }}>
            <label className="field-label">Plataforma</label>
            <div className="input-wrap">
              <input type="text" name="platform_name" placeholder="Ex: Instagram" required />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 280 }}>
            <label className="field-label">Link de referência</label>
            <div className="input-wrap">
              <input type="url" name="reference_link" placeholder="https://..." required />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label className="field-label">Notas (opcional)</label>
            <div className="input-wrap">
              <input type="text" name="notes" placeholder="Ex: cofre 'Redes' no Bitwarden" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-md">
            Adicionar
          </button>
        </form>
      </section>
    </div>
  );
}
