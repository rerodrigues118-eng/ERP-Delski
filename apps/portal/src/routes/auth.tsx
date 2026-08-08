import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { email?: string } => {
    return {
      email: typeof search.email === "string" ? search.email : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Portal do Cliente — Delski" },
      { name: "description", content: "Acesso exclusivo ao Portal do Cliente Delski." },
    ],
  }),
  component: ClientAuthPage,
});

function ClientAuthPage() {
  const searchParams = useSearch({ from: "/auth" });
  const queryEmail = searchParams?.email;
  const { isAuthenticated, isCliente, isGestor, isFreelancer, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(queryEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [queryEmail]);

  // Guard: Role-based redirection if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (isGestor || isFreelancer) {
        toast.info("Acesso interno detectado. Redirecionando...");
        window.location.href = "/auth";
      } else if (isCliente) {
        navigate({ to: "/dashboard", replace: true });
      }
    }
  }, [isAuthenticated, isGestor, isFreelancer, isCliente, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email.trim() || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setSubmitting(true);
    try {
      if (isFirstAccess) {
        if (password.length < 6) {
          toast.error("A senha deve conter no mínimo 6 caracteres.");
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error("As senhas informadas não coincidem.");
          setSubmitting(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role: "cliente",
            },
          },
        });

        if (error) {
          if (
            error.message.toLowerCase().includes("already registered") ||
            error.message.toLowerCase().includes("exists")
          ) {
            const { error: signInErr } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (signInErr) {
              toast.error("Sua conta já possui uma senha definida. Tente realizar o login comum.");
              setIsFirstAccess(false);
              setSubmitting(false);
              return;
            }
          } else {
            throw error;
          }
        }

        toast.success("Senha cadastrada com sucesso! Bem-vindo(a) ao Portal.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("E-mail ou senha incorretos. Verifique suas credenciais.");
          } else {
            toast.error(error.message);
          }
          setSubmitting(false);
          return;
        }

        const loggedUserId = data.user?.id;
        if (loggedUserId) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", loggedUserId)
            .maybeSingle();

          const userRole = userProfile?.role?.toLowerCase();
          if (userRole && userRole !== "cliente" && userRole !== "client") {
            await supabase.auth.signOut();
            toast.error(
              "Esta tela de acesso é exclusiva para Clientes. Utilize a área do ERP Delski.",
            );
            setSubmitting(false);
            return;
          }
        }

        toast.success("Autenticação realizada com sucesso!");
      }

      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Ocorreu um erro ao processar seu acesso.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 flex flex-col justify-between p-4 sm:p-8 font-sans">
      <header className="max-w-md mx-auto w-full pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-serif font-extrabold text-2xl tracking-wider text-stone-900">
            DELSKI
          </div>
        </div>
        <span className="text-[11px] font-medium tracking-widest text-stone-500 uppercase border border-stone-200 px-2.5 py-1 rounded">
          Portal do Cliente
        </span>
      </header>

      <main className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-white border border-stone-200/80 rounded-xl p-8 shadow-sm space-y-6">
          <div className="space-y-1.5 border-b border-stone-100 pb-5">
            <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
              {isFirstAccess ? "Defina sua Senha de Acesso" : "Acesse o Portal do Cliente"}
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              {isFirstAccess
                ? "Informe sua senha pessoal para concluir a ativação da sua conta."
                : "Ambiente exclusivo para acompanhamento de projetos, entregas e documentos."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700 block">E-mail Corporativo</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com"
                  className="w-full h-10 px-3 text-sm bg-stone-50/50 border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 focus:border-stone-800 transition-colors text-stone-900 placeholder:text-stone-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-stone-700 block">
                  {isFirstAccess ? "Nova Senha" : "Senha de Acesso"}
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 text-sm bg-stone-50/50 border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 focus:border-stone-800 transition-colors text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {isFirstAccess && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-700 block">
                  Confirme a Nova Senha
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 text-sm bg-stone-50/50 border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 focus:border-stone-800 transition-colors text-stone-900 placeholder:text-stone-400"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{isFirstAccess ? "Concluir Cadastro & Entrar" : "Entrar no Portal"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setIsFirstAccess(!isFirstAccess)}
              className="text-stone-600 hover:text-stone-900 font-medium underline underline-offset-4 transition-colors"
            >
              {isFirstAccess
                ? "Já possui senha? Entrar"
                : "Primeiro acesso? Definir senha pelo convite"}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-stone-400" />
          <span>Conexão criptografada e segura de alta prioridade.</span>
        </div>
      </main>

      <footer className="max-w-md mx-auto w-full text-center pb-4 text-[11px] text-stone-400">
        © {new Date().getFullYear()} Delski — Todos os direitos reservados. Portal Exclusivo do Cliente.
      </footer>
    </div>
  );
}
