---
name: redesenhando-erp-delski
description: Executa a revitalizacao completa do front-end do ERP Delski (apps/erp). Ative quando o usuario pedir para redesenhar o ERP, melhorar o design do ERP, fazer o redesign, revitalizar a interface, elevar o nivel visual do sistema, modernizar o painel do gestor, melhorar a UX do ERP ou qualquer variacao que indique atualizacao visual do ERP sem alterar logica de negocio. NAO se aplica ao portal do cliente (apps/portal).
---

# Redesenhando o ERP Delski

## Quando usar esta skill

- Usuario pede redesign, revitalizacao visual ou UX do ERP
- Usuario quer modernizar o sidebar, header, cards, tabelas ou graficos do ERP
- Usuario menciona inspiracao em Stripe, Linear, Vercel, Notion, ClickUp, Monday.com
- Usuario quer implementar animacoes, skeleton loading, Design System no ERP

## Regras Absolutas (NUNCA violar)

1. NAO alterar logica de negocio, hooks, APIs, banco de dados
2. NAO tocar em apps/portal - apenas apps/erp
3. NAO remover funcionalidades existentes
4. NAO alterar estrutura de rotas do TanStack Router
5. SEMPRE testar build apos cada fase com npm run build:erp
6. SE banco de dados precisar de mudanca, gerar SQL e perguntar ao usuario

## Checklist de Execucao

- [ ] Fase 0: Instalar dependencias (framer-motion)
- [ ] Fase 1: Design System tokens em styles.css
- [ ] Fase 2: Sidebar redesenhado (app-sidebar.tsx)
- [ ] Fase 3: Header e Layout principal (app.tsx)
- [ ] Fase 4: Dashboard do Gestor (app.index.tsx)
- [ ] Fase 5: Dashboard do Freelancer (view freelancer em app.index.tsx)
- [ ] Fase 6: Pagina de Projetos (app.projects.index.tsx)
- [ ] Fase 7: Pagina Financeira (app.finance.tsx)
- [ ] Fase 8: Pagina de Suporte (app.suporte.tsx)
- [ ] Fase 9: Pagina de Freelancers (app.freelancers.index.tsx)
- [ ] Fase 10: Pagina de Clientes (app.clients.index.tsx)
- [ ] Fase 11: Componentes compartilhados (kpi-card, section-header)
- [ ] Fase 12: Build final e validacao

## Paleta de Cores Obrigatoria

- Primaria: #2563EB (blue-600), #1D4ED8 (blue-700)
- Secundaria: #60A5FA (blue-400)
- Fundo principal: #FFFFFF
- Fundo de secoes: #F8FAFC (slate-50)
- Texto principal: #111827 (gray-900)
- Texto secundario: #6B7280 (gray-500)
- Bordas: #E5E7EB (gray-200)
- Status verde: #10B981, amarelo: #F59E0B, vermelho: #EF4444

## Tipografia Obrigatoria

- Manter Plus Jakarta Sans como sans-serif padrao
- Titulos de pagina: text-3xl font-bold text-gray-900
- Labels de secao: text-xs font-semibold uppercase tracking-wider text-gray-500
- Valores de KPI: text-2xl font-bold text-gray-900 tabular-nums
- Textos auxiliares: text-xs text-gray-500

## Variaveis CSS a definir em styles.css

- --sidebar-width: 220px
- --header-height: 56px
- --radius: 0.625rem
- --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)
- --shadow-card-hover: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)

## Fase 2 - Sidebar Especificacoes

- Largura: 220px fixo, fundo branco, borda-direita #E5E7EB
- Logo: DELSKI bold + subtitulo ERP em azul
- Grupos com label uppercase tiny: OPERACAO, EQUIPE, NEGOCIO, SISTEMA
- Icones: 16px, text-gray-500 inactive, text-blue-600 active
- Item ativo: bg-blue-50 text-blue-700 border-l-2 border-blue-600
- Hover: bg-gray-50 com transicao 150ms
- Footer: avatar + nome + cargo + icone de settings
- Reescrever com div simples (sem componente Sidebar do shadcn) para controle total

## Fase 3 - Header Especificacoes

- Altura: 56px, fundo branco, border-b border-gray-100, sticky top-0 z-40
- Esquerda: Breadcrumb dinamico com useRouterState
- Centro: campo de busca global (UI apenas)
- Direita: badge notificacoes + avatar com dropdown

## Fase 4 - Dashboard Gestor KPIs

- Receita Bruta (sum de projects.budget)
- Custo Freelancers (sum de projects.freelancer_cost)
- Margem Bruta (%)
- Projetos Ativos
- Projetos Concluidos
- Freelancers Cadastrados
- Clientes Ativos
- Taxa de Conclusao (%)

## Instrucoes de Qualidade - Padrao Cards KPI

Cada card deve ter: bg-white, rounded-xl, border border-gray-100, p-6, shadow sutil, hover shadow maior
Header do card: label texto-xs uppercase + icone em quadrado azul-50 rounded-lg
Valor: text-2xl font-bold text-gray-900 tabular-nums
Indicador de tendencia: text-xs text-green-600 font-medium com seta

## Instrucoes de Qualidade - Padrao Tabelas

thead: border-b border-gray-100, th com py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500
tbody: divide-y divide-gray-50
tr: hover:bg-blue-50/30 transition-colors duration-100
td: py-3.5 px-4 text-gray-900

## Instrucoes de Qualidade - Animacoes Framer Motion

Stagger container: staggerChildren: 0.06
Card item: hidden opacity:0 y:12, visible opacity:1 y:0, duration:0.3 ease:easeOut delay por index
Skeleton loading: animate-pulse bg-gray-100 rounded-xl

## Instrucoes de Qualidade - Badges de Status

pendente: bg-gray-50 text-gray-600 border-gray-200
aprovado e Concluido: bg-green-50 text-green-700 border-green-200
rejeitado: bg-red-50 text-red-700 border-red-200
em_analise: bg-purple-50 text-purple-700 border-purple-200
Pausado: bg-amber-50 text-amber-700 border-amber-200
ativo: bg-blue-50 text-blue-700 border-blue-200

## Recursos

- Stack: Tailwind CSS v4, Shadcn/UI, Radix UI, Lucide React, Framer Motion, Recharts
- Build command: npm run build:erp (na raiz do monorepo)
- Dev server ERP: http://localhost:8080
