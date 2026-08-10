import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Bell, Clock, CheckCircle2, AlertTriangle, Users, FileWarning, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFreelancers, useProfiles } from "@/hooks/useProfiles";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import {
  useManualNotifications,
  useNotifications,
  useSendManualNotification,
  type NotificationRow,
} from "@/hooks/useNotifications";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Delski ERP" },
      {
        name: "description",
        content: "Central de alertas e notificações do gestor e dos freelancers.",
      },
    ],
  }),
  component: NotificationsPage,
});

const ALERT_STALE_DAYS = 7;

function NotificationsPage() {
  const { user, isGestor, isFreelancer, isCliente } = useAuth();
  const { data: dbProjects = [] } = useProjects();
  const { data: freelancers = [] } = useFreelancers();
  const { data: profiles = [] } = useProfiles();
  const { data: inbox = [] } = useNotifications(user?.id);
  const { data: sent = [] } = useManualNotifications(user?.id);
  const sendManualNotification = useSendManualNotification();

  const [recipientMode, setRecipientMode] = useState<"all" | "specific">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const recipientOptions = useMemo(() => freelancers.map((f) => f.id), [freelancers]);

  useEffect(() => {
    if (!isGestor || !user?.id || !dbProjects.length) return;

    const gestorIds = profiles
      .filter((profile) => profile.role === "gestor")
      .map((profile) => profile.id);
    if (gestorIds.length === 0) return;

    const now = Date.now();
    const staleProjects = dbProjects.filter((project) => {
      if (project.status === "Concluido") return false;
      const createdAt = new Date(project.created_at).getTime();
      const ageDays = Math.floor((now - createdAt) / 86_400_000);
      return ageDays >= ALERT_STALE_DAYS;
    });

    const overdueProjects = dbProjects.filter((project) => {
      if (!project.deadline || project.status === "Concluido") return false;
      const due = new Date(project.deadline).getTime();
      return due < now;
    });

    const insertAlerts = async () => {
      const rows: Array<{
        user_id: string;
        title: string;
        message: string;
        type: "alerta";
        read: boolean;
        created_by: null;
      }> = [];

      for (const project of staleProjects) {
        rows.push({
          user_id: user.id,
          title: "Projeto parado há mais de 7 dias",
          message: `${project.title} está sem atualização e precisa de atenção do gestor.`,
          type: "alerta",
          read: false,
          created_by: null,
        });
      }

      for (const project of overdueProjects) {
        rows.push({
          user_id: user.id,
          title: "Prazo de entrega vencido",
          message: `${project.title} já passou do prazo previsto (${project.deadline}).`,
          type: "alerta",
          read: false,
          created_by: null,
        });
      }

      if (rows.length > 0) {
        await supabase.from("notifications").insert(rows);
      }
    };

    void insertAlerts();
  }, [isGestor, user?.id, dbProjects, profiles]);

  const inboxItems = useMemo(() => {
    return [...(inbox ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [inbox]);

  const sentItems = useMemo(() => {
    return [...(sent ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [sent]);

  const allFreelancerIds = useMemo(() => freelancers.map((f) => f.id), [freelancers]);

  const handleToggleRecipient = (id: string) => {
    setSelectedRecipients((previous) =>
      previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id],
    );
  };

  const handleSendNotification = async () => {
    if (!user?.id) return;
    if (!title.trim() || !message.trim()) {
      return;
    }

    const recipients = recipientMode === "all" ? allFreelancerIds : selectedRecipients;
    await sendManualNotification.mutateAsync({
      recipients,
      title: title.trim(),
      message: message.trim(),
      createdBy: user.id,
    });

    setTitle("");
    setMessage("");
    setSelectedRecipients([]);
  };

  const kindStyle: Record<NotificationRow["type"], string> = {
    manual: "bg-blue-600/15 text-blue-700 dark:text-blue-300",
    sistema: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    alerta: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Central de alertas automáticos e envio manual do gestor.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 py-1 px-3 self-start">
          <Bell className="h-3.5 w-3.5 text-indigo-400" /> {inboxItems.length} recebida(s)
        </Badge>
      </div>

      {isGestor && (
        <Card className="border-blue-900/10 bg-blue-50/40 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-blue-900" /> Enviar Notificação
            </CardTitle>
            <CardDescription>
              Envie uma mensagem para todos os freelancers ou para uma lista específica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Destinatário</Label>
                <div className="flex gap-2">
                  <Button
                    variant={recipientMode === "all" ? "default" : "outline"}
                    onClick={() => setRecipientMode("all")}
                    className="flex-1"
                  >
                    Todos os Freelancers
                  </Button>
                  <Button
                    variant={recipientMode === "specific" ? "default" : "outline"}
                    onClick={() => setRecipientMode("specific")}
                    className="flex-1"
                  >
                    Freelancers Específicos
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-title">Título</Label>
                <Input
                  id="notification-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Atualização importante"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Mensagem</Label>
              <Textarea
                id="notification-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Descreva o conteúdo da comunicação..."
              />
            </div>

            {recipientMode === "specific" && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {freelancers.map((freelancer) => (
                  <label
                    key={freelancer.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(freelancer.id)}
                      onChange={() => handleToggleRecipient(freelancer.id)}
                    />
                    <span>{freelancer.full_name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSendNotification} disabled={sendManualNotification.isPending}>
                {sendManualNotification.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="space-y-4">
          {inboxItems.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma notificação recebida.
              </CardContent>
            </Card>
          )}

          {inboxItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-2">
                      {item.type === "alerta" ? (
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                      ) : item.type === "manual" ? (
                        <Send className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Bell className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.title}</span>
                        <Badge variant="secondary" className={kindStyle[item.type]}>
                          {item.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {item.read ? "Lida" : "Não lida"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
