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
      ? `${window.location.origin}/auth`
      : "http://localhost:8080/auth");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">Bem-vindo(a) à Plataforma Delski!</h2>
      </div>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">Olá <strong>${to.name}</strong>,</p>
      <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">
        Sua conta de freelancer foi cadastrada pelo Gestor na plataforma Delski (Automação com IA, Tráfego Pago, Sites e Social Media).
      </p>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #f3f4f6;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Seu e-mail de acesso:</p>
        <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #111827;">${to.email}</p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
          🚀 Acesse o App & Crie / Entre na sua Conta
        </a>
      </div>
      <p style="font-size: 13px; color: #6b7280; text-align: center;">
        Ou acesse diretamente pelo link: <br/>
        <a href="${loginUrl}" style="color: #4f46e5; word-break: break-all;">${loginUrl}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
        Delski — Gestão de Projetos, Contratos & Freelancers
      </p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: to.email, name: to.name }],
    subject: "Convite de Acesso — Plataforma Delski",
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
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Bem-vindo(a) à plataforma Delski!</h2>
      <p>Olá <strong>${args.to.name}</strong>,</p>
      <p>Sua conta foi provisionada pelo Gestor. Use as credenciais temporárias abaixo para acessar e complete seu cadastro:</p>
      <p><strong>E-mail:</strong> ${args.to.email}</p>
      <p><strong>Senha temporária:</strong> <code>${args.tempPassword}</code></p>
      <p style="margin-top:20px;"><a href="${args.onboardingLink}" style="display:inline-block; padding:12px 24px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">Acessar e completar cadastro</a></p>
      <p style="font-size:12px; color:#888; margin-top:20px;">Recomendamos trocar a senha após o primeiro acesso.</p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: "Acesso provisório — Plataforma Delski",
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
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Acesso ao Portal do Projeto — Delski</h2>
      <p>Olá <strong>${args.to.name}</strong>,</p>
      <p>O Gestor da Delski vinculou um projeto a você: <strong>${args.projectTitle}</strong>.</p>
      <p style="margin-top:20px;"><a href="${args.projectLink}" style="display:inline-block; padding:12px 24px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">Visualizar Projeto</a></p>
      <p style="font-size:12px; color:#888; margin-top:20px;">Caso não consiga acessar, entre em contato com a equipe Delski.</p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Acesso ao Projeto: ${args.projectTitle} — Delski`,
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
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Novo Projeto Atribuído!</h2>
      <p>Olá <strong>${args.to.name}</strong>,</p>
      <p>Você foi alocado(a) para o projeto de <strong>${args.projectClient}</strong> na Delski.</p>
      ${args.publicLink ? `<p><a href="${args.publicLink}" style="display:inline-block; padding:10px 20px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:6px;">Acessar Projeto</a></p>` : ""}
      <p style="font-size: 12px; color: #666;">Delski — Automação com IA, Tráfego, Sites e Social Media</p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Alocação de Projeto: ${args.projectClient} — Delski`,
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
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h3 style="color: #4f46e5;">Atualização de Status do Projeto</h3>
      <p>O status do projeto <strong>${args.projectClient}</strong> mudou para: <strong>${args.status}</strong>.</p>
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

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: `Convite de Triagem: Projeto ${args.projectClient} — Delski`,
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
    <div style="background-color: #f4f4f5; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);">
        <!-- Top Royal Blue Gradient Bar -->
        <div style="height: 6px; background: linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%);"></div>

        <div style="padding: 32px 28px;">
          <!-- Header / Brand -->
          <div style="text-align: center; margin-bottom: 28px;">
            <span style="display: inline-block; padding: 4px 12px; background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 9999px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Portal do Cliente
            </span>
            <h1 style="color: #09090b; font-size: 22px; font-weight: 700; margin: 14px 0 6px 0; letter-spacing: -0.5px;">
              Convite de Acesso — Delski ERP
            </h1>
            <p style="color: #71717a; font-size: 14px; margin: 0;">Gestão Integrada de Projetos & Demandas</p>
          </div>

          <!-- Body Content -->
          <p style="font-size: 15px; color: #18181b; line-height: 1.6; margin: 0 0 16px 0;">
            Olá, <strong>${args.to.name}</strong>${args.companyName ? ` (${args.companyName})` : ""}!
          </p>
          <p style="font-size: 14px; color: #3f3f46; line-height: 1.6; margin: 0 0 20px 0;">
            Sua conta de cliente foi criada no <strong>Delski ERP</strong>. Clique no botão abaixo para ativar seu acesso e cadastrar sua senha inicial:
          </p>

          <!-- Email Highlight Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Seu e-mail de login:</p>
            <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">${args.to.email}</p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%); color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
              🔑 Ativar Conta & Criar Senha
            </a>
          </div>

          <!-- Direct URL Fallback -->
          <p style="font-size: 12px; color: #71717a; text-align: center; line-height: 1.5; margin: 24px 0 0 0;">
            Caso o botão não funcione, copie e cole o link a seguir no seu navegador:<br/>
            <a href="${loginUrl}" style="color: #2563eb; text-decoration: underline; word-break: break-all; font-size: 12px;">${loginUrl}</a>
          </p>

          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 28px 0 20px 0;"/>

          <!-- Footer -->
          <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0; line-height: 1.5;">
            © ${new Date().getFullYear()} Delski — Todos os direitos reservados.<br/>
            Esta é uma mensagem automática de segurança.
          </p>
        </div>
      </div>
    </div>
  `;

  const result = await sendBrevoEmail({
    to: [{ email: args.to.email, name: args.to.name }],
    subject: "Convite de Acesso ao Portal do Cliente — Delski ERP",
    htmlContent: html,
  });

  if (result.success) {
    toast.success(`E-mail de convite enviado para ${args.to.email}`);
  } else {
    if (result.error?.includes("unrecognised IP address")) {
      toast.error(
        `E-mail não enviado: Seu endereço IP precisa ser autorizado no painel da Brevo (Security > Authorized IPs) ou desativar a restrição de IP.`,
        { duration: 8000 },
      );
    } else {
      toast.error(`Falha no e-mail (${args.to.email}): ${result.error}`);
    }
  }
}
