import { toast } from "sonner";

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || "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";
const SENDER_EMAIL = import.meta.env.BREVO_SENDER_EMAIL || "delski.contato@gmail.com";
const SENDER_NAME = "Delski Gestão";

async function sendBrevoEmail(payload: {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
}) {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: SENDER_NAME },
        to: payload.to,
        subject: payload.subject,
        htmlContent: payload.htmlContent,
      }),
    });

    if (res.ok) {
      console.log("[Brevo API] E-mail enviado com sucesso:", payload.to[0].email);
      return true;
    } else {
      const err = await res.json();
      console.warn("[Brevo API Warn]", err);
      return false;
    }
  } catch (error) {
    console.error("[Brevo API Exception]", error);
    return false;
  }
}

export async function sendWelcomeEmail(to: { name: string; email: string }) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Bem-vindo(a) à plataforma Delski!</h2>
      <p>Olá <strong>${to.name}</strong>,</p>
      <p>Sua conta foi cadastrada pelo Gestor na plataforma Delski (Automação com IA, Tráfego Pago e Sites).</p>
      <p>Você pode acessar o painel com o e-mail: <code>${to.email}</code></p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
      <p style="font-size: 12px; color: #666;">Delski Gestão de Projetos & Freelancers</p>
    </div>
  `;
  
  const sent = await sendBrevoEmail({
    to: [{ email: to.email, name: to.name }],
    subject: "Convite de Acesso — Plataforma Delski",
    htmlContent: html,
  });

  if (sent) {
    toast.success(`E-mail de convite enviado via Brevo para ${to.email}`);
  } else {
    toast.info(`Convite de acesso registrado para ${to.email}`);
  }
}

export async function sendDelegationEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  projectId: string;
  publicLink?: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Novo Projeto Atribuído!</h2>
      <p>Olá <strong>${args.to.name}</strong>,</p>
      <p>Você foi alocado(a) para o projeto de <strong>${args.projectClient}</strong> na Delski.</p>
      ${args.publicLink ? `<p><a href="${args.publicLink}" style="display:inline-block; padding:10px 20px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:6px;">Acessar Projeto</a></p>` : ""}
      <p style="font-size: 12px; color: #666;">Delski — Automação com IA, Tráfego e Sites</p>
    </div>
  `;

  const sent = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Alocação de Projeto: ${args.projectClient} — Delski`,
    htmlContent: html,
  });

  if (sent) {
    toast.success(`Notificação de delegação enviada via Brevo para ${args.to.email}`);
  } else {
    toast.info(`Projeto atribuído para ${args.to.name}`);
  }
}

export async function sendStatusChangeEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  status: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h3 style="color: #4f46e5;">Atualização de Status do Projeto</h3>
      <p>O status do projeto <strong>${args.projectClient}</strong> mudou para: <strong>${args.status}</strong>.</p>
    </div>
  `;

  await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Status Atualizado: ${args.projectClient} -> ${args.status}`,
    htmlContent: html,
  });
}

export async function sendTriageInviteEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  triageLink: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Convite de Triagem de Freelancer — Delski</h2>
      <p>Olá <strong>${args.to.name}</strong>,</p>
      <p>Você foi convidado(a) para responder à triagem do projeto <strong>${args.projectClient}</strong>.</p>
      <p style="margin-top:20px;">
        <a href="${args.triageLink}" style="display:inline-block; padding:12px 24px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">Preencher Formulário de Triagem</a>
      </p>
      <p style="font-size:12px; color:#888; margin-top:20px;">Link de acesso único: ${args.triageLink}</p>
    </div>
  `;

  const sent = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Convite de Triagem: Projeto ${args.projectClient} — Delski`,
    htmlContent: html,
  });

  if (sent) {
    toast.success(`Convite de triagem enviado via Brevo para ${args.to.email}`);
  } else {
    toast.info(`Convite de triagem gerado para ${args.to.email}`);
  }
}
