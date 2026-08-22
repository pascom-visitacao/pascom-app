import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";

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
    .select("role")
    .eq("id", user.id)
    .single();

  const isCoordenacao = profile?.role === "coordenacao_geral";

  return (
    <div className="ds-shell">
      <aside className="ds-sidebar">
        <Image
          src="/brand/pascom-horizontal.svg"
          alt="Logo Pascom"
          width={132}
          height={35}
          className="ds-sidebar-logo"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <nav>
          <div className="ds-nav-group">
            <div className="ds-nav-group-title">Geral</div>
            <NavLink href="/dashboard">Painel</NavLink>
            <NavLink href="/atividades">Atividades</NavLink>
            <NavLink href="/calendario">Calendário</NavLink>
            <NavLink href="/materiais">Enviar fotos</NavLink>
          </div>
          {isCoordenacao && (
            <div className="ds-nav-group">
              <div className="ds-nav-group-title">Administração</div>
              <NavLink href="/areas">Equipe &amp; Áreas</NavLink>
              <NavLink href="/configuracoes">Configurações</NavLink>
            </div>
          )}
        </nav>
      </aside>
      <main className="ds-main">{children}</main>
      <MobileNav isCoordenacao={isCoordenacao} />
    </div>
  );
}
