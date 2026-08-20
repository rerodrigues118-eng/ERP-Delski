import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  ShieldCheck,
  User,
  ExternalLink,
  Check,
  Briefcase,
  Globe,
  Instagram,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeString, sanitizeEmail, sanitizePhone } from "@/lib/sanitization";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding & Cadastro — DELSKI CLOUD" },
      { name: "description", content: "Cadastro de informações e documentação para ativação na DELSKI CLOUD." },
    ],
  }),
  component: OnboardingPage,
});

// Helper formatting functions
const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

interface UploadedDoc {
  type: string;
  name: string;
  size: number;
  filePath: string;
  fileUrl?: string;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 25 : -25,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 25 : -25,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

function OnboardingPage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    isAuthenticated,
    isLoading: authLoading,
    refreshProfile,
    onboardingCompleted,
    isGestor,
    isFreelancer,
  } = useAuth();

  const isFree = isFreelancer || profile?.role !== "cliente";
  const totalSteps = 2;

  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchingCep, setFetchingCep] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Form State - Passo 1: Dados Cadastrais
  const [companyName, setCompanyName] = useState<string>("");
  const [corporateName, setCorporateName] = useState<string>("");
  const [cnpj, setCnpj] = useState<string>("");
  const [segment, setSegment] = useState<string>("");
  const [corporateEmail, setCorporateEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [cep, setCep] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [rolePosition, setRolePosition] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [instagram, setInstagram] = useState<string>("");
  const [linkedin, setLinkedin] = useState<string>("");
  const [website, setWebsite] = useState<string>("");

  // Form State - Passo 2: Documentação
  const [documents, setDocuments] = useState<Record<string, UploadedDoc>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Redirecionamento se já completou
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (isGestor) {
        navigate({ to: "/app", replace: true });
      } else if (onboardingCompleted || localStorage.getItem(`delski_onboarding_completed_${user?.id}`) === "true") {
        if (isFree) {
          navigate({ to: "/freelancer" as any, replace: true });
        } else {
          navigate({ to: "/cliente" as any, replace: true });
        }
      }
    }
  }, [isAuthenticated, authLoading, onboardingCompleted, isGestor, isFree, user?.id, navigate]);

  // Carregar dados existentes e pré-preencher
  useEffect(() => {
    async function loadInitialData() {
      try {
        let activeUserId = user?.id;
        let activeUserEmail = user?.email;

        if (!activeUserId) {
          const { data: sData } = await supabase.auth.getSession();
          if (sData?.session?.user) {
            activeUserId = sData.session.user.id;
            activeUserEmail = sData.session.user.email;
          }
        }

        const normalizedEmail = (activeUserEmail || corporateEmail || "").toLowerCase().trim();

        if (activeUserId || normalizedEmail) {
          // Preencher email corporativo
          if (normalizedEmail) setCorporateEmail(normalizedEmail);

          // Buscar dados do freelancer / profile
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .or(`id.eq.${activeUserId || "00000000-0000-0000-0000-000000000000"},email.ilike.${normalizedEmail}`)
            .limit(1)
            .maybeSingle();

          if (pData) {
            if (pData.full_name && !contactName) setContactName(pData.full_name);
            if (pData.email && !corporateEmail) setCorporateEmail(pData.email);
            if (pData.phone && !phone) setPhone(formatPhone(pData.phone));
          }

          // Buscar se existe na tabela freelancers
          if (activeUserId) {
            const { data: fData } = await (supabase.from("freelancers") as any)
              .select("*")
              .eq("id", activeUserId)
              .maybeSingle();

            if (fData) {
              if (fData.company_name) setCompanyName(fData.company_name);
              if (fData.corporate_name) setCorporateName(fData.corporate_name);
              if (fData.cnpj) setCnpj(fData.cnpj);
              if (fData.segment) setSegment(fData.segment);
              if (fData.address) setAddress(fData.address);
              if (fData.city) setCity(fData.city);
              if (fData.state) setState(fData.state);
              if (fData.cep) setCep(fData.cep);
              if (fData.contact_name) setContactName(fData.contact_name);
              if (fData.role_position) setRolePosition(fData.role_position);
              if (fData.phone) setPhone(formatPhone(fData.phone));
              if (fData.instagram) setInstagram(fData.instagram);
              if (fData.linkedin) setLinkedin(fData.linkedin);
              if (fData.website) setWebsite(fData.website);
            }

            // Buscar documentos já enviados
            const { data: fDocs } = await (supabase.from("freelancer_documents") as any)
              .select("*")
              .eq("freelancer_id", activeUserId);

            if (fDocs && fDocs.length > 0) {
              const initialDocs: Record<string, UploadedDoc> = {};
              fDocs.forEach((d: any) => {
                initialDocs[d.document_type] = {
                  type: d.document_type,
                  name: d.file_path?.split("/").pop() || `${d.document_type}.pdf`,
                  size: 0,
                  filePath: d.file_path,
                  fileUrl: d.file_url,
                };
              });
              setDocuments((prev) => ({ ...initialDocs, ...prev }));
            }
          }
        }
      } catch (err) {
        console.warn("Aviso ao carregar dados do onboarding:", err);
      }
    }

    loadInitialData();
  }, [user, profile]);

  // Busca automática de endereço por CEP
  const handleCepBlur = async () => {
    const rawCep = cep.replace(/\D/g, "");
    if (rawCep.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(`${data.logradouro || ""} - ${data.bairro || ""}`.trim().replace(/^-\s*/, ""));
          setCity(data.localidade || "");
          setState(data.uf || "");
          toast.success("Endereço preenchido automaticamente.");
        }
      } catch (err) {
        console.warn("Erro ao buscar CEP:", err);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  // Upload de Documentos com Hardening de Segurança
  const handleFileUpload = async (docType: string, file: File) => {
    // 1. Validação Estrita de Tipo MIME
    const fileMime = (file.type || "").toLowerCase();
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(fileMime) || 
      file.name.toLowerCase().endsWith(".pdf") || 
      file.name.toLowerCase().endsWith(".jpg") || 
      file.name.toLowerCase().endsWith(".jpeg") || 
      file.name.toLowerCase().endsWith(".png");

    if (!isAllowedMime) {
      toast.error("Formato não permitido. Anexe apenas arquivos PDF, JPG ou PNG.");
      return;
    }

    // 2. Validação Estrita de Tamanho Máximo (5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`O arquivo tem ${sizeMB}MB e excede o limite máximo permitido de 5MB.`);
      return;
    }

    let currentUserId = user?.id;
    let currentUserEmail = (user?.email || corporateEmail || "").trim().toLowerCase();

    if (!currentUserId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          currentUserId = sessionData.session.user.id;
          if (!currentUserEmail) currentUserEmail = sessionData.session.user.email?.trim().toLowerCase() || "";
        }
      } catch {
        currentUserId = profile?.id;
      }
    }

    const effectiveFolderId = currentUserId || "pending_prestador";
    setUploadingDoc(docType);

    try {
      // 3. Nomeação Segura com UUID Aleatório Criptográfico (Prevenção de sobrescrita e enumeração)
      const rawExt = file.name.split(".").pop() || "pdf";
      const safeExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
      const randomUuid = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
        : Math.random().toString(36).substring(2, 12);
      const safeName = `doc_${docType}_${randomUuid}.${safeExt}`;

      const bucketName = "freelancer-docs";
      const filePath = `freelancers/${effectiveFolderId}/${safeName}`;

      let fileUrl = "";

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        const { data: fallbackUpload, error: fallbackError } = await supabase.storage
          .from("project-attachments")
          .upload(`onboarding/${effectiveFolderId}/${safeName}`, file, { upsert: true });

        if (!fallbackError && fallbackUpload) {
          const { data: pubData } = supabase.storage
            .from("project-attachments")
            .getPublicUrl(fallbackUpload.path);
          fileUrl = pubData?.publicUrl || "";
        }
      } else if (uploadData) {
        const { data: pubData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(uploadData.path || filePath);
        fileUrl = pubData?.publicUrl || "";
      }

      if (!fileUrl) {
        try {
          fileUrl = URL.createObjectURL(file);
        } catch {}
      }

      // Persistir no banco de dados freelancer_documents
      if (currentUserId) {
        try {
          await (supabase.from("freelancer_documents") as any).upsert(
            {
              freelancer_id: currentUserId,
              document_type: docType,
              file_path: filePath,
              file_url: fileUrl || null,
              status: "em_analise",
              uploaded_at: new Date().toISOString(),
            },
            { onConflict: "freelancer_id,document_type" }
          );
        } catch (dbErr) {
          console.warn("Aviso ao persistir documento no banco:", dbErr);
        }
      }

      const newDoc: UploadedDoc = {
        type: docType,
        name: file.name,
        size: file.size,
        filePath,
        fileUrl,
      };

      setDocuments((prev) => ({ ...prev, [docType]: newDoc }));
      toast.success(`Arquivo "${file.name}" anexado com sucesso!`);
    } catch {
      toast.error("Falha ao anexar arquivo. Verifique sua conexão e tente novamente.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRemoveDoc = (docType: string) => {
    setDocuments((prev) => {
      const copy = { ...prev };
      delete copy[docType];
      return copy;
    });
    toast.info("Documento removido.");
  };

  // Lista dos 4 Documentos Obrigatórios / Requeridos do Prestador
  const prestadorDocs = [
    {
      id: "antecedentes_criminais",
      title: "Certidão de Antecedentes Criminais",
      desc: "Documento oficial de certidão de antecedentes criminais atualizado.",
      format: "PDF ou JPG até 10MB",
      required: true,
    },
    {
      id: "situacao_cpf",
      title: "Comprovante de Situação Cadastral do CPF",
      desc: "Comprovante de inscrição e situação cadastral emitido pela Receita Federal.",
      format: "PDF ou JPG até 10MB",
      required: true,
    },
    {
      id: "situacao_cnpj",
      title: "Comprovante de Situação do CNPJ",
      desc: "Cartão CNPJ ou CCMEI ativo da pessoa jurídica prestadora.",
      format: "PDF ou JPG (se aplicável)",
      required: false,
    },
    {
      id: "foto_rosto",
      title: "Foto do Rosto (Tipo 3x4)",
      desc: "Foto frontal nítida com boa iluminação e fundo neutro.",
      format: "JPG ou PNG até 5MB",
      required: true,
    },
  ];

  const pendingRequiredDocs = prestadorDocs.filter((d) => d.required && !documents[d.id]);
  const isDocComplete = pendingRequiredDocs.length === 0;

  const nextStep = () => {
    if (step === 1) {
      if (!contactName.trim()) {
        toast.error("Informe o Nome do Responsável Legal.");
        return;
      }
      if (!corporateEmail.trim()) {
        toast.error("O E-mail Corporativo é obrigatório.");
        return;
      }
    }

    setDirection(1);
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  // Finalização do Onboarding
  const handleFinalize = async () => {
    let currentUserId = user?.id;
    let currentUserEmail = (user?.email || corporateEmail || "").trim().toLowerCase();

    if (!currentUserId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          currentUserId = sessionData.session.user.id;
          if (!currentUserEmail) currentUserEmail = sessionData.session.user.email?.trim().toLowerCase() || "";
        }
      } catch {
        currentUserId = profile?.id;
      }
    }

    setSubmitting(true);
    try {
      const cleanPhone = sanitizePhone(phone) || null;
      const cleanCnpj = cnpj ? cnpj.replace(/\D/g, "") : null;
      const cleanCep = cep ? cep.replace(/\D/g, "") : null;
      const cleanContactName = sanitizeString(contactName);
      const cleanCompanyName = sanitizeString(companyName);
      const cleanCorporateName = sanitizeString(corporateName);
      const cleanSegment = sanitizeString(segment);
      const cleanAddress = sanitizeString(address);
      const cleanCity = sanitizeString(city);
      const cleanState = sanitizeString(state).toUpperCase();
      const cleanRolePosition = sanitizeString(rolePosition);
      const cleanInstagram = sanitizeString(instagram);
      const cleanLinkedin = sanitizeString(linkedin);
      const cleanWebsite = sanitizeString(website);

      let effectiveUserId = currentUserId;
      if (!effectiveUserId && currentUserEmail) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", currentUserEmail)
          .maybeSingle();
        if (pData?.id) effectiveUserId = pData.id;
      }

      if (effectiveUserId) {
        // Atualizar Profile
        try {
          await supabase.from("profiles").upsert({
            id: effectiveUserId,
            full_name: cleanContactName || profile?.full_name || cleanCompanyName || "Prestador",
            email: currentUserEmail,
            phone: cleanPhone || profile?.phone,
            role: "freelancer",
            onboarding_completed: true,
            status: "ativo",
            approval_status: "approved",
            updated_at: new Date().toISOString(),
          });
        } catch (pErr) {
          console.warn("Erro no profile upsert:", pErr);
        }

        // Salvar/Atualizar na tabela freelancers
        try {
          await (supabase.from("freelancers") as any).upsert({
            id: effectiveUserId,
            full_name: cleanContactName || "Prestador",
            company_name: cleanCompanyName || null,
            corporate_name: cleanCorporateName || null,
            cnpj: cleanCnpj || null,
            segment: cleanSegment || null,
            email: currentUserEmail,
            address: cleanAddress || null,
            city: cleanCity || null,
            state: cleanState || null,
            cep: cleanCep || null,
            contact_name: cleanContactName || null,
            role_position: cleanRolePosition || null,
            phone: cleanPhone || null,
            instagram: cleanInstagram || null,
            linkedin: cleanLinkedin || null,
            website: cleanWebsite || null,
            documents_status: isDocComplete ? "aprovado" : "em_analise",
            status: "ativo",
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          });
        } catch (fErr) {
          console.warn("Erro no freelancers upsert:", fErr);
        }
      }

      // Atualizar metadata do Auth User
      try {
        await supabase.auth.updateUser({
          data: {
            role: "freelancer",
            onboarding_completed: true,
            full_name: contactName.trim() || "Prestador",
          },
        });
      } catch {}

      try {
        if (effectiveUserId) {
          localStorage.setItem(`delski_onboarding_completed_${effectiveUserId}`, "true");
        }
      } catch (e) {}

      await refreshProfile();
      setIsSuccessModalOpen(true);
      toast.success("Cadastro e Onboarding concluídos com sucesso!");

      setTimeout(() => {
        window.location.href = "/freelancer";
      }, 2000);
    } catch (err: any) {
      toast.error(`Erro ao finalizar onboarding: ${err.message || "Tente novamente."}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 antialiased">
      {/* Brand Header */}
      <div className="mb-6 text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">DELSKI</span>
          <span className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">CLOUD</span>
        </div>
        <p className="text-xs text-slate-500">Ativação de Prestador & Homologação Cadastral</p>
      </div>

      {/* Main Container Box */}
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm p-6 sm:p-10 space-y-8">
        {/* Stepper Header (Passo 1 de 2 / Passo 2 de 2) */}
        <div className="space-y-3 border-b border-slate-100 dark:border-zinc-800 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                Passo {step} de {totalSteps}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {step === 1 ? "Dados Cadastrais do Prestador" : "Documentação Obrigatória"}
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {step === 1 ? "Etapa 1 de 2 (50%)" : "Etapa 2 de 2 (100%)"}
            </span>
          </div>

          {/* Stepper Line */}
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full bg-slate-900 dark:bg-white rounded-full"
              initial={{ width: "50%" }}
              animate={{ width: step === 1 ? "50%" : "100%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Step Panels with Framer Motion */}
        <AnimatePresence mode="wait" custom={direction}>
          {/* ── PASSO 1: DADOS CADASTRAIS DO PRESTADOR ────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-700 dark:text-zinc-300" />
                  Informações da Pessoa Jurídica e do Responsável
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os dados oficiais para formalização contratual e repasses.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Nome Fantasia
                  </Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Delski Studios"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Razão Social
                  </Label>
                  <Input
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    placeholder="Ex: Mateus Costa Serviços ME"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    CNPJ
                  </Label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    className="h-9.5 text-xs rounded-xl font-mono bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Segmento
                  </Label>
                  <Input
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Design, Desenvolvimento, Tráfego"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    E-mail Corporativo (Leitura) <span className="text-slate-400">•</span>
                  </Label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/70 border border-slate-200 text-xs font-medium text-slate-600 cursor-not-allowed">
                    <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={corporateEmail || "prestador@delski.co"}
                      disabled
                      className="w-full bg-transparent border-0 p-0 text-xs text-slate-600 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        CEP
                      </Label>
                      <Input
                        value={cep}
                        onChange={(e) => {
                          const v = formatCEP(e.target.value);
                          setCep(v);
                          if (v.length === 9) handleCepBlur();
                        }}
                        onBlur={handleCepBlur}
                        maxLength={9}
                        placeholder="00000-000"
                        className="h-9.5 text-xs rounded-xl font-mono bg-slate-50/50 border-slate-200"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Endereço Completo
                      </Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua, Número, Bairro"
                        className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                      />
                    </div>

                    <div className="sm:col-span-1 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Cidade / UF
                      </Label>
                      <div className="flex gap-1.5">
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Cidade"
                          className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                        />
                        <Input
                          value={state}
                          onChange={(e) => setState(e.target.value.toUpperCase())}
                          placeholder="UF"
                          maxLength={2}
                          className="h-9.5 w-14 text-center text-xs rounded-xl font-mono uppercase bg-slate-50/50 border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Nome do Responsável Legal <span className="text-slate-900 font-bold">*</span>
                  </Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ex: Mateus Costa"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Cargo / Função
                  </Label>
                  <Input
                    value={rolePosition}
                    onChange={(e) => setRolePosition(e.target.value)}
                    placeholder="Ex: Diretor Técnico / Freelancer Senior"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    WhatsApp
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    className="h-9.5 text-xs rounded-xl font-mono bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Instagram
                  </Label>
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@seuperfil"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    LinkedIn
                  </Label>
                  <Input
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/perfil"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Site / Portfólio
                  </Label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://meuportfolio.com"
                    className="h-9.5 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PASSO 2: DOCUMENTAÇÃO OBRIGATÓRIA ─────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-slate-700 dark:text-zinc-300" />
                  Homologação de Documentos & Certidões
                </h3>
                <p className="text-xs text-slate-500">
                  Anexe os arquivos abaixo em formato PDF ou imagem nítida (JPG/PNG).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prestadorDocs.map((doc) => {
                  const uploaded = documents[doc.id];
                  const isUploading = uploadingDoc === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        uploaded
                          ? "bg-slate-50/80 dark:bg-zinc-800/40 border-slate-300 dark:border-zinc-700"
                          : "bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {doc.title} {doc.required && <span className="text-rose-500">*</span>}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-snug">{doc.desc}</p>
                        </div>
                        {uploaded && (
                          <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-semibold py-0.5 px-2 rounded-full shrink-0 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Anexado
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 mt-2">
                        {uploaded ? (
                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                              <span className="truncate font-medium text-slate-800 dark:text-zinc-200 text-xs" title={uploaded.name}>
                                {uploaded.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {uploaded.fileUrl && (
                                <a
                                  href={uploaded.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                                  title="Visualizar"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDoc(doc.id)}
                                className="h-6 w-6 p-0 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Remover"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-500 bg-slate-50/50 hover:bg-slate-100/50 transition-all">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.id, file);
                              }}
                              disabled={isUploading}
                            />
                            {isUploading ? (
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Enviando...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                                <span>Selecionar Arquivo</span>
                              </div>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-zinc-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <span>Próximo: Enviar Documentação</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando Dados...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Concluir Onboarding</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
