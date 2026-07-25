# Plano — Delski (Fase UI com dados mockados)

Vamos construir toda a interface do SaaS "Delski" com dados mockados em memória. Banco de dados (Supabase/Cloud) e integração com Brevo ficam para uma fase seguinte, mas a arquitetura será preparada para plugá-los depois sem refatoração pesada.

## Stack & padrões visuais

- TanStack Start + Tailwind + shadcn-ui (já no template).
- Design system: sidebar fixa moderna, cards com sombras suaves, tipografia limpa, tema claro por padrão (dark opcional). Paleta neutra + accent Delski (azul/violeta) via tokens semânticos em `src/styles.css`.
- Ícones `lucide-react`. Gráficos com `recharts`.
- Drag-and-drop no Kanban com `@dnd-kit/core`.

## Camada de dados mockada

- `src/mocks/store.ts` — store em memória (Zustand) com projetos, freelancers, arquivos, usuário atual e role switch. Persistência em `localStorage`.
- Todos os componentes consomem hooks tipo `useProjects()`, `useFreelancers()` — na fase 2 basta trocar a implementação por chamadas Supabase.
- Toggle no topo da sidebar para simular login como "Gestor" ou "Freelancer" (só nesta fase mock).

## Rotas

```text
/                          Landing minimal com CTA "Entrar"
/auth                      Tela de login/cadastro (mock — só entra)
/app                       Layout com Sidebar (gate mock)
  /app                     Dashboard (KPIs + gráficos) — Gestor
  /app/projects            Lista + Kanban (toggle) — filtrado por role
  /app/projects/new        Formulário de solicitação
  /app/projects/$id        Detalhe (specs, delegação, arquivos, histórico)
  /app/freelancers         Lista + cadastro de freelancers — Gestor
  /app/freelancers/$id     Perfil do freelancer
  /app/settings            Preferências + placeholder integrações (Brevo)
/p/$token                  Vista pública do projeto (sem login) para freelancer
```

## Telas & componentes

1. **Sidebar** (`AppSidebar`): logo Delski, links (Dashboard, Projetos, Freelancers, Configurações), avatar + role switcher, collapse.
2. **Dashboard**: 4 KPI cards (Ativos, Concluídos, Freelancers, Taxa de conclusão), gráfico de barras por tipo de serviço (IA/Tráfego/Sites), gráfico de pizza por status, lista "Projetos recentes".
3. **Solicitação de projeto** (`/app/projects/new`): form validado com `react-hook-form` + `zod` — Cliente, Tipo (IA/Tráfego/Sites), Descrição, Prazo (date picker), Orçamento, Link de referência. Cria em status "Solicitado".
4. **Projetos — Kanban/Lista**: toggle no topo. Kanban com 5 colunas (Solicitado, Delegado, Em Produção, Em Revisão, Concluído), cards arrastáveis (dnd-kit). Lista/tabela com filtros (tipo, status, freelancer) e mudança rápida de status via Select.
5. **Modal/Detalhe de projeto**: abas Detalhes, Delegação, Arquivos, Histórico.
   - Delegação: Select de freelancers cadastrados; botão "Gerar link público" cria token e mostra URL `/p/<token>` copiável.
   - Arquivos: dropzone (mock upload — guarda blob URL) + campo para colar link do Google Drive.
   - Histórico: timeline de mudanças de status/delegação.
6. **Freelancers**: tabela + botão "Novo freelancer" (Nome, Email, Habilidades multi-select IA/Tráfego/Sites, Status ativo/inativo). Perfil individual com projetos atribuídos.
7. **Vista pública `/p/$token`**: layout sem sidebar; mostra specs, arquivos e link do Drive; permite freelancer enviar arquivo (mock) e marcar como "Em Revisão".
8. **Auth mock** (`/auth`): tabs Login/Cadastro; ao submeter, seta usuário no store e redireciona para `/app`.

## Placeholders para fases futuras

- `src/integrations/brevo.ts` — stubs `sendWelcomeEmail`, `sendDelegationEmail`, `sendStatusChangeEmail` com `console.log`. Botões "Reenviar email" no UI já chamam essas funções.
- `src/integrations/storage.ts` — stubs para upload/download que hoje usam blob URL, prontos para virar Supabase Storage.
- Cada componente que consulta dados usa hooks isolados para facilitar troca por chamadas reais.

## SEO / metadata

- Cada rota principal com `head()` próprio (título "Delski — Dashboard", etc.), `og:title`, `og:description`, `og:type`, `twitter:card`. `/` recebe título e descrição da agência.

## Fora de escopo desta fase (fica claro no chat ao entregar)

- Supabase Auth real, tabelas, RLS, buckets.
- Envio real via Brevo (fica só como stub + botão).
- Persistência entre dispositivos (mock salva só em `localStorage`).

Quando quiser, na próxima fase eu: (a) ativo Lovable Cloud, crio schema `profiles`, `user_roles`, `freelancers`, `projects`, `project_files` + RLS + policies, migro os hooks; (b) conecto o Brevo via `@connector:brevo` e ligo os stubs aos envios reais; (c) troco o upload mock por Supabase Storage.
