import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAssetLink } from "./actions";
import { AssetLinkRow } from "./asset-link-row";

export default async function AcervoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isCoordenacao = profile?.role === "coordenacao_geral";

  const { data: assets } = await supabase
    .from("asset_links")
    .select("id, name, reference_link, notes")
    .order("name");

  return (
    <div style={{ padding: "var(--space-9)", maxWidth: 720 }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}>Acervo</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-7)" }}>
        Logos, diretrizes de implantação, templates e outros arquivos institucionais — cada bloco
        leva pra pasta correspondente no Google Drive.
      </p>

      <div className="flex flex-col" style={{ gap: "var(--space-3)", marginBottom: isCoordenacao ? "var(--space-8)" : 0 }}>
        {(assets ?? []).map((asset) => (
          <AssetLinkRow key={asset.id} asset={asset} isCoordenacao={isCoordenacao} />
        ))}
        {(assets ?? []).length === 0 && (
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Nenhum arquivo cadastrado ainda.
          </span>
        )}
      </div>

      {isCoordenacao && (
        <form action={createAssetLink} className="flex items-end flex-wrap" style={{ gap: "var(--space-3)" }}>
          <div className="field" style={{ maxWidth: 200 }}>
            <label className="field-label">Nome</label>
            <div className="input-wrap">
              <input type="text" name="name" placeholder="Ex: Logo da Pascom" required />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 280 }}>
            <label className="field-label">Link do Drive</label>
            <div className="input-wrap">
              <input type="url" name="reference_link" placeholder="https://..." required />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label className="field-label">Notas (opcional)</label>
            <div className="input-wrap">
              <input type="text" name="notes" placeholder="Ex: PNG e SVG" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-md">
            Adicionar
          </button>
        </form>
      )}
    </div>
  );
}
