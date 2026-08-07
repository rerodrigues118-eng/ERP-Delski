import { useMemo } from "react";
import type { ContractModelVariable } from "@/types/contract-models";
import type { Project } from "@/hooks/useProjects";
import type { Profile } from "@/hooks/useProfiles";

export interface CompanySettings {
  nome_empresa: string;
  razao_social: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  email: string;
  telefone: string;
  nome_representante: string;
  cargo_representante: string;
  email_contratante: string;
  telefone_contratante: string;
  cidade_padrao_assinatura: string;
  representante?: string;
  cidade_assinatura?: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  nome_empresa: "Delski Serviços de Tecnologia Ltda",
  razao_social: "Delski Serviços de Tecnologia Ltda",
  cnpj: "45.892.123/0001-90",
  endereco: "Av. Cândido de Abreu, 526 - Centro Cívico, Curitiba - PR",
  cidade: "Curitiba",
  estado: "PR",
  email: "contato@delski.com.br",
  telefone: "(41) 99876-5432",
  nome_representante: "Diretoria Delski",
  cargo_representante: "Diretoria",
  email_contratante: "contato@delski.com.br",
  telefone_contratante: "(41) 99876-5432",
  cidade_padrao_assinatura: "Curitiba",
  representante: "Diretoria Delski",
  cidade_assinatura: "Curitiba",
};

export interface ResolvedFieldsResult {
  values: Record<string, string>;
  autoFields: Record<string, boolean>;
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_");
}

export function resolveContractFieldValue(
  variable: ContractModelVariable,
  project?: Project | null,
  freelancer?: Profile | null,
  companySettings: CompanySettings = DEFAULT_COMPANY_SETTINGS,
): { value: string; isAuto: boolean } {
  const normName = normalizeKey(variable.name);

  switch (variable.origin) {
    case "company": {
      if (normName.includes("cnpj")) {
        return { value: companySettings.cnpj, isAuto: true };
      }
      if (normName.includes("razao") || normName.includes("social")) {
        return { value: companySettings.razao_social, isAuto: true };
      }
      if (normName.includes("endereco") || normName.includes("logradouro")) {
        return { value: companySettings.endereco, isAuto: true };
      }
      if (normName.includes("cidade")) {
        return { value: companySettings.cidade, isAuto: true };
      }
      if (normName.includes("estado") || normName.includes("uf")) {
        return { value: companySettings.estado, isAuto: true };
      }
      if (normName.includes("email")) {
        return { value: companySettings.email_contratante || companySettings.email, isAuto: true };
      }
      if (
        normName.includes("telefone") ||
        normName.includes("fone") ||
        normName.includes("contato")
      ) {
        return {
          value: companySettings.telefone_contratante || companySettings.telefone,
          isAuto: true,
        };
      }
      if (normName.includes("cargo") && normName.includes("representante")) {
        return { value: companySettings.cargo_representante || "", isAuto: true };
      }
      if (normName.includes("representante")) {
        return {
          value: companySettings.nome_representante || companySettings.representante || "",
          isAuto: true,
        };
      }
      // Default company name fallback
      return {
        value: companySettings.nome_empresa || variable.defaultValue || "",
        isAuto: true,
      };
    }

    case "freelancer": {
      if (!freelancer) {
        return { value: "", isAuto: false };
      }
      if (freelancer.contract_field_values && freelancer.contract_field_values[variable.name]) {
        return { value: freelancer.contract_field_values[variable.name], isAuto: true };
      }
      if (normName.includes("email")) {
        return { value: freelancer.email ?? "", isAuto: true };
      }
      if (normName.includes("role") || normName.includes("cargo") || normName.includes("funcao")) {
        return { value: freelancer.role ?? "", isAuto: true };
      }
      // Name fallback
      return {
        value: freelancer.full_name ?? "",
        isAuto: true,
      };
    }

    case "project": {
      if (!project) {
        return { value: "", isAuto: false };
      }
      if (project.contract_field_values && project.contract_field_values[variable.name]) {
        return { value: project.contract_field_values[variable.name], isAuto: true };
      }
      if (normName.includes("cliente") && normName.includes("email")) {
        return { value: project.client?.email ?? "", isAuto: true };
      }
      if (normName.includes("cliente")) {
        return { value: project.client?.full_name ?? "", isAuto: true };
      }
      if (
        normName.includes("tipo") ||
        normName.includes("servico") ||
        normName.includes("modalidade")
      ) {
        return { value: project.service_type ?? "", isAuto: true };
      }
      if (
        normName.includes("orcamento") ||
        normName.includes("budget") ||
        normName.includes("valor_projeto") ||
        normName.includes("valor_total")
      ) {
        const formatted =
          typeof project.budget === "number"
            ? `R$ ${project.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            : "";
        return { value: formatted, isAuto: true };
      }
      if (
        normName.includes("custo_freelancer") ||
        normName.includes("valor_freelancer") ||
        normName.includes("remuneracao")
      ) {
        const formatted =
          typeof project.freelancer_cost === "number"
            ? `R$ ${project.freelancer_cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            : "";
        return { value: formatted, isAuto: true };
      }
      if (
        normName.includes("prazo") ||
        normName.includes("deadline") ||
        normName.includes("entrega")
      ) {
        return { value: project.deadline ?? "", isAuto: true };
      }
      if (
        normName.includes("briefing") ||
        normName.includes("escopo") ||
        normName.includes("descricao")
      ) {
        return { value: project.briefing_content ?? "", isAuto: true };
      }
      // Project title fallback
      return {
        value: project.title ?? "",
        isAuto: true,
      };
    }

    case "system": {
      if (normName.includes("cidade")) {
        return {
          value:
            companySettings.cidade_padrao_assinatura ||
            companySettings.cidade_assinatura ||
            companySettings.cidade ||
            "",
          isAuto: true,
        };
      }
      if (normName.includes("ano")) {
        return { value: new Date().getFullYear().toString(), isAuto: true };
      }
      // Date default (today pt-BR)
      const todayStr = new Date().toLocaleDateString("pt-BR");
      return { value: todayStr, isAuto: true };
    }

    case "manual":
    default: {
      return {
        value: variable.defaultValue ?? "",
        isAuto: false,
      };
    }
  }
}

export function resolveAllContractFields(
  variableMap: ContractModelVariable[],
  project?: Project | null,
  freelancer?: Profile | null,
  companySettings: CompanySettings = DEFAULT_COMPANY_SETTINGS,
): ResolvedFieldsResult {
  const values: Record<string, string> = {};
  const autoFields: Record<string, boolean> = {};

  variableMap.forEach((variable) => {
    const res = resolveContractFieldValue(variable, project, freelancer, companySettings);
    values[variable.name] = res.value;
    if (res.isAuto) {
      autoFields[variable.name] = true;
    }
  });

  return { values, autoFields };
}

export function useContractFieldResolver(
  variableMap: ContractModelVariable[],
  project?: Project | null,
  freelancer?: Profile | null,
  companySettings: CompanySettings = DEFAULT_COMPANY_SETTINGS,
): ResolvedFieldsResult {
  return useMemo(() => {
    return resolveAllContractFields(variableMap, project, freelancer, companySettings);
  }, [variableMap, project, freelancer, companySettings]);
}
