import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeEmail } from "@/lib/sanitization";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limiter";

export const Route = createFileRoute("/portal/definir-senha")({
  head: () => ({
    meta: [
      { title: "Primeiro Acesso & Definir Senha — DELSKI CLOUD" },
      { name: "description", content: "Defina sua senha de acesso para ativar sua conta na DELSKI CLOUD." },
    ],
  }),
  component: DefinirSenhaPage,
});

function calculatePasswordStrength(pass: string) {
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
  return score; // 0 to 4
}

function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const email = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("email") || "";
    } catch {
      return "";
    }
  }, []);

  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  const strengthColor = useMemo(() => {
    if (!password) return "bg-slate-200";
    if (strength <= 1) return "bg-rose-500";
    if (strength === 2) return "bg-amber-500";
    if (strength === 3) return "bg-blue-500";
    return "bg-emerald-500";
  }, [password, strength]);

  const strengthLabel = useMemo(() => {
    if (!password) return "Digite uma senha";
    if (strength <= 1) return "Muito fraca";
    if (strength === 2) return "Razoável";
    if (strength === 3) return "Boa";
    return "Forte e segura";
  }, [password, strength]);

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanEmail = sanitizeEmail(email);
    const rateLimitCheck = checkRateLimit(`definir_senha_${cleanEmail || "anon"}`, 5, 120_000, 60_000);
    if (!rateLimitCheck.allowed) {
      toast.error(`Muitas tentativas consecutivas. Aguarde ${rateLimitCheck.retryAfterSeconds}s antes de tentar novamente.`);
      return;
    }

    if (!password || password.length < 6) {
      toast.error("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      // 1. Verificar se já existe uma sessão ativa (ex: vindo de link de recovery)
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session?.user) {
        // Atualizar senha do usuário autenticado
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
          data: {
            approval_status: "approved",
          },
        });
        if (updateError) throw updateError;
      } else if (cleanEmail) {
        // Tentar primeiro logar com a senha digitada
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (loginErr) {
          // Se não logou, tenta criar conta (signUp)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                approval_status: "approved",
              },
            },
          });

          if (signUpError) {
            // Se o usuário já existe no auth mas a senha era outra, tenta updateUser
            const { error: updateErr } = await supabase.auth.updateUser({ password });
            if (updateErr) {
              const { error: retryLoginErr } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: password,
              });
              if (retryLoginErr) {
                recordFailedAttempt(`definir_senha_${cleanEmail || "anon"}`, 5, 60_000);
                throw new Error("Não foi possível configurar a senha. Verifique se o e-mail convidado é válido.");
              }
            }
          } else if (!signUpData.session) {
            await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: password,
            });
          }
        }
      } else {
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) throw updateErr;
      }

      // Sucesso: resetar rate limit
      resetRateLimit(`definir_senha_${cleanEmail || "anon"}`);

      // 2. Garantir perfil atualizado no Supabase com onboarding pendente
      const { data: latestSession } = await supabase.auth.getSession();
      const currentUserId = latestSession.session?.user?.id;

      if (currentUserId && cleanEmail) {
        try {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", currentUserId)
            .maybeSingle();

          const targetRole = existingProfile?.role || "freelancer";

          await (supabase.from("profiles") as any).upsert({
            id: currentUserId,
            email: cleanEmail,
            role: targetRole,
            approval_status: "approved",
            onboarding_completed: false,
            status: "ativo",
            updated_at: new Date().toISOString(),
          });

          if (typeof window !== "undefined") {
            localStorage.removeItem(`delski_onboarding_completed_${currentUserId}`);
          }
        } catch (pErr) {
          console.warn("Profile upsert fallback:", pErr);
        }
      }

      setSuccess(true);
      toast.success("Senha configurada com sucesso! Iniciando Onboarding...");

      // Redirecionar diretamente para o Onboarding do prestador
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 1200);
    } catch (err: any) {
      const msg = err?.message || "Não foi possível definir a senha. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-zinc-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 mb-1 font-extrabold text-xl tracking-tight">
              <span className="text-[#0F172A] dark:text-white uppercase font-extrabold">DELSKI</span>
              <span className="text-[#2563EB] uppercase font-extrabold">CLOUD</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Criar Senha de Acesso</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Cadastre suas credenciais para ativar sua conta e iniciar o onboarding.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Senha ativada com sucesso!</h3>
                  <p className="text-sm text-slate-500">Iniciando fluxo de onboarding...</p>
                </div>
                <Loader2 className="w-5 h-5 animate-spin text-slate-900 mt-2" />
              </motion.div>
            ) : (
              <motion.form
                key="form-state"
                onSubmit={handleSubmit}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Pre-filled Email Display (Disabled) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                    E-mail Corporativo
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-sm font-medium text-slate-700 dark:text-zinc-200 opacity-90 cursor-not-allowed">
                    <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                      type="email"
                      value={email || "prestador@delski.co"}
                      disabled
                      className="w-full bg-transparent border-0 p-0 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider" htmlFor="password">
                      Nova Senha
                    </label>
                    {password && (
                      <span className="text-xs font-medium text-slate-500">{strengthLabel}</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoComplete="new-password"
                      className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {password && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 transition-all duration-300 ${
                              strength >= step ? strengthColor : "bg-slate-200 dark:bg-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className={password.length >= 6 ? "text-emerald-600 font-medium" : ""}>
                          ✓ Mínimo 6 dígitos
                        </span>
                        <span className={/[A-Z]/.test(password) ? "text-emerald-600 font-medium" : ""}>
                          ✓ Maiúscula
                        </span>
                        <span className={/[0-9]/.test(password) ? "text-emerald-600 font-medium" : ""}>
                          ✓ Número
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider" htmlFor="confirmPassword">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      autoComplete="new-password"
                      className={`w-full h-10 pl-10 pr-10 rounded-xl border bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none transition-all shadow-xs ${
                        confirmPassword
                          ? passwordsMatch
                            ? "border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            : "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" /> As senhas não conferem.
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !password || password !== confirmPassword}
                  className="w-full h-11 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl shadow-sm transition-all duration-200 gap-2 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Ativando conta...
                    </>
                  ) : (
                    "Ativar conta"
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
