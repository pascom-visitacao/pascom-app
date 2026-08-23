import type { LucideIcon, LucideProps } from "lucide-react";

// strokeWidth central pra todo ícone do app - o padrão do Lucide (2) fica
// fino demais pro estilo do design system; 2.5 aproxima do peso "cheio"
// que os ícones desenhados à mão já tinham. Muda aqui, não em cada uso.
const DEFAULT_STROKE_WIDTH = 2.5;

export function Icon({ icon: IconComponent, ...props }: { icon: LucideIcon } & LucideProps) {
  return <IconComponent strokeWidth={DEFAULT_STROKE_WIDTH} {...props} />;
}
