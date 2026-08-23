const APP_VERSION = "v1.0";

export default function SobrePage() {
  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 560 }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-7)" }}>Sobre o app</h1>

      <div className="card flex flex-col" style={{ padding: "var(--space-7)", gap: "var(--space-6)" }}>
        <div>
          <div className="card-stat-label" style={{ marginBottom: "var(--space-2)" }}>
            Versão
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: "var(--weight-semibold)" }}>
            {APP_VERSION}
          </div>
        </div>

        <div>
          <div className="card-stat-label" style={{ marginBottom: "var(--space-3)" }}>
            Créditos
          </div>
          <p style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-loose)" }}>
            Idealizado por <strong>Matheus</strong> para a Pastoral da Comunicação. Desenvolvido com o
            apoio do <strong>Claude</strong>, ferramenta de IA da Anthropic que viabilizou a construção
            do app.
          </p>
        </div>
      </div>
    </div>
  );
}
