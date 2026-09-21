import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/cron/* tem autenticação própria (CRON_SECRET via checkCronAuth) e é
// chamada sem sessão de usuário (cron da Vercel, GitHub Actions) — não deve
// passar pelo redirect de login.
const PUBLIC_PATHS = ["/login", "/auth", "/solicitar", "/acompanhar", "/api/cron", "/privacidade", "/instalar"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims() (não getSession()) valida a assinatura do JWT contra a
  // chave pública do projeto (ES256, cacheada) sem ida à rede, e ainda
  // renova o token expirado. Se o projeto voltasse a chaves simétricas, o
  // SDK cai sozinho pra getUser. Trade-off: uma sessão revogada só é
  // percebida quando o token expira (~1h) - o guard de conta pendente/
  // excluída no layout lê o banco a cada carga, então não depende disso.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? claimsData.claims : null;

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
