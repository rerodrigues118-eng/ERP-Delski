import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  FileText,
  CheckCircle2,
  Download,
  CreditCard,
  Building2,
  Sparkles,
  ShieldCheck,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClienteFinanceProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_LABEL } from "@/mocks/types";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro & Contratos — Portal do Cliente" },
      { name: "description", content: "Acompanhamento transparente de investimentos e cobranças." },
    ],
  }),
  component: PortalFinanceiroPage,
});

export function PortalFinanceiroPage() {
  const { user, loading } = useAuth();
  const { data: clientProjects = [], isLoading } = useClienteFinanceProjects(user?.id, user?.email);

  if (loading || !user) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-40 w-full bg-stone-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Skeleton className="h-28 w-full bg-stone-200 rounded-2xl" />
          <Skeleton className="h-28 w-full bg-stone-200 rounded-2xl" />
          <Skeleton className="h-28 w-full bg-stone-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const totalInvestment = clientProjects.reduce((acc, p) => acc + Number(p.budget || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">
                Investimento & transparência
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Painel Financeiro
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-3xl">
                Acompanhe os valores contratados por projeto, status financeiro e o histórico do seu
                investimento.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 text-right">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Investimento acumulado
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                R$ {totalInvestment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Investimento Contratado</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  R$ {totalInvestment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Status da Conta</p>
                <p className="mt-3 text-lg font-semibold text-foreground">Regular / Adimplente</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-indigo-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Faturamento Padrão</p>
                <p className="mt-3 text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-600" /> PIX / Transferência PJ
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-amber-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-stone-200 pb-4">
          <CardTitle className="text-lg font-semibold">
            Detalhamento dos valores contratados
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Valores acordados em contrato por projeto e modalidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Carregando demonstrativo financeiro...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Projeto / Serviço</th>
                    <th className="text-left px-4 py-3 font-semibold">Modalidade</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Valor</th>
                    <th className="text-right px-4 py-3 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {clientProjects.length > 0 ? (
                    clientProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-semibold text-foreground">{p.title}</td>
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-100 text-indigo-600 border-indigo-200"
                          >
                            {SERVICE_LABEL[p.service_type] || p.service_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="secondary" className="text-xs">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-foreground">
                          R${" "}
                          {Number(p.budget || 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                            Ativo
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum projeto registrado na sua conta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
