import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  Loader2,
  UserPlus,
  LogIn,
  User,
} from "lucide-react";
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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isCliente, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`[AuthPage RENDER #${renderCount.current}]`);

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  // Direct redirection ONLY if already logged in via Supabase
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (isCliente) {
        toast.info("Você está conectado como Cliente.");
        window.location.href = "/portal/auth";
      } else {
        navigateRef.current({ to: "/app", replace: true });
      }
    }
  }, [isAuthenticated, isCliente, authLoading]);

  const onLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

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

  const onRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const formData = new FormData(e.currentTarget);
    const fullName = String(formData.get("fullName") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      toast.error(result.error.errors[0]?.message || "Preencha os dados corretamente.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: result.data.email.trim(),
        password: result.data.password,
        options: {
          data: {
            full_name: result.data.fullName.trim(),
            role: "freelancer",
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (authData.user) {
        await (supabase.from("profiles") as any).upsert({
          id: authData.user.id,
          full_name: result.data.fullName.trim(),
          email: result.data.email.trim(),
          role: "freelancer",
        });

        toast.success("Conta criada com sucesso! Faça login para continuar.");
        setActiveTab("login");
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
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md text-lg">
          D
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900">DELSKI ERP</span>
      </div>

      {/* Main Form Box */}
      <div className="w-full max-w-md my-auto bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "login" | "register")}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 w-full mb-6 bg-muted p-1 border border-border rounded-lg">
            <TabsTrigger value="login" className="gap-2 font-medium">
              <LogIn className="h-4 w-4" /> Entrar no Sistema
            </TabsTrigger>
            <TabsTrigger value="register" className="gap-2 font-medium text-indigo-400">
              <UserPlus className="h-4 w-4" /> Criar Conta
            </TabsTrigger>
          </TabsList>

          {/* TAB: LOGIN */}
          <TabsContent value="login" className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
                <Lock className="h-3.5 w-3.5" />
                Acesso via Supabase Auth
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Entrar no Sistema
              </h2>
              <p className="text-sm text-muted-foreground">
                Informe suas credenciais registradas para acessar o painel corporativo Delski.
              </p>
            </div>

            <form action="javascript:void(0)" method="post" onSubmit={onLoginSubmit} autoComplete="off" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="usuario@delski.co"
                    defaultValue=""
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Senha de acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                    defaultValue=""
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Autenticando..." : "Acessar Painel Delski"}
              </Button>
            </form>
          </TabsContent>

          {/* TAB: REGISTER FREELANCER */}
          <TabsContent value="register" className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 text-xs font-medium">
                <UserPlus className="h-3.5 w-3.5" />
                Cadastro no Sistema
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Criar Conta
              </h2>
              <p className="text-sm text-muted-foreground">
                Preencha seus dados para criar sua conta no Delski ERP.
              </p>
            </div>

            <form action="javascript:void(0)" method="post" onSubmit={onRegisterSubmit} autoComplete="off" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-foreground">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="off"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="Ex: Maria Silva"
                    defaultValue=""
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
                    autoComplete="off"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="seu.email@exemplo.com"
                    defaultValue=""
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
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                    defaultValue=""
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                    defaultValue=""
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Criando Conta..." : "Criar Conta e Acessar"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Rights */}
      <div className="text-center text-xs text-gray-400 py-4">
        &copy; {new Date().getFullYear()} Delski ERP — Sistema de Gestão Interna & Freelancers.
      </div>
    </div>
  );
}
