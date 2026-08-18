import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendClientAccessInviteEmail } from "@/integrations/brevo";

export interface ClientItem {
  id: string;
  auth_user_id?: string | null;
  resolved_id?: string;
  full_name: string;
  email: string;
  company_name?: string | null;
  phone?: string | null;
  status: "convidado" | "ativo" | "bloqueado";
  created_at: string;
  projects?: { id: string; title: string; status: string }[];
}

export interface CreateClientInput {
  full_name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

// ── Query: list all clients ──────────────────────────────────────────────────
export function useClientsList() {
  return useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      // 1. Fetch from public.clients
      const { data: clientsData, error: clientsErr } = await (supabase.from("clients") as any)
        .select("*")
        .order("created_at", { ascending: false });

      // 2. Fetch profiles with role = 'cliente'
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "cliente")
        .order("created_at", { ascending: false });

      const profileByEmail = new Map<string, any>();
      (profilesData ?? []).forEach((p: any) => {
        profileByEmail.set((p.email || "").toLowerCase().trim(), p);
      });

      // 3. Fetch all projects to map client_id
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title, status, client_id");

      const projectsMap = new Map<string, { id: string; title: string; status: string }[]>();
      (projectsData ?? []).forEach((p: any) => {
        if (p.client_id) {
          if (!projectsMap.has(p.client_id)) projectsMap.set(p.client_id, []);
          projectsMap.get(p.client_id)!.push({ id: p.id, title: p.title, status: p.status });
        }
      });

      const clientMap = new Map<string, ClientItem>();

      // Populate from clients table first
      if (!clientsErr && clientsData) {
        (clientsData as any[]).forEach((c) => {
          const resolvedId =
            c.auth_user_id || profileByEmail.get((c.email || "").toLowerCase().trim())?.id || c.id;

          const projects = [
            ...(projectsMap.get(resolvedId) ?? []),
            ...(projectsMap.get(c.id) ?? []),
          ];
          const uniqueProjects = Array.from(
            new Map(projects.map((proj) => [proj.id, proj])).values(),
          );

          clientMap.set(c.id, {
            id: c.id,
            auth_user_id: c.auth_user_id,
            resolved_id: resolvedId,
            full_name: c.full_name,
            email: c.email,
            company_name: c.company_name || "",
            phone: c.phone || "",
            status: c.status || "convidado",
            created_at: c.created_at,
            projects: uniqueProjects,
          });
        });
      }

      // Merge profiles with role='cliente' if not already in clientMap
      (profilesData ?? []).forEach((p: any) => {
        if (!clientMap.has(p.id)) {
          clientMap.set(p.id, {
            id: p.id,
            auth_user_id: p.id,
            resolved_id: p.id,
            full_name: p.full_name,
            email: p.email,
            company_name: "",
            phone: "",
            status: "ativo",
            created_at: p.created_at,
            projects: projectsMap.get(p.id) || [],
          });
        }
      });

      return Array.from(clientMap.values());
    },
  });
}

// ── Query: single client detail ──────────────────────────────────────────────
export function useClientDetail(id: string) {
  return useQuery({
    queryKey: ["client-detail", id],
    enabled: !!id,
    queryFn: async () => {
      // Try clients table
      let client: ClientItem | null = null;
      const { data: clientRow } = await (supabase.from("clients") as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (clientRow) {
        const normalizedEmail = (clientRow.email || "").toLowerCase().trim();
        const { data: profileByEmail } = normalizedEmail
          ? await supabase
              .from("profiles")
              .select("*")
              .ilike("email", normalizedEmail)
              .limit(1)
              .maybeSingle()
          : { data: null };

        const resolvedId = clientRow.auth_user_id || profileByEmail?.id || clientRow.id;

        client = {
          id: clientRow.id,
          auth_user_id: clientRow.auth_user_id,
          resolved_id: resolvedId,
          full_name: clientRow.full_name,
          email: clientRow.email,
          company_name: clientRow.company_name || "",
          phone: clientRow.phone || "",
          status: clientRow.status || "convidado",
          created_at: clientRow.created_at,
        };
      } else {
        // Fallback to profiles
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (profileRow) {
          client = {
            id: profileRow.id,
            auth_user_id: profileRow.id,
            resolved_id: profileRow.id,
            full_name: profileRow.full_name,
            email: profileRow.email,
            company_name: "",
            phone: "",
            status: "ativo",
            created_at: profileRow.created_at,
          };
        }
      }

      if (!client) throw new Error("Cliente não encontrado");

      const queryIds = [client.id];
      if (client.auth_user_id) queryIds.push(client.auth_user_id);
      if (client.resolved_id) queryIds.push(client.resolved_id);
      const uniqueQueryIds = Array.from(new Set(queryIds));

      // Fetch projects
      const { data: projData } = await supabase
        .from("projects")
        .select("id, title, service_type, status, budget, deadline, created_at")
        .or(uniqueQueryIds.map((id) => `client_id.eq.${id}`).join(","))
        .order("created_at", { ascending: false });

      client.projects = (projData ?? []) as any[];
      return client;
    },
  });
}

// ── Mutation: create client ──────────────────────────────────────────────────
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const clientId = crypto.randomUUID();

      // 1. Insert into profiles
      await (supabase.from("profiles") as any).upsert({
        id: clientId,
        full_name: input.full_name,
        email: input.email,
        role: "cliente",
      });

      // 2. Insert into clients table
      const { data, error } = await (supabase.from("clients") as any)
        .insert({
          id: clientId,
          auth_user_id: clientId,
          full_name: input.full_name,
          email: input.email,
          company_name: input.company_name || null,
          phone: input.phone || null,
          status: "convidado",
        })
        .select()
        .single();

      if (error) {
        console.warn("Could not insert into clients table directly, relying on profiles:", error);
      }

      // 3. Send Brevo invitation email
      await sendClientAccessInviteEmail({
        to: { name: input.full_name, email: input.email },
        companyName: input.company_name,
      });

      return data || { id: clientId, ...input };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente cadastrado com sucesso e convite enviado!");
    },
    onError: (e: Error) => toast.error(`Erro ao cadastrar cliente: ${e.message}`),
  });
}

// ── Mutation: update client ──────────────────────────────────────────────────
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CreateClientInput> & { status?: "convidado" | "ativo" | "bloqueado" };
    }) => {
      // Update clients table
      await (supabase.from("clients") as any).update(patch).eq("id", id);

      // Update profiles if name, email or status changed
      const updateData: any = {};
      if (patch.full_name) updateData.full_name = patch.full_name;
      if (patch.email) updateData.email = patch.email;
      if (patch.status) updateData.status = patch.status;
      if (Object.keys(updateData).length > 0) {
        await supabase.from("profiles").update(updateData).eq("id", id);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-detail", v.id] });
      toast.success("Dados e acesso do cliente atualizados!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ── Mutation: delete client ──────────────────────────────────────────────────
export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Unlink projects
      await supabase.from("projects").update({ client_id: null }).eq("client_id", id);

      // 2. Delete from clients table
      await (supabase.from("clients") as any).delete().eq("id", id);

      // 3. Delete from profiles table
      await supabase.from("profiles").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Cliente e seu acesso foram excluídos do banco de dados.");
    },
    onError: (e: Error) => toast.error(`Erro ao excluir cliente: ${e.message}`),
  });
}

// ── Mutation: link project to client ─────────────────────────────────────────
export function useLinkProjectClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, clientId }: { projectId: string; clientId: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({ client_id: clientId })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["client-detail", v.clientId] });
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto vinculado ao cliente!");
    },
    onError: (e: Error) => toast.error(`Erro ao vincular projeto: ${e.message}`),
  });
}

// ── Mutation: unlink project from client ──────────────────────────────────────
export function useUnlinkProjectClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, clientId }: { projectId: string; clientId: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({ client_id: null })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["client-detail", v.clientId] });
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto desvinculado.");
    },
    onError: (e: Error) => toast.error(`Erro ao desvincular projeto: ${e.message}`),
  });
}

// ── Query: current logged-in client profile ─────────────────────────────────
export function useCurrentClientProfile(userId?: string, userEmail?: string) {
  const emailLower = userEmail?.toLowerCase().trim() || "";

  return useQuery({
    queryKey: ["current-client-profile", userId, emailLower],
    enabled: !!(userId || emailLower),
    queryFn: async () => {
      let clientRow: any = null;

      if (userId || emailLower) {
        const { data } = await (supabase.from("clients") as any)
          .select("*")
          .or(`auth_user_id.eq.${userId},email.ilike.${emailLower}`)
          .limit(1)
          .maybeSingle();
        clientRow = data;
      }

      // Fetch profile data
      let profileRow: any = null;
      if (userId) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        profileRow = pData;
      }

      // If no client row exists, build a draft from profile
      if (!clientRow && profileRow) {
        clientRow = {
          id: profileRow.id,
          auth_user_id: profileRow.id,
          full_name: profileRow.full_name,
          email: profileRow.email,
          company_name: "",
          corporate_name: "",
          phone: profileRow.phone || "",
          onboarding_completed: profileRow.onboarding_completed || false,
          status: "ativo",
          created_at: profileRow.created_at,
        };
      }

      // Fetch linked projects
      const resolvedId = clientRow?.id || userId;
      let projects: any[] = [];

      try {
        const { data: projData } = await supabase
          .from("projects")
          .select(
            `
            id,
            title,
            service_type,
            status,
            budget,
            deadline,
            briefing_content,
            google_drive_link,
            client_contract_url,
            created_at
          `
          )
          .or(`client_id.eq.${resolvedId},client_id.eq.${userId}`);

        if (projData) {
          projects = projData;
        }
      } catch (err) {
        console.warn("Error fetching client projects:", err);
      }

      return {
        ...clientRow,
        projects,
      };
    },
  });
}

// ── Mutation: update current client corporate data ───────────────────────────
export function useUpdateCurrentClientProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      userId,
      patch,
    }: {
      clientId?: string;
      userId?: string;
      patch: Record<string, any>;
    }) => {
      // 1. Update clients table
      if (clientId) {
        const { error: cErr } = await (supabase.from("clients") as any)
          .update({
            ...patch,
            updated_at: new Date().toISOString(),
          })
          .eq("id", clientId);
        if (cErr) console.warn("Error updating clients:", cErr);
      }

      // 2. Update profiles table if name or phone changed
      if (userId) {
        const profilePatch: any = {};
        if (patch.full_name || patch.contact_name) {
          profilePatch.full_name = patch.full_name || patch.contact_name;
        }
        if (patch.phone) profilePatch.phone = patch.phone;
        if (typeof patch.onboarding_completed === "boolean") {
          profilePatch.onboarding_completed = patch.onboarding_completed;
        }

        if (Object.keys(profilePatch).length > 0) {
          await supabase.from("profiles").update(profilePatch).eq("id", userId);
        }
      }

      return patch;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["current-client-profile"] });
      qc.invalidateQueries({ queryKey: ["client-detail", v.clientId] });
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      toast.success("Dados cadastrais atualizados com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar dados: ${e.message}`),
  });
}

// ── Mutation: upload client payment receipt ──────────────────────────────────
export function useUploadClientPaymentReceipt() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      file,
      notes,
    }: {
      clientId: string;
      file: File;
      notes?: string;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `receipts/${clientId}/comprovante_${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage
        .from("client-documents")
        .getPublicUrl(filePath);

      const fileUrl = pubData?.publicUrl || null;

      // 2. Insert into client_documents
      const { error: docErr } = await (supabase.from("client_documents") as any).insert([
        {
          client_id: clientId,
          document_type: "comprovante_pagamento",
          file_path: filePath,
          file_url: fileUrl,
          status: "em_analise",
          review_notes: notes || "Comprovante enviado pelo cliente",
          uploaded_at: new Date().toISOString(),
        },
      ]);

      if (docErr) throw docErr;

      return { filePath, fileUrl };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_documents"] });
      qc.invalidateQueries({ queryKey: ["current-client-profile"] });
      toast.success("Comprovante de pagamento enviado com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao enviar comprovante: ${e.message}`),
  });
}

// ── Mutation: resend invite email ─────────────────────────────────────────────
export function useResendClientInvite() {
  return useMutation({
    mutationFn: async (client: { name: string; email: string; companyName?: string }) => {
      await sendClientAccessInviteEmail({
        to: { name: client.name, email: client.email },
        companyName: client.companyName,
      });
    },
    onSuccess: () => toast.success("Convite reenviado com sucesso!"),
    onError: (e: Error) => toast.error(`Erro ao reenviar convite: ${e.message}`),
  });
}


