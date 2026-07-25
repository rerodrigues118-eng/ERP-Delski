import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/mocks/store";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Delski" },
      { name: "description", content: "Acesse o painel Delski para gerir projetos e freelancers." },
      { property: "og:title", content: "Entrar — Delski" },
      { property: "og:description", content: "Acesse o painel Delski." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const login = useStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("gestor@delski.co");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("demo");

  const handle = (mode: "login" | "signup") => {
    if (!email || !password) return toast.error("Preencha e-mail e senha");
    login(email, mode === "signup" ? name || email.split("@")[0] : undefined);
    toast.success(mode === "signup" ? "Conta criada!" : "Bem-vindo(a)!");
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-brand to-chart-2 p-10 text-white">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 font-bold">D</div>
          <span className="font-semibold">Delski</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Painel completo para agências.</h2>
          <p className="mt-3 text-white/80 max-w-sm">Solicite, delegue e entregue projetos de IA, Tráfego e Sites sem sair de uma única plataforma.</p>
        </div>
        <p className="text-xs text-white/70">© Delski Agency</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 md:hidden flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">D</div>
            <span className="font-semibold">Delski</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Acessar a plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">Modo demo — qualquer credencial entra. Use um e-mail de freelancer cadastrado para experimentar o papel de freelancer.</p>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-3 pt-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pw">Senha</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => handle("login")}>Entrar</Button>
              <div className="text-xs text-muted-foreground">
                Dica: <button className="underline" onClick={() => { setEmail("ana@delski.co"); }}>entrar como freelancer</button>
              </div>
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 pt-4">
              <div>
                <Label htmlFor="n">Nome</Label>
                <Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
              <div>
                <Label htmlFor="es">E-mail</Label>
                <Input id="es" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ps">Senha</Label>
                <Input id="ps" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => handle("signup")}>Criar conta</Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
