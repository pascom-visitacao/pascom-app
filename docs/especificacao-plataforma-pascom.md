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
- Painel "minhas atividades" e "minhas escalas"

### 3.2 Calendário e escalas
- Calendário compartilhado (idealmente sincronizado com Google Calendar)
- Eventos com "vagas" por função (ex: 1 fotógrafo, 2 operadores de transmissão)
- Pasconeiros se inscrevem ou são escalados; confirmação de presença

### 3.3 Quadro de atividades (estilo Kanban)
- Colunas: A fazer → Em produção → Revisão → Concluído
- Cada card: título, categoria, responsável, prazo, anexos, origem (interna ou pedido externo)

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

```
users (id, name, email, avatar_url, role, area_id, created_at)
areas (id, name)  -- ex: redes sociais, transmissão, design, texto, fotografia
activities (id, title, description, status, area_id, assignee_id, due_date, source, request_id, created_at)
schedules (id, event_id, area_id, role_needed, user_id, confirmed)
events (id, title, date, location, description)
external_requests (id, category, description, requester_name, requester_contact, deadline, status, tracking_token, area_id, created_at)
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
- Modelo de eventos e vagas
- Inscrição/confirmação de Pasconeiros em escalas
- Sincronização com Google Calendar

**Fase 5 — Materiais e notificações**
- Integração com Google Drive API
- Notificações por e-mail
- (Opcional) integração WhatsApp Business

---

## 6. Design System (já existente)

Já existe um design system pronto (`pascom-design-system/`), derivado da identidade visual oficial da paróquia, com:
- Tokens em três formatos: `tokens.css` (variáveis CSS), `tokens.js` (`window.PASCOM_TOKENS`), `tokens.json` (fonte estruturada, ideal para converter em tema Tailwind se necessário)
- Fundamentos: 5 escalas de cor (verde, azul, âmbar, vermelho, neutro), tipografia (Fredoka/Inter/JetBrains Mono), espaçamento, raio, elevação
- 14 componentes documentados em `index.html`: botão, badge, card, alerta, campo de texto, área de texto, checkbox, radio, switch, select, navegação (navbar/tabs/breadcrumb/paginação), avatar, **tabela, modal, tooltip**
- Regra de ouro: componentes sempre consomem tokens semânticos (`--color-primary`), nunca cor de marca direta

**Integração no Next.js (Fase 1):** copiar `tokens.css` e `styles.css` para a pasta de estilos globais do projeto e importar no layout raiz, nessa ordem:
```
import './tokens.css'
import './styles.css'
```
Carregar as fontes (Fredoka, Inter, JetBrains Mono) via Google Fonts ou `next/font`.

**Status:** v1.1 — todos os componentes essenciais para o app já estão prontos (modal, tabela e tooltip foram adicionados depois do v1 inicial, seguindo os mesmos tokens). Não há mais nada bloqueado por falta de componente; qualquer necessidade nova pode seguir o mesmo padrão ao ser criada durante o desenvolvimento.

## 7. Observações práticas
- Comece cada fase pedindo ao Claude Code para gerar o schema/migração antes da interface.
- Valide cada fase com dados reais da pastoral antes de avançar para a próxima.
- Mantenha este documento atualizado conforme decisões mudarem — é a referência para novas sessões de trabalho.
