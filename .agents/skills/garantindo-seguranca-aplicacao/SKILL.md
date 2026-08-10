---
name: garantindo-seguranca-aplicacao
description: Regras e melhores práticas de segurança para o ERP Delski. Ative quando o usuário solicitar revisão de segurança, auditoria de API keys, prevenção de vazamento de segredos, validação de Row Level Security (RLS) no Supabase ou execução de auditorias de vulnerabilidades (npm audit).
---

# Garantindo Segurança na Aplicação — Delski ERP

## Quando usar esta skill

- Auditoria de segurança do código-fonte e segredos.
- Prevenção de vazamento de credenciais privadas (API Keys, `service_role`).
- Auditoria de dependências via `npm audit` ou ferramentas de análise estática.
- Configuração e validação de Row Level Security (RLS) e isolamento multi-tenant.

## Checklist de Segurança

- [ ] **Zero Segredos no Frontend**: Nenhuma chave de API privada (`SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, segredos JWT, senhas de banco) pode estar hardcoded ou prefixada com `VITE_`.
- [ ] **Uso de Envs Públicas vs Privadas**: Apenas variáveis prefixadas com `VITE_` e que sejam estritamente públicas (ex: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) podem ser lidas no navegador.
- [ ] **Row Level Security (RLS) Obrigatório**: Toda tabela no Supabase deve ter RLS habilitado com policies isolando acessos por perfil (`gestor`, `freelancer`, `cliente`).
- [ ] **Formulários Não-Controlados e Sanitização**: Entradas de formulário devem ser tratadas com esquemas Zod e sanitizadas antes da persistência.
- [ ] **Dependências Atualizadas**: Rodar `npm audit` periodicamente e corrigir vulnerabilidades críticas e de alto risco sem quebrar retrocompatibilidade.

## Regras Fundamentais de Segurança

### 1. Proteção de Chaves de API no Frontend

> [!CRITICAL]
> **NUNCA** inclua chaves privadas (`service_role`, `api-key` privadas de terceiros como Brevo, Stripe, etc.) diretamente no código do cliente ou como fallback string!

```typescript
// ❌ INCORRETO: Nunca faça isso no frontend
const BREVO_API_KEY = "xkeysib-4bc6265981327c97..."; // Chave exposta no bundle JS!
const supabaseAdmin = createClient(URL, SERVICE_ROLE_KEY); // Burla RLS no navegador!

// ✅ CORRETO: Use requisições autenticadas pelo cliente e endpoints backend/functions
const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || "";
if (!BREVO_API_KEY) {
  console.warn("Chave de serviço de e-mail não configurada no ambiente.");
}
```

### 2. Multi-tenant e RLS (Row Level Security)

1. No Supabase, **nunca** desabilite RLS para atalhos de desenvolvimento.
2. Certifique-se de que cada query do Supabase no cliente utiliza a instância autenticada padrão do usuário (`supabase`), herdando os privilégios do token JWT.

### 3. Mitigação de Vulnerabilidades no `npm`

Ao executar correções de dependências com `npm audit`:
1. Execute `npm audit` para diagnosticar os riscos.
2. Utilize `npm audit fix` para atualizar pacotes em versões de patch/minor seguras.
3. Evite `npm audit fix --force` em pacotes de roteamento ou UI sem antes testar se haverá breaking changes.

---
