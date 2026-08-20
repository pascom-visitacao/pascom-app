# Pascom Design System

Sistema de design da **Pascom Brasil — Paróquia N. Sra. da Visitação**, derivado da identidade visual oficial da logo. Contém fundamentos (cor, tipografia, espaçamento, ícones) e uma biblioteca de 11 componentes de UI, todos documentados e navegáveis em `index.html`.

## Como abrir

Abra `index.html` diretamente no navegador — não depende de servidor, build step ou instalação. Todos os arquivos usam caminhos relativos, então **mantenha a estrutura de pastas intacta**.

```
pascom-design-system/
├── index.html          → a documentação navegável (fonte visual)
├── tokens.css           → variáveis CSS — importe em qualquer projeto
├── styles.css           → classes de componentes (depende de tokens.css)
├── tokens.json           → os mesmos tokens em JSON puro, p/ scripts e ferramentas
├── tokens.js             → os mesmos tokens em JS, expostos como `window.PASCOM_TOKENS`
├── app.js                → renderiza as escalas dinâmicas e interações da doc
├── assets/
│   ├── pascom-horizontal.svg
│   ├── pascom-vertical.svg
│   └── pascom-icon.svg   → símbolo isolado (favicon, avatar, espaços pequenos)
└── README.md
```

## Usar em outro projeto

Só precisa de dois arquivos: `tokens.css` (as variáveis) e `styles.css` (as classes de componente, que consomem essas variáveis). Copie os dois para o seu projeto e importe nessa ordem:

```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="styles.css">
```

Depois é só usar as classes — `btn btn-primary btn-md`, `card card-elevated`, `input-wrap`, `badge badge-success` etc. Consulte `index.html` para ver todas as variações e copiar o HTML de cada uma (cada seção de componente tem um bloco de código pronto).

Se o seu projeto **não** usa HTML/CSS puro (React, Vue, Tailwind, design tokens de outra ferramenta), use `tokens.json` como fonte — é a estrutura mais fácil de converter automaticamente para o seu formato.

### Fontes usadas

`Fredoka` (display), `Inter` (corpo/UI) e `JetBrains Mono` (código) — carregadas via Google Fonts no `index.html`. Se for usar `tokens.css`/`styles.css` isoladamente, inclua essas fontes você mesmo:

```html
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## Regra de ouro

Nunca aponte para uma cor de marca direto (`--color-blue-500`) dentro de um componente. Use sempre o token semântico (`--color-primary`). Isso significa que, se um dia a cor primária mudar, você edita em **um único lugar** (`tokens.css`) e todo o sistema atualiza sozinho.

## O que está incluído

**Fundamentos:** metodologia (tokens → átomos → moléculas → organismos → templates → páginas), uso do logotipo, paleta de cores (5 escalas de 10 tons), tipografia, espaçamento, raio de borda, elevação (sombras) e ícones.

**Componentes:** botão, badge, card, alerta, campo de texto, área de texto, checkbox, radio, switch, select/dropdown, navegação (navbar, tabs, breadcrumb, paginação) e avatar.

## O que não está incluído (ainda)

Este é um v1 completo dos fundamentos + componentes essenciais. Não cobre: modais/diálogos, tabelas, tooltips, acordeões, steppers, ou variantes de RTL (não se aplica — conteúdo é 100% em português). Se precisar de algum desses, peça — a estrutura de tokens já está pronta para receber novos componentes seguindo o mesmo padrão.

## Créditos

Cores e formas extraídas da logo oficial fornecida pela Pascom (`PASCOM_BRASIL_-_VISITAÇÃO`). Vermelho de erro/perigo não está na logo original — foi criado em harmonia com a paleta, exclusivamente para estados de erro.
