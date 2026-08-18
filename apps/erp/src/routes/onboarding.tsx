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
  AlertCircle,
  Briefcase,
  ShieldCheck,
  CreditCard,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Instagram,
  Linkedin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Boas-vindas & Onboarding — DELSKI CLOUD" },
      { name: "description", content: "Cadastro inicial e homologação de documentos DELSKI." },
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

const slideVariants: any = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    transition: { duration: 0.2 },
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
    isCliente,
  } = useAuth();

  const isFree = isFreelancer || profile?.role === "freelancer";
  const totalSteps = isFree ? 4 : 3;

  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchingCep, setFetchingCep] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Form State - Etapa 1 (Dados Cadastrais)
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

  // Form State - Etapa 2 (Documentação)
  const [documents, setDocuments] = useState<Record<string, UploadedDoc>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Form State - Etapa 3 para Freelancer (Dados Bancários & PIX)
  const [bankName, setBankName] = useState<string>("");
  const [bankAgency, setBankAgency] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [pixType, setPixType] = useState<string>("CNPJ");
  const [pixKey, setPixKey] = useState<string>("");

  // Pre-populate data from auth or existing profile
  useEffect(() => {
    if (user) {
      if (user.email && !corporateEmail) setCorporateEmail(user.email);
      if (profile?.full_name && !contactName) setContactName(profile.full_name);
      if (profile?.phone && !phone) setPhone(formatPhone(profile.phone));
    }
  }, [user, profile]);

  // Load draft from sessionStorage on mount
  useEffect(() => {
    if (!user?.id) return;
    try {
      const savedDraft = sessionStorage.getItem(`delski_onboarding_draft_${user.id}`);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.step && draft.step > 1) setStep(draft.step);
        if (draft.companyName) setCompanyName(draft.companyName);
        if (draft.corporateName) setCorporateName(draft.corporateName);
        if (draft.cnpj) setCnpj(draft.cnpj);
        if (draft.segment) setSegment(draft.segment);
        if (draft.corporateEmail) setCorporateEmail(draft.corporateEmail);
        if (draft.address) setAddress(draft.address);
        if (draft.city) setCity(draft.city);
        if (draft.state) setState(draft.state);
        if (draft.cep) setCep(draft.cep);
        if (draft.contactName) setContactName(draft.contactName);
        if (draft.rolePosition) setRolePosition(draft.rolePosition);
        if (draft.phone) setPhone(draft.phone);
        if (draft.instagram) setInstagram(draft.instagram);
        if (draft.linkedin) setLinkedin(draft.linkedin);
        if (draft.website) setWebsite(draft.website);
        if (draft.documents && typeof draft.documents === "object") setDocuments(draft.documents);
        if (draft.bankName) setBankName(draft.bankName);
        if (draft.bankAgency) setBankAgency(draft.bankAgency);
        if (draft.bankAccount) setBankAccount(draft.bankAccount);
        if (draft.pixType) setPixType(draft.pixType);
        if (draft.pixKey) setPixKey(draft.pixKey);
      }
    } catch (e) {
      console.warn("Erro ao restaurar rascunho de onboarding:", e);
    }
  }, [user?.id]);

  // Auto-save draft to sessionStorage on state change
  useEffect(() => {
    if (!user?.id || onboardingCompleted) return;
    const draftData = {
      step,
      companyName,
      corporateName,
      cnpj,
      segment,
      corporateEmail,
      address,
      city,
      state,
      cep,
      contactName,
      rolePosition,
      phone,
      instagram,
      linkedin,
      website,
      documents,
      bankName,
      bankAgency,
      bankAccount,
      pixType,
      pixKey,
    };
    try {
      sessionStorage.setItem(`delski_onboarding_draft_${user.id}`, JSON.stringify(draftData));
    } catch (e) {
      // ignore
    }
  }, [
    user?.id,
    onboardingCompleted,
    step,
    companyName,
    corporateName,
    cnpj,
    segment,
    corporateEmail,
    address,
    city,
    state,
    cep,
    contactName,
    rolePosition,
    phone,
    instagram,
    linkedin,
    website,
    documents,
    bankName,
    bankAgency,
    bankAccount,
    pixType,
    pixKey,
  ]);

  // If already completed onboarding or if gestor, navigate to respective workspace
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (isGestor) {
        navigate({ to: "/app", replace: true });
      } else if (onboardingCompleted) {
        if (isFree) {
          navigate({ to: "/freelancer" as any, replace: true });
        } else {
          navigate({ to: "/cliente" as any, replace: true });
        }
      }
    }
  }, [isAuthenticated, authLoading, onboardingCompleted, isGestor, isFree, navigate]);

  // Auto fetch address by CEP via ViaCEP
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
          toast.success("Endereço preenchido automaticamente pelo CEP!");
        }
      } catch (err) {
        console.warn("Erro ao buscar CEP:", err);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  // Upload document handler
  const handleFileUpload = async (docType: string, file: File) => {
    if (!user) return;
    setUploadingDoc(docType);

    try {
      const fileExt = file.name.split(".").pop();
      const safeName = `${docType}_${Date.now()}.${fileExt}`;
      const bucketName = isFree ? "freelancer-docs" : "client-documents";
      const folderPrefix = isFree ? "freelancers" : "clients";
      const filePath = `${folderPrefix}/${user.id}/${safeName}`;

      // Upload to appropriate bucket
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn("Storage upload warn:", uploadError);
      }

      const { data: pubData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const fileUrl = pubData?.publicUrl || "";

      setDocuments((prev) => ({
        ...prev,
        [docType]: {
          type: docType,
          name: file.name,
          size: file.size,
          filePath,
          fileUrl,
        },
      }));

      toast.success(`Documento anexado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Falha ao enviar arquivo: ${err.message || "Erro desconhecido"}`);
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

  const nextStep = () => {
    if (step === 1) {
      if (!companyName.trim() || !corporateEmail.trim() || !contactName.trim()) {
        return toast.error("Preencha todos os campos obrigatórios (Nome, E-mail, Responsável).");
      }
    }
    if (step === 2 && isFree) {
      // Document step for freelancer: allow proceed
    }
    if (step === 3 && isFree) {
      if (!bankName.trim() || !pixKey.trim()) {
        return toast.error("Informe o Banco e a Chave PIX para recebimento de pagamentos.");
      }
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  // Final Submit
  const handleFinalize = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const cleanCnpj = cnpj.replace(/\D/g, "");
      const cleanCep = cep.replace(/\D/g, "");

      if (isFree) {
        // ── FLUXO FREELANCER ──────────────────────────────────────────────
        const freelancerPayload: any = {
          id: user.id,
          company_name: companyName.trim(),
          corporate_name: corporateName.trim() || companyName.trim(),
          cnpj: cleanCnpj || null,
          segment: segment.trim() || null,
          email: corporateEmail.trim().toLowerCase(),
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          cep: cleanCep || null,
          role_position: rolePosition.trim() || null,
          phone: cleanPhone || null,
          instagram: instagram.trim() || null,
          linkedin: linkedin.trim() || null,
          website: website.trim() || null,
          bank_name: bankName.trim(),
          bank_agency: bankAgency.trim() || null,
          bank_account: bankAccount.trim() || null,
          pix_type: pixType,
          pix_key: pixKey.trim(),
          onboarding_completed: true,
          status: "ativo",
          updated_at: new Date().toISOString(),
        };

        const { error: fErr } = await (supabase.from("freelancers") as any).upsert(freelancerPayload);
        if (fErr) console.warn("Freelancers upsert warn:", fErr);

        // Update profile
        await (supabase.from("profiles") as any)
          .update({
            full_name: contactName.trim(),
            phone: cleanPhone,
            role: "freelancer",
            onboarding_completed: true,
          })
          .eq("id", user.id);

        // Insert documents
        const docEntries = Object.entries(documents);
        if (docEntries.length > 0) {
          for (const [docType, docData] of docEntries) {
            try {
              await (supabase.from("freelancer_documents") as any).insert([
                {
                  freelancer_id: user.id,
                  document_type: docType,
                  file_path: docData.filePath,
                  file_url: docData.fileUrl || null,
                  status: "em_analise",
                  uploaded_at: new Date().toISOString(),
                },
              ]);
            } catch (dErr) {
              console.warn("Error inserting freelancer document:", dErr);
            }
          }
        }

        try {
          sessionStorage.removeItem(`delski_onboarding_draft_${user.id}`);
        } catch (e) {}

        await refreshProfile();
        setIsSuccessModalOpen(true);
        toast.success("Cadastro concluído com sucesso!");
        setTimeout(() => {
          navigate({ to: "/freelancer" as any, replace: true });
        }, 2000);
      } else {
        // ── FLUXO CLIENTE ─────────────────────────────────────────────────
        let resolvedClientId: string | null = null;
        const normalizedEmail = corporateEmail.trim().toLowerCase();

        const { data: existingClient } = await (supabase.from("clients") as any)
          .select("id")
          .or(`auth_user_id.eq.${user.id},email.ilike.${normalizedEmail}`)
          .limit(1)
          .maybeSingle();

        if (existingClient?.id) {
          resolvedClientId = existingClient.id;
        }

        const clientPayload: any = {
          auth_user_id: user.id,
          full_name: contactName.trim(),
          company_name: companyName.trim(),
          corporate_name: corporateName.trim() || companyName.trim(),
          cnpj: cleanCnpj || null,
          segment: segment.trim() || null,
          email: normalizedEmail,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          cep: cleanCep || null,
          contact_name: contactName.trim(),
          role_position: rolePosition.trim() || null,
          phone: cleanPhone || null,
          instagram: instagram.trim() || null,
          linkedin: linkedin.trim() || null,
          website: website.trim() || null,
          onboarding_completed: true,
          status: "ativo",
        };

        if (resolvedClientId) {
          await (supabase.from("clients") as any)
            .update(clientPayload)
            .eq("id", resolvedClientId);
        } else {
          const { data: inserted } = await (supabase.from("clients") as any)
            .insert([clientPayload])
            .select("id")
            .single();
          resolvedClientId = inserted?.id || user.id;
        }

        // Update profile
        await (supabase.from("profiles") as any)
          .update({
            full_name: contactName.trim(),
            phone: cleanPhone,
            role: "cliente",
            onboarding_completed: true,
          })
          .eq("id", user.id);

        // Insert documents
        const docEntries = Object.entries(documents);
        if (docEntries.length > 0 && resolvedClientId) {
          for (const [docType, docData] of docEntries) {
            try {
              await (supabase.from("client_documents") as any).insert([
                {
                  client_id: resolvedClientId,
                  document_type: docType,
                  file_path: docData.filePath,
                  file_url: docData.fileUrl || null,
                  status: "em_analise",
                  uploaded_at: new Date().toISOString(),
                },
              ]);
            } catch (dErr) {
              console.warn("Error inserting client document:", dErr);
            }
          }
        }

        try {
          sessionStorage.removeItem(`delski_onboarding_draft_${user.id}`);
        } catch (e) {}

        await refreshProfile();
        setIsSuccessModalOpen(true);
        toast.success("Homologação do Cliente concluída com sucesso!");
        setTimeout(() => {
          navigate({ to: "/cliente" as any, replace: true });
        }, 2000);
      }
    } catch (err: any) {
      console.error("Erro ao finalizar onboarding:", err);
      toast.error(`Erro ao salvar informações: ${err.message || "Tente novamente."}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Documents list per role
  const requiredDocs = isFree
    ? [
        { id: "cartao_cnpj", title: "Comprovante de CNPJ Ativo", desc: "Cartão CNPJ atualizado da Receita Federal" },
        { id: "doc_constitutivo", title: "Documento Constitutivo ou CCMEI", desc: "Certificado MEI ou Contrato Social" },
        { id: "consulta_projudi", title: "Consulta ProJudi", desc: "Certidão/Comprovante de distribuição judicial" },
        { id: "rg_cnh", title: "RG ou CNH do Responsável", desc: "Documento oficial de identificação com foto" },
        { id: "certidao_trabalhista", title: "Certidão de Débitos Trabalhistas", desc: "CNDT emitida pela Justiça do Trabalho" },
      ]
    : [
        { id: "cartao_cnpj", title: "Comprovante de CNPJ Ativo", desc: "Cartão CNPJ emitido pela Receita Federal" },
        { id: "doc_constitutivo", title: "Documento Constitutivo", desc: "Contrato Social ou CCMEI registrado" },
        { id: "rg_cnh", title: "RG / CNH do Responsável Legal", desc: "Documento oficial com foto do representante" },
        { id: "procuracao", title: "Procuração (se aplicável)", desc: "Instrumento público/particular de representação" },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Delski Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                DELSKI <span className="text-blue-600">CLOUD</span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {isFree ? "Onboarding de Prestador de Serviços / Freelancer PJ" : "Onboarding & Homologação de Cliente"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-white text-gray-600 border-gray-200">
              Etapa {step} de {totalSteps}
            </Badge>
          </div>
        </div>

        {/* Progress Stepper Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-blue-600 h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-xs font-semibold text-gray-500">
            <span className={step >= 1 ? "text-blue-600 font-bold" : ""}>1. Dados Cadastrais</span>
            <span className={step >= 2 ? "text-blue-600 font-bold" : ""}>2. Documentação</span>
            {isFree && <span className={step >= 3 ? "text-blue-600 font-bold" : ""}>3. Dados Financeiros</span>}
            <span className={step === totalSteps ? "text-blue-600 font-bold" : ""}>
              {totalSteps}. Revisão & Ativação
            </span>
          </div>
        </div>

        {/* Dynamic Multi-step Form Content */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-10">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── ETAPA 1: DADOS CADASTRAIS ─────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" /> Dados Cadastrais da Empresa / Prestador
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Informe os dados corporativos para emissão de contratos e formalização fiscal.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="company-name" className="text-xs font-semibold text-gray-700">
                      Nome Fantasia <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Studio Lumina Mídia"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="corporate-name" className="text-xs font-semibold text-gray-700">
                      Razão Social
                    </Label>
                    <Input
                      id="corporate-name"
                      value={corporateName}
                      onChange={(e) => setCorporateName(e.target.value)}
                      placeholder="Ex: Lumina Midia e Servicos de Tecnologia LTDA"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cnpj" className="text-xs font-semibold text-gray-700">
                      CNPJ
                    </Label>
                    <Input
                      id="cnpj"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className="h-10 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="segment" className="text-xs font-semibold text-gray-700">
                      Segmento de Atuação
                    </Label>
                    <Input
                      id="segment"
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      placeholder="Ex: Tráfego Pago, Design, Dev, IA"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="corp-email" className="text-xs font-semibold text-gray-700">
                      E-mail Corporativo <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="corp-email"
                        type="email"
                        value={corporateEmail}
                        onChange={(e) => setCorporateEmail(e.target.value)}
                        placeholder="contato@empresa.com"
                        className="h-10 pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cep" className="text-xs font-semibold text-gray-700">
                      CEP
                    </Label>
                    <div className="relative">
                      <Input
                        id="cep"
                        value={cep}
                        onChange={(e) => setCep(formatCEP(e.target.value))}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        maxLength={9}
                        className="h-10 font-mono text-sm pr-9"
                      />
                      {fetchingCep && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-600" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address" className="text-xs font-semibold text-gray-700">
                      Endereço Completo
                    </Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua, Número, Bairro, Complemento"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold text-gray-700">
                      Cidade / UF
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="h-10 flex-1"
                      />
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        placeholder="UF"
                        maxLength={2}
                        className="h-10 w-16 text-center font-mono text-sm uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs font-semibold text-gray-700">
                      Responsável Legal <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="contact-name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Nome do representante legal"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="role-pos" className="text-xs font-semibold text-gray-700">
                      Cargo / Função
                    </Label>
                    <Input
                      id="role-pos"
                      value={rolePosition}
                      onChange={(e) => setRolePosition(e.target.value)}
                      placeholder="Ex: Sócio-Administrador / Especialista"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">
                      WhatsApp
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="h-10 pl-9 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="instagram" className="text-xs font-semibold text-gray-700">
                      Instagram (Opcional)
                    </Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@perfil"
                        className="h-10 pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="linkedin" className="text-xs font-semibold text-gray-700">
                      LinkedIn (Opcional)
                    </Label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="linkedin"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="linkedin.com/in/..."
                        className="h-10 pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="website" className="text-xs font-semibold text-gray-700">
                      Site Institucional (Opcional)
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://empresa.com"
                        className="h-10 pl-9"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ETAPA 2: DOCUMENTAÇÃO ─────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-blue-600" /> Documentação Obrigatória
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Anexe os arquivos para validação cadastral e conformidade jurídica (PDF, PNG ou JPG até 10MB).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredDocs.map((doc) => {
                    const uploaded = documents[doc.id];
                    const isUploading = uploadingDoc === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          uploaded
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-white border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="space-y-1">
                            <h3 className="font-bold text-sm text-gray-900">{doc.title}</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">{doc.desc}</p>
                          </div>
                          {uploaded && (
                            <Badge className="bg-emerald-500 text-white text-[10px] font-semibold py-0 px-2">
                              Anexado
                            </Badge>
                          )}
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                          {uploaded ? (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 truncate max-w-[200px]">
                                <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                <span className="truncate">{uploaded.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDoc(doc.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Remover
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors w-full justify-center">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(doc.id, file);
                                }}
                                disabled={isUploading}
                              />
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-4 w-4" /> Selecionar Arquivo
                                </>
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

            {/* ── ETAPA 3 (FREELANCER): DADOS FINANCEIROS & PIX ────────────── */}
            {step === 3 && isFree && (
              <motion.div
                key="step3-free"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-600" /> Dados Financeiros para Pagamentos
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Informe os dados da conta bancária da sua PJ e a chave PIX para liquidação de honorários.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="bank-name" className="text-xs font-semibold text-gray-700">
                      Instituição Bancária (Banco) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bank-name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Banco Inter, Bradesco"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pix-type" className="text-xs font-semibold text-gray-700">
                      Tipo de Chave PIX <span className="text-red-500">*</span>
                    </Label>
                    <Select value={pixType} onValueChange={setPixType}>
                      <SelectTrigger id="pix-type" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                        <SelectItem value="E-mail">E-mail</SelectItem>
                        <SelectItem value="Telefone">Telefone</SelectItem>
                        <SelectItem value="Chave Aleatória">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pix-key" className="text-xs font-semibold text-gray-700">
                      Chave PIX <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pix-key"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Informe sua chave Pix cadastrada"
                      className="h-10 font-mono text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bank-agency" className="text-xs font-semibold text-gray-700">
                        Agência
                      </Label>
                      <Input
                        id="bank-agency"
                        value={bankAgency}
                        onChange={(e) => setBankAgency(e.target.value)}
                        placeholder="0001"
                        className="h-10 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bank-account" className="text-xs font-semibold text-gray-700">
                        Conta Corrente
                      </Label>
                      <Input
                        id="bank-account"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="123456-7"
                        className="h-10 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 leading-relaxed">
                    <strong>Atenção:</strong> Os pagamentos serão processados exclusivamente para a titularidade da pessoa jurídica cadastrada (mesmo CNPJ).
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ETAPA FINAL: REVISÃO & ATIVAÇÃO ──────────────────────────── */}
            {step === totalSteps && (
              <motion.div
                key="step-final"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Revisão & Confirmação de Cadastro
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Confira o resumo das informações antes de concluir a homologação no DELSKI CLOUD.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Resumo Cadastral */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Dados da Empresa</span>
                      <Button variant="link" size="sm" onClick={() => setStep(1)} className="text-xs h-auto p-0 text-blue-600">
                        Editar
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">Nome Fantasia:</span>
                        <p className="font-semibold text-gray-800">{companyName || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Razão Social:</span>
                        <p className="font-semibold text-gray-800">{corporateName || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">CNPJ:</span>
                        <p className="font-semibold text-gray-800 font-mono">{cnpj || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">E-mail Corporativo:</span>
                        <p className="font-semibold text-gray-800">{corporateEmail || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Responsável Legal:</span>
                        <p className="font-semibold text-gray-800">{contactName || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">WhatsApp:</span>
                        <p className="font-semibold text-gray-800">{phone || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Bancário (Freelancer) */}
                  {isFree && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Dados Bancários / PIX</span>
                        <Button variant="link" size="sm" onClick={() => setStep(3)} className="text-xs h-auto p-0 text-blue-600">
                          Editar
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400">Banco:</span>
                          <p className="font-semibold text-gray-800">{bankName || "—"}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Tipo de PIX:</span>
                          <p className="font-semibold text-gray-800">{pixType || "—"}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Chave PIX:</span>
                          <p className="font-semibold text-gray-800 font-mono">{pixKey || "—"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resumo Documental */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Documentos Anexados ({Object.keys(documents).length})
                      </span>
                      <Button variant="link" size="sm" onClick={() => setStep(2)} className="text-xs h-auto p-0 text-blue-600">
                        Gerenciar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(documents).length === 0 ? (
                        <p className="text-xs text-amber-600 font-medium">Nenhum documento anexado ainda.</p>
                      ) : (
                        Object.entries(documents).map(([type, doc]) => (
                          <Badge key={type} className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs py-1 px-3 flex items-center gap-1.5">
                            <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{doc.name}</span>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={submitting}
                className="h-10 px-5 text-xs font-semibold rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                className="h-10 px-6 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinalize}
                disabled={submitting}
                className="h-10 px-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Concluindo Homologação...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Finalizar e Acessar Painel
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Animado de Conclusão ('Tudo pronto!') */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 max-w-md w-full text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Homologação Concluída
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tudo pronto!</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Seus dados cadastrais foram registrados com sucesso no Delski Cloud. Estamos redirecionando para o seu painel...
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => {
                    if (isFree) {
                      navigate({ to: "/freelancer" as any, replace: true });
                    } else {
                      navigate({ to: "/cliente" as any, replace: true });
                    }
                  }}
                  className="w-full h-11 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] text-white font-semibold rounded-xl shadow-md gap-2 cursor-pointer"
                >
                  Acessar Meu Portal Agora <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
