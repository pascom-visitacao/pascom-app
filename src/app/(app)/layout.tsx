import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";
import { AreaOnboardingModal } from "./area-onboarding-modal";
import { InitialOnboardingModal } from "./initial-onboarding-modal";
import { CoordenacaoPromotionBanner } from "./coordenacao-promotion-banner";
import { RevalidateOnFocus } from "./revalidate-on-focus";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, areas_submitted_at, name, avatar_url, onboarding_seen, account_status")
    .eq("id", user.id)
    .single();

  // Guard único pros dois casos - autenticado no Supabase não é o mesmo
  // que liberado no app. Vive só aqui, antes de qualquer lógica de
  // onboarding: pendente/excluído não deve nem entrar nesse fluxo.
  if (profile?.account_status === "pending") {
    redirect("/aguardando-aprovacao");
  }
  if (profile?.account_status === "deleted") {
    redirect("/conta-desativada");
  }

  const isCoordenacao = profile?.role === "coordenacao_geral";

  const { count: pendingApprovalsCount } = isCoordenacao
    ? await supabase.from("users").select("id", { count: "exact", head: true }).eq("account_status", "pending")
    : { count: 0 };
  const onboardingSeen = (profile?.onboarding_seen ?? {}) as Record<string, boolean>;
  const needsInitialOnboarding = !onboardingSeen.initial;
  // Nunca empilha modal: o conceitual (pulável) sempre vem antes do de
  // área (obrigatório) - só avalia esse depois que o outro já foi visto.
  const needsAreaOnboarding = !needsInitialOnboarding && profile?.areas_submitted_at === null;
  const needsPromotionNotice = isCoordenacao && !onboardingSeen.coordenacao_promovido;

  const { data: allAreas } = needsAreaOnboarding
    ? await supabase.from("areas").select("id, name").order("name")
    : { data: [] };

  return (
    <div className="ds-shell">
      <RevalidateOnFocus />
      <aside className="ds-sidebar">
        <Image
          src="/brand/pascom-horizontal-mono-negativo.svg"
          alt="Logo Pascom"
          width={132}
          height={35}
          className="ds-sidebar-logo"
        />
        <nav>
          <div className="ds-nav-group">
            <div className="ds-nav-group-title">Geral</div>
            <NavLink href="/inicio">Início</NavLink>
            <NavLink href="/tarefas">Tarefas</NavLink>
            <NavLink href="/agenda">Agenda</NavLink>
            <NavLink href="/equipamentos">Equipamentos</NavLink>
            <NavLink href="/materiais">Enviar fotos</NavLink>
            <NavLink href="/acervo">Acervo</NavLink>
            <NavLink href="/equipe">Equipe</NavLink>
            <NavLink href="/perfil">Meu perfil</NavLink>
            <NavLink href="/instalar">Instalar app</NavLink>
            <NavLink href="/sobre">Sobre o app</NavLink>
          </div>
          {isCoordenacao && (
            <div className="ds-nav-group">
              <div className="ds-nav-group-title">Administração</div>
              <NavLink href="/areas">Equipe &amp; Áreas</NavLink>
              <NavLink href="/configuracoes">
                Configurações
                {(pendingApprovalsCount ?? 0) > 0 && (
                  <span
                    style={{
                      marginLeft: "var(--space-2)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 20,
                      height: 20,
                      padding: "0 6px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--color-green-700)",
                      color: "#fff",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--weight-semibold)",
                    }}
                  >
                    {pendingApprovalsCount}
                  </span>
                )}
              </NavLink>
            </div>
          )}
        </nav>
      </aside>
      <main className="ds-main">
        {needsPromotionNotice && <CoordenacaoPromotionBanner />}
        {children}
      </main>
      <MobileNav
        isCoordenacao={isCoordenacao}
        userName={profile?.name ?? user.email ?? "Usuário"}
        avatarUrl={profile?.avatar_url ?? null}
        pendingApprovalsCount={pendingApprovalsCount ?? 0}
      />
      {needsInitialOnboarding ? (
        <InitialOnboardingModal firstName={(profile?.name ?? user.email ?? "Usuário").split(" ")[0]} />
      ) : (
        needsAreaOnboarding && <AreaOnboardingModal areas={allAreas ?? []} />
      )}
    </div>
  );
}
