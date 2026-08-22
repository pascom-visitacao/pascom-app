import { NextRequest, NextResponse } from "next/server";

/**
 * Confere o header Authorization: Bearer <CRON_SECRET>. Necessário
 * porque essas rotas são chamadas de fora da Vercel (GitHub Actions),
 * então não têm a proteção automática que o cron nativo da Vercel dá.
 */
export function checkCronAuth(request: NextRequest): NextResponse | null {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
