import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  a_fazer: "Recebido",
  em_producao: "Em produção",
  revisao: "Em revisão",
  concluido: "Concluído",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

const STATUS_BADGE: Record<string, string> = {
  a_fazer: "badge-neutral",
  em_producao: "badge-primary",
  revisao: "badge-warning",
  concluido: "badge-success",
  recebido: "badge-neutral",
  cancelado: "badge-danger",
};

type RequestByToken = {
  category_name: string;
  description: string;
  deadline: string | null;
  created_at: string;
  current_status: string | null;
};

export default async function AcompanharPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: rawData, error } = await supabase
    .rpc("get_request_by_token", { p_token: token })
    .maybeSingle();

  if (error || !rawData) {
    notFound();
  }

  const data = rawData as RequestByToken;
  const status = data.current_status ?? "recebido";

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--color-bg-subtle)", minHeight: "100vh", padding: "var(--space-8)" }}
    >
      <div className="card card-elevated" style={{ maxWidth: 480, width: "100%", padding: "var(--space-9)" }}>
        <span className={`badge ${STATUS_BADGE[status] ?? "badge-neutral"}`} style={{ marginBottom: "var(--space-5)" }}>
          {STATUS_LABELS[status] ?? status}
        </span>

        <h1 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>
          {data.category_name}
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
          {data.description}
        </p>

        <div className="flex flex-col" style={{ gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
          {data.deadline && (
            <div>
              <strong>Prazo desejado:</strong>{" "}
              {new Date(data.deadline).toLocaleDateString("pt-BR")}
            </div>
          )}
          <div>
            <strong>Enviado em:</strong>{" "}
            {new Date(data.created_at).toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>
    </div>
  );
}
