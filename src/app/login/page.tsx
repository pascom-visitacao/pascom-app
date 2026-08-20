"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function handleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--color-bg-subtle)" }}
    >
      <div
        className="card card-elevated"
        style={{ maxWidth: 420, width: "100%", padding: "var(--space-9)", textAlign: "center" }}
      >
        <Image
          src="/brand/pascom-horizontal.svg"
          alt="Logo Pascom"
          width={180}
          height={48}
          style={{ margin: "0 auto var(--space-7)" }}
          priority
        />
        <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>
          Plataforma de Gestão
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-7)" }}>
          Entre com a conta Google da paróquia para acessar o painel da
          Pastoral da Comunicação.
        </p>
        <button
          onClick={handleLogin}
          className="btn btn-primary btn-md"
          style={{ margin: "0 auto" }}
        >
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
