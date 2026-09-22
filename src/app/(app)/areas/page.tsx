import { redirect } from "next/navigation";

// /areas foi unificada em /equipe (conteúdo condicional por papel, ver
// equipe/page.tsx) - fica só esse redirect pra quem tiver a URL antiga
// salva/em favoritos não cair em 404.
export default function AreasPage() {
  redirect("/equipe");
}
