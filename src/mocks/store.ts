import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuthUser,
  ClientDecision,
  Expense,
  ExpenseStatus,
  Freelancer,
  Lead,
  LeadStage,
  Project,
  ProjectFile,
  ProjectStatus,
  Role,
  WikiArticle,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

const seedFreelancers: Freelancer[] = [
  { id: "f1", name: "Ana Ribeiro", email: "ana@delski.co", skills: ["IA", "Sites"], active: true, createdAt: now() },
  { id: "f2", name: "Bruno Alves", email: "bruno@delski.co", skills: ["Trafego"], active: true, createdAt: now() },
  { id: "f3", name: "Carla Nunes", email: "carla@delski.co", skills: ["Sites", "Trafego"], active: true, createdAt: now() },
  { id: "f4", name: "Diego Souza", email: "diego@delski.co", skills: ["IA"], active: false, createdAt: now() },
];

const seedProjects: Project[] = [
  {
    id: "p1", client: "Café Aurora", type: "Sites",
    description: "Novo site institucional com blog e integração com Instagram.",
    deadline: "2026-08-30", budget: 8500, referenceLink: "https://cafeaurora.com",
    status: "Em Producao", freelancerId: "f1",
    driveLink: "https://drive.google.com/drive/folders/exemplo1",
    files: [], clientFeedback: [],
    history: [
      { id: uid(), at: daysAgo(20), actor: "Gestor", message: "Projeto criado" },
      { id: uid(), at: daysAgo(19), actor: "Gestor", message: "Delegado para Ana Ribeiro" },
      { id: uid(), at: daysAgo(15), actor: "Ana Ribeiro", message: "Movido para Em Produção" },
    ],
    createdAt: daysAgo(20), lastStatusChangeAt: daysAgo(15),
  },
  {
    id: "p2", client: "Studio Lumen", type: "Trafego",
    description: "Gestão de tráfego pago no Meta Ads e Google Ads por 3 meses.",
    deadline: "2026-09-15", budget: 6000, status: "Delegado", freelancerId: "f2",
    files: [], clientFeedback: [], history: [{ id: uid(), at: daysAgo(8), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(8), lastStatusChangeAt: daysAgo(7),
  },
  {
    id: "p3", client: "Vetra Tech", type: "IA",
    description: "Automação de atendimento com agente IA integrado ao WhatsApp.",
    deadline: "2026-08-10", budget: 12000, status: "Em Revisao", freelancerId: "f1",
    files: [], clientFeedback: [], history: [{ id: uid(), at: daysAgo(12), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(12), lastStatusChangeAt: daysAgo(9),
  },
  {
    id: "p4", client: "Padaria Bella", type: "Sites",
    description: "Landing page para captação de leads de aniversários corporativos.",
    deadline: "2026-08-05", budget: 3500, status: "Solicitado",
    files: [], clientFeedback: [], history: [{ id: uid(), at: daysAgo(2), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(2), lastStatusChangeAt: daysAgo(2),
  },
  {
    id: "p5", client: "Move Fitness", type: "IA",
    description: "Chatbot IA para agendamento de aulas experimentais.",
    deadline: "2026-07-20", budget: 5200, status: "Concluido", freelancerId: "f4",
    files: [], clientFeedback: [], history: [{ id: uid(), at: daysAgo(30), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(30), lastStatusChangeAt: daysAgo(3),
  },
  {
    id: "p6", client: "Cliente Demo", type: "Trafego",
    description: "Campanha de lançamento para novo produto SaaS.",
    deadline: "2026-09-01", budget: 4500, status: "Solicitado",
    files: [], clientFeedback: [], history: [{ id: uid(), at: daysAgo(1), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(1), lastStatusChangeAt: daysAgo(1),
  },
];

const seedExpenses: Expense[] = [
  { id: uid(), projectId: "p1", description: "Pagamento Ana Ribeiro — Front-end", amount: 3200, category: "freelancer", status: "Aprovado", freelancerId: "f1", createdAt: daysAgo(10) },
  { id: uid(), projectId: "p1", description: "Domínio + hospedagem 1 ano", amount: 420, category: "ferramentas", status: "Pago", createdAt: daysAgo(15) },
  { id: uid(), projectId: "p2", description: "Verba de anúncios Meta", amount: 1500, category: "ads", status: "Pago", createdAt: daysAgo(5) },
  { id: uid(), projectId: "p3", description: "Pagamento Ana Ribeiro — Integração", amount: 4000, category: "freelancer", status: "Pendente", freelancerId: "f1", createdAt: daysAgo(4) },
  { id: uid(), projectId: "p5", description: "Pagamento Diego Souza", amount: 2400, category: "freelancer", status: "Pago", freelancerId: "f4", createdAt: daysAgo(2) },
];

const seedLeads: Lead[] = [
  { id: uid(), name: "Clínica Vida+", contact: "gestor@vidamais.com", service: "Sites", estimatedValue: 6000, stage: "Prospeccao", notes: "Indicação da Vetra Tech.", createdAt: daysAgo(6) },
  { id: uid(), name: "Loja Nébula", contact: "(11) 99999-1234", service: "Trafego", estimatedValue: 4500, stage: "Reuniao", createdAt: daysAgo(4) },
  { id: uid(), name: "Agro Verde", contact: "compras@agroverde.co", service: "IA", estimatedValue: 15000, stage: "Proposta", notes: "Aguardando aprovação da diretoria.", createdAt: daysAgo(3) },
  { id: uid(), name: "TechFlow", contact: "cto@techflow.io", service: "IA", estimatedValue: 9800, stage: "Proposta", createdAt: daysAgo(2) },
];

const seedWiki: WikiArticle[] = [
  { id: uid(), title: "Padrão de código React para sites", category: "Sites", content: "Componentes em PascalCase, hooks em camelCase começando com use.\nTailwind com tokens semânticos — nunca cor hardcoded.\nSempre acessibilidade: labels, aria, contraste AA.", updatedAt: daysAgo(9) },
  { id: uid(), title: "Prompts validados — Atendimento IA", category: "IA", content: "Prompt base do agente de atendimento (v3):\n\nVocê é um assistente cordial da {empresa}...\n\nRegras: sempre confirmar CPF, nunca prometer prazo sem checar agenda.", updatedAt: daysAgo(5) },
  { id: uid(), title: "Checklist de campanha Meta Ads", category: "Trafego", content: "1. Pixel instalado e conversões testadas.\n2. Público custom + lookalike criados.\n3. Criativos em 3 formatos (feed, stories, reels).\n4. Orçamento diário validado com o cliente.", updatedAt: daysAgo(2) },
  { id: uid(), title: "Onboarding do freelancer", category: "Geral", content: "1. Acesso ao Drive da Delski.\n2. Ler SOPs da vertical dele.\n3. Reunião de kickoff com o gestor.", updatedAt: daysAgo(1) },
];

interface State {
  user: AuthUser | null;
  projects: Project[];
  freelancers: Freelancer[];
  expenses: Expense[];
  leads: Lead[];
  wiki: WikiArticle[];
  login: (email: string, name?: string, role?: Role) => void;
  logout: () => void;
  setRole: (role: Role) => void;
  addProject: (p: Omit<Project, "id" | "status" | "files" | "history" | "createdAt" | "clientFeedback">) => Project;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
  assignFreelancer: (id: string, freelancerId: string | undefined) => void;
  setDriveLink: (id: string, link: string) => void;
  addFile: (id: string, f: Omit<ProjectFile, "id" | "uploadedAt">) => void;
  removeFile: (id: string, fileId: string) => void;
  generatePublicToken: (id: string) => string;
  generateClientToken: (id: string) => string;
  addClientFeedback: (id: string, decision: ClientDecision, message?: string) => void;
  addFreelancer: (f: Omit<Freelancer, "id" | "createdAt">) => Freelancer;
  toggleFreelancerActive: (id: string) => void;
  removeFreelancer: (id: string) => void;
  addExpense: (e: Omit<Expense, "id" | "createdAt">) => void;
  updateExpenseStatus: (id: string, status: ExpenseStatus) => void;
  removeExpense: (id: string) => void;
  addLead: (l: Omit<Lead, "id" | "createdAt" | "stage"> & { stage?: LeadStage }) => void;
  updateLeadStage: (id: string, stage: LeadStage) => void;
  removeLead: (id: string) => void;
  convertLeadToProject: (id: string, deadline: string) => string | null;
  saveWiki: (w: Omit<WikiArticle, "id" | "updatedAt"> & { id?: string }) => void;
  removeWiki: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      projects: seedProjects,
      freelancers: seedFreelancers,
      expenses: seedExpenses,
      leads: seedLeads,
      wiki: seedWiki,
      login: (email, name, role = "gestor") => {
        const freelancer = get().freelancers.find((f) => f.email === email);
        const resolvedRole: Role = freelancer ? "freelancer" : role;
        set({
          user: {
            id: uid(), email,
            name: name || freelancer?.name || email.split("@")[0],
            role: resolvedRole, freelancerId: freelancer?.id,
          },
        });
      },
      logout: () => set({ user: null }),
      setRole: (role) => {
        const u = get().user;
        if (!u) return;
        if (role === "freelancer") {
          const f = get().freelancers[0];
          set({ user: { ...u, role, freelancerId: f?.id, name: f?.name || u.name, email: f?.email || u.email } });
        } else {
          set({ user: { ...u, role, freelancerId: undefined } });
        }
      },
      addProject: (p) => {
        const project: Project = {
          ...p, id: uid(), status: "Solicitado", files: [], clientFeedback: [],
          history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
          createdAt: now(), lastStatusChangeAt: now(),
        };
        set({ projects: [project, ...get().projects] });
        return project;
      },
      updateProjectStatus: (id, status) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? { ...p, status, lastStatusChangeAt: now(), history: [...p.history, { id: uid(), at: now(), actor: get().user?.name || "Sistema", message: `Status alterado para ${status}` }] }
              : p,
          ),
        });
      },
      assignFreelancer: (id, freelancerId) => {
        const f = get().freelancers.find((x) => x.id === freelancerId);
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? {
                  ...p, freelancerId,
                  status: freelancerId && p.status === "Solicitado" ? "Delegado" : p.status,
                  lastStatusChangeAt: freelancerId && p.status === "Solicitado" ? now() : p.lastStatusChangeAt,
                  history: [...p.history, { id: uid(), at: now(), actor: get().user?.name || "Sistema", message: freelancerId ? `Delegado para ${f?.name}` : "Delegação removida" }],
                }
              : p,
          ),
        });
      },
      setDriveLink: (id, link) => {
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, driveLink: link } : p)) });
      },
      addFile: (id, f) => {
        const file: ProjectFile = { ...f, id: uid(), uploadedAt: now() };
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, files: [...p.files, file] } : p)) });
      },
      removeFile: (id, fileId) => {
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p)) });
      },
      generatePublicToken: (id) => {
        const token = uid() + uid();
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, publicToken: token } : p)) });
        return token;
      },
      generateClientToken: (id) => {
        const token = uid() + uid();
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, clientToken: token } : p)) });
        return token;
      },
      addClientFeedback: (id, decision, message) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== id) return p;
            const fb = { id: uid(), decision, message, at: now() };
            return {
              ...p,
              clientFeedback: [...(p.clientFeedback || []), fb],
              history: [...p.history, { id: uid(), at: now(), actor: `Cliente ${p.client}`, message: decision === "aprovado" ? "Aprovou a entrega" : `Solicitou ajuste${message ? ": " + message : ""}` }],
            };
          }),
        });
      },
      addFreelancer: (f) => {
        const freelancer: Freelancer = { ...f, id: uid(), createdAt: now() };
        set({ freelancers: [freelancer, ...get().freelancers] });
        return freelancer;
      },
      toggleFreelancerActive: (id) => {
        set({ freelancers: get().freelancers.map((f) => (f.id === id ? { ...f, active: !f.active } : f)) });
      },
      removeFreelancer: (id) => {
        set({ freelancers: get().freelancers.filter((f) => f.id !== id) });
      },
      addExpense: (e) => {
        set({ expenses: [{ ...e, id: uid(), createdAt: now() }, ...get().expenses] });
      },
      updateExpenseStatus: (id, status) => {
        set({ expenses: get().expenses.map((e) => (e.id === id ? { ...e, status } : e)) });
      },
      removeExpense: (id) => {
        set({ expenses: get().expenses.filter((e) => e.id !== id) });
      },
      addLead: (l) => {
        set({ leads: [{ ...l, stage: l.stage || "Prospeccao", id: uid(), createdAt: now() }, ...get().leads] });
      },
      updateLeadStage: (id, stage) => {
        set({ leads: get().leads.map((l) => (l.id === id ? { ...l, stage } : l)) });
      },
      removeLead: (id) => {
        set({ leads: get().leads.filter((l) => l.id !== id) });
      },
      convertLeadToProject: (id, deadline) => {
        const lead = get().leads.find((l) => l.id === id);
        if (!lead) return null;
        const project = get().addProject({
          client: lead.name, type: lead.service,
          description: lead.notes || `Projeto originado do lead ${lead.name}.`,
          deadline, budget: lead.estimatedValue,
        });
        set({ leads: get().leads.map((l) => (l.id === id ? { ...l, stage: "Fechado", convertedProjectId: project.id } : l)) });
        return project.id;
      },
      saveWiki: (w) => {
        if (w.id) {
          set({ wiki: get().wiki.map((a) => (a.id === w.id ? { ...a, ...w, id: w.id, updatedAt: now() } as WikiArticle : a)) });
        } else {
          set({ wiki: [{ ...w, id: uid(), updatedAt: now() } as WikiArticle, ...get().wiki] });
        }
      },
      removeWiki: (id) => {
        set({ wiki: get().wiki.filter((a) => a.id !== id) });
      },
    }),
    { name: "delski-store-v2" },
  ),
);

export const useProjectByToken = (token: string) =>
  useStore((s) => s.projects.find((p) => p.publicToken === token));

export const useProjectByClientToken = (token: string) =>
  useStore((s) => s.projects.find((p) => p.clientToken === token));
