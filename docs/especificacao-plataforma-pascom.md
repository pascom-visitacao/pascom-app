# Plataforma de Gestão — Pastoral da Comunicação (PASCOM)

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

> Coordenador de área fica de fora por enquanto — só Coordenação geral e Pasconeiro. Dá pra adicionar esse papel intermediário depois sem quebrar nada, já que a estrutura de áreas (`area_id`) continua existindo no modelo de dados; só não há um papel dedicado a administrá-la ainda.

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
- Não duplicar arquivos — integrar via API do Google Drive
- Estrutura de pastas espelhada por categoria/evento
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

**Fase 5 — Materiais e notificações**
- Integração com Google Drive API
- Notificações por e-mail
- (Opcional) integração WhatsApp Business

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

## 7. Observações práticas
- Comece cada fase pedindo ao Claude Code para gerar o schema/migração antes da interface.
- Valide cada fase com dados reais da pastoral antes de avançar para a próxima.
- Mantenha este documento atualizado conforme decisões mudarem — é a referência para novas sessões de trabalho.
