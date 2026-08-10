import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FreelancerOnboardingSection } from "@/components/FreelancerOnboardingSection";
import { ShieldCheck, Camera, Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/app/documents")({
  head: () => ({
    meta: [
      { title: "Documentos e Contratos — Delski ERP" },
      {
        name: "description",
        content: "Gestão de dados para contrato, envio de documentos e assinatura digital.",
      },
    ],
  }),
  component: FreelancerDocumentsPage,
});

function ProfilePhotoSection() {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (profile as any)?.avatar_url ?? null,
  );

  const initials = ((profile as any)?.full_name || user?.email || "?")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("freelancer-documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("freelancer-documents")
        .getPublicUrl(path);

      const publicUrl = urlData?.publicUrl;

      // Update profiles table
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("id", user.id);

      setAvatarUrl(publicUrl ?? null);
      toast.success("Foto de perfil atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar foto de perfil.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Camera className="h-5 w-5 text-indigo-500" /> Foto de Perfil
        </CardTitle>
        <CardDescription className="text-xs">
          Adicione ou altere sua foto de perfil exibida no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20 ring-2 ring-border">
            <AvatarImage src={avatarUrl ?? undefined} alt="Foto de perfil" />
            <AvatarFallback className="text-xl font-bold bg-indigo-500/10 text-indigo-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Formatos aceitos: JPG, PNG, WEBP. Tamanho máximo: 5MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="avatar-upload"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : "Escolher Foto"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePasswordSection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const np = data.get("new_password") as string;
    const cp = data.get("confirm_password") as string;

    if (!np || np.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (np !== cp) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: np });
      if (error) throw error;
      setDone(true);
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar senha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Lock className="h-5 w-5 text-indigo-500" /> Alterar Senha
        </CardTitle>
        <CardDescription className="text-xs">
          Defina uma nova senha para a sua conta Delski.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="new_password" className="text-xs font-semibold">
              Nova Senha
            </Label>
            <div className="relative">
              <Input
                id="new_password"
                name="new_password"
                type={showNew ? "text" : "password"}
                defaultValue=""
                placeholder="Mínimo 6 caracteres"
                className="text-sm h-9 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password" className="text-xs font-semibold">
              Confirmar Senha
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                name="confirm_password"
                type={showConfirm ? "text" : "password"}
                defaultValue=""
                placeholder="Repita a nova senha"
                className="text-sm h-9 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] text-white font-medium text-sm gap-2 h-9"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {saving ? "Salvando..." : done ? "Senha Alterada!" : "Salvar Nova Senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FreelancerDocumentsPage() {
  const { isGestor, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isGestor) {
      navigate({ to: "/app/freelancers", replace: true });
    }
  }, [isGestor, loading, navigate]);

  if (loading || isGestor) return null;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-indigo-600" /> Documentos & Contratos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Preencha seus dados de contrato, envie os comprovantes pessoais solicitados e assine
            seus contratos.
          </p>
        </div>
      </div>

      {/* Profile Photo & Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfilePhotoSection />
        <ChangePasswordSection />
      </div>

      <FreelancerOnboardingSection hideBanner />
    </div>
  );
}
