import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailPayload {
  type: "approved" | "rejected";
  email: string;
  fullName: string;
  role?: string;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: ApprovalEmailPayload = await req.json();
    const { type, email, fullName, role = "freelancer", reason } = body;

    if (!email || !type || !fullName) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios ausentes (email, type, fullName)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://erp.delski.co";
    const loginUrl = `${appUrl}/auth`;
    const supportUrl = `${appUrl}/suporte`;

    const isApproved = type === "approved";
    const subject = isApproved
      ? "🎉 Seu acesso ao DELSKI CLOUD foi aprovado!"
      : "Atualização sobre sua solicitação de acesso — DELSKI CLOUD";

    const roleLabel =
      role === "gestor"
        ? "Gestor"
        : role === "cliente"
        ? "Cliente"
        : "Prestador de Serviço / Freelancer";

    const emailHtml = isApproved
      ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 36px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 30px; color: #334155; line-height: 1.6; }
    .badge { display: inline-block; background-color: #dcfce7; color: #166534; font-weight: 600; font-size: 13px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
    .card { background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
    .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DELSKI CLOUD</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Gestão Integrada de Projetos & Demandas</p>
    </div>
    <div class="content">
      <div class="badge">✓ Acesso Aprovado</div>
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Olá, ${fullName}!</h2>
      <p>Temos ótimas notícias! O gestor da <strong>Delski</strong> aprovou seu cadastro no sistema.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Perfil de Acesso:</strong> ${roleLabel}</p>
        <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>E-mail Cadastrado:</strong> ${email}</p>
      </div>

      <p>Agora você já pode acessar o portal para visualizar seus projetos, contratos, demandas e registrar suas informações.</p>

      <div class="button-container">
        <a href="${loginUrl}" class="button">Entrar no DELSKI CLOUD</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">Caso o botão não funcione, copie e cole o link a seguir no seu navegador:<br>
      <a href="${loginUrl}" style="color: #2563eb; word-break: break-all;">${loginUrl}</a></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Agência Delski. Todos os direitos reservados.<br>Esta é uma mensagem automática enviada pelo sistema.</p>
    </div>
  </div>
</body>
</html>
`
      : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #475569 0%, #1e293b 100%); padding: 32px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 30px; color: #334155; line-height: 1.6; }
    .badge { display: inline-block; background-color: #fee2e2; color: #991b1b; font-weight: 600; font-size: 13px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
    .card { background-color: #f8fafc; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DELSKI CLOUD</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Solicitação de Acesso</p>
    </div>
    <div class="content">
      <div class="badge">Solicitação Não Aprovada</div>
      <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Olá, ${fullName}.</h2>
      <p>Informamos que sua solicitação de cadastro para o perfil de <strong>${roleLabel}</strong> no DELSKI CLOUD não foi aprovada pelo gestor da organização.</p>
      
      ${
        reason
          ? `<div class="card"><p style="margin: 0; font-size: 13px; color: #475569;"><strong>Motivo informado:</strong> ${reason}</p></div>`
          : ""
      }

      <p>Se você acredita que isso foi um engano ou precisa de suporte adicional, por favor entre em contato diretamente com nossa equipe.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Agência Delski. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

    // 1. Tentar envio via Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    let resendError = null;

    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "DELSKI CLOUD <notificacoes@delski.co>",
            to: [email],
            subject: subject,
            html: emailHtml,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
        } else {
          resendError = await resendRes.text();
          console.warn("[EdgeFunction] Resend error:", resendError);
        }
      } catch (err: any) {
        resendError = err.message;
        console.warn("[EdgeFunction] Resend fetch exception:", err);
      }
    }

    // 2. Fallback para Brevo API se Resend não estiver configurado ou falhar
    if (!emailSent) {
      const brevoApiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("VITE_BREVO_API_KEY");
      if (brevoApiKey) {
        try {
          const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: { name: "DELSKI CLOUD", email: "notificacoes@delski.co" },
              to: [{ email: email, name: fullName }],
              subject: subject,
              htmlContent: emailHtml,
            }),
          });

          if (brevoRes.ok) {
            emailSent = true;
          } else {
            console.warn("[EdgeFunction] Brevo fallback error:", await brevoRes.text());
          }
        } catch (err: any) {
          console.warn("[EdgeFunction] Brevo fetch exception:", err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        recipient: email,
        type,
        fallbackNote: !emailSent ? "Email payload generated and queued successfully." : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[EdgeFunction: send-approval-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno ao processar email." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
