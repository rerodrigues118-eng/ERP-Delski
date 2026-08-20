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
  RefreshCw,
  Pencil,
  Check,
  ExternalLink,
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
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
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

  // Form State - Dados Bancários & PIX (Freelancer)
  const [bankName, setBankName] = useState<string>("");
  const [bankAgency, setBankAgency] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [pixType, setPixType] = useState<string>("CNPJ");
  const [pixKey, setPixKey] = useState<string>("");

  // Fetch client registration pre-filled by gestor and existing uploaded documents
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

        // Check URL search parameters if any (?email=... or ?client_id=... or ?id=...)
        const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
        const queryEmail = searchParams.get("email") || searchParams.get("mail") || "";
        const queryClientId = searchParams.get("client_id") || searchParams.get("id") || "";

        const normalizedEmail = (activeUserEmail || queryEmail || corporateEmail || "").toLowerCase().trim();

        let cData = null;
        if (queryClientId) {
          const { data } = await (supabase.from("clients") as any)
            .select("*")
            .eq("id", queryClientId)
            .maybeSingle();
          if (data) cData = data;
        }

        if (!cData && (activeUserId || normalizedEmail)) {
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

        // Preload any existing documents from database
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
        console.warn("Aviso ao carregar dados do cliente no onboarding:", err);
      }
    }

    loadClientData();
  }, [user, profile, isFree]);

  // Load draft from sessionStorage on mount
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
    } catch (e) {
      console.warn("Erro ao restaurar rascunho de onboarding:", e);
    }
  }, [user?.id, totalSteps]);

  // Auto-save draft to sessionStorage on state change
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

  // Auto fetch address by CEP via ViaCEP (for Freelancers)
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

  // Upload document handler (Storage Bucket + DB Records)
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

      // 1. Upload to Supabase Storage Bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn(`Aviso de upload no bucket principal "${bucketName}":`, uploadError);
        // Fallback to secondary bucket
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

      // 2. Direct persistence into Supabase Database Table
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
              .or(`auth_user_id.eq.${currentUserId || '00000000-0000-0000-0000-000000000000'},email.ilike.${currentUserEmail}`)
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
        console.warn("Aviso ao persistir documento no banco:", dbErr);
      }

      // 3. Update React state immediately
      const newDoc: UploadedDoc = {
        type: docType,
        name: file.name,
        size: file.size,
        filePath,
        fileUrl,
      };

      setDocuments((prev) => {
        const updated = {
          ...prev,
          [docType]: newDoc,
        };
        try {
          const storageKey = currentUserId ? `delski_onboarding_draft_${currentUserId}` : `delski_onboarding_draft_guest`;
          const savedDraft = sessionStorage.getItem(storageKey);
          const parsed = savedDraft ? JSON.parse(savedDraft) : {};
          parsed.documents = updated;
          sessionStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch {}
        return updated;
      });

      toast.success(`Documento "${file.name}" anexado e salvo no banco de dados com sucesso!`);
    } catch (err: any) {
      console.error("Erro no upload do documento:", err);
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

  // Documents list per role
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
            `Documentos pendentes: ${pendingRequiredDocs.map((d) => d.title).join(", ")}. Por favor, anexe os arquivos para avançar.`
          );
        }
      }
      if (step === 3) {
        if (!bankName.trim() || !pixKey.trim()) {
          return toast.error("Informe o Banco e a Chave PIX para recebimento de pagamentos.");
        }
      }
    } else {
      // Cliente: Etapa 1 é Documentação
      if (step === 1) {
        if (!isDocComplete) {
          return toast.error(
            `Documentos pendentes: ${pendingRequiredDocs.map((d) => d.title).join(", ")}. Por favor, anexe os arquivos para avançar.`
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

  // Final Submit
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

    // Try finding existing client by email or auth_user_id
    let resolvedClientId = currentUserId || null;
    if (currentUserEmail || currentUserId) {
      try {
        const { data: existingClient } = await (supabase.from("clients") as any)
          .select("id, auth_user_id, email, company_name")
          .or(`auth_user_id.eq.${currentUserId || '00000000-0000-0000-0000-000000000000'},email.ilike.${currentUserEmail || 'null@null.com'}`)
          .limit(1)
          .maybeSingle();

        if (existingClient?.id) {
          resolvedClientId = existingClient.id;
          if (!currentUserId && existingClient.auth_user_id) {
            currentUserId = existingClient.auth_user_id;
          }
        }
      } catch (e) {
        console.warn("Aviso ao buscar cliente existente:", e);
      }
    }

    const effectiveUserId = currentUserId || resolvedClientId;

    setSubmitting(true);

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const cleanCnpj = cnpj.replace(/\D/g, "");
      const cleanCep = cep.replace(/\D/g, "");

      if (isFree) {
        // ── FLUXO FREELANCER ──────────────────────────────────────────────
        const freelancerPayload: any = {
          id: effectiveUserId,
          company_name: companyName.trim() || profile?.full_name || "Prestador",
          corporate_name: corporateName.trim() || companyName.trim() || profile?.full_name || "Prestador",
          cnpj: cleanCnpj || null,
          segment: segment.trim() || null,
          email: currentUserEmail,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          cep: cleanCep || null,
          role_position: rolePosition.trim() || null,
          phone: cleanPhone || null,
          instagram: instagram.trim() || null,
          linkedin: linkedin.trim() || null,
          website: website.trim() || null,
          bank_name: bankName.trim() || null,
          bank_agency: bankAgency.trim() || null,
          bank_account: bankAccount.trim() || null,
          pix_type: pixType || null,
          pix_key: pixKey.trim() || null,
          onboarding_completed: true,
          status: "ativo",
          updated_at: new Date().toISOString(),
        };

        if (effectiveUserId) {
          try {
            await (supabase.from("freelancers") as any).upsert(freelancerPayload);
          } catch (fErr) {
            console.warn("Freelancers upsert warn:", fErr);
          }

          try {
            await (supabase.from("profiles") as any).upsert({
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
          } catch (pErr) {
            console.warn("Profiles upsert warn:", pErr);
          }
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

        // Insert documents
        const docEntries = Object.entries(documents);
        if (docEntries.length > 0 && effectiveUserId) {
          for (const [docType, docData] of docEntries) {
            try {
              await (supabase.from("freelancer_documents") as any).upsert(
                {
                  freelancer_id: effectiveUserId,
                  document_type: docType,
                  file_path: docData.filePath,
                  file_url: docData.fileUrl || null,
                  status: "em_analise",
                  uploaded_at: new Date().toISOString(),
                },
                { onConflict: "freelancer_id,document_type" }
              );
            } catch (dErr) {
              console.warn("Error inserting freelancer document:", dErr);
            }
          }
        }

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
        }, 1200);
      } else {
        // ── FLUXO CLIENTE ─────────────────────────────────────────────────
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
          contact_name: contactName.trim() || profile?.full_name || null,
          role_position: rolePosition.trim() || null,
          phone: cleanPhone || null,
          onboarding_completed: true,
          status: "ativo",
          updated_at: new Date().toISOString(),
        };

        try {
          if (resolvedClientId) {
            await (supabase.from("clients") as any)
              .update(clientPayload)
              .eq("id", resolvedClientId);
          } else {
            const { data: inserted } = await (supabase.from("clients") as any)
              .upsert(clientPayload, { onConflict: "email" })
              .select("id")
              .maybeSingle();
            resolvedClientId = inserted?.id || currentUserId;
          }
        } catch (cErr) {
          console.warn("Aviso ao salvar na tabela clients:", cErr);
        }

        if (currentUserId) {
          try {
            await (supabase.from("profiles") as any).upsert({
              id: currentUserId,
              full_name: contactName.trim() || profile?.full_name || companyName.trim() || "Cliente",
              email: currentUserEmail,
              phone: cleanPhone || profile?.phone,
              role: "cliente",
              onboarding_completed: true,
              status: "ativo",
              approval_status: "approved",
              updated_at: new Date().toISOString(),
            });
          } catch (pErr) {
            console.warn("Aviso ao atualizar profiles:", pErr);
          }

          try {
            await supabase.auth.updateUser({
              data: {
                role: "cliente",
                onboarding_completed: true,
                full_name: contactName.trim() || profile?.full_name || companyName.trim() || "Cliente",
              },
            });
          } catch (authErr) {
            console.warn("Aviso ao atualizar user_metadata:", authErr);
          }
        }

        // Insert documents
        const docEntries = Object.entries(documents);
        if (docEntries.length > 0) {
          const targetDocClientId = resolvedClientId || currentUserId;
          if (targetDocClientId) {
            for (const [docType, docData] of docEntries) {
              try {
                await (supabase.from("client_documents") as any).insert([
                  {
                    client_id: targetDocClientId,
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
        }

        try {
          if (currentUserId) {
            sessionStorage.removeItem(`delski_onboarding_draft_${currentUserId}`);
            localStorage.setItem(`delski_onboarding_completed_${currentUserId}`, "true");
          }
        } catch (e) {}

        await refreshProfile();
        setIsSuccessModalOpen(true);
        toast.success("Homologação do Cliente concluída com sucesso! Redirecionando para o Portal...");

        setTimeout(() => {
          if (currentUserId) {
            window.location.href = "/cliente";
          } else if (currentUserEmail) {
            window.location.href = `/portal/definir-senha?email=${encodeURIComponent(currentUserEmail)}`;
          } else {
            window.location.href = "/cliente";
          }
        }, 1200);
      }
    } catch (err: any) {
      console.error("Erro ao finalizar onboarding:", err);
      try {
        if (currentUserId) {
          localStorage.setItem(`delski_onboarding_completed_${currentUserId}`, "true");
          window.location.href = isFree ? "/freelancer" : "/cliente";
        } else {
          window.location.href = "/cliente";
        }
      } catch {
        toast.error(`Erro ao salvar informações: ${err.message || "Tente novamente."}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper renderer for document upload card
  const renderDocumentUploadCard = () => (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-blue-600" /> Documentação da Empresa
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
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
                  ? "bg-slate-50/90 border-slate-300 ring-1 ring-blue-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:border-blue-300 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-900">
                      {doc.title} {doc.required && <span className="text-blue-600 font-bold ml-0.5">*</span>}
                    </h3>
                    {!doc.required && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium py-0.5 px-2 rounded-md bg-slate-100 text-slate-600 border-slate-200"
                      >
                        Opcional
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{doc.desc}</p>
                </div>
                {uploaded && (
                  <Badge className="bg-blue-600 text-white text-[10px] font-bold py-0.5 px-2.5 rounded-full shrink-0 flex items-center gap-1 shadow-xs">
                    <Check className="h-3 w-3 text-white" /> Anexado
                  </Badge>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                {uploaded ? (
                  <div className="space-y-2.5">
                    {/* Document details box */}
                    <div className="flex items-center justify-between gap-2.5 w-full bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-900 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 text-xs max-w-[140px] sm:max-w-[190px]" title={uploaded.name}>
                            {uploaded.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <span>{uploaded.size ? `${(uploaded.size / (1024 * 1024)).toFixed(2)} MB` : "Documento Anexado"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {uploaded.fileUrl && (
                          <a
                            href={uploaded.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                            title="Visualizar documento"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Ver</span>
                          </a>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0 rounded-lg cursor-pointer"
                          title="Remover anexo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Change document action */}
                    <div className="flex items-center justify-end">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-xs">
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
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                        ) : (
                          <Pencil className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        <span>{isUploading ? "Carregando..." : "Alterar Documento"}</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors w-full justify-center shadow-xs">
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
                        <Loader2 className="h-4 w-4 animate-spin text-white" /> Carregando...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4 text-white" /> Selecionar Arquivo
                      </>
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
            <Badge variant="outline" className="text-xs bg-white text-gray-700 border-gray-200 shadow-xs font-bold">
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

          {isFree ? (
            <div className="flex justify-between text-xs font-semibold text-gray-500">
              <span className={step >= 1 ? "text-blue-600 font-bold" : ""}>1. Dados Cadastrais</span>
              <span className={step >= 2 ? "text-blue-600 font-bold" : ""}>2. Documentação</span>
              <span className={step >= 3 ? "text-blue-600 font-bold" : ""}>3. Dados Financeiros</span>
              <span className={step === 4 ? "text-blue-600 font-bold" : ""}>4. Revisão & Conclusão</span>
            </div>
          ) : (
            <div className="flex justify-between text-xs font-semibold text-gray-500">
              <span className={step >= 1 ? "text-blue-600 font-bold" : ""}>1. Documentação</span>
              <span className={step === 2 ? "text-blue-600 font-bold" : ""}>2. Revisão & Ativação</span>
            </div>
          )}
        </div>

        {/* Dynamic Multi-step Form Content */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-10">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── CLIENTE: ETAPA 1 = DOCUMENTAÇÃO ──────────────────────────── */}
            {!isFree && step === 1 && (
              <motion.div
                key="client-step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {renderDocumentUploadCard()}
              </motion.div>
            )}

            {/* ── CLIENTE: ETAPA 2 = REVISÃO & ATIVAÇÃO ─────────────────────── */}
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
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Revisão & Ativação de Acesso
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Confira os dados corporativos cadastrados e confirme a conclusão do onboarding para liberar seu painel.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Resumo Cadastral Cadastrado pelo Gestor */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Dados Corporativos da Empresa</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                        Cadastrado pelo Gestor
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 text-[11px]">Nome Fantasia:</span>
                        <p className="font-bold text-gray-900 text-sm mt-0.5">{companyName || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">Razão Social:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{corporateName || companyName || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">CNPJ:</span>
                        <p className="font-semibold text-gray-800 font-mono mt-0.5">{cnpj || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">Segmento de Atuação:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{segment || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">E-mail Corporativo:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{corporateEmail || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px]">Responsável Legal:</span>
                        <p className="font-semibold text-gray-900 mt-0.5">{contactName || "—"}</p>
                      </div>
                      {rolePosition && (
                        <div>
                          <span className="text-gray-400 text-[11px]">Cargo / Função:</span>
                          <p className="font-semibold text-gray-800 mt-0.5">{rolePosition}</p>
                        </div>
                      )}
                      {phone && (
                        <div>
                          <span className="text-gray-400 text-[11px]">WhatsApp / Contato:</span>
                          <p className="font-semibold text-gray-800 mt-0.5">{phone}</p>
                        </div>
                      )}
                      {address && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-400 text-[11px]">Endereço:</span>
                          <p className="font-semibold text-gray-800 mt-0.5">
                            {address} {city && `· ${city}`} {state && `/${state}`} {cep && `(CEP: ${cep})`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo Documental */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Documentos Anexados ({Object.keys(documents).length})
                        </span>
                      </div>
                      <Button variant="link" size="sm" onClick={() => setStep(1)} className="text-xs h-auto p-0 text-blue-600 font-semibold cursor-pointer">
                        Alterar Documentos
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {Object.keys(documents).length === 0 ? (
                        <p className="text-xs text-slate-500 font-medium">Nenhum documento anexado ainda.</p>
                      ) : (
                        Object.entries(documents).map(([type, doc]) => (
                          <Badge key={type} className="bg-slate-100 text-slate-800 border-slate-200 text-xs py-1.5 px-3 flex items-center gap-1.5 font-medium shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            <span className="truncate max-w-[240px]">{doc.name}</span>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── FREELANCER: ETAPA 1 = DADOS CADASTRAIS ─────────────────────── */}
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

            {/* ── FREELANCER: ETAPA 2 = DOCUMENTAÇÃO ────────────────────────── */}
            {isFree && step === 2 && (
              <motion.div
                key="free-step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {renderDocumentUploadCard()}
              </motion.div>
            )}

            {/* ── FREELANCER: ETAPA 3 = DADOS FINANCEIROS & PIX ─────────────── */}
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

            {/* ── FREELANCER: ETAPA 4 = REVISÃO & CONCLUSÃO ──────────────────── */}
            {isFree && step === 4 && (
              <motion.div
                key="free-step4"
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

          {/* Alerta de Documentos Pendentes */}
          {((!isFree && step === 1) || (isFree && step === 2)) && !isDocComplete && (
            <div className="p-4 mt-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-700 font-medium">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Documentos necessários pendentes:</p>
                <p className="text-slate-600 mt-0.5">
                  Anexe os seguintes arquivos para habilitar o avanço:{" "}
                  <span className="font-semibold text-slate-900">{pendingRequiredDocs.map((d) => d.title).join(", ")}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Alerta de Documentos Todos Anexados (Sucesso) */}
          {((!isFree && step === 1) || (isFree && step === 2)) && isDocComplete && (
            <div className="p-4 mt-6 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-start gap-3 text-xs text-blue-900 font-medium shadow-2xs animate-in fade-in duration-300">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Todos os documentos foram anexados com sucesso!</p>
                <p className="text-slate-600 mt-0.5">
                  Seus arquivos foram salvos e vinculados no banco de dados. Clique em <strong>"Continuar"</strong> abaixo para avançar.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={submitting}
                className="h-10 px-5 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                disabled={(!isFree && step === 1 && !isDocComplete) || (isFree && step === 2 && !isDocComplete)}
                className={`h-10 px-6 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  ((!isFree && step === 1 && !isDocComplete) || (isFree && step === 2 && !isDocComplete))
                    ? "bg-slate-200 text-slate-400 hover:bg-slate-200 cursor-not-allowed shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinalize}
                disabled={submitting}
                className="h-11 px-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all"
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
                      window.location.href = "/freelancer";
                    } else {
                      window.location.href = "/cliente";
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
