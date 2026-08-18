import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, ShieldAlert, LogOut, CheckCircle2, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/aguardando-aprovacao")({
  head: () => ({
    meta: [
      { title: "Aguardando Aprovação — DELSKI CLOUD" },
      {
        name: "description",
        content: "Sua solicitação de acesso está aguardando análise e aprovação do gestor.",
      },
    ],
  }),
  component: AguardandoAprovacaoPage,
});

function AguardandoAprovacaoPage() {
  const {
    user,
    profile,
    isApproved,
    isRejected,
    isGestor,
    isCliente,
    isFreelancer,
    onboardingCompleted,
    refreshProfile,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  // Polling suave a cada 6 segundos para redirecionar assim que o gestor aprovar
  useEffect(() => {
    const interval = setInterval(() => {
      refreshProfile();
    }, 6000);
    return () => clearInterval(interval);
  }, [refreshProfile]);

  // Redirecionamento automático quando o status mudar
  useEffect(() => {
    if (isApproved || isGestor) {
      if (isCliente) {
        navigate({ to: onboardingCompleted ? "/cliente" : ("/onboarding" as any), replace: true });
      } else if (isFreelancer) {
        navigate({ to: onboardingCompleted ? "/freelancer" : ("/onboarding" as any), replace: true });
      } else {
        navigate({ to: "/app" as any, replace: true });
      }
    } else if (isRejected) {
      navigate({ to: "/acesso-negado" as any, replace: true });
    }
  }, [isApproved, isRejected, isGestor, isCliente, isFreelancer, onboardingCompleted, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Usuário";
  const displayEmail = profile?.email || user?.email || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-between items-center p-6 sm:p-12">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-12 w-12 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Delski Logo"
            className="h-12 w-12 object-contain"
          />
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-1.5">
          DELSKI{" "}
          <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent font-extrabold uppercase">
            CLOUD
          </span>
        </span>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 shadow-xl p-8 sm:p-10 text-center space-y-6"
      >
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-blue-100 rounded-full"
          />
          <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Clock className="h-8 w-8" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Solicitação em Análise
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Conta Criada com Sucesso!
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            O gestor foi notificado e você receberá um e-mail assim que seu acesso for aprovado.
          </p>
        </div>

        {/* User Info Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-left text-xs space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Dados do Cadastro
          </div>
          <p className="font-bold text-slate-800 text-sm">{displayName}</p>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span>{displayEmail}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            onClick={() => refreshProfile()}
            className="w-full text-xs font-semibold h-10 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Verificar Status Agora
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-xs font-semibold h-10 gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair da Conta / Voltar ao Login
          </Button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4">
        © {new Date().getFullYear()} Agência Delski. Todos os direitos reservados.
      </div>
    </div>
  );
}
