import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles, CheckCircle2, Clock, Calendar, DollarSign, Wrench, Layers } from "lucide-react";
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

// ── Default variables common to commercial conditions ─────────────────────────
const COMMON_COMMERCIAL_VARIABLES: ContractModelVariable[] = [
  {
    name: "vigencia_meses",
    origin: "project",
    section: "Condições Comerciais",
    order: 1,
    label: "Vigência (Meses)",
    defaultValue: "12 meses",
  },
  {
    name: "data_inicio_prevista",
    origin: "project",
    section: "Condições Comerciais",
    order: 2,
    label: "Data de Início Prevista",
    defaultValue: "",
  },
  {
    name: "periodicidade_relatorio",
    origin: "project",
    section: "Condições Comerciais",
    order: 3,
    label: "Periodicidade de Relatórios",
    defaultValue: "Mensal",
  },
  {
    name: "valor_inteiro",
    origin: "project",
    section: "Condições Comerciais",
    order: 4,
    label: "Valor Total do Escopo / Contrato (R$)",
    defaultValue: "",
  },
  {
    name: "mensalidade_acordada",
    origin: "project",
    section: "Condições Comerciais",
    order: 5,
    label: "Mensalidade Acordada / Remuneração (R$)",
    defaultValue: "",
  },
  {
    name: "prazo_minimo_contratacao",
    origin: "project",
    section: "Condições Comerciais",
    order: 6,
    label: "Prazo Mínimo de Contratação",
    defaultValue: "3 (três) meses",
  },
  {
    name: "pasta_relatorios_compartilhada",
    origin: "project",
    section: "Condições Comerciais",
    order: 7,
    label: "Pasta Compartilhada de Relatórios (Drive / Link)",
    defaultValue: "",
  },
];

// ── Default variables per vertical ────────────────────────────────────────────
const VERTICAL_DEFAULT_VARIABLES: Record<ServiceType, ContractModelVariable[]> = {
  // 1. IA / Analista de Automação
  IA: [
    ...COMMON_COMMERCIAL_VARIABLES,
    {
      name: "canal_comunicacao",
      origin: "project",
      section: "Escopo Técnico (Automação)",
      order: 10,
      label: "Canal de Comunicação (WhatsApp, Site, Instagram)",
      defaultValue: "",
    },
    {
      name: "plataforma_automacao_utilizada",
      origin: "project",
      section: "Escopo Técnico (Automação)",
      order: 11,
      label: "Plataforma de Automação (ex: n8n, Typebot, Make)",
      defaultValue: "n8n / Typebot",
    },
    {
      name: "destino_leads",
      origin: "project",
      section: "Escopo Técnico (Automação)",
      order: 12,
      label: "Destino dos Leads (CRM, Planilha, Grupo WhatsApp)",
      defaultValue: "",
    },
    {
      name: "fluxos_jornadas_desenvolvidos",
      origin: "project",
      section: "Escopo Técnico (Automação)",
      order: 13,
      label: "Fluxos e Jornadas a Desenvolver",
      defaultValue: "",
    },
    {
      name: "integracoes_especificas_necessarias",
      origin: "project",
      section: "Escopo Técnico (Automação)",
      order: 14,
      label: "Integrações Específicas Necessárias",
      defaultValue: "",
    },
    {
      name: "perguntas_qualificatorias_briefing",
      origin: "project",
      section: "Escopo Técnico (Automação)",
      order: 15,
      label: "Perguntas Qualificatórias / Briefing",
      defaultValue: "",
    },
    {
      name: "notificacao_time_vendas",
      origin: "project",
      section: "Escopo Técnico (Automação)",
      order: 16,
      label: "Notificação do Time de Vendas (Sim/Não / Destinatários)",
      defaultValue: "Sim, via WhatsApp / Slack",
    },
    {
      name: "data_entrega_primeira_entrega",
      origin: "project",
      section: "Prazos & Entregas",
      order: 20,
      label: "Data da Primeira Entrega",
      defaultValue: "",
    },
    {
      name: "prazo_suporte_tecnico_pos_entrega",
      origin: "project",
      section: "Prazos & Entregas",
      order: 21,
      label: "Prazo de Suporte Técnico Pós-Entrega",
      defaultValue: "30 (trinta) dias",
    },
    {
      name: "acesso_plataforma_automacao",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 30,
      label: "Acesso à Plataforma de Automação",
      defaultValue: "",
    },
    {
      name: "crm_destino_leads",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 31,
      label: "CRM de Destino dos Leads (HubSpot, RD Station, Kommo)",
      defaultValue: "",
    },
    {
      name: "acesso_whatsapp_business_api",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 32,
      label: "Acesso ao WhatsApp Business API / Z-API / Evolution",
      defaultValue: "",
    },
    {
      name: "outros_acessos_necessarios",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 33,
      label: "Outros Acessos Necessários",
      defaultValue: "",
    },
  ],

  // 2. Sites / Full Stack & Web Designer
  Sites: [
    ...COMMON_COMMERCIAL_VARIABLES.filter((v) => v.name !== "prazo_minimo_contratacao"),
    {
      name: "tipo_projeto",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 10,
      label: "Tipo de Projeto / Tipo de Site (Landing Page, Institucional, E-commerce, Web App)",
      defaultValue: "",
    },
    {
      name: "objetivo_principal",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 11,
      label: "Objetivo Principal do Projeto",
      defaultValue: "",
    },
    {
      name: "paginas_funcionalidades_desenvolvidas",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 12,
      label: "Páginas e Funcionalidades a Desenvolver",
      defaultValue: "",
    },
    {
      name: "plataforma_desenvolvimento",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 13,
      label: "Plataforma / CMS / Stack Utilizada (React, Next.js, WordPress, etc.)",
      defaultValue: "React / Vite / Tailwind",
    },
    {
      name: "integracoes_necessarias",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 14,
      label: "Integrações Necessárias (Gateways, APIs, Analytics)",
      defaultValue: "",
    },
    {
      name: "responsavel_textos_imagens",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 15,
      label: "Responsável por Textos e Imagens",
      defaultValue: "Contratante fornece briefing e fotos em alta",
    },
    {
      name: "numero_rodadas_revisao",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 16,
      label: "Número de Rodadas de Revisão",
      defaultValue: "2 (duas) rodadas",
    },
    {
      name: "responsavel_dominio",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 17,
      label: "Responsável pelo Domínio",
      defaultValue: "Contratante",
    },
    {
      name: "responsavel_hospedagem",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 18,
      label: "Responsável pela Hospedagem / Servidor",
      defaultValue: "Contratante (ou Vercel/Cloudflare gerenciado)",
    },
    {
      name: "sites_referencia_estilo_visual",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 19,
      label: "Sites de Referência e Estilo Visual",
      defaultValue: "",
    },
    {
      name: "identidade_visual_definida",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 20,
      label: "Identidade Visual Definida (Manual de Marca / Paleta / Logo)",
      defaultValue: "Sim, fornecida pelo Contratante",
    },
    {
      name: "ambiente_staging_necessario",
      origin: "project",
      section: "Escopo Técnico (Sites & Full Stack)",
      order: 21,
      label: "Ambiente de Staging / Homologação Necessário",
      defaultValue: "Sim",
    },
    {
      name: "data_entrega_primeira_entrega",
      origin: "project",
      section: "Prazos & Entregas",
      order: 25,
      label: "Data da Primeira Entrega (Layout / Wireframe)",
      defaultValue: "",
    },
    {
      name: "prazo_layout_dias_uteis",
      origin: "project",
      section: "Prazos & Entregas",
      order: 26,
      label: "Prazo de Layout (Dias Úteis)",
      defaultValue: "7 dias úteis",
    },
    {
      name: "prazo_desenvolvimento_completo",
      origin: "project",
      section: "Prazos & Entregas",
      order: 27,
      label: "Prazo de Desenvolvimento Completo",
      defaultValue: "21 dias úteis",
    },
    {
      name: "prazo_suporte_pos_golive",
      origin: "project",
      section: "Prazos & Entregas",
      order: 28,
      label: "Prazo de Suporte Pós Go-Live",
      defaultValue: "30 dias",
    },
    {
      name: "prazo_handoff_assets",
      origin: "project",
      section: "Prazos & Entregas",
      order: 29,
      label: "Prazo de Handoff & Assets",
      defaultValue: "3 dias úteis",
    },
    {
      name: "acesso_dominio_registradora",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 35,
      label: "Acesso ao Domínio / Registradora (Registro.br, Cloudflare, GoDaddy)",
      defaultValue: "",
    },
    {
      name: "acesso_hospedagem",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 36,
      label: "Acesso à Hospedagem / Servidor / Vercel",
      defaultValue: "",
    },
    {
      name: "repositorio_codigo",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 37,
      label: "Repositório de Código (GitHub / GitLab)",
      defaultValue: "",
    },
    {
      name: "acesso_figma_ferramenta_design",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 38,
      label: "Acesso ao Figma / Ferramentas de Design",
      defaultValue: "",
    },
    {
      name: "outros_acessos_necessarios",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 39,
      label: "Outros Acessos Necessários",
      defaultValue: "",
    },
  ],

  // 3. Social Media
  "Social Media": [
    ...COMMON_COMMERCIAL_VARIABLES,
    {
      name: "redes_sociais_gerenciadas",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 10,
      label: "Redes Sociais Gerenciadas (Instagram, LinkedIn, TikTok, etc.)",
      defaultValue: "Instagram e LinkedIn",
    },
    {
      name: "qtd_posts_feed_mes",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 11,
      label: "Qtd. Posts no Feed por Mês",
      defaultValue: "12 posts",
    },
    {
      name: "qtd_carrosseis_mes",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 12,
      label: "Qtd. Carrosséis por Mês",
      defaultValue: "4 carrosséis",
    },
    {
      name: "qtd_stories_mes",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 13,
      label: "Qtd. Stories por Mês",
      defaultValue: "20 stories",
    },
    {
      name: "outros_formatos_conteudo",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 14,
      label: "Outros Formatos de Conteúdo (Reels, Shorts, Vídeos)",
      defaultValue: "4 Reels com edição",
    },
    {
      name: "criacao_legendas_incluida",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 15,
      label: "Criação de Legendas e Copywriting Incluída",
      defaultValue: "Sim, com chamadas para ação (CTA)",
    },
    {
      name: "numero_rodadas_revisao_lote",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 16,
      label: "Número de Rodadas de Revisão por Lote",
      defaultValue: "2 (duas) rodadas",
    },
    {
      name: "referencias_estilo_visual",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 17,
      label: "Referências e Estilo Visual",
      defaultValue: "",
    },
    {
      name: "persona_publico",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 18,
      label: "Persona / Público-Alvo",
      defaultValue: "",
    },
    {
      name: "manual_marca_disponivel",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 19,
      label: "Manual de Marca Disponível (Sim/Não)",
      defaultValue: "Sim",
    },
    {
      name: "fonte_imagens",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 20,
      label: "Fonte de Imagens / Banco de Imagens",
      defaultValue: "Fotos autorais do cliente + banco Freepik/Unsplash",
    },
    {
      name: "temas_elementos_proibidos",
      origin: "project",
      section: "Escopo Técnico (Social Media)",
      order: 21,
      label: "Temas e Elementos Proibidos",
      defaultValue: "Sem temas políticos/religiosos",
    },
    {
      name: "data_entrega_primeira_entrega",
      origin: "project",
      section: "Prazos & Entregas",
      order: 25,
      label: "Data da Primeira Entrega",
      defaultValue: "",
    },
    {
      name: "prazo_entrega_primeiro_lote",
      origin: "project",
      section: "Prazos & Entregas",
      order: 26,
      label: "Prazo de Entrega do 1º Lote de Conteúdo",
      defaultValue: "5 dias úteis antes do início do mês",
    },
    {
      name: "ferramenta_design",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 30,
      label: "Ferramenta de Design (Canva, Photoshop, Illustrator, Figma)",
      defaultValue: "Photoshop / Canva Pro",
    },
    {
      name: "ferramenta_aprovacao",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 31,
      label: "Ferramenta de Aprovação (Trello, Notion, Reportei)",
      defaultValue: "Trello / Notion",
    },
    {
      name: "outros_acessos_necessarios",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 32,
      label: "Outros Acessos Necessários",
      defaultValue: "",
    },
  ],

  // 4. Tráfego Pago
  Trafego: [
    ...COMMON_COMMERCIAL_VARIABLES,
    {
      name: "plataformas_veiculacao",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 10,
      label: "Plataformas de Veiculação (Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads)",
      defaultValue: "Meta Ads (Facebook/Instagram) e Google Ads",
    },
    {
      name: "objetivo_principal",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 11,
      label: "Objetivo Principal das Campanhas (Leads WhatsApp, Vendas E-commerce, Branding)",
      defaultValue: "Geração de Leads Qualificados para Vendas",
    },
    {
      name: "produto_servico_anunciado",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 12,
      label: "Produto ou Serviço Anunciado",
      defaultValue: "",
    },
    {
      name: "publico_alvo",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 13,
      label: "Público-Alvo das Campanhas (Idade, Região, Interesses, B2B/B2C)",
      defaultValue: "",
    },
    {
      name: "destino_leads",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 14,
      label: "Destino dos Leads (WhatsApp Direto, Landing Page, Formulário Nativo)",
      defaultValue: "WhatsApp Comercial",
    },
    {
      name: "meta_cac_cpl",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 15,
      label: "Meta de Custo por Lead (CPL) ou CAC Estimada (R$)",
      defaultValue: "",
    },
    {
      name: "responsavel_criativos",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 16,
      label: "Responsável pela Produção dos Criativos / Vídeos",
      defaultValue: "Contratante fornece vídeos brutos, Contratado adapta copies",
    },
    {
      name: "url_site_landing_page",
      origin: "project",
      section: "Escopo Técnico (Tráfego Pago)",
      order: 17,
      label: "URL do Site / Landing Page de Destino",
      defaultValue: "",
    },
    {
      name: "id_business_manager",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 30,
      label: "ID do Business Manager (Meta BM)",
      defaultValue: "",
    },
    {
      name: "id_conta_google_ads",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 31,
      label: "ID da Conta Google Ads (ex: 123-456-7890)",
      defaultValue: "",
    },
    {
      name: "acesso_tiktok_ads",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 32,
      label: "Acesso ao TikTok Ads (se aplicável)",
      defaultValue: "",
    },
    {
      name: "outros_acessos_necessarios",
      origin: "project",
      section: "Acessos & Ferramentas",
      order: 33,
      label: "Outros Acessos Necessários (Pixel, Google Tag Manager, GA4)",
      defaultValue: "",
    },
  ],
};

const SECTION_ICONS: Record<string, any> = {
  "Condições Comerciais": DollarSign,
  "Escopo Técnico (Automação)": Layers,
  "Escopo Técnico (Sites & Full Stack)": Layers,
  "Escopo Técnico (Social Media)": Layers,
  "Escopo Técnico (Tráfego Pago)": Layers,
  "Prazos & Entregas": Calendar,
  "Acessos & Ferramentas": Wrench,
};

export function ProjectContractFieldsSection({
  serviceType,
  values,
  onChange,
  readOnly = false,
}: ProjectContractFieldsSectionProps) {
  const { data: models = [], isLoading } = useContractModels();

  // Combine default vertical variables with active uploaded contract model variables
  const { projectVariables, groupedSections, isComplete } = useMemo(() => {
    if (!serviceType) {
      return { projectVariables: [], groupedSections: [], isComplete: false };
    }

    const defaultVars = VERTICAL_DEFAULT_VARIABLES[serviceType] || COMMON_COMMERCIAL_VARIABLES;
    const mapByName = new Map<string, ContractModelVariable>();

    // 1. Seed with built-in default variables for this vertical
    defaultVars.forEach((v) => {
      mapByName.set(v.name, v);
    });

    // 2. Merge variables from active uploaded models for this serviceType (if any)
    const activeModels = models.filter(
      (m) => m.is_active !== false && (m.service_type === serviceType || (m as any).service_type?.toLowerCase() === serviceType.toLowerCase()),
    );

    activeModels.forEach((model) => {
      let vars: ContractModelVariable[] = [];
      if (Array.isArray(model.variable_map)) {
        vars = model.variable_map;
      } else if (typeof model.variable_map === "string") {
        try {
          vars = JSON.parse(model.variable_map);
        } catch {}
      }

      vars.forEach((v) => {
        if (v.origin === "project" && v.name) {
          if (!mapByName.has(v.name)) {
            mapByName.set(v.name, v);
          } else {
            // Preserve model label and section if customized
            const existing = mapByName.get(v.name)!;
            mapByName.set(v.name, {
              ...existing,
              label: v.label || existing.label,
              section: v.section || existing.section,
              defaultValue: v.defaultValue || existing.defaultValue,
            });
          }
        }
      });
    });

    const list = Array.from(mapByName.values());
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Group by section with prioritized order
    const SECTION_ORDER: string[] = [
      "Condições Comerciais",
      `Escopo Técnico (${serviceType === "IA" ? "Automação" : serviceType === "Trafego" ? "Tráfego Pago" : serviceType === "Sites" ? "Sites & Full Stack" : "Social Media"})`,
      "Prazos & Entregas",
      "Acessos & Ferramentas",
      "Geral",
    ];

    const groups = new Map<string, ContractModelVariable[]>();
    list.forEach((v) => {
      const sec = v.section || "Geral";
      if (!groups.has(sec)) groups.set(sec, []);
      groups.get(sec)!.push(v);
    });

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const idxA = SECTION_ORDER.findIndex((s) => a[0].includes(s) || s.includes(a[0]));
      const idxB = SECTION_ORDER.findIndex((s) => b[0].includes(s) || s.includes(b[0]));
      const rankA = idxA === -1 ? 99 : idxA;
      const rankB = idxB === -1 ? 99 : idxB;
      return rankA - rankB;
    });

    const complete = list.length > 0 && list.every((v) => (values[v.name] ?? v.defaultValue ?? "").trim().length > 0);

    return {
      projectVariables: list,
      groupedSections: sortedGroups,
      isComplete: complete,
    };
  }, [models, serviceType, values]);

  const handleFieldChange = (name: string, val: string) => {
    const updated = { ...values, [name]: val };
    const complete =
      projectVariables.length > 0 &&
      projectVariables.every((v) => (updated[v.name] ?? v.defaultValue ?? "").trim().length > 0);

    onChange(updated, complete);
  };

  if (!serviceType) {
    return (
      <Card className="border-indigo-500/20 bg-card shadow-sm space-y-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            Dados para Contrato
          </CardTitle>
          <CardDescription>
            Selecione uma Vertical de Serviço acima para carregar os campos contratuais e técnicos do projeto.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-500/20 bg-card shadow-sm space-y-4">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Dados para Contrato — Vertical: {serviceType === "IA" ? "Inteligência Artificial & Automação" : serviceType === "Trafego" ? "Tráfego Pago" : serviceType === "Sites" ? "Sites & Full Stack" : "Social Media"}
            </CardTitle>
            <CardDescription className="text-xs">
              Estes campos preenchem automaticamente os contratos emitidos para o Freelancer e para o Cliente.
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
                  <Clock className="h-3 w-3" /> Preenchimento Opcional / Contratual
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {projectVariables.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center bg-muted/30">
            <p className="text-xs text-muted-foreground italic">
              Selecione uma vertical de serviço para exibir os campos de contrato.
            </p>
          </div>
        ) : (
          groupedSections.map(([sectionName, sectionVars]) => {
            const IconComponent = SECTION_ICONS[sectionName] || Sparkles;

            return (
              <div key={sectionName} className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <IconComponent className="h-4 w-4 text-indigo-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {sectionName}
                  </h4>
                  <Badge variant="secondary" className="ml-auto text-[10px] font-mono">
                    {sectionVars.length} {sectionVars.length === 1 ? "campo" : "campos"}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  {sectionVars.map((v) => {
                    const val = values[v.name] !== undefined ? values[v.name] : (v.defaultValue || "");
                    const isTextarea =
                      v.name.includes("briefing") ||
                      v.name.includes("escopo") ||
                      v.name.includes("detalhes") ||
                      v.name.includes("fluxos") ||
                      v.name.includes("paginas") ||
                      v.name.includes("publico") ||
                      v.name.includes("temas");
                    const isLong = (v.label || v.name).length > 45 || isTextarea;

                    return (
                      <div
                        key={v.name}
                        className={isLong ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {v.label || v.name}
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {`{{${v.name}}}`}
                          </span>
                        </div>

                        {isTextarea ? (
                          <Textarea
                            rows={2}
                            value={val}
                            disabled={readOnly}
                            onChange={(e) => handleFieldChange(v.name, e.target.value)}
                            placeholder={v.defaultValue || `Preencha ${v.label || v.name}`}
                            className="text-xs bg-background"
                          />
                        ) : (
                          <Input
                            value={val}
                            disabled={readOnly}
                            onChange={(e) => handleFieldChange(v.name, e.target.value)}
                            placeholder={v.defaultValue || `Preencha ${v.label || v.name}`}
                            className="text-xs h-9 bg-background"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
