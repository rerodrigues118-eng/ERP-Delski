import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Mail, Loader2, UserPlus, LogIn, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().min(1, "O e-mail é obrigatório.").email("Insira um endereço de e-mail válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

const registerSchema = z
  .object({
    fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres."),
    email: z.string().min(1, "O e-mail é obrigatório.").email("Insira um endereço de e-mail válido."),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "A confirmação de senha é obrigatória."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso & Cadastro — Delski ERP" },
      {
        name: "description",
        content: "Portal de acesso e cadastro de freelancers Delski.",
      },
    ],
  }),
  component: AuthGuard,
});

/** Auth guard: watches session state; renders form only when unauthenticated */
function AuthGuard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate({ to: "/app", replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <AuthPage />;
}

/** Purely presentational auth form — NO auth context subscription here */
function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);

  const onLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || "Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: result.data.email.trim(),
        password: result.data.password,
      });

      if (signInError) {
        toast.error(signInError.message || "Erro de autenticação. Verifique suas credenciais.");
        setLoading(false);
        return;
      }

      if (authData?.session || authData?.user) {
        toast.success("Login realizado com sucesso!");
        navigate({ to: "/app", replace: true });
      }
    } catch (err: unknown) {
      console.error("Erro inesperado no login:", err);
      toast.error("Erro de conexão com o servidor de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("forgot-email") || "").trim();
    if (!email) {
      toast.error("Informe o seu e-mail para redefinir a senha.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar o e-mail de redefinição.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") || "");
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");

    const result = registerSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || "Preencha os dados corretamente.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: result.data.email.trim(),
        password: result.data.password,
        options: { data: { full_name: result.data.fullName.trim(), role: "freelancer" } },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        try {
          await (supabase.from("profiles") as any).upsert({
            id: authData.user.id,
            full_name: result.data.fullName.trim(),
            email: result.data.email.trim(),
            role: "freelancer",
          });
        } catch (profileErr) {
          console.warn("Upsert de perfil falhou (possível RLS):", profileErr);
        }

        toast.success("Conta criada com sucesso! Faça login para continuar.");
        setTab("login");
      }
    } catch (err: unknown) {
      console.error("Erro ao criar conta:", err);
      const msg = err instanceof Error ? err.message : "Erro ao criar conta.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-gray-50/60 p-6 sm:p-12">
      {/* Brand Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-11 w-11 flex items-center justify-center">
          <img src="/logo.png" alt="Delski Logo" className="h-11 w-11 object-contain" />
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900">DELSKI ERP</span>
      </div>

      {/* Main Form Box */}
      <div className="w-full max-w-md my-auto bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        {/* Simple CSS Tabs — no Radix, no controlled state, no re-renders */}
        <div className="grid grid-cols-2 w-full bg-muted p-1 border border-border rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium ${
              tab === "login"
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="h-4 w-4" /> Entrar no Sistema
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium ${
              tab === "register"
                ? "bg-white shadow-sm text-indigo-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-4 w-4" /> Criar Conta
          </button>
        </div>

        {/* TAB: LOGIN */}
        {tab === "login" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Entrar no Sistema</h2>
              <p className="text-sm text-muted-foreground">
                Informe suas credenciais registradas para acessar o painel corporativo Delski.
              </p>
            </div>

            <form onSubmit={onLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">E-mail corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="usuario@delski.co"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">Senha de acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setTab("forgot"); setResetSent(false); }}
                  className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium gap-2 shadow-sm transition-all"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Autenticando..." : "Acessar Painel Delski"}
              </Button>
            </form>
          </div>
        )}

        {/* TAB: REGISTER */}
        {tab === "register" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Criar Conta</h2>
              <p className="text-sm text-muted-foreground">
                Preencha seus dados para criar sua conta no Delski ERP.
              </p>
            </div>

            <form onSubmit={onRegisterSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reg-fullName" className="text-sm font-medium text-foreground">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="reg-fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reg-email" className="text-sm font-medium text-foreground">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="seu.email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reg-password" className="text-sm font-medium text-foreground">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reg-confirmPassword" className="text-sm font-medium text-foreground">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="reg-confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium gap-2 shadow-sm transition-all"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Criando Conta..." : "Criar Conta e Acessar"}
              </Button>
            </form>
          </div>
        )}
        {/* TAB: FORGOT PASSWORD */}
        {tab === "forgot" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Redefinir Senha</h2>
              <p className="text-sm text-muted-foreground">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            {resetSent ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                <p className="text-sm font-semibold text-emerald-700">E-mail enviado!</p>
                <p className="text-xs text-emerald-600">
                  Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                </p>
                <button
                  type="button"
                  onClick={() => { setTab("login"); setResetSent(false); }}
                  className="text-xs text-indigo-500 hover:underline mt-2"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={onForgotSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">Seu e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="forgot-email"
                      name="forgot-email"
                      type="email"
                      autoComplete="email"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                      placeholder="usuario@delski.co"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar Link de Redefinição"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setTab("login")}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Rights */}
      <div className="text-center text-xs text-gray-400 py-4">
        &copy; {new Date().getFullYear()} Delski ERP — Sistema de Gestão Interna & Freelancers.
      </div>
    </div>
  );
}
