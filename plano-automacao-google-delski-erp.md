# Plano de Implementação — Automação Google (Sheets, Calendar, Drive) no Delski ERP

## Objetivo

Conectar o Delski ERP ao Google Drive, Google Calendar e Google Sheets para
automatizar processos operacionais recorrentes: criação de estrutura de pastas
por projeto, agendamento de marcos importantes no calendário, e consolidação
de dados financeiros/operacionais numa planilha mestra — sem intervenção
manual do Gestor a cada evento.

## Pré-requisitos (fazer antes de qualquer código)

A Delski usa contas Gmail comuns/gratuitas, **sem** Google Workspace. Isso
define a arquitetura: autenticação via **OAuth 2.0 + Refresh Token** com uma
conta Gmail dedicada à automação (ex: `suporte.gmail.com`) — **não**
usar Service Account (contas de serviço têm cota zero de armazenamento em
Drive pessoal/gratuito, só funcionam com Shared Drive do Workspace pago, que
a Delski não tem).

Antes de implementar, confirme que já existem, guardados como variáveis de
ambiente (nunca em código, nunca em chat):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_ROOT_FOLDER_ID` (pasta raiz no Drive da conta dedicada)
- `GOOGLE_SHEETS_SPREADSHEET_ID` (planilha mestra, com abas "Clientes",
  "Projetos Ativos", "Fluxo de Caixa")

Se qualquer uma não existir ainda, pare aqui e gere o passo a passo de setup
manual (conta dedicada, projeto no Google Cloud Console, tela de
consentimento OAuth, credenciais, geração do refresh token) antes de
prosseguir com a implementação.

---

## 1. Arquitetura

### 1.1 Cliente Google único (OAuth 2.0)

Criar `supabase/functions/_shared/googleService.ts` com:

- Inicialização de um `google.auth.OAuth2Client` usando `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`. A lib `googleapis` renova o
  `access_token` automaticamente a cada chamada — nenhum código adicional de
  refresh é necessário.
- Clientes tipados para as 3 APIs: `drive('v3')`, `calendar('v3')`,
  `sheets('v4')`.
- Um único modo de autenticação. Não implementar suporte a Service Account
  neste projeto — é um caminho que nunca vai funcionar no ambiente atual e só
  adiciona superfície de bug.

### 1.2 Wrapper de resiliência

Toda chamada às APIs do Google passa por um wrapper
`callGoogleApiWithRetry(fn)`:

- Até 3 tentativas com backoff exponencial + jitter (ex: 1s, 2s, 4s + até
  500ms de jitter aleatório).
- Erros HTTP 429 (rate limit) e 5xx (erro do lado do Google): retry.
- Erros HTTP 4xx exceto 429 (ex: 401, 403, 404 — credencial inválida,
  permissão negada, recurso não encontrado): falha imediata, sem retry — são
  erros que retry não resolve e só desperdiçam tentativas.
- Ao esgotar as tentativas, lançar uma exceção tipada
  (`GoogleApiExhaustedError`) capturada pelo chamador para registrar o
  status final em `automation_logs` (ver seção 3).

### 1.3 Gatilho dos eventos — Database Webhook + Cron (desacoplado)

Não chamar a API do Google de forma síncrona dentro do fluxo principal da
aplicação (ex: dentro da mesma transação que cria um projeto) — isso deixaria
operações normais do ERP lentas ou sujeitas a falha por causa de uma API
externa.

Fluxo correto, em duas etapas:

1. **Captura do evento (rápida, nunca falha):** Configurar Supabase Database
   Webhooks (Dashboard → Database → Webhooks) nas tabelas relevantes
   (`clients`, `projects`, `freelancer_payouts`, `generated_contracts`),
   disparando em INSERT/UPDATE conforme as condições de cada evento (seção
   2). O webhook chama uma Edge Function leve
   (`google-automation-enqueue`) que só grava um registro em
   `automation_logs` com `status='pending'` — não chama nenhuma API do
   Google aqui. Essa etapa deve ser instantânea e nunca deve falhar por
   dependência externa.
2. **Processamento (lento, com retry):** Uma Supabase Cron Function
   (`google-automation-worker`), agendada para rodar a cada 1-2 minutos,
   busca registros `status IN ('pending', 'retrying')` em `automation_logs`,
   processa cada um (chamando de fato Drive/Calendar/Sheets via
   `googleService.ts`), e atualiza o status ao final.

Essa separação garante que uma lentidão ou instabilidade temporária do lado
do Google nunca trave uma ação normal do usuário no ERP.

---

## 2. Eventos automatizados

### Evento A — Criação de estrutura de pastas no Drive (novo cliente)

**Gatilho:** INSERT em `clients` com `status` definido pela primeira vez (ou
INSERT simples, se todo cliente novo deve gerar pasta).

**Ação:**
1. Criar uma pasta com o nome do cliente (`full_name` ou `company_name`)
   dentro de `GOOGLE_ROOT_FOLDER_ID`.
2. Dentro dela, criar 3 subpastas: `/Briefing`, `/Assets`, `/Entregaveis`.
3. Salvar o `drive_folder_id` da pasta raiz do cliente numa coluna nova em
   `clients` (`drive_folder_id text`), para reuso nos eventos seguintes.

### Evento B — Agendamento no Calendar (marco de projeto)

**Gatilho:** UPDATE em `projects` quando `status` muda para
`'Em Andamento'` (kickoff) ou quando `deadline` é definida/alterada.

**Ação:**
1. Criar (ou atualizar, se já existir um `calendar_event_id` salvo) um
   evento no Google Calendar da conta dedicada, com título referenciando o
   projeto e cliente, e data/hora baseada em `deadline`.
2. Salvar o `calendar_event_id` retornado numa coluna nova em `projects`
   (`calendar_event_id text`), para permitir atualização/remoção
   posteriores em vez de duplicar eventos a cada mudança.

### Evento C — Registro em Sheets (dado financeiro)

**Gatilho:** INSERT em `freelancer_payouts` ou em qualquer tabela de
lançamento financeiro relevante.

**Ação:**
1. Inserir uma nova linha na aba "Fluxo de Caixa" da planilha mestra
   (`GOOGLE_SHEETS_SPREADSHEET_ID`), via `spreadsheets.values.append`, com as
   colunas correspondentes (data, projeto, freelancer, valor, status).
2. Não é necessário salvar referência de volta no banco — a escrita em
   planilha é append-only e não precisa ser "encontrada" depois pelo sistema.

### Evento D — Alteração de permissão na entrega (conclusão)

**Gatilho:** UPDATE em `projects` quando `status` muda para `'Concluido'`,
OU em `generated_contracts`/registro de entrega equivalente quando marcado
como aceito pelo Gestor.

**Ação:**
1. Buscar o `drive_folder_id` do cliente (salvo no Evento A).
2. Alterar a permissão do freelancer alocado (se ele tiver acesso
   compartilhado à pasta) de "editor" para "leitor" em toda a pasta do
   projeto (`/Briefing`, `/Assets`, `/Entregaveis` — a pasta inteira, não só
   `/Entregaveis`, para que o freelancer não possa mais alterar briefing ou
   assets depois da entrega aceita).

---

## 3. Tabela de log e idempotência

```sql
create table if not exists public.automation_logs (
  id uuid default gen_random_uuid() primary key,
  event_type text not null check (event_type in (
    'drive_folder_creation', 'calendar_event_upsert',
    'sheets_append', 'drive_permission_update'
  )),
  entity_id uuid not null,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'retrying', 'success', 'error'
  )),
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Idempotência: nunca processar o mesmo evento de sucesso duas vezes
create unique index if not exists automation_logs_event_success_unique
  on public.automation_logs (event_type, entity_id)
  where status = 'success';

alter table public.automation_logs enable row level security;

drop policy if exists "Gestores leem automation_logs" on public.automation_logs;
create policy "Gestores leem automation_logs" on public.automation_logs
  for select using (public.is_gestor(auth.uid()));

-- Nenhuma policy de insert/update para roles de usuário — só o service_role
-- (usado pelas Edge Functions) pode escrever aqui, o que já é o padrão
-- default do Supabase para chaves service_role (bypassa RLS).
```

Antes de processar um evento pendente, o worker verifica se já existe um
registro `status='success'` para o mesmo `(event_type, entity_id)` — se
existir, marca o novo registro como descartado sem chamar a API do Google de
novo (evita pastas/eventos duplicados por reenvio de webhook).

## 4. Falha definitiva — alertar o Gestor

Quando um evento esgota as 3 tentativas e fica com `status='error'`, o worker
insere uma notificação na tabela `notifications` já existente no ERP
(`type='alerta'`), destinada a todos os usuários com `role='gestor'`:

> "Falha ao sincronizar [tipo de evento] com Google — [cliente/projeto
> afetado]. Verifique automation_logs (id: ...)."

Isso conecta com o sistema de alertas automáticos já implementado, em vez de
a falha ficar visível só numa tabela de log que ninguém consulta
proativamente.

## 5. Plano de verificação

### Automatizado
- `npm run build` — zero erros de TypeScript.
- Teste unitário do wrapper de retry: simular resposta 429 (deve tentar de
  novo), simular resposta 403 (deve falhar imediatamente sem retry).

### Manual, em ordem
1. Criar um cliente de teste no ERP → confirmar que a pasta e as 3
   subpastas aparecem no Drive da conta `automacao.delski@gmail.com`, e que
   `clients.drive_folder_id` foi salvo.
2. Mudar o status de um projeto de teste para "Em Andamento" → confirmar
   evento criado no Google Calendar da conta dedicada, com
   `projects.calendar_event_id` salvo.
3. Mudar a `deadline` desse mesmo projeto → confirmar que o evento existente
   foi ATUALIZADO (não duplicado).
4. Registrar um pagamento de teste em `freelancer_payouts` → confirmar nova
   linha na aba "Fluxo de Caixa" da planilha mestra.
5. Marcar o projeto de teste como "Concluido" → confirmar que a permissão do
   freelancer na pasta do cliente virou "leitor".
6. Forçar uma falha (ex: revogar temporariamente uma permissão de API no
   Google Cloud Console) e confirmar: (a) o evento fica `status='error'`
   após 3 tentativas, (b) uma notificação de alerta aparece para o Gestor no
   ERP.
7. Disparar o mesmo evento (ex: criar o mesmo cliente de novo, se possível
   via reenvio manual do webhook) e confirmar que NÃO cria uma segunda
   pasta duplicada (teste de idempotência).

---

## 6. Fora de escopo desta fase

- Sincronização bidirecional (alterações feitas manualmente no Drive/Sheets/
  Calendar refletindo de volta no ERP) — só o sentido ERP → Google está
  coberto aqui.
- Migração para Service Account / Shared Drive — só relevante se a Delski
  migrar para Google Workspace pago no futuro.
- Verificação do app OAuth pelo Google (publicação pública) — o app
  permanece em modo "Teste", suficiente para uso interno com a conta
  dedicada como único usuário de teste autorizado.
