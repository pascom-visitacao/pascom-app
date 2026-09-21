// Esqueleto único das rotas do app: aparece na hora do clique enquanto o
// servidor monta a página (sem isso, a tela ficava parada ~0,3-1s).
export function RouteLoading() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      style={{ padding: "var(--space-9)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
    >
      <div className="skeleton" style={{ height: 32, width: 220 }} />
      <div className="skeleton" style={{ height: 16, width: 340, maxWidth: "100%" }} />
      <div className="flex flex-col" style={{ gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
        <div className="skeleton" style={{ height: 88 }} />
        <div className="skeleton" style={{ height: 88 }} />
        <div className="skeleton" style={{ height: 88 }} />
      </div>
    </div>
  );
}
