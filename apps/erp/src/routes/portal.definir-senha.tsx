import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/definir-senha")({
  head: () => ({
    meta: [
      { title: "Ativar Conta & Definir Senha — Portal do Cliente Delski" },
      { name: "description", content: "Defina sua senha de acesso para o Portal do Cliente Delski." },
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
        });
        if (updateError) throw updateError;
      } else if (email) {
        // Tentar registrar/ativar a conta com o e-mail convidado
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              role: "cliente",
              approval_status: "approved",
            },
          },
        });

        if (signUpError) {
          // Se o usuário já existe no auth, tenta fazer signIn com a nova senha ou notifica
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password,
          });

          if (signInError) {
            // Tenta atualizar senha se for token de recuperação na URL
            const { error: updateErr } = await supabase.auth.updateUser({ password });
            if (updateErr) {
              throw new Error(signUpError.message || "Erro ao configurar senha.");
            }
          }
        }

        // Garantir criação / atualização de profile como cliente
        const currentUserId = signUpData?.user?.id;
        if (currentUserId) {
          try {
            await (supabase.from("profiles") as any).upsert({
              id: currentUserId,
              email: email.trim().toLowerCase(),
              role: "cliente",
              approval_status: "approved",
            });
          } catch (pErr) {
            console.warn("Profile upsert fallback:", pErr);
          }
        }
      } else {
        // Caso sem email nos params, tenta update da sessão
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) throw updateErr;
      }

      setSuccess(true);
      toast.success("Conta ativada com sucesso! Bem-vindo(a) ao Delski.");

      // Aguardar animação de celebração e redirecionar para Onboarding do Cliente
      setTimeout(() => {
        navigate({ to: "/onboarding", replace: true });
      }, 1500);
    } catch (err: any) {
      console.error("[Definir Senha Error]", err);
      const msg = err?.message || "Não foi possível definir a senha. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 font-sans">
      {/* Background ambient subtle glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
          {/* Top Royal Blue Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#3b82f6] rounded-full" />

          {/* Logo / Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Portal do Cliente Delski
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ativar sua Conta</h1>
            <p className="text-sm text-slate-500">
              Defina sua senha de acesso segura para acessar seus projetos, demandas e contratos.
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
                  <h3 className="text-lg font-bold text-slate-900">Senha cadastrada com sucesso!</h3>
                  <p className="text-sm text-slate-500">Redirecionando você para o Onboarding da sua conta...</p>
                </div>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 mt-2" />
              </motion.div>
            ) : (
              <motion.form
                key="form-state"
                onSubmit={handleSubmit}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Pre-filled Email Display */}
                {email && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      E-mail de Acesso
                    </label>
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider" htmlFor="password">
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
                      className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
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
                      <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 transition-all duration-300 ${
                              strength >= step ? strengthColor : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className={password.length >= 6 ? "text-emerald-600 font-medium" : ""}>
                          ✓ Mínimo 6 dígitos
                        </span>
                        <span className={/[A-Z]/.test(password) ? "text-emerald-600 font-medium" : ""}>
                          ✓ Letra maiúscula
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
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider" htmlFor="confirmPassword">
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
                      className={`w-full h-10 pl-10 pr-10 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none transition-all shadow-xs ${
                        confirmPassword
                          ? passwordsMatch
                            ? "border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            : "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
                  className="w-full h-11 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] hover:from-[#1e40af] hover:via-[#1d4ed8] hover:to-[#2563eb] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Ativando Conta...
                    </>
                  ) : (
                    <>
                      Ativar Conta & Acessar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Delski ERP — Gestão Integrada & Portal do Cliente
        </p>
      </motion.div>
    </div>
  );
}
