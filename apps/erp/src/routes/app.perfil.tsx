import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings, useUpsertCompanySettings } from "@/hooks/useCompanySettings";
import { DEFAULT_COMPANY_SETTINGS } from "@/hooks/useContractFieldResolver";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  UserCheck,
  Building2,
  Settings,
  Save,
  Loader2,
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Upload,
  Trash2,
  Camera,
} from "lucide-react";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil do Gestor & Configurações — Delski ERP" },
      {
        name: "description",
        content:
          "Gerencie os dados do Gestor, informações da empresa e padrões do sistema para geração automática de contratos.",
      },
    ],
  }),
  component: GestorProfileSettingsPage,
});

function GestorProfileSettingsPage() {
  const { user, profile, refreshProfile, logout } = useAuth();
  const { data: companySettings = DEFAULT_COMPANY_SETTINGS, isLoading: loadingCompany } =
    useCompanySettings();
  const upsertCompanySettings = useUpsertCompanySettings();

  // Gestor personal profile form state
  const [gestorName, setGestorName] = useState("");
  const [gestorEmail, setGestorEmail] = useState("");
  const [gestorCargo, setGestorCargo] = useState("");
  const [gestorPhone, setGestorPhone] = useState("");
  const [gestorCpfCnpj, setGestorCpfCnpj] = useState("");
  const [gestorAvatarUrl, setGestorAvatarUrl] = useState(""); // saved URL in DB
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // pending upload file
  const [avatarPreview, setAvatarPreview] = useState(""); // local object URL for preview
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company and System settings form state
  const [companyForm, setCompanyForm] = useState(companySettings);

  useEffect(() => {
    if (profile || user) {
      const metadata = user?.user_metadata || {};

      setGestorName(
        profile?.full_name ||
          (metadata as any).full_name ||
          (metadata as any).name ||
          user?.email?.split("@")[0] ||
          "",
      );
      setGestorEmail(profile?.email || user?.email || "");
      setGestorCargo(
        (profile as any)?.cargo ||
          (metadata as any).cargo ||
          "Gestor de Contas",
      );
      setGestorPhone(
        (profile as any)?.phone || (metadata as any).phone || "",
      );
      setGestorCpfCnpj((profile as any)?.cpf_cnpj || "");

      // avatar_url from DB is the source of truth (isolated per user.id)
      const dbAvatar =
        (profile as any)?.avatar_url ||
        (metadata as any)?.avatar_url ||
        "";
      setGestorAvatarUrl(dbAvatar);
      setAvatarPreview(dbAvatar);
    }
  }, [profile, user]);

  useEffect(() => {
    setCompanyForm(companySettings);
  }, [companySettings]);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setAvatarFile(file);
    // Show local preview immediately without uploading yet
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    toast.info("Foto selecionada. Clique em 'Salvar Dados do Gestor' para confirmar.");
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setGestorAvatarUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Uploads avatar to Supabase Storage: avatars/{userId}/avatar.{ext}
   * Returns the public URL or null on failure.
   */
  const uploadAvatarToStorage = async (file: File, userId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/avatar.${ext}`;
    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error("[Avatar Upload]", uploadError);
        toast.error(`Erro ao fazer upload da foto: ${uploadError.message}`);
        return null;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      // Append timestamp cache-bust so browser reloads after update
      return `${data.publicUrl}?t=${Date.now()}`;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveGestorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    try {
      let finalAvatarUrl = gestorAvatarUrl;

      // 1. If a new file was selected, upload it to Supabase Storage first
      if (avatarFile) {
        const uploaded = await uploadAvatarToStorage(avatarFile, user.id);
        if (uploaded) {
          finalAvatarUrl = uploaded;
          setGestorAvatarUrl(uploaded);
          setAvatarPreview(uploaded);
          setAvatarFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }

      // 2. Update Supabase Auth user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: gestorName.trim(),
          cargo: gestorCargo.trim(),
          phone: gestorPhone.trim(),
          avatar_url: finalAvatarUrl || null,
        },
      });

      // 3. Upsert profile row in DB with ALL fields
      const { error: upsertError } = await (supabase.from("profiles") as any).upsert({
        id: user.id,
        full_name: gestorName.trim(),
        email: gestorEmail.trim(),
        avatar_url: finalAvatarUrl || null,
        role: (profile?.role as any) || "gestor",
        cargo: gestorCargo.trim() || null,
        phone: gestorPhone.trim() || null,
        cpf_cnpj: gestorCpfCnpj.trim() || null,
        contract_field_values: {
          cargo: gestorCargo.trim(),
          telefone: gestorPhone.trim(),
          cpf_cnpj: gestorCpfCnpj.trim(),
        },
      });

      if (upsertError) {
        console.error("[Profile Upsert Error]", upsertError);
        toast.error(`Erro ao salvar no banco: ${upsertError.message}`);
        return;
      }

      // 4. Trigger AuthContext refresh so that sidebar, header and app state update immediately
      if (refreshProfile) {
        await refreshProfile();
      }

      toast.success("Perfil do Gestor atualizado com sucesso!");
    } catch (err: any) {
      console.error("[handleSaveGestorProfile]", err);
      toast.error(err?.message || "Erro ao salvar perfil do Gestor.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCompanyAndSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertCompanySettings.mutateAsync(companyForm);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Display avatar: prefer live preview (newly selected file), then saved DB URL
  const displayAvatar = avatarPreview || gestorAvatarUrl;
  const isSaving = savingProfile || uploadingAvatar;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-subtle">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Direct-on-Avatar Interactive Editor */}
            <div className="relative group flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleAvatarFileSelect}
                disabled={isSaving}
              />
              
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={gestorName}
                  className="h-24 w-24 rounded-2xl object-cover ring-4 ring-primary/10 border border-border shadow-md"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-3xl border border-primary/20 shadow-sm">
                  {gestorName.charAt(0).toUpperCase() || "G"}
                </div>
              )}

              {/* Hover Overlay para troca direta */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                title="Clique para alterar a foto de perfil"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px] font-semibold mt-1">Alterar Foto</span>
                  </>
                )}
              </button>

              {/* Botão rápido para remover foto */}
              {displayAvatar && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAvatar();
                  }}
                  disabled={isSaving}
                  className="absolute -top-1.5 -right-1.5 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                  title="Remover foto de perfil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                  Painel de Configurações
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mt-0.5">{gestorName}</h1>
              <p className="text-xs text-muted-foreground">{gestorEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="gestor" className="w-full space-y-6">
        <TabsList className="inline-flex h-auto items-center justify-start gap-1 bg-muted p-1 border border-border rounded-xl w-full sm:w-auto">
          <TabsTrigger
            value="gestor"
            className="flex-1 sm:flex-none gap-2 font-semibold text-xs py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all"
          >
            <UserCheck className="h-4 w-4 text-primary" /> Dados do Gestor
          </TabsTrigger>
          <TabsTrigger
            value="empresa"
            className="flex-1 sm:flex-none gap-2 font-semibold text-xs py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all"
          >
            <Building2 className="h-4 w-4 text-primary" /> Dados da Empresa
          </TabsTrigger>
          <TabsTrigger
            value="sistema"
            className="flex-1 sm:flex-none gap-2 font-semibold text-xs py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all"
          >
            <Settings className="h-4 w-4 text-primary" /> Padrões do Sistema
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DADOS DO GESTOR */}
        <TabsContent value="gestor">
          <Card className="bg-card border border-border shadow-subtle rounded-2xl">
            <CardHeader className="border-b border-border/70 pb-5">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold text-foreground">Informações do Gestor</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSaveGestorProfile} className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="gestorName" className="text-xs font-semibold text-foreground">
                      Nome Completo do Gestor
                    </Label>
                    <Input
                      id="gestorName"
                      value={gestorName}
                      onChange={(e) => setGestorName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo Delski"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gestorCargo" className="text-xs font-semibold text-foreground">
                      Cargo / Função no Sistema
                    </Label>
                    <Input
                      id="gestorCargo"
                      value={gestorCargo}
                      onChange={(e) => setGestorCargo(e.target.value)}
                      placeholder="Ex: Gestor de Operações & Contratos"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gestorEmail" className="text-xs font-semibold text-foreground">
                      E-mail Corporativo
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="gestorEmail"
                        type="email"
                        value={gestorEmail}
                        onChange={(e) => setGestorEmail(e.target.value)}
                        placeholder="gestor@delski.com.br"
                        className="pl-9 bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gestorPhone" className="text-xs font-semibold text-foreground">
                      Telefone / WhatsApp
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="gestorPhone"
                        value={gestorPhone}
                        onChange={(e) => setGestorPhone(e.target.value)}
                        placeholder="(41) 99999-8888"
                        className="pl-9 bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                      />
                    </div>
                  </div>


                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="gestorCpfCnpj"
                      className="text-xs font-semibold text-foreground"
                    >
                      CPF ou CNPJ Profissional (opcional)
                    </Label>
                    <Input
                      id="gestorCpfCnpj"
                      value={gestorCpfCnpj}
                      onChange={(e) => setGestorCpfCnpj(e.target.value)}
                      placeholder="000.000.000-00"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground max-w-md"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-2 h-10 px-6 shadow-sm cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{uploadingAvatar ? "Enviando foto…" : "Salvar Dados do Gestor"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DADOS DA EMPRESA */}
        <TabsContent value="empresa">
          <Card className="bg-card border border-border shadow-subtle rounded-2xl">
            <CardHeader className="border-b border-border/70 pb-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold text-foreground">
                  Informações da Empresa (Origem: Empresa)
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSaveCompanyAndSystem} className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="razao_social" className="text-xs font-semibold text-foreground">
                      Razão Social
                    </Label>
                    <Input
                      id="razao_social"
                      value={companyForm.razao_social || ""}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({ ...prev, razao_social: e.target.value }))
                      }
                      placeholder="Delski Serviços de Tecnologia Ltda"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj" className="text-xs font-semibold text-foreground">
                      CNPJ
                    </Label>
                    <Input
                      id="cnpj"
                      value={companyForm.cnpj || ""}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({ ...prev, cnpj: e.target.value }))
                      }
                      placeholder="45.892.123/0001-90"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="nome_representante"
                      className="text-xs font-semibold text-foreground"
                    >
                      Nome Representante Contratante
                    </Label>
                    <Input
                      id="nome_representante"
                      value={companyForm.nome_representante || ""}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({ ...prev, nome_representante: e.target.value }))
                      }
                      placeholder="Diretoria Delski"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="cargo_representante"
                      className="text-xs font-semibold text-foreground"
                    >
                      Cargo Representante Contratante
                    </Label>
                    <Input
                      id="cargo_representante"
                      value={companyForm.cargo_representante || ""}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({
                          ...prev,
                          cargo_representante: e.target.value,
                        }))
                      }
                      placeholder="Diretoria Geral"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email_contratante"
                      className="text-xs font-semibold text-foreground"
                    >
                      Email Contratante
                    </Label>
                    <Input
                      id="email_contratante"
                      value={companyForm.email_contratante || ""}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({ ...prev, email_contratante: e.target.value }))
                      }
                      placeholder="contato@delski.com.br"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="telefone_contratante"
                      className="text-xs font-semibold text-foreground"
                    >
                      Telefone Contratante
                    </Label>
                    <Input
                      id="telefone_contratante"
                      value={companyForm.telefone_contratante || ""}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({
                          ...prev,
                          telefone_contratante: e.target.value,
                        }))
                      }
                      placeholder="(41) 99876-5432"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="endereco" className="text-xs font-semibold text-foreground">
                      Endereço da Empresa
                    </Label>
                    <Textarea
                      id="endereco"
                      rows={2}
                      value={companyForm.endereco || ""}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({ ...prev, endereco: e.target.value }))
                      }
                      placeholder="Av. Cândido de Abreu, 526 - Centro Cívico, Curitiba - PR"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    disabled={upsertCompanySettings.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-2 h-10 px-6 shadow-sm cursor-pointer"
                  >
                    {upsertCompanySettings.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Salvar Dados da Empresa</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PADRÕES DO SISTEMA */}
        <TabsContent value="sistema">
          <Card className="bg-card border border-border shadow-subtle rounded-2xl">
            <CardHeader className="border-b border-border/70 pb-5">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold text-foreground">
                  Valores Padrão do Sistema (Origem: Sistema)
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSaveCompanyAndSystem} className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cidade_padrao_assinatura"
                      className="text-xs font-semibold text-foreground"
                    >
                      Cidade Fixa de Assinatura (cidade_assinatura)
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cidade_padrao_assinatura"
                        value={companyForm.cidade_padrao_assinatura || ""}
                        onChange={(e) =>
                          setCompanyForm((prev) => ({
                            ...prev,
                            cidade_padrao_assinatura: e.target.value,
                            cidade_assinatura: e.target.value,
                          }))
                        }
                        placeholder="Ex: Curitiba"
                        className="pl-9 bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="metodo_pagamento_padrao"
                      className="text-xs font-semibold text-foreground"
                    >
                      Método de Pagamento Padrão (metodo_pagamento)
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="metodo_pagamento_padrao"
                        value={
                          companyForm.metodo_pagamento_padrao || "PIX / Transferência Bancária"
                        }
                        onChange={(e) =>
                          setCompanyForm((prev) => ({
                            ...prev,
                            metodo_pagamento_padrao: e.target.value,
                          }))
                        }
                        placeholder="PIX / Transferência Bancária"
                        className="pl-9 bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="data_pagamento_padrao"
                      className="text-xs font-semibold text-foreground"
                    >
                      Data / Prazo de Pagamento (data_pagamento)
                    </Label>
                    <Input
                      id="data_pagamento_padrao"
                      value={companyForm.data_pagamento_padrao || "Dia 10 de cada mês"}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({
                          ...prev,
                          data_pagamento_padrao: e.target.value,
                        }))
                      }
                      placeholder="Ex: Dia 10 de cada mês"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="foro_padrao" className="text-xs font-semibold text-foreground">
                      Foro da Comarca Padrão (foro)
                    </Label>
                    <Input
                      id="foro_padrao"
                      value={companyForm.foro_padrao || "Comarca de Curitiba - PR"}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({ ...prev, foro_padrao: e.target.value }))
                      }
                      placeholder="Ex: Comarca de Curitiba - PR"
                      className="bg-muted/50 dark:bg-zinc-900/90 border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    disabled={upsertCompanySettings.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-2 h-10 px-6 shadow-sm cursor-pointer"
                  >
                    {upsertCompanySettings.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Salvar Padrões do Sistema</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
