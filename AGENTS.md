# Diretrizes de Desenvolvimento — Delski ERP

## Prevenção de CPU Lockup em Formulários (React Hook Form + Zod)
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
