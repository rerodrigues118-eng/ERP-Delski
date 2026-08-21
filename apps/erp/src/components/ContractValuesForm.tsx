import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Link2 } from "lucide-react";
import type { ContractModelVariable } from "@/types/contract-models";

export interface ContractValuesFormProps {
  variableMap: ContractModelVariable[];
  values: Record<string, string>;
  autoFields: Record<string, boolean>;
  onChange: (name: string, value: string) => void;
  missingCount: number;
}

const ACRONYMS: Record<string, string> = {
  cac: "CAC",
  cpl: "CPL",
  cnpj: "CNPJ",
  cpf: "CPF",
  id: "ID",
  url: "URL",
  ia: "IA",
  pj: "PJ",
  clt: "CLT",
  roi: "ROI",
  kpi: "KPI",
  uf: "UF",
  crm: "CRM",
  api: "API",
  cms: "CMS",
  ui: "UI",
  ux: "UX",
  bm: "BM",
  sla: "SLA",
  nfs: "NFs",
  cep: "CEP",
  pix: "PIX",
};

export function formatFieldTitle(variable: ContractModelVariable): string {
  if (variable.label && variable.label.trim()) {
    return variable.label.trim();
  }

  const words = variable.name.replace(/[-_]+/g, " ").trim().split(/\s+/);

  const formattedWords = words.map((word) => {
    const lower = word.toLowerCase();
    if (ACRONYMS[lower]) {
      return ACRONYMS[lower];
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return formattedWords.join(" ");
}

export function isLongOrMultiLineField(variable: ContractModelVariable): boolean {
  const normName = variable.name.toLowerCase();
  const normSection = (variable.section || "").toLowerCase();
  const defaultValue = variable.defaultValue ?? "";

  if (defaultValue.length > 60 || defaultValue.includes("\n")) {
    return true;
  }

  const longKeywords = [
    "escopo",
    "observac",
    "briefing",
    "descric",
    "considerac",
    "detalhe",
    "clausula",
    "condico",
  ];

  return longKeywords.some((kw) => normName.includes(kw) || normSection.includes(kw));
}

export function ContractValuesForm({
  variableMap,
  values,
  autoFields,
  onChange,
  missingCount,
}: ContractValuesFormProps) {
  if (!variableMap || variableMap.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted p-6 text-sm text-muted-foreground">
        Selecione um modelo para carregar os campos automáticos.
      </div>
    );
  }

  // Group variables by section
  const sectionsMap: Record<string, ContractModelVariable[]> = {};
  variableMap.forEach((variable) => {
    const sectionName = variable.section?.trim() || "Geral";
    if (!sectionsMap[sectionName]) {
      sectionsMap[sectionName] = [];
    }
    sectionsMap[sectionName].push(variable);
  });

  // Sort variables within each section by order
  Object.keys(sectionsMap).forEach((sectionName) => {
    sectionsMap[sectionName].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  const sectionEntries = Object.entries(sectionsMap);

  return (
    <div className="space-y-6">
      {/* Validation status header */}
      {missingCount > 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>{missingCount} campo(s) obrigatório(s) não preenchido(s)</strong>. Preencha
            todos os campos destacados abaixo para liberar a geração do contrato.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Todos os campos do contrato estão preenchidos!</span>
        </div>
      )}

      {/* Sections and inputs */}
      <div className="space-y-6">
        {sectionEntries.map(([sectionName, variables]) => (
          <div
            key={sectionName}
            className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase text-xs text-muted-foreground/80">
                {sectionName}
              </h3>
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                {variables.length} {variables.length === 1 ? "campo" : "campos"}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
              {variables.map((variable) => {
                const fieldValue = values[variable.name] ?? "";
                const isEmpty = !fieldValue || fieldValue.trim() === "";
                const isAuto = Boolean(autoFields[variable.name]);
                const isTextarea = isLongOrMultiLineField(variable);
                const titleLabel = formatFieldTitle(variable);

                return (
                  <div key={variable.name} className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label
                          htmlFor={`field-${variable.name}`}
                          className="text-xs font-semibold text-foreground"
                        >
                          {titleLabel}
                        </Label>

                        <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/40">
                          {`{{${variable.name}}}`}
                        </code>
                      </div>

                      {isAuto && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          <Link2 className="h-2.5 w-2.5" /> Auto
                        </span>
                      )}
                    </div>

                    {isTextarea ? (
                      <Textarea
                        id={`field-${variable.name}`}
                        value={fieldValue}
                        onChange={(e) => onChange(variable.name, e.target.value)}
                        placeholder={`Preencha ${titleLabel.toLowerCase()}`}
                        rows={3}
                        className={
                          isEmpty
                            ? "border-red-500/80 focus-visible:ring-red-500/50 bg-red-500/[0.03] transition-colors"
                            : "transition-colors"
                        }
                      />
                    ) : (
                      <Input
                        id={`field-${variable.name}`}
                        value={fieldValue}
                        onChange={(e) => onChange(variable.name, e.target.value)}
                        placeholder={`Preencha ${titleLabel.toLowerCase()}`}
                        className={
                          isEmpty
                            ? "border-red-500/80 focus-visible:ring-red-500/50 bg-red-500/[0.03] transition-colors"
                            : "transition-colors"
                        }
                      />
                    )}

                    {isEmpty && (
                      <p className="text-[11px] font-medium text-red-500">
                        Campo obrigatório não preenchido
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
