import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuthUser,
  Freelancer,
  Project,
  ProjectFile,
  ProjectStatus,
  Role,
  ServiceType,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

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
    files: [], history: [
      { id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" },
      { id: uid(), at: now(), actor: "Gestor", message: "Delegado para Ana Ribeiro" },
      { id: uid(), at: now(), actor: "Ana Ribeiro", message: "Movido para Em Produção" },
    ],
    createdAt: now(),
  },
  {
    id: "p2", client: "Studio Lumen", type: "Trafego",
    description: "Gestão de tráfego pago no Meta Ads e Google Ads por 3 meses.",
    deadline: "2026-09-15", budget: 6000, status: "Delegado", freelancerId: "f2",
    files: [], history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
    createdAt: now(),
  },
  {
    id: "p3", client: "Vetra Tech", type: "IA",
    description: "Automação de atendimento com agente IA integrado ao WhatsApp.",
    deadline: "2026-08-10", budget: 12000, status: "Em Revisao", freelancerId: "f1",
    files: [], history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
    createdAt: now(),
  },
  {
    id: "p4", client: "Padaria Bella", type: "Sites",
    description: "Landing page para captação de leads de aniversários corporativos.",
    deadline: "2026-08-05", budget: 3500, status: "Solicitado",
    files: [], history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
    createdAt: now(),
  },
  {
    id: "p5", client: "Move Fitness", type: "IA",
    description: "Chatbot IA para agendamento de aulas experimentais.",
    deadline: "2026-07-20", budget: 5200, status: "Concluido", freelancerId: "f4",
    files: [], history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
    createdAt: now(),
  },
  {
    id: "p6", client: "Cliente Demo", type: "Trafego",
    description: "Campanha de lançamento para novo produto SaaS.",
    deadline: "2026-09-01", budget: 4500, status: "Solicitado",
    files: [], history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
    createdAt: now(),
  },
];

interface State {
  user: AuthUser | null;
  projects: Project[];
  freelancers: Freelancer[];
  login: (email: string, name?: string, role?: Role) => void;
  logout: () => void;
  setRole: (role: Role) => void;
  addProject: (p: Omit<Project, "id" | "status" | "files" | "history" | "createdAt">) => Project;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
  assignFreelancer: (id: string, freelancerId: string | undefined) => void;
  setDriveLink: (id: string, link: string) => void;
  addFile: (id: string, f: Omit<ProjectFile, "id" | "uploadedAt">) => void;
  removeFile: (id: string, fileId: string) => void;
  generatePublicToken: (id: string) => string;
  addFreelancer: (f: Omit<Freelancer, "id" | "createdAt">) => Freelancer;
  toggleFreelancerActive: (id: string) => void;
  removeFreelancer: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      projects: seedProjects,
      freelancers: seedFreelancers,
      login: (email, name, role = "gestor") => {
        const freelancer = get().freelancers.find((f) => f.email === email);
        const resolvedRole: Role = freelancer ? "freelancer" : role;
        set({
          user: {
            id: uid(),
            email,
            name: name || freelancer?.name || email.split("@")[0],
            role: resolvedRole,
            freelancerId: freelancer?.id,
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
          ...p, id: uid(), status: "Solicitado", files: [],
          history: [{ id: uid(), at: now(), actor: "Gestor", message: "Projeto criado" }],
          createdAt: now(),
        };
        set({ projects: [project, ...get().projects] });
        return project;
      },
      updateProjectStatus: (id, status) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? { ...p, status, history: [...p.history, { id: uid(), at: now(), actor: get().user?.name || "Sistema", message: `Status alterado para ${status}` }] }
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
    }),
    { name: "delski-store-v1" },
  ),
);

export const useProjectByToken = (token: string) =>
  useStore((s) => s.projects.find((p) => p.publicToken === token));
