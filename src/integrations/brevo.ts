// Stubs de integração com Brevo — trocar por chamada real (Edge Function / API) na Fase 2.
import { toast } from "sonner";

const log = (label: string, payload: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`[brevo:mock] ${label}`, payload);
};

export async function sendWelcomeEmail(to: { name: string; email: string }) {
  log("welcome", to);
  toast.success(`E-mail de boas-vindas enviado para ${to.email} (mock)`);
}

export async function sendDelegationEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  projectId: string;
  publicLink?: string;
}) {
  log("delegation", args);
  toast.success(`Delegação enviada para ${args.to.email} (mock)`);
}

export async function sendStatusChangeEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  status: string;
}) {
  log("status-change", args);
  toast.success(`Notificação de status enviada para ${args.to.email} (mock)`);
}

export async function sendTriageInviteEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  triageLink: string;
}) {
  log("triage-invite", args);
  toast.success(`Convite de triagem enviado para ${args.to.email} (mock)`);
}
