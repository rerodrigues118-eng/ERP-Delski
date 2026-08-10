import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Globe,
  Award,
  Send,
  Calendar,
  FileText,
  Loader2,
  Phone,
  User,
  Mail,
} from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import {
  useSubmitCandidatura,
  DEFAULT_TRIAGE_FORM_CONFIG,
  type TriageFormFieldConfig,
} from "@/hooks/useTriage";
import { calculateFreelancerMatch } from "@/lib/matchmaking";
import { SERVICE_LABEL } from "@/mocks/types";

export const Route = createFileRoute("/candidatura/$id")({
  head: () => ({
    meta: [
      { title: "Candidatura a Vaga — Delski ERP" },
      {
        name: "description",
        content: "Formulário oficial de candidatura para freelancers Delski.",
      },
    ],
  }),
  component: PublicCandidaturaPage,
});

function PublicCandidaturaPage() {
  const { id } = Route.useParams();
  const { data: rawProject, isLoading: loadingProject } = useProject(id);
  const submitCandidatura = useSubmitCandidatura();

  const [submitted, setSubmitted] = useState(false);

  // Security: Sanitize public project object to prevent ANY leakage of budget or internal data
  const project = useMemo(() => {
    if (!rawProject) return null;
    return {
      id: rawProject.id,
      title: rawProject.title,
      service_type: rawProject.service_type,
      deadline: rawProject.deadline,
      briefing_content: rawProject.briefing_content,
      triage_form_config: rawProject.triage_form_config,
    };
  }, [rawProject]);

  // Form values state for standard and custom fields
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // Enabled and ordered fields from project triage_form_config or fallback default
  const fields = useMemo(() => {
    const rawConfig: TriageFormFieldConfig[] =
      Array.isArray(project?.triage_form_config) && project.triage_form_config.length > 0
        ? (project.triage_form_config as TriageFormFieldConfig[])
        : DEFAULT_TRIAGE_FORM_CONFIG;

    return rawConfig
      .filter((f) => f.enabled)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [project?.triage_form_config]);

  const handleStandardChange = (key: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleCustomChange = (key: string, val: string) => {
    setCustomAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const fullName = formValues["full_name"]?.trim() || "";
    const email = formValues["email"]?.trim() || "";

    if (fields.some((f) => f.field_key === "full_name") && !fullName) {
      toast.error("Por favor, informe seu Nome Completo.");
      return;
    }
    if (fields.some((f) => f.field_key === "email") && (!email || !email.includes("@"))) {
      toast.error("Por favor, informe um E-mail de contato válido.");
      return;
    }

    const availHours = Number(formValues["availability_hours"] || 0);
    const propRate = Number(formValues["expected_rate"] || 0);
    const portfolio = formValues["portfolio_url"] || "";

    const match = calculateFreelancerMatch({
      projectServiceType: project.service_type,
      freelancerSkills: [project.service_type],
      availabilityHours: availHours > 0 ? availHours : 20,
      hasPortfolio: Boolean(portfolio),
      proposedRate: propRate > 0 ? propRate : undefined,
    });

    submitCandidatura.mutate(
      {
        project_id: project.id,
        freelancer_name: fullName || "Candidato",
        freelancer_email: email || "contato@freelancer.com",
        phone: formValues["phone"] || undefined,
        skills: [project.service_type],
        availability_hours: availHours || 0,
        portfolio_url: portfolio || undefined,
        proposed_rate: propRate || undefined,
        experience_summary: formValues["experience_summary"] || undefined,
        considerations: formValues["notes"] || undefined,
        notes: formValues["notes"] || undefined,
        custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
        score: match.score,
      },
      {
        onSuccess: () => setSubmitted(true),
      },
    );
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-800" />
          <p className="text-xs text-neutral-500 font-medium tracking-wide">Carregando oportunidade...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center p-6 font-sans">
        <Card className="max-w-md w-full bg-white border-neutral-200 shadow-xs text-center rounded-xl">
          <CardContent className="py-12 space-y-4">
            <img src="/logo.png" alt="Delski Logo" className="h-16 w-auto object-contain mx-auto mb-2" />
            <h2 className="text-xl font-bold text-neutral-900">Oportunidade Não Encontrada</h2>
            <p className="text-xs text-neutral-500">
              O link de candidatura expirou ou o projeto não está mais aceitando candidaturas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center p-6 font-sans">
        <Card className="max-w-lg w-full bg-white border-neutral-200 shadow-sm text-center rounded-2xl">
          <CardContent className="py-12 px-8 space-y-6">
            <div className="flex justify-center">
              <img src="/logo.png" alt="Delski Logo" className="h-16 w-auto object-contain" />
            </div>
            <div className="h-14 w-14 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="border-neutral-300 text-neutral-800 bg-neutral-100 font-semibold text-xs px-3 py-1"
              >
                Candidatura Recebida
              </Badge>
              <h1 className="text-2xl font-bold text-neutral-900">Obrigado pelo envio!</h1>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Sua candidatura para o projeto{" "}
                <strong className="text-neutral-900 font-semibold">{project.title}</strong> foi registrada e enviada para o Gestor.
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-left text-xs space-y-2">
              <div className="flex justify-between text-neutral-600">
                <span>Vertical de Serviço:</span>
                <span className="text-neutral-900 font-semibold">
                  {SERVICE_LABEL[project.service_type] || project.service_type}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Status da Seleção:</span>
                <span className="text-neutral-900 font-semibold">
                  Em Análise pela Equipe
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-400">
              Caso seu perfil atenda aos requisitos, nossa equipe entrará em contato direto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Hero - Centered & Enlarged Logo */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
          <img src="/logo.png" alt="Delski Logo" className="h-16 sm:h-20 w-auto object-contain mx-auto" />
          
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block">
              Delski ERP · Oportunidade Freelancer
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">{project.title}</h1>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Badge variant="outline" className="border-neutral-300 text-neutral-800 bg-neutral-100 font-semibold text-xs rounded-md px-3 py-1 border">
              {SERVICE_LABEL[project.service_type] || project.service_type}
            </Badge>
            {project.deadline && (
              <Badge variant="outline" className="border-neutral-200 text-neutral-600 bg-neutral-50 text-xs rounded-md px-3 py-1 border flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                Prazo: {new Date(project.deadline).toLocaleDateString("pt-BR")}
              </Badge>
            )}
          </div>
        </div>

        {/* Briefing Card */}
        <Card className="bg-white border-neutral-200 shadow-xs rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-neutral-700" />
              Briefing do Projeto
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Examine o escopo e requisitos técnicos da oportunidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed font-normal">
              {project.briefing_content ||
                "Descrição do escopo em definição pelo gestor da agência."}
            </div>
          </CardContent>
        </Card>

        {/* Candidacy Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs"
        >
          <div className="pb-4 border-b border-neutral-100">
            <h2 className="text-lg font-bold text-neutral-900">
              Formulário de Candidatura
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Preencha os campos abaixo com suas informações técnicas e disponibilidade.
            </p>
          </div>

          <div className="space-y-5">
            {fields.map((field) => {
              if (field.type === "padrao") {
                switch (field.field_key) {
                  case "full_name":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-neutral-500" />
                          {field.label} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          placeholder="Ex: Carlos Silva"
                          value={formValues["full_name"] || ""}
                          onChange={(e) => handleStandardChange("full_name", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 h-10 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  case "email":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-neutral-500" />
                          {field.label} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="email"
                          placeholder="seu.email@exemplo.com"
                          value={formValues["email"] || ""}
                          onChange={(e) => handleStandardChange("email", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 h-10 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  case "phone":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-neutral-500" />
                          {field.label}
                        </Label>
                        <Input
                          placeholder="(11) 99999-9999"
                          value={formValues["phone"] || ""}
                          onChange={(e) => handleStandardChange("phone", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 h-10 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  case "availability_hours":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-neutral-500" />
                          {field.label}
                        </Label>
                        <Input
                          type="number"
                          placeholder="20"
                          value={formValues["availability_hours"] || ""}
                          onChange={(e) => handleStandardChange("availability_hours", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 h-10 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  case "portfolio_url":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-neutral-500" />
                          {field.label}
                        </Label>
                        <Input
                          placeholder="https://github.com/seuusuario ou https://seuportfolio.com"
                          value={formValues["portfolio_url"] || ""}
                          onChange={(e) => handleStandardChange("portfolio_url", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 h-10 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  case "expected_rate":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-neutral-500" />
                          {field.label}
                        </Label>
                        <Input
                          type="number"
                          placeholder="1500"
                          value={formValues["expected_rate"] || ""}
                          onChange={(e) => handleStandardChange("expected_rate", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 h-10 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  case "experience_summary":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700">
                          {field.label}
                        </Label>
                        <Textarea
                          rows={3}
                          placeholder="Conte sua experiência anterior e projetos semelhantes..."
                          value={formValues["experience_summary"] || ""}
                          onChange={(e) => handleStandardChange("experience_summary", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  case "notes":
                    return (
                      <div key={field.field_key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700">
                          {field.label}
                        </Label>
                        <Textarea
                          rows={3}
                          placeholder="Compartilhe observações e pontos importantes para o projeto..."
                          value={formValues["notes"] || ""}
                          onChange={(e) => handleStandardChange("notes", e.target.value)}
                          className="bg-white border-neutral-300 text-neutral-900 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    );

                  default:
                    return null;
                }
              } else {
                return (
                  <div key={field.field_key} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-neutral-700">
                      {field.label}
                    </Label>
                    {field.input_type === "textarea" ? (
                      <Textarea
                        rows={3}
                        placeholder="Sua resposta..."
                        value={customAnswers[field.field_key] || ""}
                        onChange={(e) => handleCustomChange(field.field_key, e.target.value)}
                        className="bg-white border-neutral-300 text-neutral-900 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                      />
                    ) : (
                      <Input
                        placeholder="Sua resposta..."
                        value={customAnswers[field.field_key] || ""}
                        onChange={(e) => handleCustomChange(field.field_key, e.target.value)}
                        className="bg-white border-neutral-300 text-neutral-900 h-10 text-xs rounded-lg focus:border-neutral-900 focus:ring-neutral-900"
                      />
                    )}
                  </div>
                );
              }
            })}
          </div>

          <Button
            type="submit"
            disabled={submitCandidatura.isPending}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs h-11 rounded-lg shadow-xs gap-2 transition-colors"
          >
            {submitCandidatura.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Candidatura
          </Button>
        </form>
      </div>
    </div>
  );
}


