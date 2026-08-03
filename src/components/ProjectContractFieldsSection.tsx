import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContractModels } from "@/hooks/useContractModels";
import type { ContractModelVariable } from "@/types/contract-models";
import type { ServiceType } from "@/hooks/useProjects";

interface ProjectContractFieldsSectionProps {
  serviceType: ServiceType;
  values: Record<string, string>;
  onChange: (newValues: Record<string, string>, isComplete: boolean) => void;
  readOnly?: boolean;
}

export function ProjectContractFieldsSection({
  serviceType,
  values,
  onChange,
  readOnly = false,
}: ProjectContractFieldsSectionProps) {
  const { data: models = [], isLoading } = useContractModels();

  // Deduplicate variables with origin='project' across active models for selected serviceType
  const { projectVariables, groupedSections, isComplete } = useMemo(() => {
    const activeModels = models.filter(
      (m) => m.is_active !== false && m.service_type === serviceType,
    );

    const mapByName = new Map<string, ContractModelVariable>();

    activeModels.forEach((model) => {
      const vars: ContractModelVariable[] = model.variable_map ?? [];
      vars.forEach((v) => {
        if (v.origin === "project" && v.name && !mapByName.has(v.name)) {
          mapByName.set(v.name, v);
        }
      });
    });

    const list = Array.from(mapByName.values());
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Group by section
    const groups = new Map<string, ContractModelVariable[]>();
    list.forEach((v) => {
      const sec = v.section || "Geral";
      if (!groups.has(sec)) groups.set(sec, []);
      groups.get(sec)!.push(v);
    });

    const complete = list.length > 0 && list.every((v) => (values[v.name] ?? "").trim().length > 0);

    return {
      projectVariables: list,
      groupedSections: Array.from(groups.entries()),
      isComplete: complete,
    };
  }, [models, serviceType, values]);

  const handleFieldChange = (name: string, val: string) => {
    const updated = { ...values, [name]: val };
    const complete =
      projectVariables.length > 0 &&
      projectVariables.every((v) => (updated[v.name] ?? "").trim().length > 0);

    onChange(updated, complete);
  };

  return (
    <Card className="border-indigo-500/20 bg-card shadow-sm space-y-4">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Dados para Contrato
            </CardTitle>
            <CardDescription className="text-xs">
              Variáveis técnicas exigidas pelos modelos de contrato ativos na vertical de{" "}
              <strong>{serviceType}</strong>.
            </CardDescription>
          </div>

          {projectVariables.length > 0 && (
            <Badge
              variant="outline"
              className={
                isComplete
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs"
                  : "bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-xs"
              }
            >
              {isComplete ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Campos Completos
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" /> Pendente de Preenchimento
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse">
            Carregando mapeamento de variáveis de contrato...
          </p>
        ) : projectVariables.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center bg-muted/30">
            <p className="text-xs text-muted-foreground italic">
              Nenhum modelo de contrato cadastrado para esta vertical ainda.
            </p>
          </div>
        ) : (
          groupedSections.map(([sectionName, sectionVars]) => (
            <div key={sectionName} className="space-y-3">
              {groupedSections.length > 1 && (
                <div className="flex items-center gap-2 border-b pb-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {sectionName}
                  </h4>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {sectionVars.map((v) => {
                  const val = values[v.name] ?? "";
                  const isLong = (v.label || v.name).length > 40;

                  return (
                    <div
                      key={v.name}
                      className={isLong ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">{v.label || v.name}</Label>
                      </div>

                      {v.name.includes("briefing") ||
                      v.name.includes("escopo") ||
                      v.name.includes("detalhes") ? (
                        <Textarea
                          rows={2}
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => handleFieldChange(v.name, e.target.value)}
                          placeholder={v.defaultValue || `Preencha ${v.label || v.name}`}
                          className="text-xs"
                        />
                      ) : (
                        <Input
                          value={val}
                          disabled={readOnly}
                          onChange={(e) => handleFieldChange(v.name, e.target.value)}
                          placeholder={v.defaultValue || `Preencha ${v.label || v.name}`}
                          className="text-xs h-9"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
