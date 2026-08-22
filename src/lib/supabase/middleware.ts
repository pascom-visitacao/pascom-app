import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/cron/* tem autenticação própria (CRON_SECRET via checkCronAuth) e é
// chamada sem sessão de usuário (cron da Vercel, GitHub Actions) — não deve
// passar pelo redirect de login.
const PUBLIC_PATHS = ["/login", "/auth", "/solicitar", "/acompanhar", "/api/cron"];

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

  // IMPORTANT: getUser() (not getSession()) re-validates the token against
  // Supabase Auth on every request — required for middleware to trust it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
