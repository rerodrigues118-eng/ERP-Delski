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
        <span className="text-xl font-extrabold tracking-tight text-gray-900 flex items-center gap-1.5">
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
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 shadow-xl p-8 sm:p-10 text-center space-y-6"
      >
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
          <XOctagon className="h-8 w-8" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Solicitação Não Aprovada
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Acesso Não Autorizado
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Olá, <strong>{displayName}</strong>. Sua solicitação de cadastro para acessar a plataforma não foi aprovada pelo gestor.
          </p>
        </div>

        {/* Support Help Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-left text-xs space-y-2 text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <HelpCircle className="h-4 w-4 text-blue-600" /> Precisa de esclarecimentos?
          </div>
          <p className="text-[12px] leading-relaxed">
            Se você faz parte da equipe ou foi convidado para um projeto da Delski, entre em contato diretamente com o gestor responsável para verificar o status do seu convite.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full text-xs font-semibold h-10 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Voltar à Tela de Login
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
