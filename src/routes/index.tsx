import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, LineChart, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delski — Automação com IA, Tráfego e Sites" },
      { name: "description", content: "Delski é uma agência de Automação com IA, Tráfego Pago e Desenvolvimento de Sites. Gerimos projetos e freelancers em uma única plataforma." },
      { property: "og:title", content: "Delski — Automação com IA, Tráfego e Sites" },
      { property: "og:description", content: "Agência digital especializada em IA, tráfego pago e sites, com gestão centralizada de projetos e freelancers." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">D</div>
          <span className="text-lg font-semibold tracking-tight">Delski</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
          <Button asChild><Link to="/auth">Começar agora</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="pt-16 pb-20 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Plataforma interna da agência
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
            Projetos e freelancers,
            <span className="block bg-gradient-to-r from-brand to-chart-2 bg-clip-text text-transparent">organizados em um só lugar.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A Delski centraliza a operação de IA, Tráfego Pago e Desenvolvimento de Sites — do briefing à entrega, com delegação e documentos vinculados a cada projeto.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Acessar painel <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/app/projects">Ver projetos demo</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Bot, title: "Automação com IA", desc: "Agentes, chatbots e integrações com dados do cliente." },
            { icon: LineChart, title: "Tráfego Pago", desc: "Campanhas Meta e Google, gestão contínua e relatórios." },
            { icon: Globe, title: "Sites & Landings", desc: "Do design ao deploy, com CMS e integrações comerciais." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
