# PASCOM App — Spec: Onboarding

> **Status:** IMPLEMENTADO. Onboarding inicial (3 telas), orientação
> contextual (empty state do Kanban + copy do Enviar fotos) e aviso de
> promoção a Coordenação geral — todos sequenciados e testados ao vivo.
> **Origem:** Sessão de planejamento entre Matheus e o Claude "arquiteto",
> incorporando uma segunda análise externa ("Diretrizes iniciais de
> onboarding — App PASCOM") avaliada criticamente antes de ser aceita.

---

## 1. Objetivo

Facilitar o primeiro contato com o app fornecendo **apenas o contexto
necessário pra começar a usá-lo** — não um manual, treinamento completo ou
apresentação página por página.

Princípio central adotado:

> O onboarding inicial explica o aplicativo. A interface explica as
> funcionalidades. Os fluxos explicam o que fazer.

---

## 2. Decisão de arquitetura: por que não um tour guiado

A ideia original (levantada por Matheus) era um onboarding em 3 partes
**seguido de um tour guiado** tipo spotlight/tooltip percorrendo as telas
principais (painel, Atividades, Calendário, Enviar fotos, menu).

Uma segunda análise, trazida por Matheus a partir de outra IA, apontou que
esse desenho — boas-vindas seguidas de um passeio tela-por-tela — é
justamente o anti-padrão que a literatura de onboarding recomenda evitar:
aumenta o tempo até o primeiro uso real, explica cada tela fora do
contexto em que ela importa, e tende a ser ignorado ou clicado sem leitura
depois da segunda parada.

**Avaliação crítica feita antes de aceitar a recomendação:** concordamos
com o argumento por três motivos específicos do projeto (não só porque a
outra análise disse isso):
1. Bate com o padrão de escopo apertado que já guia o resto do projeto —
   um motor de tour spotlight é a peça mais cara de construir das duas
   opções, pra resolver algo que interface bem escrita já resolve.
2. Equipe pequena (15-50 pessoas, mesma paróquia) com contexto social
   prévio (grupo de WhatsApp, Coordenação acessível) — o cenário não pede
   o mesmo investimento em ativação que um produto B2C anônimo pediria.
3. Zero manutenção quando o app crescer: orientação contextual por tela
   escala automaticamente; um tour central precisa ser lembrado e editado
   toda vez que uma tela nova entra.

**Decisão tomada:** não construir tour guiado agora. Onboarding inicial
fica só nas 3 telas conceituais (ver seção 4.1). Orientação sobre telas
específicas migra pra dentro de cada tela (empty states, coach marks
pontuais), no momento em que o usuário chega nelas — não tudo de uma vez
no início.

A opção do tour completo não foi descartada — foi registrada como
hipótese adiada (seção 6).

---

## 3. Modelo de camadas adotado

| Camada | Responde | Onde vive |
|---|---|---|
| 1 — Onboarding inicial | O que é este app e o que consigo fazer com ele? | Modal de 3 telas, primeiro acesso |
| 2 — Interface | O que esta página/recurso faz? | Títulos, descrições, empty states, tooltips pontuais |
| 3 — Fluxo | O que preciso fazer agora? | Dentro de fluxos com múltiplas etapas (ex: Enviar fotos) |
| 4 — Ajuda | Tenho dúvida / quero rever algo | Área de Ajuda (não construída agora — ver seção 6) |

---

## 4. Estrutura definida

### 4.1 Onboarding inicial (Camada 1) — IMPLEMENTADO

Modal sequencial (reaproveita o componente `Modal` do design system).
Dispara uma única vez, no primeiro login. Pulável a qualquer momento
(botão "Pular" visível desde a Tela 1, não só no final). Meta de duração:
30-45 segundos.

Como confirmado por Matheus, **todo usuário novo entra como Pasconeiro** —
não existe um "primeiro login como Coordenação geral" (promoção acontece
depois, via 7.1). Por isso o onboarding inicial é único, sem variante por
papel.

- **Tela 1 — Boas-vindas:** saudação com nome do usuário + frase curta
  sobre o que é o PASCOM App
- **Tela 2 — Organização:** o app centraliza atividades, calendário e
  materiais da Pascom (texto conceitual — sem citar nomes de páginas
  específicas)
- **Tela 3 — Colaboração:** o app facilita a participação da equipe,
  compartilhamento de materiais e a comunicação entre a Pascom e o resto
  da paróquia
- Botão final **"Começar"** fecha o modal

**Regra explícita:** não referenciar nomes de páginas (Painel, Atividades,
Calendário etc.) nem apontar pra elementos da UI. É contexto conceitual,
não um mapa da interface.

**Implementação:** `src/app/(app)/initial-onboarding-modal.tsx` (client,
reaproveita as classes `.modal-overlay`/`.modal`/`.modal-body`/
`.modal-footer` do design system — não existe um componente `<Modal>` de
verdade, é convenção de CSS) + `setOnboardingFlag("initial")` em
`onboarding-actions.ts`. Renderizado em `layout.tsx`, com prioridade
sobre o onboarding de área (`AreaOnboardingModal`) — nunca os dois
empilhados: o conceitual (pulável) sempre aparece primeiro; o de área
(obrigatório) só é avaliado depois que `onboarding_seen.initial` já é
`true`. Nomes das telas atualizados na cópia pra rota atual (Tarefas/
Agenda em vez de Atividades/Calendário, mesmo rename da Fase 7).

### 4.2 Orientação contextual (Camadas 2/3) — ajustes em telas existentes — IMPLEMENTADO

Sem tarefa nova de construção de componente — são ajustes de conteúdo em
telas que já existem:

- **Tarefas (Kanban):** revisado o empty state de coluna/área sem
  tarefas — antes não existia nenhuma mensagem (só o contador "· 0" no
  cabeçalho); agora cada coluna vazia mostra "Nenhuma tarefa por aqui —
  quando sua área tiver algo pra fazer, aparece aqui." (`tarefas/page.tsx`)
- **Enviar fotos:** adicionada uma linha de apoio abaixo do botão
  "Escolher fotos", reforçando antes do envio pra onde as fotos vão
  (Drive, pasta do evento ou acervo por data) — sem mudar lógica. Os
  status por item (Comprimindo/Enviando/✓ Enviado) e a confirmação final
  com link da pasta já existiam e já eram claros (`enviar-fotos-form.tsx`)

### 4.3 Aviso de promoção a Coordenação — IMPLEMENTADO

Quando um Pasconeiro é promovido a Coordenação geral, ele deve receber um
aviso pontual (banner ou modal leve) no primeiro acesso após a promoção,
apontando pra Configurações do Coordenador — não um onboarding completo
novo, só um "você agora é Coordenação geral, aqui está o que mudou".

**Não é uma tarefa separada de onboarding** — sugerido empacotar junto da
implementação/manutenção do item **7.1** (Configurações do Coordenador),
já que o trigger de mudança de `role` já vive lá.

**Decisão na hora de implementar:** confirmado que o item 7.1 (já
construído antes) não trouxe esse aviso — só `is_protected` + trigger
`enforce_protected_role` + `social_media_accounts`. Entrou de escopo
nesta rodada. Optado por **banner** (`alert-info`, dispensável) em vez
de modal — evita empilhar um terceiro modal em cima dos dois de
onboarding em cenários raros (conta promovida rapidamente).
**Implementação:** `coordenacao-promotion-banner.tsx`, renderizado no
topo do `<main>` em `layout.tsx` quando `role = coordenacao_geral` e
`onboarding_seen.coordenacao_promovido` ainda não é `true`; dispensar
usa a mesma action `setOnboardingFlag`.

---

## 5. Modelo de dados — IMPLEMENTADO

```sql
alter table users
  add column onboarding_seen jsonb not null default '{}'::jsonb;
```

Uso: `onboarding_seen->>'initial'` ausente/false → dispara o modal da
seção 4.1 no próximo login. Ao clicar "Começar" ou "Pular":

```sql
onboarding_seen = onboarding_seen || '{"initial": true}'
```

Estrutura em `jsonb` (não colunas booleanas separadas) pra permitir
adicionar novas chaves no futuro (ex: `"promocao_coordenacao": true`) sem
migração nova.

**Como saiu, na migration `20260907090000_onboarding_inicial.sql`:**
- `grant update (onboarding_seen) on users to authenticated` — `users`
  usa concessão por coluna desde a Fase 7 (multi-área); sem esse grant
  explícito, a RLS deixaria mas o Postgres ainda bloquearia o UPDATE
  direto.
- **Backfill no momento da migration:** quem já usava o app não devia
  ver o onboarding conceitual nem o aviso de promoção retroativamente.
  Todo usuário existente ganhou `"initial": true`; quem já era
  `coordenacao_geral` na hora da migration também ganhou
  `"coordenacao_promovido": true`. Só quem se cadastra depois disso
  nasce com `onboarding_seen = {}` de verdade (via `handle_new_user`,
  não tocado pelo backfill).
- Merge feito lendo o valor atual e reescrevendo o objeto no servidor
  (`onboarding-actions.ts`), não com `||` direto na chamada do Supabase
  client (não dá pra mandar uma expressão SQL raw pelo `.update()`).

---

## 6. Fora de escopo — hipóteses adiadas

Registradas aqui pra não perder contexto entre sessões, seguindo o mesmo
padrão de Oportunidades Futuras já usado no `spec-fase6-v2.md`.

### 6.1 Tour guiado tipo spotlight
Percurso guiado apontando pra elementos reais da UI (painel, Kanban,
Calendário, menu), com balões explicativos sequenciais.
**Condição de promoção:** se o teste real com Pasconeiros mostrar confusão
recorrente mesmo depois do onboarding conceitual + orientação contextual
em vigor — não implementar de antemão.

### 6.2 Área de Ajuda
Seção permanente com "Primeiros passos", "Conheça o aplicativo", dúvidas
frequentes, opção de "rever dicas".
**Condição de promoção:** quando o volume de dúvidas repetidas (grupo de
WhatsApp, mensagens diretas à Coordenação) justificar centralizar isso
dentro do app em vez de responder ponto a ponto.

---

## 7. Sequenciamento — CONCLUÍDO

Sequenciado e implementado depois dos itens da Seção 7 do
`spec-fase7.md` e da Fase 4.4 (tag urgente), como planejado.

---

## 8. Prompt consolidado (pronto para quando for sequenciado)

```
Tarefa: Onboarding inicial (3 telas) + ajustes de orientação contextual

MODELO DE DADOS
- Adicionar `users.onboarding_seen jsonb not null default '{}'::jsonb`

ONBOARDING INICIAL (Camada 1)
Modal sequencial (componente Modal do design system), dispara uma única vez
no primeiro login — verificar `onboarding_seen->>'initial'` ausente/false.
Pulável a partir da Tela 1 (botão "Pular" sempre visível, não só na última
tela). Meta de duração: 30-45s pra completar, sem travar em textos longos.

- Tela 1 — Boas-vindas: saudação com nome do usuário + frase curta sobre o
  que é o PASCOM App
- Tela 2 — Organização: o app centraliza atividades, calendário e materiais
  da Pascom (texto conceitual, sem citar nomes de telas específicas)
- Tela 3 — Colaboração: o app facilita a participação da equipe,
  compartilhamento de materiais e comunicação entre a Pascom e o resto da
  paróquia
- Botão final "Começar" fecha o modal e seta `onboarding_seen = onboarding_seen || '{"initial": true}'`
- "Pular" a qualquer momento faz o mesmo set e fecha imediatamente

IMPORTANTE: não é um tour guiado sobre a interface. Não referenciar nomes
de páginas (Painel, Atividades, Calendário etc.) nem apontar pra elementos
da UI. É só contexto conceitual do que o app é e pra que serve.

ORIENTAÇÃO CONTEXTUAL (Camada 2/3) — ajustes pontuais em telas existentes
- Atividades (Kanban): revisar o empty state de colunas/área sem atividades.
  Trocar mensagem genérica tipo "Nenhuma atividade encontrada" por algo que
  também explique o que vai aparecer ali, ex: "Nenhuma atividade por aqui —
  quando sua área tiver algo pra fazer, aparece aqui."
- Enviar fotos: revisar os textos do fluxo de upload existente (não mudar
  a lógica, só a copy) garantindo que cada etapa deixe claro o que está
  sendo enviado, pra onde vai, e o que acontece depois (confirmação com
  link da pasta já existe — reforçar essa clareza nos textos intermediários)

FORA DE ESCOPO NESSA TAREFA
- Tour guiado tipo spotlight pela interface — decidido não construir
  (registrado como hipótese adiada no spec, seção 6.1)
- Área de Ajuda — não construir agora (registrado como hipótese adiada,
  seção 6.2)
- Aviso de "você virou Coordenação geral" — sugerido empacotar com a
  implementação/manutenção do item 7.1 (trigger de promoção), não faz
  parte desta tarefa
```

---

## 9. Observações práticas

- Este documento não substitui `spec-fase6-v2.md` ou `spec-fase7.md` —
  é um spec dedicado, seguindo a convenção do projeto de nunca sobrescrever
  arquivos anteriores.
- Validar com dados/uso reais antes de considerar as hipóteses da seção 6.
