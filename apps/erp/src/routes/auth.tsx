import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Mail, Loader2, UserPlus, LogIn, User, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeEmail, sanitizeString } from "@/lib/sanitization";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limiter";

const loginSchema = z.object({
  email: z.string().min(1, "O e-mail é obrigatório.").email("Insira um endereço de e-mail válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso Corporativo — DELSKI CLOUD" },
      {
        name: "description",
        content: "Portal de acesso corporativo DELSKI CLOUD.",
      },
    ],
  }),
  component: AuthGuard,
});

/** Auth guard: watches session state; renders form only when unauthenticated */
function AuthGuard() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    isGestor,
    isCliente,
    isFreelancer,
    onboardingCompleted,
    isPendingApproval,
    isRejected,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (!isGestor && isPendingApproval) {
        navigate({ to: "/aguardando-aprovacao" as any, replace: true });
        return;
      }
      if (!isGestor && isRejected) {
        navigate({ to: "/acesso-negado" as any, replace: true });
        return;
      }

      let target = "/app";
      if (isCliente) {
        target = onboardingCompleted ? "/cliente" : "/onboarding";
      } else if (isFreelancer) {
        target = onboardingCompleted ? "/freelancer" : "/onboarding";
      }
      navigate({ to: target as any, replace: true });
    }
  }, [
    isAuthenticated,
    authLoading,
    isGestor,
    isCliente,
    isFreelancer,
    onboardingCompleted,
    isPendingApproval,
    isRejected,
    navigate,
  ]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
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
  const [tab, setTab] = useState<"login" | "forgot" | "reset-password">("login");
  const [resetSent, setResetSent] = useState(false);

  const initialEmail = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("email") || "";
    } catch {
      return "";
    }
  }, []);

  // Listen for Supabase password recovery link click / hash params
  useEffect(() => {
    const checkRecovery = () => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const search = typeof window !== "undefined" ? window.location.search : "";
      if (hash.includes("type=recovery") || search.includes("type=recovery")) {
        setTab("reset-password");
      }
    };

    checkRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTab("reset-password");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(e.currentTarget);
    const rawEmail = sanitizeEmail(fd.get("email"));
    const rawPassword = String(fd.get("password") || "");

    const rateLimitCheck = checkRateLimit(`login_${rawEmail}`, 5, 120_000, 60_000);
    if (!rateLimitCheck.allowed) {
      toast.error(
        `Muitas tentativas consecutivas. Aguarde ${rateLimitCheck.retryAfterSeconds}s antes de tentar novamente.`
      );
      return;
    }

    const result = loginSchema.safeParse({ email: rawEmail, password: rawPassword });
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
        const failureStatus = recordFailedAttempt(`login_${rawEmail}`, 5, 60_000);
        if (failureStatus.isBlocked) {
          toast.error(`Credenciais inválidas. Conta bloqueada temporariamente por ${failureStatus.retryAfterSeconds}s.`);
        } else {
          toast.error("E-mail ou senha incorretos. Verifique suas credenciais.");
        }
        setLoading(false);
        return;
      }

      // Sucesso: resetar o rate limit
      resetRateLimit(`login_${rawEmail}`);

      if (authData?.user) {
        const userEmail = (authData.user.email || "").toLowerCase().trim();
        const { data: pCheck } = await supabase
          .from("profiles")
          .select("role, status, onboarding_completed, approval_status")
          .eq("id", authData.user.id)
          .maybeSingle();

        const { data: cCheck } = await (supabase.from("clients") as any)
          .select("status, onboarding_completed")
          .or(`auth_user_id.eq.${authData.user.id},email.ilike.${userEmail}`)
          .limit(1)
          .maybeSingle();

        const { data: fCheck } = await (supabase.from("freelancers") as any)
          .select("status, onboarding_completed")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (
          pCheck?.status === "bloqueado" ||
          cCheck?.status === "bloqueado" ||
          fCheck?.status === "bloqueado"
        ) {
          await supabase.auth.signOut();
          toast.error("Sua conta está bloqueada pelo gestor. Acesso negado.");
          setLoading(false);
          return;
        }

        const userRole = (
          pCheck?.role ||
          (cCheck ? "cliente" : "freelancer")
        ).toLowerCase();
        const isGestorUser = userRole === "gestor" || userRole === "admin";
        const approvalStatus = pCheck?.approval_status || (isGestorUser ? "approved" : "approved");

        if (!isGestorUser && approvalStatus === "rejected") {
          toast.error("Sua solicitação de acesso não foi aprovada pelo gestor.");
          navigate({ to: "/acesso-negado" as any, replace: true });
          return;
        }

        if (!isGestorUser && approvalStatus === "pending") {
          toast.info("Sua conta está em análise aguardando aprovação do gestor.");
          navigate({ to: "/aguardando-aprovacao" as any, replace: true });
          return;
        }

        const isClient = userRole === "cliente" || userRole === "client";
        const isFree = userRole === "freelancer";
        const isOnboardingDone = Boolean(
          pCheck?.onboarding_completed ||
          cCheck?.onboarding_completed ||
          fCheck?.onboarding_completed
        );

        toast.success("Login realizado com sucesso!");

        if (isClient) {
          if (isOnboardingDone) {
            navigate({ to: "/cliente" as any, replace: true });
          } else {
            navigate({ to: "/onboarding" as any, replace: true });
          }
        } else if (isFree) {
          if (isOnboardingDone) {
            navigate({ to: "/freelancer" as any, replace: true });
          } else {
            navigate({ to: "/onboarding" as any, replace: true });
          }
        } else {
          navigate({ to: "/app", replace: true });
        }
      }
    } catch {
      toast.error("Erro de conexão com o servidor de autenticação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData(e.currentTarget);
    const email = sanitizeEmail(fd.get("forgot-email"));
    if (!email) {
      toast.error("Informe seu e-mail para recuperação.");
      return;
    }

    const rateLimitCheck = checkRateLimit(`forgot_${email}`, 3, 180_000, 120_000);
    if (!rateLimitCheck.allowed) {
      toast.error(`Muitos pedidos de recuperação. Aguarde ${rateLimitCheck.retryAfterSeconds}s.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      recordFailedAttempt(`forgot_${email}`, 3, 120_000);
      setResetSent(true);
      toast.success("Instruções de recuperação enviadas para o seu e-mail.");
    } catch {
      toast.error("Não foi possível processar a recuperação. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const onResetPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("newPassword") || "");
    const confirmNewPassword = String(fd.get("confirmNewPassword") || "");

    if (!newPassword || newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Senha redefinida com sucesso! Redirecionando para o sistema...");
      navigate({ to: "/app", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar a senha.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background dark:bg-zinc-950 text-foreground p-6 sm:p-12 transition-colors">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 flex items-center justify-center">
          <img src="/logo.png" alt="Delski Logo" className="h-12 w-12 object-contain transition-all hover:scale-105 dark:brightness-0 dark:invert" />
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
          DELSKI{" "}
          <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent font-extrabold uppercase">
            CLOUD
          </span>
        </span>
      </div>

      {/* Main Form Box */}
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border shadow-subtle space-y-6">
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
                    defaultValue={initialEmail}
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
                  className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline transition-colors cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium gap-2 shadow-sm transition-all cursor-pointer"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Autenticando..." : "Acessar Painel Delski"}
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
                  className="text-xs text-indigo-500 hover:underline mt-2 cursor-pointer"
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
                  className="w-full bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium gap-2 shadow-sm transition-all cursor-pointer"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar Link de Redefinição"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setTab("login")}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer"
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB: RESET PASSWORD (NEW PASSWORD FROM RECOVERY LINK) */}
        {tab === "reset-password" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Digite a Nova Senha</h2>
              <p className="text-sm text-muted-foreground">
                Cadastre sua nova senha para concluir a redefinição de acesso.
              </p>
            </div>

            <form onSubmit={onResetPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-foreground">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmNewPassword" className="text-sm font-medium text-foreground">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 md:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium gap-2 shadow-sm transition-all cursor-pointer"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Atualizando..." : "Salvar Nova Senha & Acessar"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
