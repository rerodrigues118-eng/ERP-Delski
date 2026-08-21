import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { XOctagon, LogOut, Mail, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/acesso-negado")({
  head: () => ({
    meta: [
      { title: "Acesso Negado — DELSKI CLOUD" },
      {
        name: "description",
        content: "Sua solicitação de acesso não foi aprovada pelo gestor.",
      },
    ],
  }),
  component: AcessoNegadoPage,
});

function AcessoNegadoPage() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Usuário";
  const displayEmail = profile?.email || user?.email || "";

  const isBlocked = profile?.status === "bloqueado" || profile?.status === "inativo";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-between items-center p-6 sm:p-12 transition-colors">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-12 w-12 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Delski Logo"
            className="h-12 w-12 object-contain"
          />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
          DELSKI{" "}
          <span className="text-[#2563EB] font-extrabold uppercase">
            CLOUD
          </span>
        </span>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white dark:bg-[#11131A] rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-xl p-8 sm:p-10 text-center space-y-6"
      >
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
          <XOctagon className="h-8 w-8" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60">
          {isBlocked ? "Acesso Suspenso" : "Solicitação Não Aprovada"}
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isBlocked ? "Acesso Suspenso" : "Acesso Não Autorizado"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
            {isBlocked ? (
              <>
                Olá, <strong>{displayName}</strong>. Seu acesso foi suspenso. Entre em contato com a gestão para mais informações.
              </>
            ) : (
              <>
                Olá, <strong>{displayName}</strong>. Sua solicitação de cadastro para acessar a plataforma não foi aprovada pelo gestor.
              </>
            )}
          </p>
        </div>

        {/* Support Help Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-left text-xs space-y-2 text-slate-600 dark:text-zinc-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
            <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Precisa de esclarecimentos?
          </div>
          <p className="text-[12px] leading-relaxed">
            Se você faz parte da equipe ou é um cliente ativo da Delski, entre em contato diretamente com a gestão responsável.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full text-xs font-semibold h-10 gap-2 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Voltar à Tela de Login
          </Button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 dark:text-zinc-500 py-4">
        © {new Date().getFullYear()} Agência Delski. Todos os direitos reservados.
      </div>
    </div>
  );
}
