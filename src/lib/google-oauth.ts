// Troca de refresh token por access token, compartilhada por todos os
// clients Google (Drive, Calendar, ...) autenticados pela mesma conta
// institucional (pascomvisitacao@gmail.com) — não é login por usuário.
// Ver scripts/drive-oauth-setup/ pra como o refresh token foi gerado.
//
// Nunca importar isso em código que roda no navegador.

const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 30_000) {
    return cachedAccessToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao renovar access token do Google: ${await res.text()}`);
  }

  const data = await res.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedAccessToken.token;
}
