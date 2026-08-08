import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

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

  // Direct redirection ONLY if already logged in via Supabase
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (isCliente) {
        toast.info("Você está conectado como Cliente.");
        window.location.href = "/portal/auth";
      } else {
        navigate({ to: "/app", replace: true });
      }
    }
  }, [isAuthenticated, isCliente, authLoading, navigate]);

  // Form hooks for Login
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Form hooks for Register
  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Clean, standard login handler
  const onLoginSubmit = async (data: LoginFormData, e?: React.BaseSyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const email = data.email?.trim();
    const password = data.password;

    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
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

  // Clean, standard register handler
  const onRegisterSubmit = async (data: RegisterFormData, e?: React.BaseSyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName.trim(),
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
          full_name: data.fullName.trim(),
          email: data.email.trim(),
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

            <form onSubmit={handleSubmitLogin(onLoginSubmit)} autoComplete="off" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    className="pl-9"
                    placeholder="usuario@delski.co"
                    {...registerLogin("email")}
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-xs text-destructive">{loginErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha de acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    placeholder="••••••••"
                    {...registerLogin("password")}
                  />
                </div>
                {loginErrors.password && (
                  <p className="text-xs text-destructive">{loginErrors.password.message}</p>
                )}
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

            <form onSubmit={handleSubmitSignUp(onRegisterSubmit)} autoComplete="off" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="off"
                    className="pl-9"
                    placeholder="Ex: Maria Silva"
                    {...registerSignUp("fullName")}
                  />
                </div>
                {registerErrors.fullName && (
                  <p className="text-xs text-destructive">{registerErrors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    className="pl-9"
                    placeholder="seu.email@dominio.com"
                    {...registerSignUp("email")}
                  />
                </div>
                {registerErrors.email && (
                  <p className="text-xs text-destructive">{registerErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Senha de acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    placeholder="No mínimo 6 caracteres"
                    {...registerSignUp("password")}
                  />
                </div>
                {registerErrors.password && (
                  <p className="text-xs text-destructive">{registerErrors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    placeholder="Repita sua senha"
                    {...registerSignUp("confirmPassword")}
                  />
                </div>
                {registerErrors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {registerErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Criando conta..." : "Criar Conta & Entrar no APP"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Rights */}
      <div className="text-xs text-gray-400 pb-4 text-center">
        © {new Date().getFullYear()} Delski Technology & Agency Operations. Todos os direitos reservados.
      </div>
    </div>
  );
}
