# Diretrizes de Desenvolvimento — Delski ERP

## 1. Prevenção de CPU Lockup em Formulários (React Hook Form + Zod)
> [!CRITICAL]
> **NUNCA** instancie `zodResolver(schema)` inline dentro do corpo de um componente React (ex: `resolver: zodResolver(loginSchema)` dentro do `useForm`).
> 
> Instanciar o `zodResolver` inline cria uma nova referência de objeto a cada renderização do React. O `react-hook-form` detecta a nova referência de resolver e dispara uma re-validação síncrona interna que entra em um **loop infinito em 100% de CPU**, travando completamente o navegador.
> 
> **Padrão Obrigatório**:
> Declare sempre o resolver fora do componente (no escopo do módulo):
> ```typescript
> const loginResolver = zodResolver(loginSchema);
> 
> function Componente() {
>   const form = useForm({ resolver: loginResolver });
>   // ...
> }
> ```

---

## 2. Padrões de Arquitetura de Autenticação & Hidratação (Incidente P0 - Resumo e Regras)

### 2.1. Formulários de Autenticação Uncontrolled (`FormData`)
- **Regra**: Os formulários de autenticação (`auth.tsx` do ERP e Portal) devem manter os elementos `<input>` **não-controlados** (`defaultValue=""`, lidos no evento `onSubmit` via `new FormData(e.currentTarget)`).
- **Por quê**: Em telas de autenticação, vincular `value` e `onChange` ao `useState` causa uma re-renderização completa da página a cada caractere digitado. Sob certas condições de hidratação ou foco, isso engatilha reconciliações cíclicas no React 19 / TanStack Start. O uso de `FormData` garante performance zero-re-render durante a digitação e elimina o risco de travamentos.

### 2.2. Obrigatoriedade do Módulo `/env.mjs`
- **Regra**: O arquivo `env.mjs` **deve existir fisicamente** em `public/env.mjs` em todos os apps (`apps/erp/public/env.mjs` e `apps/portal/public/env.mjs`) e possuir o middleware `envMjsPlugin` configurado nos arquivos `vite.config.ts`.
- **Por quê**: O runtime do TanStack Start requisita `/env.mjs` no cliente durante o bootstrap. Se a requisição retornar **404 Not Found**, o bundle de JavaScript não inicializa (falha de hidratação). Sem o JavaScript ativo no DOM, qualquer clique no formulário de login aciona a submissão **nativa de formulário HTML via GET**, vazando e-mail e senha expostos na URL do navegador.

### 2.3. Estabilidade Referencial do `AuthContext`
- **Regra**: O objeto `value` passado para o `<AuthContext.Provider value={value}>` deve ser **estritamente memoizado com `useMemo`** e conter a lista de dependências completa:
  `[session, user, profile, role, isLoading, isGestor, isFreelancer, isCliente, isAuthenticated, signOut]`.
- **Por quê**: O `AuthContext` é consumido por quase todas as rotas e guards do sistema (`ProtectedRoute`, `AppSidebar`, etc.). Objetos de contexto instáveis propagam re-renderizações em cascata por toda a árvore da aplicação. A memoização previne oscilações indevidas de estado e garante navegações de rota previsíveis.

