import Link from "next/link";

const CONTACT_EMAIL = "pascomvisitacao@gmail.com";

export default function PrivacidadePage() {
  return (
    <div
      className="flex justify-center"
      style={{ background: "var(--color-bg-subtle)", minHeight: "100vh", padding: "var(--space-9)" }}
    >
      <div
        className="card"
        style={{
          maxWidth: 720,
          width: "100%",
          height: "fit-content",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Política de Privacidade — PASCOM App</h1>
        <p style={{ color: "var(--color-text-muted)" }}>Última atualização: 16 de outubro de 2026</p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Quem somos</h2>
        <p>
          O PASCOM App é da Pastoral da Comunicação (Pascom) da Paróquia Nossa Senhora da Visitação, em
          Curitiba.
        </p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Para que o app serve</h2>
        <p>
          Organizar as tarefas, a agenda e os materiais dos voluntários da Pascom. Não é um produto aberto
          ao público em geral.
        </p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Dados que tratamos</h2>
        <ul style={{ paddingLeft: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <li>Nome, e-mail e foto de perfil da conta Google usada para entrar no app.</li>
          <li>
            Tarefas e pedidos criados no app. Quem envia um pedido pelo formulário público informa também
            nome e um contato.
          </li>
          <li>Arquivos enviados pelos usuários, como imagens e áudios.</li>
        </ul>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Como usamos o Google</h2>
        <p>
          O app usa uma conta institucional da Pascom (não contas pessoais de voluntários) para duas coisas:
        </p>
        <ul style={{ paddingLeft: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <li>
            <strong>Google Drive</strong> (escopo <code>drive.file</code>): grava os arquivos enviados em uma
            pasta do Drive da Pascom.
          </li>
          <li>
            <strong>Google Agenda</strong> (escopo <code>calendar.events</code>): cria eventos na agenda
            institucional.
          </li>
        </ul>
        <p>
          O app não lê nem edita outros arquivos ou eventos além dos que ele mesmo cria nessa pasta e nessa
          agenda.
        </p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Compartilhamento</h2>
        <p>Não vendemos nem compartilhamos dados com terceiros para publicidade.</p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Onde os dados ficam</h2>
        <ul style={{ paddingLeft: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <li>Supabase: banco de dados e login.</li>
          <li>Google Drive: arquivos enviados.</li>
          <li>Vercel: hospedagem do app.</li>
        </ul>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Seus direitos (LGPD)</h2>
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados escrevendo para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <footer
          className="flex items-center justify-between flex-wrap"
          style={{
            gap: "var(--space-3)",
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-5)",
            borderTop: "1px solid var(--color-border)",
            fontSize: "var(--text-sm)",
          }}
        >
          <Link href="/">Página inicial</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </footer>
      </div>
    </div>
  );
}
