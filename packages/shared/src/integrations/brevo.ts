import { toast } from "sonner";

const BREVO_API_KEY =
  import.meta.env.VITE_BREVO_API_KEY ||
  (typeof window !== "undefined" ? (window as any).__ENV__?.VITE_BREVO_API_KEY : "") ||
  "";

const SENDER_EMAIL =
  import.meta.env.VITE_BREVO_SENDER_EMAIL ||
  import.meta.env.BREVO_SENDER_EMAIL ||
  "delski.contato@gmail.com";

const SENDER_NAME = "Delski Gestão";

const EMAIL_HEADER_HTML = `
      <!-- Header / Logo -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px auto;">
        <tr>
          <td style="vertical-align: middle; padding-right: 10px;">
            <img src="https://delski.cloud/logo-icon.png" alt="Delski Logo" width="28" height="28" style="display: block; border: 0;" />
          </td>
          <td style="vertical-align: middle; font-family: 'Plus Jakarta Sans', 'Inter', Arial, sans-serif; font-size: 22px; line-height: 1;">
            <span style="font-weight: 800; color: #0f172a; letter-spacing: -0.3px; text-transform: uppercase;">DELSKI</span><span style="font-weight: 800; color: #2563eb; letter-spacing: 0.2px; text-transform: uppercase; margin-left: 5px;">CLOUD</span>
          </td>
        </tr>
      </table>
`;

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

async function sendBrevoEmail(payload: {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
}): Promise<SendEmailResult> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
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
      return { success: true };
    } else {
      const err = await res.json().catch(() => null);
      const errMsg = err?.message || err?.code || `Erro HTTP ${res.status}`;
      console.warn("[Brevo API Error]", err);
      return { success: false, error: errMsg };
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Falha na conexão com Brevo";
    console.error("[Brevo API Exception]", error);
    return { success: false, error: errMsg };
  }
}

export async function sendWelcomeEmail(to: { name: string; email: string }, customLink?: string) {
  const loginUrl =
    customLink ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/portal/definir-senha?email=${encodeURIComponent(to.email)}`
      : `https://delski.cloud/portal/definir-senha?email=${encodeURIComponent(to.email)}`);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      ${EMAIL_HEADER_HTML}

      <!-- Formal Message -->
      <p style="font-size: 15px; color: #0f172a; line-height: 1.6; margin: 0 0 16px 0;">
        Olá, <strong>${to.name}</strong>.
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
        Sua conta de acesso à plataforma Delski Cloud foi configurada pelo gestor responsável.<br/>
        Clique no botão abaixo para concluir seu acesso e definir sua senha de entrada.
      </p>

      <!-- Email Card -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px;">
        <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">E-mail cadastrado:</p>
        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">${to.email}</p>
      </div>

      <!-- Compact Black CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
          Acessar Plataforma
        </a>
      </div>

      <!-- Fallback Direct URL -->
      <p style="font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; margin: 24px 0 0 0;">
        Ou acesse diretamente pelo link:<br/>
        <a href="${loginUrl}" style="color: #0f172a; text-decoration: underline; word-break: break-all; font-size: 12px;">${loginUrl}</a>
      </p>

      <!-- Minimalist Clean Footer -->
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;"/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Delski Cloud — Gestão de Projetos
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: to.email, name: to.name }],
    subject: "Convite de Acesso — Delski Cloud",
    htmlContent: html,
  });

  if (result.success) {
    toast.success(`E-mail de convite enviado via Brevo para ${to.email}`);
  } else {
    toast.error(`Falha ao enviar e-mail via Brevo para ${to.email}: ${result.error}`);
  }
}

export async function sendOnboardingEmail(args: {
  to: { name: string; email: string };
  tempPassword: string;
  onboardingLink: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      ${EMAIL_HEADER_HTML}
      <p style="font-size: 15px; color: #0f172a; line-height: 1.6; margin: 0 0 16px 0;">Olá, <strong>${args.to.name}</strong>.</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">Sua conta de acesso à plataforma Delski Cloud foi configurada pelo gestor responsável.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">E-mail: <strong>${args.to.email}</strong></p>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #0f172a;">Senha provisória: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${args.tempPassword}</code></p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${args.onboardingLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
          Acessar Plataforma
        </a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;"/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Delski Cloud — Gestão de Projetos
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: "Acesso Provisório — Delski Cloud",
    htmlContent: html,
  });

  if (result.success) {
    toast.success(`E-mail de onboarding enviado via Brevo para ${args.to.email}`);
  } else {
    toast.error(`Erro Brevo ao enviar onboarding: ${result.error}`);
  }
}

export async function sendClientInvite(args: {
  to: { name: string; email: string };
  projectTitle: string;
  projectLink: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      ${EMAIL_HEADER_HTML}
      <p style="font-size: 15px; color: #0f172a; line-height: 1.6; margin: 0 0 16px 0;">Olá, <strong>${args.to.name}</strong>.</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">O Gestor da Delski vinculou um projeto a você: <strong>${args.projectTitle}</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${args.projectLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
          Visualizar Projeto
        </a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;"/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Delski Cloud — Gestão de Projetos
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Acesso ao Projeto: ${args.projectTitle} — Delski Cloud`,
    htmlContent: html,
  });

  if (result.success) {
    toast.success(`Convite enviado via Brevo para ${args.to.email}`);
  } else {
    toast.error(`Erro Brevo ao enviar convite: ${result.error}`);
  }
}

export async function sendDelegationEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  projectId: string;
  publicLink?: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      ${EMAIL_HEADER_HTML}
      <p style="font-size: 15px; color: #0f172a; line-height: 1.6; margin: 0 0 16px 0;">Olá, <strong>${args.to.name}</strong>.</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">Você foi alocado(a) para o projeto de <strong>${args.projectClient}</strong> na Delski.</p>
      ${args.publicLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${args.publicLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
          Acessar Projeto
        </a>
      </div>` : ""}
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;"/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Delski Cloud — Gestão de Projetos
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Alocação de Projeto: ${args.projectClient} — Delski Cloud`,
    htmlContent: html,
  });

  if (result.success) {
    toast.success(`Notificação de delegação enviada via Brevo para ${args.to.email}`);
  } else {
    toast.error(`Erro Brevo na notificação de delegação: ${result.error}`);
  }
}

export async function sendStatusChangeEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  status: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      ${EMAIL_HEADER_HTML}
      <p style="font-size: 15px; color: #0f172a; line-height: 1.6; margin: 0 0 16px 0;">Atualização de Projeto</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">O status do projeto <strong>${args.projectClient}</strong> mudou para: <strong>${args.status}</strong>.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;"/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Delski Cloud — Gestão de Projetos
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Status Atualizado: ${args.projectClient} -> ${args.status}`,
    htmlContent: html,
  });

  if (!result.success) {
    toast.error(`Erro Brevo na atualização de status: ${result.error}`);
  }
}

export async function sendTriageInviteEmail(args: {
  to: { name: string; email: string };
  projectClient: string;
  triageLink: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      ${EMAIL_HEADER_HTML}
      <p style="font-size: 15px; color: #0f172a; line-height: 1.6; margin: 0 0 16px 0;">Olá, <strong>${args.to.name}</strong>.</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">Você foi convidado(a) para responder à triagem do projeto <strong>${args.projectClient}</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${args.triageLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
          Preencher Triagem
        </a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;"/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Delski Cloud — Gestão de Projetos
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Convite de Triagem: Projeto ${args.projectClient} — Delski Cloud`,
    htmlContent: html,
  });

  if (result.success) {
    toast.success(`Convite de triagem enviado via Brevo para ${args.to.email}`);
  } else {
    toast.error(`Erro Brevo ao enviar triagem: ${result.error}`);
  }
}

export async function sendClientAccessInviteEmail(args: {
  to: { name: string; email: string };
  companyName?: string;
  customLink?: string;
}) {
  const loginUrl =
    args.customLink ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/portal/definir-senha?email=${encodeURIComponent(args.to.email)}`
      : `https://delski.cloud/portal/definir-senha?email=${encodeURIComponent(args.to.email)}`);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      ${EMAIL_HEADER_HTML}

      <!-- Formal Message -->
      <p style="font-size: 15px; color: #0f172a; line-height: 1.6; margin: 0 0 16px 0;">
        Olá, <strong>${args.to.name}</strong>${args.companyName ? ` (${args.companyName})` : ""}.
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
        Sua conta de acesso à plataforma Delski Cloud foi configurada pelo gestor responsável.<br/>
        Clique no botão abaixo para concluir seu acesso e definir sua senha de entrada.
      </p>

      <!-- Email Card -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px;">
        <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">E-mail cadastrado:</p>
        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">${args.to.email}</p>
      </div>

      <!-- Compact Black CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
          Acessar Plataforma
        </a>
      </div>

      <!-- Fallback Direct URL -->
      <p style="font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; margin: 24px 0 0 0;">
        Ou acesse diretamente pelo link:<br/>
        <a href="${loginUrl}" style="color: #0f172a; text-decoration: underline; word-break: break-all; font-size: 12px;">${loginUrl}</a>
      </p>

      <!-- Minimalist Clean Footer -->
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;"/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Delski Cloud — Gestão de Projetos
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: "Convite de Acesso — Delski Cloud",
    htmlContent: html,
  });

  if (result.success) {
    toast.success(`E-mail de convite enviado para ${args.to.email}`);
  } else {
    toast.error(`Falha no e-mail (${args.to.email}): ${result.error}`);
  }
}
