import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ApplicationStatus,
  AuthUser,
  ClientDecision,
  Expense,
  ExpenseStatus,
  Freelancer,
  Lead,
  LeadStage,
  Project,
  ProjectApplication,
  ProjectBriefingSections,
  ProjectFile,
  ProjectStatus,
  ProjectTask,
  ProjectTriageResponse,
  Role,
  TaskStatus,
  WikiArticle,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : uid() + uid() + uid();
const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

const seedFreelancers: Freelancer[] = [
  { id: "f1", name: "Ana Ribeiro", email: "ana@delski.co", skills: ["IA", "Sites"], active: true, createdAt: now() },
  { id: "f2", name: "Bruno Alves", email: "bruno@delski.co", skills: ["Trafego"], active: true, createdAt: now() },
  { id: "f3", name: "Carla Nunes", email: "carla@delski.co", skills: ["Sites", "Trafego"], active: true, createdAt: now() },
  { id: "f4", name: "Diego Souza", email: "diego@delski.co", skills: ["IA"], active: false, createdAt: now() },
];

const seedProjects: Project[] = [
  {
    id: "p1",
    client: "Café Aurora",
    clientId: "c1",
    type: "Sites",
    description: "Novo site institucional com blog e integração com Instagram.",
    briefing: "## Objetivo\nRelançar o site com foco em conversão de reservas.\n\n## Escopo\n- 5 páginas\n- Blog com CMS\n- Feed do Instagram embutido\n\n## Restrições\nManter identidade visual atual (cores marrom/creme).",
    briefingSections: {
      overview: "Reformulação do portal web com 5 páginas chave, layout responsivo e focado em aumento de reservas em 40%.",
      technicalSpecs: "Stack: React, Vite, Tailwind CSS, API Instagram Graph v18.0, Hospedagem Vercel Enterprise.",
      repositoryNotes: "Arquivos de protótipo Figma salvos na pasta oficial do Google Drive.",
    },
    deadline: "2026-08-30",
    budget: 8500,
    freelancerCost: 3200,
    referenceLink: "https://cafeaurora.com",
    status: "Em Producao",
    freelancerId: "f1",
    driveLink: "https://drive.google.com/drive/folders/exemplo1",
    files: [
      { id: "file-1", name: "escopo_tecnico_v2.pdf", size: 1024500, url: "https://jrcyhfjubqtiwbttjeiv.supabase.co/storage/v1/object/public/project-attachments/escopo_tecnico_v2.pdf", uploadedBy: "Gestor", uploadedAt: daysAgo(5) }
    ],
    clientFeedback: [],
    history: [
      { id: uid(), at: daysAgo(20), actor: "Gestor", message: "Projeto criado" },
      { id: uid(), at: daysAgo(19), actor: "Gestor", message: "Delegado para Ana Ribeiro" },
      { id: uid(), at: daysAgo(15), actor: "Ana Ribeiro", message: "Movido para Em Produção" },
    ],
    createdAt: daysAgo(20),
    lastStatusChangeAt: daysAgo(15),
  },
  {
    id: "p2",
    client: "Studio Lumen",
    clientId: "c2",
    type: "Trafego",
    description: "Gestão de tráfego pago no Meta Ads e Google Ads por 3 meses.",
    briefingSections: {
      overview: "Estruturação de funil de vendas via Meta Ads e Google Search para conversão de leads qualificados.",
      technicalSpecs: "Meta Pixel, Google Tag Manager, GA4, Looker Studio Dashboard para relatórios em tempo real.",
      repositoryNotes: "Banners criativos armazenados no Google Drive na pasta /Criativos2026.",
    },
    deadline: "2026-09-15",
    budget: 6000,
    freelancerCost: 2000,
    status: "Delegado",
    freelancerId: "f2",
    files: [],
    clientFeedback: [],
    history: [{ id: uid(), at: daysAgo(8), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(8),
    lastStatusChangeAt: daysAgo(7),
  },
  {
    id: "p3",
    client: "Vetra Tech",
    clientId: "c3",
    type: "IA",
    description: "Automação de atendimento com agente IA integrado ao WhatsApp.",
    briefingSections: {
      overview: "Agente IA inteligente para triagem de suporte e agendamento automático via API do WhatsApp.",
      technicalSpecs: "LangChain, OpenAI GPT-4o, Evolution API WhatsApp, Webhooks em Node.js.",
      repositoryNotes: "Prompts validados e base de conhecimento em formato Markdown.",
    },
    deadline: "2026-08-10",
    budget: 12000,
    freelancerCost: 4000,
    status: "Em Revisao",
    freelancerId: "f1",
    files: [],
    clientFeedback: [],
    history: [{ id: uid(), at: daysAgo(12), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(12),
    lastStatusChangeAt: daysAgo(9),
  },
  {
    id: "p4",
    client: "Padaria Bella",
    type: "Sites",
    description: "Landing page para captação de leads de aniversários corporativos.",
    briefingSections: {
      overview: "Landing page ultra rápida voltada para cotação de eventos corporativos.",
      technicalSpecs: "Vite, Tailwind, Formspree / Webhook N8N para CRM.",
      repositoryNotes: "Fotos em alta resolução no Google Drive.",
    },
    deadline: "2026-08-05",
    budget: 3500,
    freelancerCost: 1200,
    status: "Solicitado",
    files: [],
    clientFeedback: [],
    history: [{ id: uid(), at: daysAgo(2), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(2),
    lastStatusChangeAt: daysAgo(2),
  },
  {
    id: "p5",
    client: "Move Fitness",
    type: "IA",
    description: "Chatbot IA para agendamento de aulas experimentais.",
    briefingSections: {
      overview: "Bot de conversão de leads no Instagram Direct e WhatsApp.",
      technicalSpecs: "ManyChat, OpenAI API, webhook de sincronização com sistema de academia.",
      repositoryNotes: "Fluxogramas de atendimento em PDF.",
    },
    deadline: "2026-07-20",
    budget: 5200,
    freelancerCost: 2400,
    status: "Concluido",
    freelancerId: "f4",
    files: [],
    clientFeedback: [],
    history: [{ id: uid(), at: daysAgo(30), actor: "Gestor", message: "Projeto criado" }],
    createdAt: daysAgo(30),
    lastStatusChangeAt: daysAgo(3),
  },
];

const seedExpenses: Expense[] = [
  { id: uid(), projectId: "p1", description: "Pagamento Ana Ribeiro — Front-end", amount: 3200, category: "freelancer", status: "Aprovado", freelancerId: "f1", createdAt: daysAgo(10) },
  { id: uid(), projectId: "p1", description: "Domínio + hospedagem 1 ano", amount: 420, category: "ferramentas", status: "Pago", createdAt: daysAgo(15) },
  { id: uid(), projectId: "p2", description: "Pagamento Bruno Alves — Meta Ads", amount: 2000, category: "freelancer", status: "Pago", freelancerId: "f2", createdAt: daysAgo(5) },
  { id: uid(), projectId: "p3", description: "Pagamento Ana Ribeiro — Integração IA", amount: 4000, category: "freelancer", status: "Pendente", freelancerId: "f1", createdAt: daysAgo(4) },
  { id: uid(), projectId: "p5", description: "Pagamento Diego Souza — Agente IA", amount: 2400, category: "freelancer", status: "Pago", freelancerId: "f4", createdAt: daysAgo(2) },
];

const seedTasks: ProjectTask[] = [
  { id: "t1", projectId: "p1", title: "Definição de Requisitos e Visão Geral", phase: "Fase 1: Alinhamento & Setup", status: "Concluida", startDate: daysAgo(20).slice(0, 10), dueDate: daysAgo(15).slice(0, 10), createdAt: daysAgo(20) },
  { id: "t2", projectId: "p1", title: "Design de Alta Fidelidade e UI Kits", phase: "Fase 1: Alinhamento & Setup", status: "Concluida", startDate: daysAgo(15).slice(0, 10), dueDate: daysAgo(10).slice(0, 10), predecessorId: "t1", createdAt: daysAgo(15) },
  { id: "t3", projectId: "p1", title: "Desenvolvimento Front-end Responsivo", phase: "Fase 2: Execução & Código", status: "Em andamento", startDate: daysAgo(10).slice(0, 10), dueDate: daysFromNow(5), predecessorId: "t2", createdAt: daysAgo(10) },
  { id: "t4", projectId: "p1", title: "Integração API Instagram & CMS Blog", phase: "Fase 2: Execução & Código", status: "Pendente", startDate: daysFromNow(5), dueDate: daysFromNow(12), predecessorId: "t3", createdAt: daysAgo(10) },
  { id: "t5", projectId: "p1", title: "Homologação, Deploy e QA Final", phase: "Fase 3: Testes & Entrega", status: "Pendente", startDate: daysFromNow(12), dueDate: daysFromNow(18), predecessorId: "t4", createdAt: daysAgo(10) },
];

interface State {
  user: AuthUser | null;
  projects: Project[];
  freelancers: Freelancer[];
  expenses: Expense[];
  leads: Lead[];
  wiki: WikiArticle[];
  tasks: ProjectTask[];
  applications: ProjectApplication[];
  triageResponses: ProjectTriageResponse[];
  
  login: (email: string, name?: string, role?: Role) => void;
  logout: () => void;
  setRole: (role: Role) => void;
  addProject: (p: Omit<Project, "id" | "status" | "files" | "history" | "createdAt" | "clientFeedback">) => Project;
  updateProjectDetails: (id: string, patch: Partial<Project>) => void;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
  updateProjectBriefing: (id: string, briefing: string) => void;
  updateProjectBriefingSections: (id: string, sections: ProjectBriefingSections) => void;
  assignFreelancer: (id: string, freelancerId: string | undefined) => void;
  setDriveLink: (id: string, link: string) => void;
  addFile: (id: string, f: Omit<ProjectFile, "id" | "uploadedAt">) => void;
  removeFile: (id: string, fileId: string) => void;
  addClientFeedback: (id: string, decision: ClientDecision, message?: string) => void;
  generatePublicToken: (id: string) => string;
  generateClientToken: (id: string) => string;
  addTriageResponse: (response: ProjectTriageResponse) => void;
  getTriageResponse: (token: string) => ProjectTriageResponse | undefined;
  
  addFreelancer: (f: Omit<Freelancer, "id" | "createdAt">) => Freelancer;
  toggleFreelancerActive: (id: string) => void;
  removeFreelancer: (id: string) => void;
  
  addExpense: (e: Omit<Expense, "id" | "createdAt">) => void;
  updateExpenseStatus: (id: string, status: ExpenseStatus) => void;
  removeExpense: (id: string) => void;

  // Leads (CRM)
  addLead: (l: Omit<Lead, "id" | "createdAt" | "stage"> & { stage?: LeadStage }) => void;
  updateLeadStage: (id: string, stage: LeadStage) => void;
  removeLead: (id: string) => void;
  convertLeadToProject: (id: string, deadline: string) => string | null;

  // Wiki
  saveWiki: (w: Omit<WikiArticle, "id" | "updatedAt"> & { id?: string }) => void;
  removeWiki: (id: string) => void;

  // Applications
  inviteFreelancerToProject: (projectId: string, freelancerId: string) => ProjectApplication;
  submitApplication: (token: string, data: Partial<ProjectApplication>) => void;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void;
  selectApplication: (id: string) => void;
  removeApplication: (id: string) => void;
  
  addTask: (t: Omit<ProjectTask, "id" | "createdAt">) => ProjectTask;
  updateTask: (id: string, patch: Partial<ProjectTask>) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => { success: boolean; error?: string };
  removeTask: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: {
        id: "gestor-1",
        email: "gestor@delski.co",
        name: "Gestor Delski",
        role: "gestor",
      },
      projects: seedProjects,
      freelancers: seedFreelancers,
      expenses: seedExpenses,
      leads: [],
      wiki: [],
      tasks: seedTasks,
      applications: [],
      triageResponses: [],

      login: (email, name, role = "gestor") => {
        const freelancer = get().freelancers.find((f) => f.email === email);
        const isClient = email.includes("cliente") || email.includes("aurora");
        const resolvedRole: Role = isClient ? "cliente" : freelancer ? "freelancer" : role;
        
        set({
          user: {
            id: uid(),
            email,
            name: name || (isClient ? "Cliente Aurora" : freelancer?.name || email.split("@")[0]),
            role: resolvedRole,
            freelancerId: freelancer?.id,
            clientId: isClient ? "c1" : undefined,
          },
        });
      },

      logout: () => set({ user: null }),

      setRole: (role) => {
        const u = get().user;
        if (!u) return;
        if (role === "freelancer") {
          const f = get().freelancers[0];
          set({ user: { ...u, role, freelancerId: f?.id, clientId: undefined, name: f?.name || u.name } });
        } else if (role === "cliente") {
          set({ user: { ...u, role, freelancerId: undefined, clientId: "c1", name: "Cliente Aurora" } });
        } else {
          set({ user: { ...u, role, freelancerId: undefined, clientId: undefined, name: "Gestor Delski" } });
        }
      },

      addProject: (p) => {
        const project: Project = {
          ...p,
          id: uid(),
          status: "Solicitado",
          files: [],
          clientFeedback: [],
          briefingSections: p.briefingSections || {
            overview: p.briefing || p.description,
            technicalSpecs: `Tecnologia para vertical ${p.type}`,
            repositoryNotes: "Links de arquivos e entregáveis",
          },
          history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
          createdAt: now(),
          lastStatusChangeAt: now(),
        };
        set({ projects: [project, ...get().projects] });
        return project;
      },

      updateProjectDetails: (id, patch) => {
        set({
          projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        });
      },

      updateProjectStatus: (id, status) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status,
                  lastStatusChangeAt: now(),
                  history: [
                    ...p.history,
                    { id: uid(), at: now(), actor: get().user?.name || "Sistema", message: `Status alterado para ${status}` },
                  ],
                }
              : p,
          ),
        });
      },

      updateProjectBriefing: (id, briefing) => {
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, briefing } : p)) });
      },

      updateProjectBriefingSections: (id, sections) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, briefingSections: sections } : p,
          ),
        });
      },

      assignFreelancer: (id, freelancerId) => {
        const f = get().freelancers.find((x) => x.id === freelancerId);
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  freelancerId,
                  status: freelancerId && p.status === "Solicitado" ? "Delegado" : p.status,
                  lastStatusChangeAt: freelancerId && p.status === "Solicitado" ? now() : p.lastStatusChangeAt,
                  history: [
                    ...p.history,
                    {
                      id: uid(),
                      at: now(),
                      actor: get().user?.name || "Sistema",
                      message: freelancerId ? `Delegado para ${f?.name}` : "Delegação removida",
                    },
                  ],
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
        set({
          projects: get().projects.map((p) => (p.id === id ? { ...p, files: [...p.files, file] } : p)),
        });
      },

      removeFile: (id, fileId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p,
          ),
        });
      },

      addTriageResponse: (resp) => {
        set({
          triageResponses: [resp, ...get().triageResponses.filter((t) => t.token !== resp.token)],
        });
      },

      getTriageResponse: (token) => {
        return get().triageResponses.find((t) => t.token === token);
      },

      addFreelancer: (f) => {
        const freelancer: Freelancer = { ...f, id: uid(), createdAt: now() };
        set({ freelancers: [freelancer, ...get().freelancers] });
        return freelancer;
      },

      toggleFreelancerActive: (id) => {
        set({
          freelancers: get().freelancers.map((f) => (f.id === id ? { ...f, active: !f.active } : f)),
        });
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

      addTask: (t) => {
        const task: ProjectTask = {
          ...t,
          id: uid(),
          phase: t.phase || "Fase 1: Execução",
          createdAt: now(),
        };
        set({ tasks: [...get().tasks, task] });
        return task;
      },

      updateTask: (id, patch) => {
        set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
      },

      updateTaskStatus: (id, newStatus) => {
        const tasks = get().tasks;
        const targetTask = tasks.find((t) => t.id === id);
        if (!targetTask) return { success: false, error: "Tarefa não encontrada" };

        // PREDECESSOR DEPENDENCY CHECKING
        if (targetTask.predecessorId && (newStatus === "Em andamento" || newStatus === "Concluida")) {
          const pred = tasks.find((t) => t.id === targetTask.predecessorId);
          if (pred && pred.status !== "Concluida") {
            return {
              success: false,
              error: `Bloqueado por dependência: A tarefa "${pred.title}" precisa ser concluída antes de avançar esta tarefa!`,
            };
          }
        }

        set({
          tasks: tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
        });
        return { success: true };
      },

      removeTask: (id) => {
        set({ tasks: get().tasks.filter((t) => t.id !== id && t.predecessorId !== id) });
      },

      // ─── Client Feedback ─────────────────────────────────────────────────
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

      // ─── Leads (CRM) ──────────────────────────────────────────────────────
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
          client: lead.name,
          type: lead.service,
          description: lead.notes || `Projeto originado do lead ${lead.name}.`,
          deadline,
          budget: lead.estimatedValue,
        });
        set({ leads: get().leads.map((l) => (l.id === id ? { ...l, stage: "Fechado", convertedProjectId: project.id } : l)) });
        return project.id;
      },

      // ─── Wiki ─────────────────────────────────────────────────────────────
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

      // ─── Applications (legacy / freelancer invite flow) ───────────────────
      inviteFreelancerToProject: (projectId, freelancerId) => {
        const exists = get().applications.find((a) => a.projectId === projectId && a.freelancerId === freelancerId);
        if (exists) return exists;
        const app: ProjectApplication = {
          id: uid(), projectId, freelancerId, token: uid() + uid(),
          status: "Pendente", invitedAt: now(),
        };
        set({ applications: [app, ...get().applications] });
        return app;
      },
      submitApplication: (token, data) => {
        set({
          applications: get().applications.map((a) =>
            a.token === token ? { ...a, ...data, status: "Respondida" } : a,
          ),
        });
      },
      updateApplicationStatus: (id, status) => {
        set({ applications: get().applications.map((a) => (a.id === id ? { ...a, status } : a)) });
      },
      selectApplication: (id) => {
        const app = get().applications.find((a) => a.id === id);
        if (!app || !app.freelancerId) return;
        get().assignFreelancer(app.projectId, app.freelancerId);
        set({
          applications: get().applications.map((a) => {
            if (a.projectId !== app.projectId) return a;
            if (a.id === id) return { ...a, status: "Selecionada" };
            return a.status === "Respondida" || a.status === "Pendente" ? { ...a, status: "Recusada" } : a;
          }),
        });
      },
      removeApplication: (id) => {
        set({ applications: get().applications.filter((a) => a.id !== id) });
      },
    }),

    { name: "delski-store-v5" },
  ),
);

// ─── Selector helpers (backward-compat with existing routes) ───────────────
export const useProjectByClientToken = (token: string) =>
  useStore((s) => s.projects.find((p) => p.clientToken === token));

export const useProjectByToken = (token: string) =>
  useStore((s) => s.projects.find((p) => p.publicToken === token));

export const useApplicationByToken = (token: string) =>
  useStore((s) =>
    // look in triageResponses first, then fall back to a compatible shape
    s.triageResponses.find((r) => r.token === token),
  );

