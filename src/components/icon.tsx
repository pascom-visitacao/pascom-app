import type { LucideIcon, LucideProps } from "lucide-react";

// strokeWidth central pra todo ícone do app - o padrão do Lucide (2) fica
// fino demais pro estilo do design system; 2.5 aproxima do peso "cheio"
// que os ícones desenhados à mão já tinham. Muda aqui, não em cada uso.
const DEFAULT_STROKE_WIDTH = 2.5;

export function Icon({ icon: IconComponent, style, ...props }: { icon: LucideIcon } & LucideProps) {
  // flexShrink: 0 por padrão - sem isso, um ícone ao lado de texto que
  // pode crescer (nome de arquivo, label longa) vira o único filho
  // "encolhível" da linha e o flexbox o espreme até quase sumir.
  return <IconComponent strokeWidth={DEFAULT_STROKE_WIDTH} style={{ flexShrink: 0, ...style }} {...props} />;
}
