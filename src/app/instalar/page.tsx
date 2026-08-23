import Image from "next/image";
import { Share, MoreVertical, SquarePlus, CheckCircle2 } from "lucide-react";
import { Icon } from "@/components/icon";

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start" style={{ gap: "var(--space-4)" }}>
      <span
        className="avatar avatar-sm"
        style={{ flexShrink: 0, fontFamily: "var(--font-body)", fontSize: "var(--text-sm)" }}
      >
        {number}
      </span>
      <span style={{ paddingTop: 2 }}>{children}</span>
    </li>
  );
}

export default function InstalarPage() {
  return (
    <div
      className="flex justify-center"
      style={{ background: "var(--color-bg-subtle)", minHeight: "100vh", padding: "var(--space-9)" }}
    >
      <div style={{ maxWidth: 720, width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-7)" }}>
        <div style={{ textAlign: "center" }}>
          <Image
            src="/brand/pascom-icon.svg"
            alt="Logo Pascom"
            width={64}
            height={64}
            style={{ margin: "0 auto var(--space-5)" }}
          />
          <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-3)" }}>Instalar o PASCOM no celular</h1>
          <p style={{ color: "var(--color-text-muted)" }}>
            Adicione o app à tela inicial do seu celular pra abrir com um toque, como qualquer outro app —
            sem precisar procurar o link toda vez.
          </p>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="card-title" style={{ fontSize: "var(--text-lg)", marginBottom: 0 }}>
            Android (Chrome)
          </div>
          <div className="alert alert-info">
            <Icon icon={CheckCircle2} />
            <div>
              Na maioria das vezes o Chrome mostra sozinho um aviso “Instalar app” ao visitar o site —
              é só tocar nele. Se não aparecer, segue os passos abaixo.
            </div>
          </div>
          <ol className="flex flex-col" style={{ gap: "var(--space-4)", listStyle: "none" }}>
            <Step number={1}>
              Toque no ícone de <strong>três pontinhos</strong>{" "}
              <Icon icon={MoreVertical} size={16} style={{ display: "inline", verticalAlign: "text-bottom" }} /> no
              canto superior direito do Chrome.
            </Step>
            <Step number={2}>
              Toque em <strong>“Instalar app”</strong> (ou “Adicionar à tela inicial”, dependendo da versão).
            </Step>
            <Step number={3}>Confirme tocando em “Instalar”.</Step>
          </ol>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="card-title" style={{ fontSize: "var(--text-lg)", marginBottom: 0 }}>
            iPhone (Safari)
          </div>
          <div className="alert alert-warning">
            <Icon icon={CheckCircle2} />
            <div>
              Precisa ser pelo <strong>Safari</strong> — no iPhone, o Chrome e outros navegadores não
              conseguem adicionar apps à tela inicial.
            </div>
          </div>
          <ol className="flex flex-col" style={{ gap: "var(--space-4)", listStyle: "none" }}>
            <Step number={1}>
              Toque no ícone de <strong>Compartilhar</strong>{" "}
              <Icon icon={Share} size={16} style={{ display: "inline", verticalAlign: "text-bottom" }} /> na barra
              inferior (o quadrado com uma seta pra cima).
            </Step>
            <Step number={2}>
              Role a lista de opções pra baixo e toque em{" "}
              <strong>“Adicionar à Tela de Início”</strong>{" "}
              <Icon icon={SquarePlus} size={16} style={{ display: "inline", verticalAlign: "text-bottom" }} />.
            </Step>
            <Step number={3}>Toque em “Adicionar”, no canto superior direito.</Step>
          </ol>
        </div>

        <p style={{ textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>
          Depois de instalado, o PASCOM abre em tela cheia, como um app normal — pra sair, é só fechar
          como qualquer outro app.
        </p>
      </div>
    </div>
  );
}
