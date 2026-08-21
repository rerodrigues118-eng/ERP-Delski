import { useMemo } from "react";
import type { ContractModelVariable } from "@/types/contract-models";
import type { Project } from "@/hooks/useProjects";
import type { Profile } from "@/hooks/useProfiles";
import type { ClientItem } from "@/hooks/useClients";

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
  metodo_pagamento_padrao?: string;
  data_pagamento_padrao?: string;
  foro_padrao?: string;
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
  cargo_representante: "Diretor Geral",
  email_contratante: "contato@delski.com.br",
  telefone_contratante: "(41) 99876-5432",
  cidade_padrao_assinatura: "Curitiba",
  representante: "Diretoria Delski",
  cidade_assinatura: "Curitiba",
  metodo_pagamento_padrao: "PIX / Transferência Bancária",
  data_pagamento_padrao: "Dia 10 de cada mês",
  foro_padrao: "Comarca de Curitiba - PR",
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
  gestorProfile?: Profile | any | null,
  selectedModel?: any,
  client?: ClientItem | null,
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
        return {
          value: companySettings.email_contratante || gestorProfile?.email || companySettings.email,
          isAuto: true,
        };
      }
      if (
        normName.includes("telefone") ||
        normName.includes("fone") ||
        normName.includes("contato")
      ) {
        return {
          value: companySettings.telefone_contratante || gestorProfile?.phone || companySettings.telefone,
          isAuto: true,
        };
      }
      if (
        normName.includes("cargo") &&
        (normName.includes("representante") || normName.includes("contratante"))
      ) {
        return {
          value: companySettings.cargo_representante || gestorProfile?.cargo || "Diretor Geral",
          isAuto: true,
        };
      }
      if (normName.includes("representante") || normName.includes("contratante")) {
        return {
          value:
            companySettings.nome_representante ||
            gestorProfile?.full_name ||
            companySettings.representante ||
            "Diretoria Delski",
          isAuto: true,
        };
      }
      if (normName.includes("observac")) {
        return { value: "", isAuto: false };
      }
      return {
        value: companySettings.nome_empresa || variable.defaultValue || "",
        isAuto: true,
      };
    }

    case "gestor": {
      if (normName.includes("email")) {
        return { value: gestorProfile?.email || companySettings.email_contratante, isAuto: true };
      }
      if (normName.includes("cargo") || normName.includes("funcao") || normName.includes("titulo")) {
        return {
          value: gestorProfile?.cargo || companySettings.cargo_representante || "Gestor de Contas",
          isAuto: true,
        };
      }
      if (normName.includes("telefone") || normName.includes("fone") || normName.includes("whatsapp")) {
        return { value: gestorProfile?.phone || companySettings.telefone_contratante, isAuto: true };
      }
      if (normName.includes("cpf") || normName.includes("cnpj") || normName.includes("documento")) {
        return { value: gestorProfile?.cpf_cnpj || companySettings.cnpj, isAuto: true };
      }
      return {
        value: gestorProfile?.full_name || companySettings.nome_representante || "",
        isAuto: true,
      };
    }

    case "freelancer": {
      if (!freelancer) {
        return { value: "", isAuto: false };
      }
      // Check saved contract field values on freelancer first
      if (freelancer.contract_field_values && freelancer.contract_field_values[variable.name]) {
        return { value: String(freelancer.contract_field_values[variable.name]), isAuto: true };
      }

      if (normName.includes("cnpj") || normName.includes("cpf") || normName.includes("documento")) {
        return { value: freelancer.cpf_cnpj || (freelancer as any).cnpj || "", isAuto: true };
      }
      if (normName.includes("razao") || normName.includes("social") || normName.includes("nome_contratado")) {
        return { value: (freelancer as any).corporate_name || freelancer.full_name || "", isAuto: true };
      }
      if (normName.includes("fantasia")) {
        return { value: (freelancer as any).company_name || freelancer.full_name || "", isAuto: true };
      }
      if (normName.includes("segmento") || normName.includes("atuacao") || normName.includes("especialidade")) {
        return { value: (freelancer as any).segment || (freelancer as any).specialty || freelancer.role || "Prestador de Serviços", isAuto: true };
      }
      if (normName.includes("email")) {
        return { value: freelancer.email ?? "", isAuto: true };
      }
      if (normName.includes("cep")) {
        return { value: (freelancer as any).cep || "", isAuto: true };
      }
      if (normName.includes("endereco") || normName.includes("logradouro")) {
        const addr = (freelancer as any).address;
        const city = (freelancer as any).city;
        const state = (freelancer as any).state;
        const fullAddr = [addr, city, state].filter(Boolean).join(", ");
        return { value: fullAddr || addr || "", isAuto: true };
      }
      if (normName.includes("telefone") || normName.includes("fone") || normName.includes("whatsapp")) {
        return { value: freelancer.phone ?? (freelancer as any).telefone ?? "", isAuto: true };
      }
      if (normName.includes("cargo") || normName.includes("responsavel") || normName.includes("funcao") || normName.includes("role")) {
        return { value: (freelancer as any).role_position || freelancer.role || "Especialista Parceiro", isAuto: true };
      }
      if (normName.includes("pix") || normName.includes("bancario") || normName.includes("banco")) {
        const bank = (freelancer as any).bank_name || "";
        const pixKey = (freelancer as any).pix_key || "";
        const pixType = (freelancer as any).pix_type || "Chave";
        if (bank || pixKey) {
          const formatted = [bank ? `Banco: ${bank}` : null, pixKey ? `PIX (${pixType}): ${pixKey}` : null]
            .filter(Boolean)
            .join(" | ");
          return { value: formatted, isAuto: true };
        }
      }
      if (normName.includes("observac")) {
        return { value: "", isAuto: false };
      }
      return {
        value: freelancer.full_name ?? "",
        isAuto: true,
      };
    }

    case "client": {
      if (!client) {
        return { value: "", isAuto: false };
      }
      if (normName.includes("email")) {
        return { value: client.email ?? "", isAuto: true };
      }
      if (
        normName.includes("empresa") ||
        normName.includes("company") ||
        normName.includes("razao") ||
        normName.includes("social")
      ) {
        return { value: client.company_name ?? client.full_name ?? "", isAuto: true };
      }
      if (normName.includes("telefone") || normName.includes("fone") || normName.includes("whatsapp")) {
        return { value: client.phone ?? "", isAuto: true };
      }
      if (normName.includes("cnpj") || normName.includes("cpf")) {
        return { value: client.cnpj ?? "", isAuto: true };
      }
      return {
        value: client.full_name ?? "",
        isAuto: true,
      };
    }

    case "project": {
      if (!project) {
        return { value: "", isAuto: false };
      }
      if (project.contract_field_values && project.contract_field_values[variable.name]) {
        return { value: String(project.contract_field_values[variable.name]), isAuto: true };
      }

      // Condições comerciais / valores
      if (normName === "valor_inteiro" || normName.includes("valor_projeto") || normName.includes("valor_total") || normName.includes("orcamento")) {
        const formatted =
          typeof project.budget === "number"
            ? `R$ ${project.budget.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "";
        return { value: formatted, isAuto: true };
      }
      if (normName === "mensalidade_acordada" || normName.includes("custo_freelancer") || normName.includes("valor_freelancer") || normName.includes("remuneracao")) {
        const cost = project.freelancer_cost ?? project.budget;
        const formatted =
          typeof cost === "number"
            ? `R$ ${cost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "";
        return { value: formatted, isAuto: true };
      }
      if (normName.includes("vigencia")) {
        return { value: "12 (doze) meses", isAuto: true };
      }
      if (normName.includes("data_inicio") || normName.includes("inicio_prevista")) {
        try {
          const date = project.created_at ? new Date(project.created_at) : new Date();
          return { value: date.toLocaleDateString("pt-BR"), isAuto: true };
        } catch {
          return { value: new Date().toLocaleDateString("pt-BR"), isAuto: true };
        }
      }
      if (normName.includes("periodicidade")) {
        return { value: "Mensal", isAuto: true };
      }
      if (normName.includes("prazo_minimo")) {
        return { value: "3 (três) meses", isAuto: true };
      }
      if (normName.includes("pasta") || normName.includes("relatorios_compartilhada")) {
        return { value: "https://drive.google.com/drive/folders/delski", isAuto: false };
      }

      // Clientes no contexto do projeto
      if (normName.includes("cliente") && normName.includes("email")) {
        return { value: project.client?.email ?? "", isAuto: true };
      }
      if (normName.includes("cliente")) {
        return { value: project.client?.full_name ?? "", isAuto: true };
      }
      if (
        normName.includes("tipo_projeto") ||
        normName.includes("tipo_servico") ||
        normName.includes("modalidade")
      ) {
        return { value: project.service_type ?? "", isAuto: true };
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
      return {
        value: project.title ?? "",
        isAuto: true,
      };
    }

    case "system": {
      if (
        normName.includes("modalidade") ||
        normName.includes("tipo_contrato") ||
        normName.includes("tipo_vinculo")
      ) {
        return {
          value: (selectedModel as any)?.contract_type || "PJ",
          isAuto: true,
        };
      }
      if (normName.includes("cidade")) {
        return {
          value:
            companySettings.cidade_padrao_assinatura ||
            companySettings.cidade_assinatura ||
            companySettings.cidade ||
            "Curitiba",
          isAuto: true,
        };
      }
      if (
        normName.includes("metodo") ||
        normName.includes("forma") ||
        (normName.includes("pagamento") && normName.includes("metodo"))
      ) {
        return {
          value: companySettings.metodo_pagamento_padrao || "PIX / Transferência Bancária",
          isAuto: true,
        };
      }
      if (normName.includes("data") && normName.includes("pagamento")) {
        return {
          value: companySettings.data_pagamento_padrao || "Dia 10 de cada mês",
          isAuto: true,
        };
      }
      if (normName.includes("data_assinatura") || normName === "data") {
        const today = new Date();
        const formatted = today.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        return { value: formatted, isAuto: true };
      }
      if (normName.includes("foro")) {
        return {
          value: companySettings.foro_padrao || "Comarca de Curitiba - PR",
          isAuto: true,
        };
      }
      if (normName.includes("ano")) {
        return { value: new Date().getFullYear().toString(), isAuto: true };
      }
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
  gestorProfile?: Profile | any | null,
  selectedModel?: any,
  client?: ClientItem | null,
): ResolvedFieldsResult {
  const values: Record<string, string> = {};
  const autoFields: Record<string, boolean> = {};

  variableMap.forEach((variable) => {
    const res = resolveContractFieldValue(
      variable,
      project,
      freelancer,
      companySettings,
      gestorProfile,
      selectedModel,
      client,
    );
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
  gestorProfile?: Profile | any | null,
  selectedModel?: any,
  client?: ClientItem | null,
): ResolvedFieldsResult {
  return useMemo(() => {
    return resolveAllContractFields(
      variableMap,
      project,
      freelancer,
      companySettings,
      gestorProfile,
      selectedModel,
      client,
    );
  }, [variableMap, project, freelancer, companySettings, gestorProfile, selectedModel, client]);
}
