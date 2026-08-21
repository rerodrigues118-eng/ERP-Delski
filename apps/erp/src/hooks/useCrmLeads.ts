import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CrmLead, CrmLeadStage, CrmMicroMetrics, LeadTemperature } from "@/types/crm";
import { isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";

const STORAGE_KEY = "delski_crm_leads";

const INITIAL_CRM_LEADS: CrmLead[] = [
  {
    id: "lead-1",
    name: "Studio Lumina Arquitetura",
    contact: "(11) 98765-4321",
    phone: "11987654321",
    email: "contato@studiolumina.com.br",
    service: "Sites",
    estimatedValue: 8500,
    stage: "novo_lead",
    temperature: "quente",
    channel: "inbound",
    seller_name: "Mariana Silva",
    notes: "Procura reformular site institucional com foco em portfólio de alto padrão.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead-2",
    name: "Dr. Roberto Oftalmologia",
    contact: "(21) 99888-7766",
    phone: "21998887766",
    email: "clinica@drroberto.med.br",
    service: "IA",
    estimatedValue: 6200,
    stage: "qualificacao",
    temperature: "quente",
    channel: "sdr_whatsapp",
    seller_name: "Carlos Eduardo",
    notes: "Interesse em automação de agendamento de consultas via WhatsApp com IA.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead-3",
    name: "EletroVolt Engenharia",
    contact: "(31) 97654-3210",
    phone: "31976543210",
    email: "diretoria@eletrovolt.com",
    service: "Trafego",
    estimatedValue: 4500,
    stage: "reuniao",
    temperature: "morno",
    channel: "indicacao",
    seller_name: "Lucas Delski",
    notes: "Reunião de apresentação marcada para esta semana com o diretor comercial.",
    meetingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead-4",
    name: "Moda Bella E-commerce",
    contact: "(41) 98123-4567",
    phone: "41981234567",
    email: "sac@modabella.com.br",
    service: "Social Media",
    estimatedValue: 3800,
    stage: "proposta",
    temperature: "quente",
    channel: "parceiros",
    seller_name: "Mariana Silva",
    notes: "Proposta de gestão de branding e tráfego orgânico enviada, aguardando assinatura.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead-5",
    name: "Alpha Logística & Transportes",
    contact: "(11) 99111-2233",
    phone: "11991112233",
    email: "diretoria@alphalogi.com",
    service: "IA",
    estimatedValue: 12000,
    stage: "fechado",
    temperature: "quente",
    channel: "inbound",
    seller_name: "Carlos Eduardo",
    notes: "Contrato fechado! Sistema de triagem automatizada com inteligência artificial.",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lead-6",
    name: "Imobiliária Prime House",
    contact: "(19) 98333-4455",
    phone: "19983334455",
    email: "contato@primehouse.com.br",
    service: "Sites",
    estimatedValue: 4000,
    stage: "perdido",
    temperature: "frio",
    channel: "outbound",
    seller_name: "Lucas Delski",
    notes: "Optaram por manter a plataforma antiga por restrição orçamentária momentânea.",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getStoredLeads(): CrmLead[] {
  if (typeof window === "undefined") return INITIAL_CRM_LEADS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CRM_LEADS));
      return INITIAL_CRM_LEADS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CRM_LEADS;
  }
}

function setStoredLeads(leads: CrmLead[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }
}

export function useCrmLeads() {
  return useQuery<CrmLead[]>({
    queryKey: ["crm_leads"],
    queryFn: async () => {
      return getStoredLeads();
    },
  });
}

export function useCrmMetrics() {
  const { data: leads = [] } = useCrmLeads();

  const newLeadsToday = leads.filter((l) => {
    try {
      return isToday(parseISO(l.createdAt));
    } catch {
      return false;
    }
  }).length;

  const meetingsThisWeek = leads.filter((l) => {
    if (l.stage === "reuniao") return true;
    if (l.meetingDate) {
      try {
        return isThisWeek(parseISO(l.meetingDate), { weekStartsOn: 1 });
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  const openStages: CrmLeadStage[] = ["novo_lead", "qualificacao", "reuniao", "proposta"];
  const openPipelineAmount = leads
    .filter((l) => openStages.includes(l.stage))
    .reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);

  const closedMonthAmount = leads
    .filter((l) => {
      if (l.stage !== "fechado") return false;
      try {
        return isThisMonth(parseISO(l.updatedAt || l.createdAt));
      } catch {
        return true;
      }
    })
    .reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);

  const closedCount = leads.filter((l) => l.stage === "fechado").length;
  const totalCount = leads.length;
  const sdrConversionRate = totalCount > 0 ? (closedCount / totalCount) * 100 : 0;

  const metrics: CrmMicroMetrics = {
    newLeadsToday,
    meetingsThisWeek,
    openPipelineAmount,
    closedMonthAmount,
    sdrConversionRate,
    totalLeads: totalCount,
  };

  return { metrics };
}

export function useCreateCrmLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      newLead: Omit<CrmLead, "id" | "createdAt" | "updatedAt">
    ) => {
      const current = getStoredLeads();
      const phoneDigits = (newLead.phone || newLead.contact || "").replace(/\D/g, "");
      const created: CrmLead = {
        ...newLead,
        id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        phone: phoneDigits,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [created, ...current];
      setStoredLeads(updated);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
    },
  });
}

export function useUpdateCrmLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CrmLead>;
    }) => {
      const current = getStoredLeads();
      const updated = current.map((l) =>
        l.id === id
          ? {
              ...l,
              ...patch,
              phone: patch.phone
                ? patch.phone.replace(/\D/g, "")
                : patch.contact
                ? patch.contact.replace(/\D/g, "")
                : l.phone,
              updatedAt: new Date().toISOString(),
            }
          : l
      );
      setStoredLeads(updated);
      return { id, patch };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
    },
  });
}

export function useUpdateCrmLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stage,
      convertedSaleId,
    }: {
      id: string;
      stage: CrmLeadStage;
      convertedSaleId?: string;
    }) => {
      const current = getStoredLeads();
      const updated = current.map((l) =>
        l.id === id
          ? {
              ...l,
              stage,
              convertedSaleId: convertedSaleId || l.convertedSaleId,
              updatedAt: new Date().toISOString(),
            }
          : l
      );
      setStoredLeads(updated);
      return { id, stage };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
    },
  });
}

export function useDeleteCrmLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const current = getStoredLeads();
      const updated = current.filter((l) => l.id !== id);
      setStoredLeads(updated);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
    },
  });
}
