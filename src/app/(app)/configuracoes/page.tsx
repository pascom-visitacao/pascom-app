import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser, getSupabase } from "@/lib/supabase/request";
import { createSocialMediaAccount } from "./actions";
import { DeleteSocialMediaButton } from "./delete-social-media-button";
import { DeletePrayerEntryButton } from "./delete-prayer-entry-button";
import { EditPrayerEntryForm, NewPrayerEntryForm } from "./prayer-entry-forms";
import { PendingApprovalRow } from "./pending-approval-row";

export default async function ConfiguracoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const [profile, { data: prayerEntries }, { data: accounts }, { data: pendingUsers }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("prayer_fixed_entries").select("id, name").order("name"),
    supabase
      .from("social_media_accounts")
      .select("id, platform_name, reference_link, notes")
      .order("platform_name"),
    supabase
      .from("users")
      .select("id, name, email, avatar_url, created_at")
      .eq("account_status", "pending")
      .order("created_at"),
  ]);

  if (profile?.role !== "coordenacao_geral") {
    redirect("/inicio");
  }

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 880 }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Configurações</h1>

      <section style={{ marginBottom: "var(--space-10)" }}>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Aprovações pendentes</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-5)" }}>
          Quem faz login pela primeira vez fica aqui até ser aprovado — entra como Pasconeiro, sem área
          definida (atribua depois em Equipe &amp; Áreas).
        </p>

        <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
          {(pendingUsers ?? []).map((pending) => (
            <PendingApprovalRow key={pending.id} user={pending} />
          ))}
          {(pendingUsers ?? []).length === 0 && (
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              Nenhuma aprovação pendente.
            </span>
          )}
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-10)" }}>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Áreas e equipe</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
          Cadastro de áreas, categorias de pedido, e papel/área de cada pessoa da equipe.
        </p>
        <Link href="/areas" className="btn btn-outline btn-md">
          Ir para Equipe &amp; Áreas
        </Link>
      </section>

      <section style={{ marginBottom: "var(--space-10)" }}>
        <h2 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}>Intenções fixas de oração</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-5)" }}>
          O cartão do painel sorteia a intenção do dia entre a equipe, as pastorais e estas entradas fixas
          (ex: o padre da paróquia, o Papa) — que aparecem com mais frequência. Renomeie pra colocar o nome
          da pessoa, se preferir.
        </p>

        <div className="flex flex-col" style={{ gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          {(prayerEntries ?? []).map((entry) => (
            <div
              key={entry.id}
              className="card flex items-center justify-between flex-wrap"
              style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}
            >
              <EditPrayerEntryForm id={entry.id} name={entry.name} />
              <DeletePrayerEntryButton id={entry.id} name={entry.name} />
            </div>
          ))}
          {(prayerEntries ?? []).length === 0 && (
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              Nenhuma intenção fixa cadastrada.
            </span>
          )}
        </div>

        <NewPrayerEntryForm />
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
              <DeleteSocialMediaButton id={account.id} platformName={account.platform_name} />
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
