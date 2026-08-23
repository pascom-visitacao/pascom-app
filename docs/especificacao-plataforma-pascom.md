# Plataforma de Gestão — Pastoral da Comunicação (PASCOM)

> **Nomenclatura de navegação (renomeado)**: as seções antes chamadas "Painel", "Atividades" e "Calendário" na UI e nas rotas (`/dashboard`, `/atividades`, `/calendario`) passaram a se chamar **Início** (`/inicio`), **Tarefas** (`/tarefas`) e **Agenda** (`/agenda`), respectivamente — texto exibido e rota, em todo o app (menus, títulos de página, e-mails de notificação). Tabelas do banco (`activities`, etc.) e nomes de função/variável no código continuam com os nomes originais em inglês, sem relação com essa troca. As demais menções deste documento a "Painel"/"Atividades"/"Calendário" abaixo são registro histórico de quando cada fase foi decidida/construída — não foram reescritas.

## 1. Visão geral

Sistema web para centralizar a operação da Pastoral da Comunicação: planejamento, escalas, calendário, produção de materiais, integração com Google Drive, e um canal público para outras pastorais solicitarem materiais/serviços.

**Equipe alvo:** 15 a 50 usuários internos.
**Stack recomendada:** Next.js + Supabase (Postgres, Auth, Storage) + Google APIs (Drive, Calendar) + deploy na Vercel.

---

## 2. Perfis e permissões

| Papel | Descrição | Permissões principais |
|---|---|---|
| **Coordenação geral** | Admin do sistema | Gerencia usuários, papéis, categorias, todas as áreas |
| **Pasconeiro** | Membro/voluntário executor | Vê e assume atividades, atualiza status, comenta |
| **Solicitante externo** | Outra pastoral/ministério | Sem login — acessa via link público para enviar e acompanhar pedidos |

> Coordenador de área **não entra nessa primeira versão do app** (decisão tomada na Fase 6, não é mais rascunho em aberto) — só Coordenação geral e Pasconeiro. A estrutura de áreas (`area_id`) continua existindo no modelo de dados, então esse papel intermediário pode ser adicionado numa versão futura sem quebrar nada; só não faz parte do escopo atual.

Implementar via **Row Level Security (RLS)** no Supabase: cada tabela tem políticas que restringem o que cada `role` pode ler/escrever.

---

## 3. Módulos

### 3.1 Usuários e perfis
- Cadastro/login (Google OAuth preferencialmente, usando conta Workspace da paróquia)
- Perfil com nome, área(s), papel, foto, contato
- **Painel principal em formato bento** (substitui o painel simples da Fase 1): grade assimétrica de blocos, com 1-2 blocos de cor sólida forte pra destacar o que mais precisa de atenção (ex: pedidos externos pendentes) e o resto neutro. Conteúdo varia por papel:
  - **Coordenação geral:** pedidos externos pendentes (bloco de destaque, com prévia da lista), seletor dos dias da semana com indicador de quais têm evento, atividades sem responsável (bloco escuro de alto contraste), próximo evento, equipe (contagem + avatares), vagas abertas, concluídas na semana (com mini gráfico)
  - **Pasconeiro:** minhas atividades pendentes, minhas escalas confirmadas, vagas abertas na minha área, resumo de perfil/área
  - Referência visual completa (HTML funcional com os tokens reais) já validada — anexar ao repassar essa tarefa

### 3.2 Calendário e escalas
- Calendário compartilhado (idealmente sincronizado com Google Calendar)
- **Alternância de visualização: Mês / Semana / Dia** — mês pra visão de planejamento geral, semana pra granularidade de escalas/vagas, dia como "minha agenda hoje" (mais relevante pro Pasconeiro que pra Coordenação)
- Eventos com "vagas" por função (ex: 1 fotógrafo, 2 operadores de transmissão)
- Pasconeiros se inscrevem ou são escalados; confirmação de presença
- **Calendário paroquial (referência + criação manual):** o padre produz um calendário anual e, mensalmente, um mais detalhado — sempre em PDF ou foto, cobrindo *todas* as pastorais da paróquia (não só a Pascom), então não faz sentido tentar estruturar o documento inteiro. Fluxo simplificado:
  - Coordenação geral faz upload do arquivo do mês/ano como referência
  - Arquivo fica salvo e visível **só pra Coordenação geral** por padrão (documentos desse tipo costumam vir com aviso de confidencialidade do padre até a versão final ser publicada — ajustar a visibilidade depois se não for necessário restringir)
  - Coordenação geral consulta o arquivo e cria manualmente só os eventos que interessam à Pascom cobrir (solenidades, festas, retiros etc.), usando a tela padrão de criação de evento da seção 3.2 — sem formulário especial de importação em massa
  - **Reavaliar depois:** se o volume de eventos recorrentes justificar, pensar numa tela de revisão mais assistida mais pra frente — não faz parte do escopo inicial

### 3.3 Quadro de atividades (estilo Kanban)
- Colunas: A fazer → Em produção → Revisão → Concluído
- Cada card: título, categoria, responsável, prazo, anexos, origem (interna ou pedido externo), **prioridade**, **evento relacionado** (se houver)
- **Prioridade:** badge com três níveis — Baixa / Média / Alta, padrão "Média" quando não especificado
- **Vínculo com evento:** `activities` ganha `event_id` (opcional) — herdado automaticamente quando a atividade nasce de um pedido externo com evento relacionado (`external_requests.event_id` já existe nesse formulário); escolhido manualmente quando a atividade é criada direto. Permite ver, a partir de um evento, quais atividades estão sendo produzidas pra ele
- **Categorização dupla** (dois conceitos independentes, não confundir):
  - **Área da Pascom** = já existe (`area_id`) — qual subequipe interna executa (redes sociais, transmissão, design, texto, fotografia)
  - **Ministério/pastoral da paróquia** = novo (`parish_ministry_id`, opcional) — a que pastoral/ministério da igreja aquela atividade está relacionada (Catequese, Pastoral Social, Liturgia, RCC, Pastoral Juvenil, Kairós, ECC, etc.). Lista gerenciável pela Coordenação geral, cresce sob demanda — não precisa vir pré-populada com tudo que aparece no calendário paroquial
  - Diferente de `request_categories` (que já existe e serve só pra rotear pedidos externos por tipo de entrega — card, transmissão, texto, impresso); os três coexistem sem conflito, cada um respondendo uma pergunta diferente
- **Detalhe da atividade (modal com briefing):** clicar num card abre uma janela maior (reaproveita o componente Modal do design system) com descrição completa, categoria, prioridade, prazo, anexos, evento relacionado (se houver) e origem do pedido
- **Candidatura/assumir tarefa:** atividade pode nascer sem responsável (igual às vagas de escala da seção 3.2) — Pasconeiro da área abre o briefing e assume a tarefa com uma ação única. Mesmo padrão de interação usado nas vagas, aplicado agora também às atividades — consistência entre os dois fluxos

### 3.4 Materiais (Drive)
- Integração via API do Google Drive, conectada pela **conta institucional** (`pascomvisitacao@gmail.com`), não por usuário individual — evita materiais espalhados em Drives pessoais de voluntários
- **Estrutura de pastas**: segue o documento "Diretrizes de Organização do Google Drive — PASCOM" (mantido como arquivo próprio na pasta `docs/` do projeto, não duplicado por inteiro aqui). Resumo da lógica:
  - `Ano → Natureza da demanda → Projeto/Evento → Tipo de material`
  - Categorias fixas dentro de cada ano: `01 Eventos e Campanhas`, `02 Redes Sociais` (por mês), `03 Pastorais e Movimentos`, `04 Comunicação Institucional`, `05 Fotos e Vídeos` (acervo, por mês), `06 Demandas Avulsas`, `99 Arquivo`
  - `00 — Recursos da PASCOM` fica fora da estrutura anual (materiais permanentes: identidade visual, templates, logos)
  - Princípio de fonte única: nunca duplicar arquivo — usar atalho do Drive quando precisar aparecer em mais de um contexto
  - Só criar pasta quando houver arquivo que justifique (nunca pasta vazia só pra seguir o modelo)
- **Mapeamento automático** (o app decide sozinho, sem perguntar):
  - Atividade com `event_id` → `[Ano]/01 Eventos e Campanhas/[Nome do evento]/[subpasta por área]` — mapeamento de área: redes sociais→"Redes Sociais", fotografia→"Fotos", transmissão→"Vídeos", design→"Identidade Visual" ou "Impressos" (conforme o caso), texto→"Planejamento e Conteúdo"
  - Atividade com `parish_ministry_id` e sem `event_id` → `[Ano]/03 Pastorais e Movimentos/[Nome do ministério]/`
  - Atividade sem os dois, área = redes sociais → `[Ano]/02 Redes Sociais/[Mês]/[Data] — [Descrição]/`
- **Não automatizável — seletor manual no upload**: "Comunicação Institucional" (permanente vs. pontual) e "Fotos e Vídeos" como acervo (peça produzida vs. registro bruto) exigem julgamento humano, o app erraria com frequência tentando adivinhar. Upload oferece seletor de destino nesses casos; padrão cai em "Demandas Avulsas" se ninguém escolher
- `00 — Recursos da PASCOM` e as pastas `99` (Arquivo/Descartados) ficam fora da automação — geridas manualmente pela equipe, o app só respeita que existem

- **Nova tela: "Enviar fotos"** (upload em massa, pensada pra zero fricção — fotos de evento são produzidas o tempo todo)
  - Acesso fácil e visível (atalho no painel ou item de menu próprio, não escondido)
  - Seleção múltipla de arquivos, otimizada pra celular (acesso direto à galeria/câmera do telefone)
  - Campo opcional: evento relacionado (busca entre eventos existentes) — se escolhido, vai pra pasta daquele evento; se vazio, cai no acervo "Fotos e Vídeos" organizado por mês/data
  - Grade de miniaturas do que foi selecionado antes de enviar, com barra de progresso durante o upload (arquivos de foto são pesados, várias de uma vez)
  - Confirmação no final com link direto pra pasta no Drive
  - Reaproveita a tabela `materials` já existente (`drive_file_id`, `name`, `folder_path`, `related_activity_id`) — `related_activity_id` fica opcional aqui, já que a maioria dessas fotos não estará amarrada a um card do Kanban

- Busca e preview dentro do app

### 3.5 Central de pedidos externos (página pública, sem login)
- Formulário categorizado (ex: card redes sociais, transmissão, texto/informativo, impresso/banner)
- Campos: descrição, prazo desejado, evento relacionado, contato do solicitante
- **Roteamento automático**: cada categoria tem uma área "dona" pré-configurada; ao enviar, vira automaticamente um card no Kanban daquela área com status "recebido"
- Solicitante recebe um **link único de acompanhamento** (token na URL) para ver o status sem precisar de conta

### 3.6 Notificações
- E-mail quando: atividade nova sem responsável, prazo próximo, pedido externo novo
- (Fase futura) WhatsApp via API Business

---

## 4. Modelo de dados (rascunho inicial)

> Este bloco é o rascunho original de referência — o schema real já evoluiu além dele (ex: `request_categories`, políticas de RLS detalhadas, colunas de auditoria) conforme confirmado com o Claude Code durante a implementação. Tratar como guia de intenção, não como fonte da verdade; a migration aplicada no Supabase é a fonte da verdade.

```
users (id, name, email, avatar_url, role, area_id, created_at)
areas (id, name)  -- ex: redes sociais, transmissão, design, texto, fotografia
parish_ministries (id, name)  -- ex: Catequese, Pastoral Social, Liturgia, RCC — gerenciável pela Coordenação geral
activities (id, title, description, status, priority, area_id, parish_ministry_id, event_id, assignee_id, due_date, source, request_id, created_at)
schedules (id, event_id, area_id, role_needed, user_id, confirmed)
events (id, title, date, location, description)
external_requests (id, category, description, requester_name, requester_contact, deadline, event_id, status, tracking_token, area_id, created_at)
materials (id, drive_file_id, name, folder_path, related_activity_id)
```

---

## 5. Roteiro de construção (fases sugeridas para o Claude Code)

**Fase 1 — Fundação**
- Setup do projeto Next.js + Supabase
- Modelo de dados (tabelas acima) + RLS básico
- Autenticação com Google OAuth
- Painel simples com perfil do usuário logado

**Fase 2 — Núcleo interno**
- Quadro de atividades (Kanban) por área
- Cadastro de áreas e vínculo de usuários a áreas
- CRUD de atividades

**Fase 3 — Pedidos externos**
- Página pública (sem login) com formulário por categoria
- Lógica de roteamento automático para a área correta
- Página de acompanhamento via token

**Fase 4 — Calendário e escalas**
- Modelo de eventos (`events`, já existe desde a Fase 1) e vagas (`schedules`, já existe: `event_id`, `area_id`, `role_needed`, `user_id`, `confirmed`)
- Coordenação geral cria eventos e define as vagas necessárias (função + área responsável); precisa de mais de uma pessoa na mesma função, cria uma linha por vaga
- Vaga fica **aberta** (`user_id` nulo) até um Pasconeiro da área correspondente assumir
- Pasconeiro vê vagas abertas da própria área e assume com uma ação única — "assumir" já é a confirmação (`user_id` + `confirmed` preenchidos juntos), sem etapa separada
- Pasconeiro pode **liberar** uma vaga já assumida (volta a ficar aberta) — cobre o caso de troca de pessoa sem depender do Coordenador reatribuir manualmente
- Sincronização com Google Calendar **adiada** — por enquanto o calendário é só interno ao app; revisitar depois que as bases estiverem estabelecidas

**Fase 4.5 — Responsividade**
- Pré-requisito pro teste real como Pasconeiro (provavelmente feito em celular)
- Prioridade: primeiro as telas que um Pasconeiro realmente usa — painel bento (variante Pasconeiro), Kanban + modal de briefing + candidatura, calendário (visualização + assumir/liberar vaga). Telas administrativas (Equipe & Áreas, upload do calendário paroquial) ficam pra depois, sem bloquear o teste
- **Dois desafios de layout que não são só CSS, são decisão de design:**
  - **Kanban**: 4 colunas lado a lado não cabem em tela de celular. Sugestão: colapsar pra uma coluna só em mobile, com abas de status pra trocar entre A fazer/Em produção/Revisão/Concluído — reaproveitando o componente `.tabs` que já existe no design system, em vez de scroll horizontal de colunas espremidas
  - **Calendário (visão Mês)**: grade de 7 colunas também aperta em tela estreita. Sugestão: em mobile, células do dia ficam só com número + indicador (bolinha/contagem), sem tentar caber o chip do evento inteiro — a lista de eventos abaixo (que já existe) continua sendo onde o detalhe aparece
- Painel bento já tem breakpoint de referência pronto no preview validado (colapsa sidebar, grade vira 2 colunas) — usar como base, não é preciso desenhar do zero

**Fase 5 — Materiais e notificações**
- **Sequência sugerida**: notificações primeiro (mais simples, sem OAuth novo, valor imediato), Drive depois (mais complexo, precisa expandir escopo do Google Cloud Console)
- **Notificações — 3 gatilhos** (consolidado de 4 no rascunho original, já que "pedido externo novo" e "atividade sem responsável" são o mesmo evento na prática):
  - Atividade sem responsável (cobre pedido externo novo e atividade interna sem dono) → notifica Pasconeiros da área
  - Prazo próximo → notifica o responsável atual
  - Vaga de escala aberta → notifica Pasconeiros da área
  - Provedor: Resend (integra bem com Next.js/Vercel, tier gratuito suficiente)
- **Drive**: ver detalhes completos na seção 3.4 — conta institucional, estrutura de pastas por natureza da demanda, mapeamento automático + seletor manual pros casos ambíguos, e a nova tela "Enviar fotos" (upload em massa)
- (Opcional, fora do escopo inicial) integração WhatsApp Business

**Fase 6 — Calendário: visões restantes e sincronização**
- **Coordenador de área não entra nessa versão** — decisão tomada, não é mais item em aberto (ver nota na seção 2)
- **1. Visualizações Semana e Dia — IMPLEMENTADO**
  - `date-utils.ts` ganhou `parseDateParam`/`dateParamString`/`addDays`/`startOfWeek`/`buildWeekGrid`, espelhando o padrão já existente pra mês
  - Semana: navegação por período via `?date=`, grade de 7 colunas (empilha em coluna única abaixo de 640px, mesmo padrão responsivo da grade de mês) com chips de evento por dia
  - Dia: navegação por período via `?date=`, sem grade própria (uma célula só seria redundante) — a lista de eventos completa abaixo já filtra pro dia selecionado
  - A lista de eventos abaixo da grade agora filtra corretamente por visão (mês/semana/dia), antes mostrava tudo pra semana/dia
- **2. Sincronização com Google Calendar — Etapa 1 IMPLEMENTADA** (mão única, app → Google Calendar)
  - **Decisões tomadas**: mão única por enquanto (app é fonte da verdade); calendário único da conta institucional (`pascomvisitacao@gmail.com`, `primary`), não um por Pasconeiro; todo evento sincroniza automaticamente, sem marcação seletiva
  - **Enquadramento explícito**: isso é a Etapa 1 de uma sincronização que será bidirecional no futuro, não a versão final. A Etapa 2 (Google Calendar → app) fica propositalmente pra depois, junto com editar/excluir evento no app — que ainda não existe e é pré-requisito pra sincronização de volta fazer sentido
  - `src/lib/google-oauth.ts` — troca de refresh token extraída do `google-drive.ts` pra um helper compartilhado entre Drive e Calendar (mesma conta institucional, mesmas credenciais)
  - `src/lib/google-calendar.ts` — `createCalendarEvent()`, REST simples sem SDK, mesmo padrão do Drive
  - `events.google_calendar_event_id` (nova coluna, sem RLS nova) guarda o id do evento no Google Calendar, pronta pra quando editar/excluir existir
  - `createEvent` chama o sync **best-effort** depois do insert — se o Google falhar, o evento continua criado normalmente no app
  - **Reautorização concluída**: conta institucional reautorizada com `drive.file` + `calendar.events`, passou pela tela "app não verificado" sem precisar do plano de contingência (modo Testing) — a verificação formal do Google ainda não foi submetida, então isso pode voltar a aparecer/expirar depois; reavaliar se persistir
  - Precisou também **habilitar a Google Calendar API** no projeto do Google Cloud (Library → Google Calendar API → Enable) — passo separado do escopo OAuth, não documentado antes por não existir até agora
  - **Sincronização confirmada funcionando de ponta a ponta**: evento de teste criado no app apareceu de verdade no Google Calendar da conta institucional, com `google_calendar_event_id` preenchido corretamente na tabela `events`
- **3. Calendário paroquial — Camada 2 (leitura assistida)** (por último, condicional)
  - Pré-preencher o formulário de criação de evento a partir do PDF/foto do padre, em vez de digitação manual (Camada 1, já existente desde a Fase 4)
  - Só vale a pena se o volume de eventos recorrentes justificar o esforço — reavaliar depois de usar a Camada 1 por um tempo, não implementar de antemão
  - **Bug de produção real encontrado e corrigido (testando um item não relacionado da UI)**: a Camada 1 (upload de referência do calendário paroquial) nunca funcionou de verdade — a migration original (`20260822200000_fase4_atividades_calendario.sql`) tinha aplicação parcial neste banco: o bucket de storage existia, mas a policy de `storage.objects`, o tipo `calendar_reference_period` e a tabela `parish_calendar_files` (com sua própria policy) nunca chegaram a ser criados. Corrigido com 2 migrations recriando exatamente o que faltava, cada uma testada via simulação antes de aplicar; upload confirmado funcionando de ponta a ponta ao vivo

---

## 6. Design System (já existente)

Já existe um design system pronto (`pascom-design-system/`), derivado da identidade visual oficial da paróquia, com:
- Tokens em três formatos: `tokens.css` (variáveis CSS), `tokens.js` (`window.PASCOM_TOKENS`), `tokens.json` (fonte estruturada, ideal para converter em tema Tailwind se necessário)
- Fundamentos: 5 escalas de cor (verde, azul, âmbar, vermelho, neutro), tipografia (**Bricolage Grotesque** para títulos/display, **Hanken Grotesk** para corpo de texto, JetBrains Mono para código), espaçamento, raio, elevação
- 14 componentes documentados em `index.html`: botão, badge, card, alerta, campo de texto, área de texto, checkbox, radio, switch, select, navegação (navbar/tabs/breadcrumb/paginação), avatar, **tabela, modal, tooltip**
- Regra de ouro: componentes sempre consomem tokens semânticos (`--color-primary`), nunca cor de marca direta

**Integração no Next.js (Fase 1):** copiar `tokens.css` e `styles.css` para a pasta de estilos globais do projeto e importar no layout raiz, nessa ordem:
```
import './tokens.css'
import './styles.css'
```
Carregar as fontes (Bricolage Grotesque, Hanken Grotesk, JetBrains Mono) via Google Fonts ou `next/font`. Bricolage Grotesque é fonte variável (eixo de peso 200-800, mais eixo óptico) — conferir se o `next/font` precisa de configuração específica pra eixo variável, diferente de pesos fixos.

**Status:** v1.1 — todos os componentes essenciais para o app já estão prontos (modal, tabela e tooltip foram adicionados depois do v1 inicial, seguindo os mesmos tokens). Não há mais nada bloqueado por falta de componente; qualquer necessidade nova pode seguir o mesmo padrão ao ser criada durante o desenvolvimento.

**Biblioteca de ícones — migrado pra `lucide-react`** (era SVG desenhado à mão, um `Record` por tela). `src/components/icon.tsx` centraliza o `strokeWidth` padrão (2.5, mais "cheio" que o 2 default do Lucide) — qualquer ícone novo usa `<Icon icon={NomeDoIcone} />` em vez de configurar caso a caso.

**Apanhado de ajustes de UI (frontend/CSS, sem migration):**
- Menu flutuante mobile: itens da barra ganharam padding real (`min-width` + `padding` em vez de `width` fixa) e ícones 24px, respeitando o touch target de 48×48dp sem cortar conteúdo nas bordas
- Removido o sublinhado global em `a:hover` (aparecia como efeito colateral em qualquer botão/link ao tocar/clicar) — troca por mudança de cor real (`--color-blue-700`); também neutralizado o tap-highlight padrão do navegador em `a`/`button`
- Bento tile "Pedidos externos pendentes": `grid-auto-rows` fixo (128px) cortava conteúdo no mobile (a linha some quando o tile perde o `grid-row: span 2`) — trocado pra `minmax(128px, auto)`, cresce com o conteúdo em vez de cortar
- Saudação do Painel: "Boa tarde," em peso regular e `calc(var(--text-2xl) - 4pt)`; nome em `calc(var(--text-2xl) + 2pt)` com auto-encolhimento via `AutoFitName` (mede contra o container pai, reduz até caber, sem quebrar layout) — testado em viewport extremo (220px) sem overflow
- Botão "Escolher fotos" (`/materiais`): trocado o `<input type="file">` nu (sem estilo, parecia link solto) pelo mesmo padrão já usado no upload de foto de perfil (input escondido + botão real disparando o seletor)
- Kanban: breakpoint pra layout mobile (abas de status) estava em 768px, mas o resto do app (sidebar → menu mobile) usa 960px — criava uma faixa de largura intermediária (768–960px) onde a sidebar já tinha sumido mas o Kanban ainda tentava mostrar 4 colunas espremidas. Unificado pra 960px
- Avatar do responsável nos cards de atividade: `avatar_url` já vinha na query, mas o componente nunca usava, só mostrava iniciais — corrigido pra usar a foto real quando existe (mesmo padrão `.avatar-photo` do resto do app)

## 7. Novas funcionalidades em análise

> Registradas aqui pra não perder contexto entre conversas. Sequenciamento e refinamentos consolidados a partir de `spec-fase6-v2.md` (levantamento original dos itens) e `spec-fase7.md` (ordem de execução + decisões refinadas) — os dois arquivos ficam em `docs/` como histórico, este documento é a fonte da verdade consolidada.

### Ordem de execução

| Ordem | Item | Motivo |
|---|---|---|
| — | 7.1 Configurações do Coordenador | Já sequenciado (roda antes de/paralelo à Fase 6) — sem mudança |
| 1 | 7.7 Comentários em atividades | Risco baixíssimo, sem impacto em RLS existente, resolve dor real |
| 2 | 7.6 Novo menu mobile | Decisão bloqueante — cada tela nova (Equipamentos, Configurações) aperta ainda mais o menu atual |
| 3 | 7.3 Página de Equipamentos | Escopo fechado, independente dos demais itens |
| 4 | 7.5 Avatar deslizante no Painel mobile | Puramente estético — menor prioridade |
| 5 | 7.2 Múltiplas áreas por Pasconeiro | Maior risco estrutural (RLS) — ver estratégia de mitigação abaixo |
| 6 | 7.4 Página de Perfil do usuário | Depende de 7.2 — só faz sentido depois |

### 7.1 Configurações do Coordenador (nova página)
- Cadastro de áreas e funções (pode reaproveitar o que já existe em Equipe & Áreas, ou centralizar aqui — decidir na hora)
- Promover/rebaixar um Pasconeiro para Coordenação geral (e vice-versa)
- **Painel de redes sociais — DECISÃO TOMADA: não guardar login/senha dentro do app.** Risco de ponto único de falha (se o banco vazar, todas as contas vazam juntas; senha de verdade não é revogável/escopada como token OAuth). Recomendado: gerenciador de senhas compartilhado da equipe (ex: Bitwarden Organizations). O app pode, no máximo, guardar um **link de referência** pra onde encontrar a credencial, nunca o valor em si
- **"Login mãe":** a conta institucional (`pascomvisitacao@gmail.com`) precisa ficar protegida contra ser rebaixada — nenhum Coordenador (nem ela mesma) consegue mudar esse `role` específico. Tecnicamente: trigger semelhante ao `enforce_users_self_update` já existente, mas mirando um e-mail/id específico como exceção protegida, não o usuário autenticado atual

### 7.7 Comentários em atividades
- Qualquer usuário autenticado pode comentar num card do Kanban — cobre informação que surge depois do briefing inicial e não estava prevista

### 7.6 Novo menu de navegação mobile — IMPLEMENTADO
- Substitui o menu atual (colapsava em barra horizontal com scroll)
- Três candidatos prototipados em HTML (`preview-menu-mobile.html`, com os tokens reais do design system, alternável em tempo real): **(A) barra flutuante inferior**, **(B) rail lateral fino**, **(C) grid em tela cheia**
- **Decisão final: combinação de A + C**, não uma escolha excludente — barra flutuante fixa com 4 posições (Painel, Atividades, Calendário, "Mais"); "Mais" abre o grid (candidato C) como catálogo completo de todas as páginas, com redundância proposital (Painel/Atividades/Calendário aparecem nos dois lugares) — regra simples: "tudo está no grid, a barra é só atalho pros mais usados". Conteúdo do grid varia por papel: Pasconeiro vê Painel/Atividades/Calendário/Enviar fotos; Coordenação vê os mesmos + Equipe & Áreas + Configurações (Equipamentos entra quando o 7.3 for construído)
- Implementado em `src/app/(app)/mobile-nav.tsx` + estilos em `ds-styles.css`, breakpoint 960px (mesmo da sidebar colapsada anterior)

### 7.3 Página de Equipamentos (nova) — IMPLEMENTADO
- Cadastro: nome, modelo, foto
- Ação de "pegar" e "devolver"
- Status: disponível / indisponível, com nome + foto redonda de quem está com o equipamento no momento
- Somente Coordenação geral pode cadastrar equipamento novo
- Trigger `enforce_equipment_update` bloqueia: edição de metadado por não-coordenação, atribuição do equipamento livre pra terceiro (só pra si mesmo), e transferência direta de equipamento já ocupado sem passar pela coordenação
- Implementado em `src/app/(app)/equipamentos/`, foto via bucket público `equipamentos-fotos` (upload só coordenação)

### 7.5 Header do Painel com avatar "deslizante" (mobile) — PARCIAL
- Premissa original mudou: a ideia era o avatar virar atalho de navegação, mas o 7.6 (menu mobile) já cobre navegação de outra forma
- **Implementado por agora**: avatar (foto do Google, com fallback de iniciais) ao lado da saudação no `/dashboard`, tamanho `avatar-lg` (64px) — só elemento visual/identificação, sem ação de clique
- **Pausado**: comportamento de deslizar ao rolar + virar atalho fixo, e o que o toque no avatar faz — decidir quando o 7.4 (Página de Perfil) existir, provavelmente como atalho pra lá

### 7.2 Múltiplas áreas por Pasconeiro — IMPLEMENTADO
- **Desenho final: self-service completo**, não administrativo — decisão que mudou durante a implementação (checar quem editava `area_id` antes de codar revelou que era 100% Coordenação via `/areas`, nunca o próprio usuário; o desenho aprovado inverteu isso por completo)
- **Regras de negócio:**
  1. Usuário novo nasce Pasconeiro sem nenhuma área (já era assim)
  2. Sem área selecionada, nenhuma atividade/vaga aparece como assumível — bloqueio natural via RLS, sem mensagem de erro especial
  3. Primeiro acesso: modal obrigatório, até 3 áreas, vale imediatamente (sem espera)
  4. Ajustes seguintes: cooldown de 3 dias desde o último envio; a nova seleção (substitui o conjunto inteiro, não edita item a item) só passa a valer 24h depois, e esse envio reinicia o cooldown — um timestamp por usuário controla os dois prazos
  5. Não é possível remover uma área com atividade não concluída OU vaga confirmada do usuário nessa área
  6. Máximo de 3 áreas simultâneas
  7. **Coordenação não edita mais a área de ninguém** — `/areas` (Equipe) virou só visualização (badges); papel (`role`) continua editável por Coordenação normalmente
- **Etapa A + Etapa B colapsadas numa migration só** (não faseadas por sessões diferentes): a checagem de "assumível" precisava considerar múltiplas áreas desde o primeiro dia, senão a regra 2 ficaria falsa assim que o self-service existisse — não dava pra faseiar com segurança
- **Schema**: `users.area_ids`/`pending_area_ids`/`areas_submitted_at` (array, não tabela de junção — o pendente sempre substitui o conjunto inteiro, não edita item a item). `effective_area_ids(user_id)`/`my_area_ids()` calculam o conjunto vigente na hora (sem cron pra "promover" o pendente). Toda a lógica de negócio mora em `submit_area_selection()` (RPC chamada pelo próprio usuário). Coluna protegida por `REVOKE`/`GRANT` seletivo (não trigger — um trigger bloquearia a escrita legítima de dentro da própria função)
- `users.area_id` (singular) e `my_area_id()` foram removidos; 5 policies (`external_requests`, `activities` ×2, `schedules` ×2) migradas pra `my_area_ids()`
- Testado com simulação cobrindo: primeira seleção, cooldown, efetivação em 24h calculada ao vivo, remoção bloqueada por atividade e por vaga confirmada, bypass de escrita direta bloqueado, e as 5 policies respeitando múltiplas áreas — depois testado ao vivo pelo usuário
- UI de "ajustar depois da primeira vez" fica pro 7.4 (Perfil), como já estava planejado

### 7.4 Página de Perfil do usuário (nova, autonomia do próprio usuário) — IMPLEMENTADO
- Campos: nome, telefone/WhatsApp, foto, biografia curta, habilidades, áreas de atuação (múltiplas — via 7.2, com o ajuste "cooldown de 3 dias / efetivação em 24h" exposto na própria página), redes sociais pessoais
- Cada pessoa edita os próprios dados livremente, sem depender da Coordenação
- Colunas de autoedição (`phone`, `bio`, `skills`, `social_links`, `name`, `avatar_url`) liberadas via `GRANT UPDATE` seletivo pro `authenticated`; trigger `enforce_users_self_update` estendido com regra invertida (só o próprio dono edita esses campos — nem Coordenação edita por outra pessoa)
- Foto de perfil: bucket público `perfil-fotos`, upload restrito à própria pasta (`{user_id}/arquivo`)
- **Bug real encontrado e corrigido durante o teste**: upload de foto usa `upsert: true`, que o Storage resolve como `INSERT ... ON CONFLICT DO UPDATE`. Pra decidir se há conflito, o Postgres precisa de uma policy de **SELECT** aplicável sob RLS, mesmo sem nenhuma linha conflitante existir ainda — faltava essa policy (só havia INSERT e UPDATE), causando rejeição do upsert inteiro com uma mensagem genérica de RLS. Corrigido adicionando a policy de SELECT restrita à própria pasta
- **Bug pré-existente descoberto de carona (Fase 3)**: o limite padrão de 1MB do corpo de Server Actions do Next.js nunca tinha sido configurado, e o formulário público `/solicitar` permitia até 5 imagens × 5MB = 25MB — bem acima do teto real (~4,5MB por invocação na Vercel). Corrigido via `experimental.serverActions.bodySizeLimit` em `next.config.ts` + compressão client-side (`src/lib/compress-image.ts`, reaproveitada de "Enviar fotos") aplicada também em `/solicitar`, com tetos por arquivo e somados calibrados pra caber com margem

### Novas ideias em análise (ainda não sequenciadas)

> Registradas pra não perder contexto, sem compromisso de ordem ainda — avaliar prioridade numa próxima conversa.

- **PWA (instalável na tela inicial) — IMPLEMENTADO**: dado o uso fortemente mobile da equipe, transformar o app num PWA instalável resolve boa parte da fricção de acesso rápido, sem o custo de aprovação/integração formal do WhatsApp Business API.
  - `public/manifest.webmanifest` (nome, ícones, `theme_color` = `--color-primary` #007cba, `display: standalone`, `start_url: /inicio`) + `public/sw.js` (service worker mínimo, sem cache offline — só o necessário pra contar como instalável, já que o app depende de dados em tempo real de qualquer forma)
  - Ícone quadrado: já existia em `public/brand/pascom-icon.svg` (só o símbolo, sem o wordmark "pascom") — gerados os PNGs em `public/icons/` (192/512 padrão + variantes `maskable` com margem de segurança pra recorte adaptativo do Android) via `scripts/generate-pwa-icons.mjs` (script local de uso único, não roda em produção)
  - Nova página pública `/instalar` — tutorial separado por Android (Chrome, prompt automático + fallback manual) e iPhone (Safari, Compartilhar → Adicionar à Tela de Início); link discreto na tela de login
  - `PUBLIC_PATHS` do middleware e o matcher do `proxy.ts` precisaram incluir `/instalar`, `manifest.webmanifest` e `sw.js` — sem isso o middleware de auth redirecionava esses arquivos pro login, quebrando a instalação pra quem não estava logado
  - Verificado tecnicamente (manifest válido, service worker registrado e ativo, ícones servindo): instalação real precisa ser testada pelo usuário num Android de verdade, depois do deploy — PWA exige HTTPS, não funciona testando por IP local
- **Notificação leve via link `wa.me`:** antes de investir na API Business (que exige aprovação e tem custo), oferecer um botão "avisar no WhatsApp" que abre uma mensagem pré-preenchida já cobre boa parte do caso de uso de notificação — sem integração formal, sem custo, sem dependência de aprovação.
- **Registro de presença real na escala:** hoje `confirmed` em `schedules` marca que a pessoa assumiu a vaga, mas não registra se ela de fato compareceu no dia. Pra uma equipe de voluntários, isso ajuda tanto a reconhecer quem é confiável quanto a identificar padrões de ausência. Possível campo adicional: `attended` (boolean, preenchido depois do evento, por quem? — a decidir: autoatestado pelo Pasconeiro ou marcado pela Coordenação).
- **Tag "urgente" no Kanban:** separada de prioridade (que reflete importância, não janela de tempo). Prioridade "Alta" não implica necessariamente prazo apertado — uma tag/badge de urgência cobriria especificamente os pedidos de véspera de missa/evento, que precisam se destacar visualmente de forma diferente da prioridade.
- **Briefing estruturado por categoria** *(origem: avaliação de roadmap de outra IA, validado por Claude — ver abaixo)*: hoje o formulário público de pedido externo já é categorizado (`request_categories`), mas os campos são genéricos pra todas as categorias. A ideia é cada categoria ganhar campos condicionais específicos, reduzindo pedidos incompletos e perguntas repetidas feitas pela equipe depois que a solicitação chega. Exemplos: post pra redes sociais (objetivo, público, formato desejado, CTA, imagens disponíveis), cobertura fotográfica (horário de chegada, duração prevista, momentos importantes, necessidade de foto oficial), impresso (dimensões, quantidade, gráfica, necessidade de sangria). Baixo risco técnico — formulário dinâmico por categoria, sem mudança estrutural em `activities` ou `external_requests`.
- **Notificações expandidas** *(origem: avaliação de roadmap de outra IA, validado por Claude — ver abaixo)*: extensão natural dos 3 gatilhos já definidos na Fase 5, sem exigir nova arquitetura de notificação — só novos eventos disparando o mesmo mecanismo. **2 dos 4 gatilhos propostos — IMPLEMENTADOS:**
  - **Atividade atribuída diretamente pela Coordenação** — disparo síncrono, best-effort, direto na Server Action (não cron, já que é uma ação pontual, não um estado pra verificar periodicamente). Pré-requisito construído de carona: não existia ainda uma ação de reatribuição distinta do self-service `assumeActivity` — nova `reassignActivity(activityId, userId)` em `atividades/actions.ts`, com select de reatribuição na modal de detalhe (só visível pra Coordenação; RLS + trigger `enforce_activity_reassignment` já permitiam, sem migration nova)
  - **Lembrete de escala confirmada na véspera do evento** — reaproveita o cron diário existente (`notify-deadline`, agora cobrindo 2 gatilhos numa rota só, pra não depender de um segundo cron job na Vercel). Nova coluna `schedules.reminder_sent_at` + extensão do trigger `reset_schedule_notified_at` (zera o lembrete junto com a notificação de vaga aberta quando a vaga é liberada, pra quem assumir depois receber o lembrete de novo)
  - **Bug de produção real encontrado e corrigido de carona**: `sendEmail()` só captura erro na chamada de envio, não na construção do cliente Resend (chave ausente/inválida) — sem tratamento, isso derrubava o cron inteiro no meio do loop, deixando de processar os itens seguintes. Corrigido com try/catch por item nas duas funções da rota (`notifyDeadlines` e `notifyScheduleReminders`): loga e segue pro próximo, só marca `*_sent_at` quando realmente entregou (senão tenta de novo no próximo cron)
  - **Ainda não implementados** (fora do pedido desta rodada): comentário mencionando `@usuario` (depende do 7.7), ajustes solicitados/material aprovado (só se algum fluxo de aprovação existir — hoje não existe). Preferências de notificação por usuário continuam fora de escopo, como já registrado.

### Avaliação de roadmap trazido de outra IA

Matheus trouxe um documento de outra IA (`pascom-app-roadmap-melhorias.md`) com um roadmap amplo, organizado em torno do fluxo *Solicitar → Triar → Planejar → Produzir → Revisar → Aprovar → Publicar → Arquivar → Mensurar → Reutilizar aprendizado*. Avaliação resumida:

**Validou decisões já tomadas:** múltiplas áreas (= 7.2) e equipamentos (= 7.3) apareceram como prioridade independentemente — bom sinal de convergência.

**Incorporado neste documento:** briefing estruturado por categoria e notificações expandidas (ambos na lista acima) — baixo risco, extensão natural do que já existe.

**Não incorporado, com justificativa:**
- **Workflow de aprovação formal** (estados como "Aguardando revisão" / "Ajustes solicitados" / "Aprovado") — processo corporativo demais pra uma equipe voluntária; o Kanban de 4 colunas já resolve "pronto ou não". Só valeria a pena se a equipe começasse a sentir falta disso na prática, não preventivamente.
- **Entregáveis + Campanhas** (nova hierarquia Campanha → Evento → Atividade → Entregável) — maior mudança estrutural do documento; duplica parcialmente o que `event_id` + Kanban já cobrem hoje. Esperar a dor aparecer antes de construir.
- **DAM (camada de metadados/tags) sobre o Google Drive** — tensiona com a decisão já tomada de o Drive ser fonte única e a estrutura de pastas já resolver organização (ver seção 3.4). Reconstruiria busca que o próprio Drive já oferece.
- **Multicanal, métricas, IA, automações, multi-paróquia** — o próprio documento de origem já classifica como fases distantes; concordância mantida.
- Publicação automática em redes, chat interno, gamificação e CRM de fiéis — o documento de origem já recomendava não priorizar, e essa recomendação também vale pro contexto deste projeto (reduzir burocracia, não replicar complexidade corporativa).

**Oportunidades futuras (não comprometidas)** — descartar não é o mesmo que esquecer. Os itens abaixo **não fazem parte do roadmap comprometido**, nenhum deve ser desenhado ou codado sem que a condição de promoção seja atendida primeiro. Lógica de *product discovery* contínuo: a ideia só vira tarefa quando a realidade pedir, não antes.

| Hipótese | Condição de promoção (o que precisaria acontecer pra virar item real) |
|---|---|
| Workflow de aprovação formal | Equipe relatar repetidamente que peças saíram sem revisão adequada, e o Kanban atual não estiver dando conta de sinalizar isso |
| Campanhas + Entregáveis | Coordenação sentir falta concreta de agrupar atividades espalhadas sob um guarda-chuva maior — hoje `event_id` não é suficiente pra isso |
| DAM sobre o Drive | Busca dentro da estrutura de pastas atual do Drive se mostrar insuficiente na prática, não apenas em teoria |
| Multicanal (canais de publicação, adaptação por canal) | Equipe crescer o suficiente pra justificar rastrear a mesma peça em múltiplos canais formalmente, em vez de fazer isso de cabeça |
| Métricas/Analytics | Volume de atividades justificar decisões guiadas por dado — hoje a equipe é pequena o bastante pra perceber gargalos sem dashboard |
| IA (assistente de briefing, geração de adaptação de texto, busca inteligente) | Base de dados estruturada (briefings, campanhas, materiais) já existir e estar populada o suficiente pra IA ter o que consultar — não faz sentido antes disso |
| Automações por regra | Padrões repetitivos identificados no uso real (não hipotéticos) que justifiquem a manutenção de regras automáticas |
| Multi-paróquia | Intenção explícita de transformar o sistema em produto pra outras comunidades — hoje não existe essa intenção |
| Menu geral em grid como catálogo separado (segunda camada de navegação, além da barra/rail principal escolhida em 7.6) | Número de destinos de navegação crescer além do que cabe confortavelmente numa barra única (mais que ~5-6 itens de primeiro nível) |

> Avaliação (agosto/2026): documento de outra IA (`recomendacoes-navegacao-mobile-app.md`) recomendava Bottom Nav fixa + Menu Geral em Grid como catálogo separado (duas camadas), mas pressupõe um app bem maior que o PASCOM hoje (menciona Publicações, Aprovações, Banco de ideias, Relatórios, Usuários — fora do roadmap atual). Resolve um problema de "muitos itens" que não existe ainda com só 4-5 destinos (Painel, Atividades, Calendário, Equipamentos + Perfil/Config via avatar). Não muda a decisão em andamento no 7.6 — os candidatos A/B/C continuam sendo testados como estão.

---

## 8. Observações práticas
- Comece cada fase pedindo ao Claude Code para gerar o schema/migração antes da interface.
- Valide cada fase com dados reais da pastoral antes de avançar para a próxima.
- Mantenha este documento atualizado conforme decisões mudarem — é a referência para novas sessões de trabalho.
