import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Lock, Sparkles, Mail, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Insira um endereço de e-mail válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso Restrito — Delski ERP" },
      { name: "description", content: "Portal corporativo restrito de gestão de projetos e freelancers Delski." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "gestor@delski.co",
      password: "demo",
    },
  });

  // Direct redirection if already logged in via Supabase
  if (user) {
    navigate({ to: "/app", replace: true });
  }

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      // Attempt Supabase Auth login
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error(`Falha no Supabase Auth: ${error.message}. Redirecionando para demonstração...`);
        // Redireciona para o painel
        setTimeout(() => navigate({ to: "/app", replace: true }), 1200);
        return;
      }

      toast.success("Autenticação no Supabase realizada com sucesso!");
      navigate({ to: "/app", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao efetuar login";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (email: string) => {
    setValue("email", email);
    setValue("password", "demo123456");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Visual Identity Hero Section */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 p-12 text-zinc-100 relative overflow-hidden border-r border-zinc-800">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
            D
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">DELSKI</span>
            <span className="ml-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50">ERP Corporate</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            Automação com IA • Tráfego Pago • Sites & Landings
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Plataforma Restrita de Gestão de Operações e Freelancers.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Centralize requisições, briefing técnico por seções, triagem de freelancers com pontuação por matriz de compatibilidade e cronograma Gantt com bloqueio de dependências.
          </p>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Políticas de Segurança RLS (Supabase)
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Lock className="h-4 w-4 text-indigo-400" />
              Acesso Restrito por Convite
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} Delski Technology & Agency Operations. Todos os direitos reservados.
        </div>
      </div>

      {/* Strict Access Login Form Section */}
      <div className="flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <div className="lg:hidden flex items-center gap-2.5 mb-6">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
                D
              </div>
              <span className="text-lg font-bold tracking-tight">DELSKI ERP</span>
            </div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
              <Lock className="h-3.5 w-3.5" />
              Sistema de Acesso Restrito via Supabase Auth
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Entrar no Sistema</h2>
            <p className="text-sm text-muted-foreground">
              O cadastro é exclusivo via convite encaminhado por e-mail (Brevo) ou provisionamento direto pelo Gestor.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  placeholder="usuario@delski.co"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha de acesso</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Autenticando no Supabase..." : "Acessar Painel Delski"}
            </Button>
          </form>

          {/* Quick Demo Access Switcher */}
          <div className="pt-6 border-t border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
              Preenchimento Rápido para Teste:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoUser("gestor@delski.co")}
                className="text-left p-2.5 rounded-lg border border-border bg-card hover:bg-accent text-xs transition-colors"
              >
                <div className="font-semibold text-foreground">Gestor</div>
                <div className="text-[10px] text-muted-foreground truncate">Acesso Total</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("ana@delski.co")}
                className="text-left p-2.5 rounded-lg border border-border bg-card hover:bg-accent text-xs transition-colors"
              >
                <div className="font-semibold text-foreground">Freelancer</div>
                <div className="text-[10px] text-muted-foreground truncate">Projetos Alocados</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("cliente@aurora.co")}
                className="text-left p-2.5 rounded-lg border border-border bg-card hover:bg-accent text-xs transition-colors"
              >
                <div className="font-semibold text-foreground">Cliente</div>
                <div className="text-[10px] text-muted-foreground truncate">Apenas Progresso</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
