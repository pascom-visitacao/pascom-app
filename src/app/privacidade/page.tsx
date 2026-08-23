export default function PrivacidadePage() {
  return (
    <div
      className="flex justify-center"
      style={{ background: "var(--color-bg-subtle)", minHeight: "100vh", padding: "var(--space-9)" }}
    >
      <div
        className="card"
        style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
      >
        <h1 style={{ fontSize: "var(--text-xl)" }}>Política de Privacidade — PASCOM App</h1>
        <p style={{ color: "var(--color-text-muted)" }}>Última atualização: agosto de 2026</p>

        <p>
          O PASCOM App é uma ferramenta interna de gestão da Pastoral da Comunicação de uma paróquia
          católica, usada pela própria equipe (voluntários e coordenação) pra organizar tarefas,
          escalas, agenda de eventos e materiais de comunicação. Não é um produto ao público em
          geral.
        </p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Login da equipe (Google OAuth)</h2>
        <p>
          Os membros da equipe entram no app usando login do Google. Nesse processo, o app recebe
          apenas nome, e-mail e foto de perfil públicos da conta Google usada — usados só pra
          identificar a pessoa dentro do app (autoria de tarefas, atribuição de responsáveis, etc). Esses
          dados não são compartilhados com terceiros nem usados fora do funcionamento do próprio app.
        </p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Integração com Google Drive</h2>
        <p>
          O app se conecta ao Google Drive usando <strong>apenas uma conta institucional</strong> da
          Pastoral da Comunicação (não contas pessoais de voluntários), com o escopo{" "}
          <code>drive.file</code> da API do Google Drive — o mais restrito disponível: o app só
          consegue acessar arquivos e pastas que ele mesmo cria, ou que o responsável pela conta
          institucional selecionar explicitamente através do seletor de arquivos do Google (Google
          Picker).
        </p>
        <p>
          Essa integração é usada exclusivamente para organizar e armazenar materiais produzidos pela
          Pastoral da Comunicação (fotos de eventos, peças gráficas, documentos) dentro de uma estrutura
          de pastas já definida pela própria paróquia. O app não lê, modifica nem acessa nenhum outro
          arquivo do Google Drive da conta institucional além do que ele mesmo organiza. Nenhum dado
          proveniente dessa integração é compartilhado com terceiros, vendido, ou usado para qualquer
          finalidade fora da organização interna desses materiais.
        </p>

        <h2 style={{ fontSize: "var(--text-lg)" }}>Contato</h2>
        <p>
          Dúvidas sobre esta política podem ser encaminhadas à Pastoral da Comunicação através dos
          canais internos da paróquia.
        </p>
      </div>
    </div>
  );
}
