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
  Briefcase,
  ShieldCheck,
  CreditCard,
  User,
  Phone,
  Mail,
  Globe,
  Instagram,
  Linkedin,
  Sparkles,
  Check,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      { title: "Boas-vindas & Onboarding HUD — DELSKI CLOUD" },
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
    x: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 30 : -30,
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
  } = useAuth();

  const isFree = isFreelancer || profile?.role === "freelancer";
  const totalSteps = isFree ? 4 : 2;

  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchingCep, setFetchingCep] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Form State - Dados Cadastrais
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

  // Form State - Documentação
  const [documents, setDocuments] = useState<Record<string, UploadedDoc>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Form State - Dados Bancários (Freelancer)
  const [bankName, setBankName] = useState<string>("");
  const [bankAgency, setBankAgency] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [pixType, setPixType] = useState<string>("CNPJ");
  const [pixKey, setPixKey] = useState<string>("");

  // ── Single-access redirection check on mount ────────────────────────────
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

  // Load client/freelancer data pre-filled
  useEffect(() => {
    async function loadClientData() {
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

        let cData = null;
        if (activeUserId || normalizedEmail) {
          let query = (supabase.from("clients") as any).select("*");
          if (activeUserId && normalizedEmail) {
            query = query.or(`auth_user_id.eq.${activeUserId},email.ilike.${normalizedEmail}`);
          } else if (activeUserId) {
            query = query.eq("auth_user_id", activeUserId);
          } else if (normalizedEmail) {
            query = query.ilike("email", normalizedEmail);
          }
          const { data } = await query.limit(1).maybeSingle();
          if (data) cData = data;
        }

        if (cData) {
          if (cData.company_name) setCompanyName(cData.company_name);
          if (cData.corporate_name) setCorporateName(cData.corporate_name);
          if (cData.cnpj) setCnpj(cData.cnpj);
          if (cData.segment) setSegment(cData.segment);
          if (cData.email) setCorporateEmail(cData.email);
          if (cData.address) setAddress(cData.address);
          if (cData.city) setCity(cData.city);
          if (cData.state) setState(cData.state);
          if (cData.cep) setCep(cData.cep);
          if (cData.full_name || cData.contact_name) setContactName(cData.full_name || cData.contact_name);
          if (cData.role_position) setRolePosition(cData.role_position);
          if (cData.phone) setPhone(cData.phone);
        } else {
          if (normalizedEmail && !corporateEmail) setCorporateEmail(normalizedEmail);
          if (profile?.full_name && !contactName) setContactName(profile.full_name);
          if (profile?.phone && !phone) setPhone(formatPhone(profile.phone));
        }

        // Preload documents
        const targetClientId = cData?.id || activeUserId;
        if (isFree && activeUserId) {
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
        } else if (targetClientId) {
          const { data: cDocs } = await (supabase.from("client_documents") as any)
            .select("*")
            .eq("client_id", targetClientId);
          if (cDocs && cDocs.length > 0) {
            const initialDocs: Record<string, UploadedDoc> = {};
            cDocs.forEach((d: any) => {
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
      } catch (err) {
        console.warn("Aviso ao carregar dados do onboarding:", err);
      }
    }

    loadClientData();
  }, [user, profile, isFree]);

  // Load draft from sessionStorage
  useEffect(() => {
    try {
      const storageKey = user?.id ? `delski_onboarding_draft_${user.id}` : `delski_onboarding_draft_guest`;
      const savedDraft = sessionStorage.getItem(storageKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.step && draft.step > 1 && draft.step <= totalSteps) setStep(draft.step);
        if (draft.companyName && !companyName) setCompanyName(draft.companyName);
        if (draft.corporateName && !corporateName) setCorporateName(draft.corporateName);
        if (draft.cnpj && !cnpj) setCnpj(draft.cnpj);
        if (draft.segment && !segment) setSegment(draft.segment);
        if (draft.corporateEmail && !corporateEmail) setCorporateEmail(draft.corporateEmail);
        if (draft.address && !address) setAddress(draft.address);
        if (draft.city && !city) setCity(draft.city);
        if (draft.state && !state) setState(draft.state);
        if (draft.cep && !cep) setCep(draft.cep);
        if (draft.contactName && !contactName) setContactName(draft.contactName);
        if (draft.rolePosition && !rolePosition) setRolePosition(draft.rolePosition);
        if (draft.phone && !phone) setPhone(draft.phone);
        if (draft.instagram && !instagram) setInstagram(draft.instagram);
        if (draft.linkedin && !linkedin) setLinkedin(draft.linkedin);
        if (draft.website && !website) setWebsite(draft.website);
        if (draft.documents && typeof draft.documents === "object") setDocuments((d) => ({ ...draft.documents, ...d }));
        if (draft.bankName && !bankName) setBankName(draft.bankName);
        if (draft.bankAgency && !bankAgency) setBankAgency(draft.bankAgency);
        if (draft.bankAccount && !bankAccount) setBankAccount(draft.bankAccount);
        if (draft.pixType && !pixType) setPixType(draft.pixType);
        if (draft.pixKey && !pixKey) setPixKey(draft.pixKey);
      }
    } catch (e) {}
  }, [user?.id, totalSteps]);

  // Auto-save draft
  useEffect(() => {
    if (onboardingCompleted) return;
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
      const storageKey = user?.id ? `delski_onboarding_draft_${user.id}` : `delski_onboarding_draft_guest`;
      sessionStorage.setItem(storageKey, JSON.stringify(draftData));
    } catch (e) {}
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

  // Auto fetch address via CEP
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

  // Upload document handler
  const handleFileUpload = async (docType: string, file: File) => {
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

    const effectiveFolderId = currentUserId || "pending_user";
    setUploadingDoc(docType);

    try {
      const fileExt = file.name.split(".").pop() || "pdf";
      const safeName = `${docType}_${Date.now()}.${fileExt}`;
      const bucketName = isFree ? "freelancer-docs" : "client-documents";
      const folderPrefix = isFree ? "freelancers" : "clients";
      const filePath = `${folderPrefix}/${effectiveFolderId}/${safeName}`;

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

      try {
        if (isFree && currentUserId) {
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
        } else {
          let clId = currentUserId;
          if (currentUserEmail) {
            const { data: clRecord } = await (supabase.from("clients") as any)
              .select("id")
              .or(`auth_user_id.eq.${currentUserId || "00000000-0000-0000-0000-000000000000"},email.ilike.${currentUserEmail}`)
              .limit(1)
              .maybeSingle();
            if (clRecord?.id) clId = clRecord.id;
          }

          if (clId) {
            await (supabase.from("client_documents") as any).insert([
              {
                client_id: clId,
                document_type: docType,
                file_path: filePath,
                file_url: fileUrl || null,
                status: "em_analise",
                uploaded_at: new Date().toISOString(),
              },
            ]);
          }
        }
      } catch (dbErr) {
        console.warn("Aviso ao persistir documento:", dbErr);
      }

      const newDoc: UploadedDoc = {
        type: docType,
        name: file.name,
        size: file.size,
        filePath,
        fileUrl,
      };

      setDocuments((prev) => {
        const updated = { ...prev, [docType]: newDoc };
        try {
          const storageKey = currentUserId ? `delski_onboarding_draft_${currentUserId}` : `delski_onboarding_draft_guest`;
          const savedDraft = sessionStorage.getItem(storageKey);
          const parsed = savedDraft ? JSON.parse(savedDraft) : {};
          parsed.documents = updated;
          sessionStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch {}
        return updated;
      });

      toast.success(`Documento "${file.name}" anexado com sucesso!`);
    } catch (err: any) {
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

  const requiredDocs = isFree
    ? [
        { id: "cartao_cnpj", title: "Comprovante de CNPJ Ativo", desc: "Cartão CNPJ atualizado da Receita Federal", required: true },
        { id: "doc_constitutivo", title: "Documento Constitutivo ou CCMEI", desc: "Certificado MEI ou Contrato Social", required: true },
        { id: "rg_cnh", title: "RG ou CNH do Responsável", desc: "Documento oficial de identificação com foto", required: true },
        { id: "certidao_trabalhista", title: "Certidão de Débitos Trabalhistas", desc: "CNDT emitida pela Justiça do Trabalho", required: true },
        { id: "consulta_projudi", title: "Consulta ProJudi", desc: "Certidão/Comprovante de distribuição judicial", required: false },
      ]
    : [
        { id: "cartao_cnpj", title: "Comprovante de CNPJ Ativo", desc: "Cartão CNPJ emitido pela Receita Federal", required: true },
        { id: "doc_constitutivo", title: "Documento Constitutivo", desc: "Contrato Social ou CCMEI registrado", required: true },
        { id: "rg_cnh", title: "RG / CNH do Responsável Legal", desc: "Documento oficial com foto do representante", required: true },
        { id: "procuracao", title: "Procuração (se aplicável)", desc: "Instrumento público/particular de representação", required: false },
      ];

  const pendingRequiredDocs = requiredDocs.filter((d) => d.required && !documents[d.id]);
  const isDocComplete = pendingRequiredDocs.length === 0;

  const nextStep = () => {
    if (isFree) {
      if (step === 1) {
        if (!companyName.trim() || !corporateEmail.trim() || !contactName.trim()) {
          return toast.error("Preencha todos os campos destacados (Nome, E-mail, Responsável).");
        }
      }
      if (step === 2) {
        if (!isDocComplete) {
          return toast.error(
            `Documentos pendentes: ${pendingRequiredDocs.map((d) => d.title).join(", ")}.`
          );
        }
      }
      if (step === 3) {
        if (!bankName.trim() || !pixKey.trim()) {
          return toast.error("Informe o Banco e a Chave PIX para recebimento.");
        }
      }
    } else {
      if (step === 1) {
        if (!isDocComplete) {
          return toast.error(
            `Documentos pendentes: ${pendingRequiredDocs.map((d) => d.title).join(", ")}.`
          );
        }
      }
    }

    setDirection(1);
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  // Final Submit with 2.5s wave animation
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
      const cleanPhone = phone ? phone.replace(/\D/g, "") : null;
      const cleanCnpj = cnpj ? cnpj.replace(/\D/g, "") : null;
      const cleanCep = cep ? cep.replace(/\D/g, "") : null;

      if (isFree) {
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
          try {
            await supabase.from("profiles").upsert({
              id: effectiveUserId,
              full_name: contactName.trim() || profile?.full_name || "Prestador",
              email: currentUserEmail,
              phone: cleanPhone || profile?.phone,
              role: "freelancer",
              onboarding_completed: true,
              status: "ativo",
              approval_status: "approved",
              updated_at: new Date().toISOString(),
            });
          } catch (pErr) {}
        }

        try {
          await supabase.auth.updateUser({
            data: {
              role: "freelancer",
              onboarding_completed: true,
              full_name: contactName.trim() || profile?.full_name || "Prestador",
            },
          });
        } catch {}

        try {
          if (effectiveUserId) {
            sessionStorage.removeItem(`delski_onboarding_draft_${effectiveUserId}`);
            localStorage.setItem(`delski_onboarding_completed_${effectiveUserId}`, "true");
          }
        } catch (e) {}

        await refreshProfile();
        setIsSuccessModalOpen(true);
        toast.success("Cadastro do Freelancer concluído com sucesso!");
        setTimeout(() => {
          window.location.href = "/freelancer";
        }, 2500);
      } else {
        // FLUXO CLIENTE
        const clientPayload: any = {
          auth_user_id: currentUserId || null,
          full_name: contactName.trim() || profile?.full_name || companyName.trim() || "Cliente",
          company_name: companyName.trim() || "Empresa Cliente",
          corporate_name: corporateName.trim() || companyName.trim() || "Empresa Cliente",
          cnpj: cleanCnpj || null,
          segment: segment.trim() || null,
          email: currentUserEmail,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          cep: cleanCep || null,
          contact_name: contactName.trim() || null,
          role_position: rolePosition.trim() || null,
          phone: cleanPhone || null,
          instagram: instagram.trim() || null,
          linkedin: linkedin.trim() || null,
          website: website.trim() || null,
          status: "ativo",
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        };

        let activeClientId = null;
        if (currentUserId) {
          const { data: existingClient } = await (supabase.from("clients") as any)
            .select("id")
            .or(`auth_user_id.eq.${currentUserId},email.ilike.${currentUserEmail}`)
            .limit(1)
            .maybeSingle();

          if (existingClient?.id) {
            activeClientId = existingClient.id;
            await (supabase.from("clients") as any)
              .update(clientPayload)
              .eq("id", existingClient.id);
          } else {
            const { data: newCl } = await (supabase.from("clients") as any)
              .insert([clientPayload])
              .select("id")
              .single();
            if (newCl?.id) activeClientId = newCl.id;
          }
        }

        if (currentUserId) {
          try {
            await supabase.from("profiles").upsert({
              id: currentUserId,
              full_name: contactName.trim() || companyName.trim() || profile?.full_name || "Cliente",
              email: currentUserEmail,
              phone: cleanPhone || profile?.phone,
              role: "cliente",
              onboarding_completed: true,
              status: "ativo",
              approval_status: "approved",
              updated_at: new Date().toISOString(),
            });
          } catch (pErr) {}
        }

        try {
          await supabase.auth.updateUser({
            data: {
              role: "cliente",
              onboarding_completed: true,
              company_name: companyName.trim() || "Empresa",
              full_name: contactName.trim() || profile?.full_name || "Cliente",
            },
          });
        } catch {}

        try {
          if (currentUserId) {
            sessionStorage.removeItem(`delski_onboarding_draft_${currentUserId}`);
            localStorage.setItem(`delski_onboarding_completed_${currentUserId}`, "true");
          }
        } catch (e) {}

        await refreshProfile();
        setIsSuccessModalOpen(true);
        toast.success("Homologação do cliente concluída!");
        setTimeout(() => {
          window.location.href = "/cliente";
        }, 2500);
      }
    } catch (err: any) {
      toast.error(`Erro ao finalizar: ${err.message || "Tente novamente."}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Document Card Renderer with Clean "Carregando..." state ──────────────
  const renderDocumentUploadCard = () => (
    <div className="space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center justify-center sm:justify-start gap-2">
          <FileCheck className="h-5 w-5 text-blue-600" /> Documentação da Empresa
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          Anexe os arquivos para validação cadastral e conformidade jurídica (PDF ou imagens até 10MB).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requiredDocs.map((doc) => {
          const uploaded = documents[doc.id];
          const isUploading = uploadingDoc === doc.id;

          return (
            <div
              key={doc.id}
              className={`p-5 rounded-[24px] border transition-all ${
                uploaded
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-xs"
                  : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-blue-400/60 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-hud">
                    {doc.title} {doc.required && <span className="text-blue-600 font-black ml-0.5">•</span>}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{doc.desc}</p>
                </div>
                {uploaded && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold py-0.5 px-2.5 rounded-full shrink-0 flex items-center gap-1 font-hud">
                    <Check className="h-3 w-3" /> Anexado
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                {uploaded ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2.5 w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-2xl p-3">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-900 dark:text-white min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-xs max-w-[140px] sm:max-w-[180px] font-hud" title={uploaded.name}>
                            {uploaded.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">Arquivo pronto para validação</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {uploaded.fileUrl && (
                          <a
                            href={uploaded.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 transition-colors"
                            title="Visualizar documento"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                          </a>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0 rounded-xl"
                          title="Remover anexo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-700 hover:border-blue-500 bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-blue-50/30 transition-all">
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
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-600 font-hud">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Carregando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400 font-hud">
                        <UploadCloud className="h-4 w-4 text-blue-600" />
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
    </div>
  );

  return (
    <div className="min-h-screen bg-[#ECECEE] dark:bg-[#090A0F] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 font-hud antialiased selection:bg-blue-600 selection:text-white transition-colors">
      {/* ── Background Ambient Light (Cobalt Glow) ────────────────────── */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[80px] pointer-events-none hud-glow-pulse" />

      {/* Top Brand Pill */}
      <div className="mb-6 flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
          <Zap className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
          DELSKI <span className="text-blue-600 dark:text-blue-400">HUD ONBOARDING</span>
        </span>
      </div>

      {/* ── Central Floating HUD Card ─────────────────────────────────── */}
      <div className="w-full max-w-2xl hud-card p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative z-10 space-y-8">
        {/* Stepper Header (Smooth 2.5s Radial/Linear Progress) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white font-hud shadow-md shadow-blue-500/20">
                Etapa {step} de {totalSteps}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {isFree
                  ? step === 1 ? "Dados Pessoais" : step === 2 ? "Documentos" : step === 3 ? "Dados Bancários" : "Revisão"
                  : step === 1 ? "Documentação Corporativa" : "Dados da Empresa"}
              </span>
            </div>

            <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-hud">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>

          {/* Progress Bar with 2.5s smooth transition */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        {/* ── Step Panels ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait" custom={direction}>
          {/* CLIENTE: ETAPA 1 = DOCUMENTAÇÃO */}
          {!isFree && step === 1 && (
            <motion.div
              key="client-step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              {renderDocumentUploadCard()}
            </motion.div>
          )}

          {/* CLIENTE: ETAPA 2 = DADOS CADASTRAIS */}
          {!isFree && step === 2 && (
            <motion.div
              key="client-step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center justify-center sm:justify-start gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" /> Dados Cadastrais & Contato
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Confirme as informações cadastrais da empresa e do representante legal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Nome Fantasia da Empresa <span className="text-blue-600">•</span>
                  </Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Minha Empresa Corp"
                    className="h-10 text-xs rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Razão Social</Label>
                  <Input
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    placeholder="Ex: Minha Empresa Serviços Ltda"
                    className="h-10 text-xs rounded-2xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">CNPJ</Label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    className="h-10 text-xs rounded-2xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Segmento</Label>
                  <Input
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Tecnologia, Varejo"
                    className="h-10 text-xs rounded-2xl"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    E-mail Corporativo <span className="text-blue-600">•</span>
                  </Label>
                  <Input
                    type="email"
                    value={corporateEmail}
                    onChange={(e) => setCorporateEmail(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Representante Legal <span className="text-blue-600">•</span>
                  </Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">WhatsApp</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className="h-10 text-xs rounded-2xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">CEP</Label>
                  <Input
                    value={cep}
                    onChange={(e) => {
                      const v = formatCEP(e.target.value);
                      setCep(v);
                      if (v.length === 9) handleCepBlur();
                    }}
                    maxLength={9}
                    placeholder="00000-000"
                    className="h-10 text-xs rounded-2xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Endereço</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* FREELANCER: ETAPA 1 = DADOS PESSOAIS */}
          {isFree && step === 1 && (
            <motion.div
              key="free-step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center justify-center sm:justify-start gap-2">
                  <User className="h-5 w-5 text-blue-600" /> Identificação do Especialista
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Preencha seus dados para homologação e emissão de contratos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Nome Completo <span className="text-blue-600">•</span>
                  </Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Razão Social / MEI</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">CNPJ</Label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    className="h-10 text-xs rounded-2xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    E-mail <span className="text-blue-600">•</span>
                  </Label>
                  <Input
                    type="email"
                    value={corporateEmail}
                    onChange={(e) => setCorporateEmail(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">WhatsApp</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className="h-10 text-xs rounded-2xl font-mono"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* FREELANCER: ETAPA 2 = DOCUMENTOS */}
          {isFree && step === 2 && (
            <motion.div
              key="free-step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              {renderDocumentUploadCard()}
            </motion.div>
          )}

          {/* FREELANCER: ETAPA 3 = DADOS BANCÁRIOS */}
          {isFree && step === 3 && (
            <motion.div
              key="free-step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center justify-center sm:justify-start gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" /> Dados Bancários & Recebimento
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Informe seus dados e chave PIX para repasse de pagamentos das entregas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Instituição Bancária <span className="text-blue-600">•</span>
                  </Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú, Banco do Brasil"
                    className="h-10 text-xs rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Agência / Conta</Label>
                  <Input
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Ex: Ag 0001 / Conta 12345-6"
                    className="h-10 text-xs rounded-2xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Tipo de Chave PIX</Label>
                  <Select value={pixType} onValueChange={setPixType}>
                    <SelectTrigger className="h-10 text-xs rounded-2xl font-hud">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="E-mail">E-mail</SelectItem>
                      <SelectItem value="Telefone">Telefone</SelectItem>
                      <SelectItem value="Aleatória">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Chave PIX <span className="text-blue-600">•</span>
                  </Label>
                  <Input
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Digite sua chave PIX"
                    className="h-10 text-xs rounded-2xl"
                    required
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* FREELANCER: ETAPA 4 = REVISÃO */}
          {isFree && step === 4 && (
            <motion.div
              key="free-step4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-hud">
                  Tudo pronto para homologação!
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto font-medium">
                  Seus dados e documentações foram estruturados com sucesso. Clique abaixo para ativar seu acesso imediato à plataforma.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation Buttons ────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-2 cursor-pointer font-hud"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer font-hud transition-all"
            >
              <span>Avançar</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={submitting}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-blue-500/30 flex items-center gap-2 cursor-pointer font-hud transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Homologando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Concluir & Acessar Portal</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
