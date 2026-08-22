import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendClientAccessInviteEmail } from "@/integrations/brevo";

export interface ClientItem {
  id: string;
  auth_user_id?: string | null;
  resolved_id?: string;
  full_name: string;
  email: string;
  company_name?: string | null;
  corporate_name?: string | null;
  cnpj?: string | null;
  segment?: string | null;
  cep?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  role_position?: string | null;
  phone?: string | null;
  status: "convidado" | "ativo" | "bloqueado";
  created_at: string;
  contract_model?: string;
  contract_value?: number;
  setup_value?: number;
  contract_duration?: string;
  payment_date?: string | null;
  due_date?: string | null;
  financial_status?: string;
  projects?: { id: string; title: string; status: string }[];
}

export interface CreateClientInput {
  full_name: string;
  email: string;
  company_name: string;
  corporate_name?: string;
  cnpj?: string;
  segment?: string;
  cep?: string;
  address?: string;
  city?: string;
  state?: string;
  role_position?: string;
  phone?: string;
  lead_id?: string;
}

function getDeletedClientsFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem("delski_deleted_clients");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map((x) => String(x).toLowerCase().trim()));
    }
  } catch {}
  return new Set();
}

export function markClientDeletedInStorage(identifiers: (string | null | undefined)[]) {
  try {
    const current = getDeletedClientsFromStorage();
    identifiers.forEach((id) => {
      if (id) current.add(String(id).toLowerCase().trim());
    });
    localStorage.setItem("delski_deleted_clients", JSON.stringify(Array.from(current)));
  } catch {}
}

// ── Query: list all clients ──────────────────────────────────────────────────
export function useClientsList() {
  return useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const deletedStorage = getDeletedClientsFromStorage();

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
      const profileById = new Map<string, any>();
      (profilesData ?? []).forEach((p: any) => {
        if (p.deleted_at || p.status === "inativo" || p.role !== "cliente") return;
        const normEmail = (p.email || "").toLowerCase().trim();
        if (
          deletedStorage.has(String(p.id).toLowerCase()) ||
          (normEmail && deletedStorage.has(normEmail))
        ) {
          return;
        }
        profileById.set(p.id, p);
        if (p.email) {
          profileByEmail.set(normEmail, p);
        }
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
      const processedEmails = new Set<string>();

      // Populate from clients table first (ignora excluídos/inativos)
      if (!clientsErr && clientsData) {
        (clientsData as any[]).forEach((c) => {
          if (c.deleted_at || c.status === "inativo") return;
          const normEmail = (c.email || "").toLowerCase().trim();
          if (
            deletedStorage.has(String(c.id).toLowerCase()) ||
            (c.auth_user_id && deletedStorage.has(String(c.auth_user_id).toLowerCase())) ||
            (normEmail && deletedStorage.has(normEmail))
          ) {
            return;
          }

          const matchedProfile = normEmail ? profileByEmail.get(normEmail) : null;
          if (matchedProfile?.deleted_at || matchedProfile?.status === "inativo") return;

          const resolvedId = c.auth_user_id || matchedProfile?.id || c.id;

          const projects = [
            ...(projectsMap.get(resolvedId) ?? []),
            ...(projectsMap.get(c.id) ?? []),
          ];
          const uniqueProjects = Array.from(
            new Map(projects.map((proj) => [proj.id, proj])).values(),
          );

          if (normEmail) processedEmails.add(normEmail);

          clientMap.set(c.id, {
            id: c.id,
            auth_user_id: c.auth_user_id || matchedProfile?.id || null,
            resolved_id: resolvedId,
            full_name: c.full_name || c.contact_name || matchedProfile?.full_name || "Cliente",
            email: c.email || matchedProfile?.email || "",
            company_name: c.company_name || "",
            corporate_name: c.corporate_name || c.company_name || "",
            cnpj: c.cnpj || matchedProfile?.cpf_cnpj || "",
            segment: c.segment || "",
            cep: c.cep || "",
            address: c.address || "",
            city: c.city || "",
            state: c.state || "",
            role_position: c.role_position || "",
            phone: c.phone || matchedProfile?.phone || "",
            status: c.status || "ativo",
            created_at: c.created_at || matchedProfile?.created_at || new Date().toISOString(),
            projects: uniqueProjects,
          });
        });
      }

      // Merge profiles with role='cliente' if not already processed by email or id
      (profilesData ?? []).forEach((p: any) => {
        if (p.deleted_at || p.status === "inativo" || p.role !== "cliente") return;
        const normEmail = (p.email || "").toLowerCase().trim();
        if (
          deletedStorage.has(String(p.id).toLowerCase()) ||
          (normEmail && deletedStorage.has(normEmail))
        ) {
          return;
        }
        if (normEmail && !processedEmails.has(normEmail)) {
          processedEmails.add(normEmail);
          const projects = projectsMap.get(p.id) ?? [];
          clientMap.set(p.id, {
            id: p.id,
            auth_user_id: p.id,
            resolved_id: p.id,
            full_name: p.full_name || "Cliente",
            email: p.email || "",
            company_name: p.company_name || "",
            corporate_name: p.company_name || "",
            cnpj: p.cpf_cnpj || "",
            segment: "",
            cep: "",
            address: "",
            city: "",
            state: "",
            role_position: "",
            phone: p.phone || "",
            status: p.approval_status === "rejected" ? "bloqueado" : "ativo",
            created_at: p.created_at || new Date().toISOString(),
            projects,
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
    queryFn: async (): Promise<ClientItem | null> => {
      try {
        let client: ClientItem | null = null;
        let clientData: any = null;

        // 1. Try clients table by direct id
        try {
          const { data: byId } = await (supabase.from("clients") as any)
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (byId) clientData = byId;
        } catch {}

        // 2. Try clients table by auth_user_id
        if (!clientData) {
          try {
            const { data: byAuth } = await (supabase.from("clients") as any)
              .select("*")
              .eq("auth_user_id", id)
              .maybeSingle();
            if (byAuth) clientData = byAuth;
          } catch {}
        }

        // If client found in clients table
        if (clientData) {
          const normalizedEmail = (clientData.email || "").toLowerCase().trim();
          let profileByEmail: any = null;
          if (normalizedEmail) {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("*")
                .ilike("email", normalizedEmail)
                .maybeSingle();
              profileByEmail = data;
            } catch {}
          }

          const resolvedId = clientData.auth_user_id || profileByEmail?.id || clientData.id;

          client = {
            id: clientData.id,
            auth_user_id: clientData.auth_user_id || profileByEmail?.id || null,
            resolved_id: resolvedId,
            full_name: clientData.full_name || clientData.contact_name || profileByEmail?.full_name || clientData.company_name || "Cliente",
            email: clientData.email || profileByEmail?.email || "",
            company_name: clientData.company_name || "",
            corporate_name: clientData.corporate_name || clientData.company_name || "",
            cnpj: clientData.cnpj || profileByEmail?.cpf_cnpj || "",
            segment: clientData.segment || "",
            cep: clientData.cep || "",
            address: clientData.address || "",
            city: clientData.city || "",
            state: clientData.state || "",
            role_position: clientData.role_position || "",
            phone: clientData.phone || profileByEmail?.phone || "",
            status: clientData.status || "ativo",
            created_at: clientData.created_at || new Date().toISOString(),
            contract_model: clientData.contract_model || "Mensal",
            contract_value: clientData.contract_value || 0,
            setup_value: clientData.setup_value || 0,
            contract_duration: clientData.contract_duration || "12 meses",
            payment_date: clientData.payment_date || null,
            due_date: clientData.due_date || null,
            financial_status: clientData.financial_status || "Pendente",
          } as any;
        } else {
          // 3. Fallback to profiles table by id
          let profileRow: any = null;
          try {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            profileRow = data;
          } catch {}

          if (profileRow) {
            const normEmail = (profileRow.email || "").toLowerCase().trim();
            let matchedClient: any = null;
            if (normEmail) {
              try {
                const { data } = await (supabase.from("clients") as any)
                  .select("*")
                  .ilike("email", normEmail)
                  .maybeSingle();
                matchedClient = data;
              } catch {}
            }

            client = {
              id: matchedClient?.id || profileRow.id,
              auth_user_id: profileRow.id,
              resolved_id: profileRow.id,
              full_name: matchedClient?.full_name || matchedClient?.contact_name || profileRow.full_name || "Cliente",
              email: matchedClient?.email || profileRow.email || "",
              company_name: matchedClient?.company_name || "",
              corporate_name: matchedClient?.corporate_name || matchedClient?.company_name || "",
              cnpj: matchedClient?.cnpj || profileRow.cpf_cnpj || "",
              segment: matchedClient?.segment || "",
              cep: matchedClient?.cep || "",
              address: matchedClient?.address || "",
              city: matchedClient?.city || "",
              state: matchedClient?.state || "",
              role_position: matchedClient?.role_position || "",
              phone: matchedClient?.phone || profileRow.phone || "",
              status: matchedClient?.status || "ativo",
              created_at: matchedClient?.created_at || profileRow.created_at || new Date().toISOString(),
              contract_model: matchedClient?.contract_model || "Mensal",
              contract_value: matchedClient?.contract_value || 0,
              setup_value: matchedClient?.setup_value || 0,
              contract_duration: matchedClient?.contract_duration || "12 meses",
              payment_date: matchedClient?.payment_date || null,
              due_date: matchedClient?.due_date || null,
              financial_status: matchedClient?.financial_status || "Pendente",
            } as any;
          }
        }

        if (!client) {
          return null;
        }

        // Fetch projects safely
        try {
          const queryIds = [client.id];
          if (client.auth_user_id) queryIds.push(client.auth_user_id);
          if (client.resolved_id) queryIds.push(client.resolved_id);
          const uniqueQueryIds = Array.from(new Set(queryIds)).filter(Boolean);

          if (uniqueQueryIds.length === 1) {
            const { data: projData } = await supabase
              .from("projects")
              .select("id, title, service_type, status, budget, deadline, created_at")
              .eq("client_id", uniqueQueryIds[0])
              .order("created_at", { ascending: false });

            client.projects = (projData ?? []) as any[];
          } else if (uniqueQueryIds.length > 1) {
            const { data: projData } = await supabase
              .from("projects")
              .select("id, title, service_type, status, budget, deadline, created_at")
              .in("client_id", uniqueQueryIds)
              .order("created_at", { ascending: false });

            client.projects = (projData ?? []) as any[];
          } else {
            client.projects = [];
          }
        } catch {
          client.projects = [];
        }

        return client;
      } catch (err) {
        console.warn("[useClientDetail] error:", err);
        return null;
      }
    },
  });
}

// ── Mutation: create client ──────────────────────────────────────────────────
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const clientId = crypto.randomUUID();

      // 1. Insert into profiles — pré-aprovado pois vem de convite direto do gestor
      await (supabase.from("profiles") as any).upsert({
        id: clientId,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone || null,
        cpf_cnpj: input.cnpj || null,
        role: "cliente",
        invited_by_gestor: true,   // convite direto — bypass da fila de aprovação
        approval_status: "approved", // pré-aprovado pelo gestor
      });

      // 2. Insert into clients table com todos os dados cadastrais e fiscais
      const { data, error } = await (supabase.from("clients") as any)
        .insert({
          id: clientId,
          auth_user_id: clientId,
          full_name: input.full_name,
          email: input.email,
          company_name: input.company_name,
          corporate_name: input.corporate_name || input.company_name,
          cnpj: input.cnpj || null,
          segment: input.segment || null,
          cep: input.cep || null,
          address: input.address || null,
          city: input.city || null,
          state: input.state || null,
          role_position: input.role_position || null,
          phone: input.phone || null,
          status: "convidado",
          invited_by_gestor: true,
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
      patch: Record<string, any>;
    }) => {
      // 1. Update clients table by direct id or auth_user_id
      const { error: clientErr } = await (supabase.from("clients") as any)
        .update(patch)
        .or(`id.eq.${id},auth_user_id.eq.${id}`);

      if (clientErr) {
        console.warn("Aviso ao atualizar clients table:", clientErr);
      }

      // 2. Update profiles if relevant fields changed
      const profileUpdate: any = {};
      if (patch.full_name) profileUpdate.full_name = patch.full_name;
      if (patch.email) profileUpdate.email = patch.email;
      if (patch.phone) profileUpdate.phone = patch.phone;
      if (patch.cnpj) profileUpdate.cpf_cnpj = patch.cnpj;
      if (patch.status) profileUpdate.status = patch.status;

      if (Object.keys(profileUpdate).length > 0) {
        await (supabase.from("profiles") as any)
          .update(profileUpdate)
          .or(`id.eq.${id},email.eq.${patch.email || ""}`);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-detail", v.id] });
      if (v.patch.status) {
        toast.success(
          v.patch.status === "bloqueado"
            ? "Acesso do cliente bloqueado!"
            : "Acesso do cliente ativado com sucesso!"
        );
      } else {
        toast.success("Dados cadastrais do cliente atualizados com sucesso!");
      }
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar dados: ${e.message}`),
  });
}

// ── Mutation: delete client ──────────────────────────────────────────────────
export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: string | { id: string; auth_user_id?: string | null; email?: string | null }
    ) => {
      const clientId = typeof input === "string" ? input : input.id;
      const authUserId = typeof input === "object" ? input.auth_user_id : undefined;
      const clientEmail = typeof input === "object" ? input.email?.toLowerCase().trim() : undefined;

      // Coleta todos os identificadores possíveis
      const idsToUnlink = new Set<string>();
      if (clientId) idsToUnlink.add(clientId);
      if (authUserId) idsToUnlink.add(authUserId);

      // Busca dados adicionais se necessário
      if (clientId) {
        try {
          const { data: cRow } = await (supabase.from("clients") as any)
            .select("id, auth_user_id, email")
            .eq("id", clientId)
            .maybeSingle();
          if (cRow) {
            if (cRow.auth_user_id) idsToUnlink.add(cRow.auth_user_id);
            if (cRow.id) idsToUnlink.add(cRow.id);
            if (cRow.email) idsToUnlink.add(cRow.email.toLowerCase().trim());
          }
        } catch {}
      }

      // 1. Marca imediatamente como excluído no storage local persistente
      markClientDeletedInStorage([
        clientId,
        authUserId,
        clientEmail,
        ...Array.from(idsToUnlink),
      ]);

      const db = supabaseAdmin || supabase;

      // 2. Desvincular e limpar dependências em paralelo (evita violação de Foreign Key no Postgres)
      const unlinkPromises: Promise<any>[] = [];
      idsToUnlink.forEach((targetId) => {
        unlinkPromises.push(
          db.from("projects").update({ client_id: null }).eq("client_id", targetId).then(() => {}).catch(() => {}),
          (db.from("client_documents") as any).delete().eq("client_id", targetId).then(() => {}).catch(() => {}),
          (db.from("support_tickets") as any).delete().eq("client_id", targetId).then(() => {}).catch(() => {}),
          (db.from("support_tickets") as any).delete().eq("user_id", targetId).then(() => {}).catch(() => {}),
          (db.from("notifications") as any).delete().eq("user_id", targetId).then(() => {}).catch(() => {}),
          (db.from("contract_instances") as any).delete().eq("client_id", targetId).then(() => {}).catch(() => {}),
          (db.from("contract_variables") as any).delete().eq("client_id", targetId).then(() => {}).catch(() => {}),
          (db.from("crm_leads") as any).update({ converted_client_id: null }).eq("converted_client_id", targetId).then(() => {}).catch(() => {}),
          (db.from("financial_transactions") as any).update({ client_id: null }).eq("client_id", targetId).then(() => {}).catch(() => {}),
          (db.from("client_invoices") as any).delete().eq("client_id", targetId).then(() => {}).catch(() => {})
        );
      });
      await Promise.allSettled(unlinkPromises);

      // 3. Exclusão da tabela CLIENTS (física + soft-delete)
      const clientDeletePromises: Promise<any>[] = [];
      idsToUnlink.forEach((targetId) => {
        clientDeletePromises.push(
          (db.from("clients") as any).delete().eq("id", targetId).then(() => {}).catch(() => {}),
          (db.from("clients") as any).delete().eq("auth_user_id", targetId).then(() => {}).catch(() => {}),
          (db.from("clients") as any)
            .update({ status: "inativo", deleted_at: new Date().toISOString() })
            .eq("id", targetId).then(() => {}).catch(() => {})
        );
      });
      if (clientEmail) {
        clientDeletePromises.push(
          (db.from("clients") as any).delete().ilike("email", clientEmail).then(() => {}).catch(() => {}),
          (db.from("clients") as any)
            .update({ status: "inativo", deleted_at: new Date().toISOString() })
            .ilike("email", clientEmail).then(() => {}).catch(() => {})
        );
      }
      await Promise.allSettled(clientDeletePromises);

      // 4. Exclusão / Desativação da tabela PROFILES
      const profilePromises: Promise<any>[] = [];
      idsToUnlink.forEach((targetId) => {
        profilePromises.push(
          db.from("profiles").delete().eq("id", targetId).then(() => {}).catch(() => {}),
          db.from("profiles")
            .update({
              role: "inativo" as any,
              status: "inativo",
              deleted_at: new Date().toISOString(),
            })
            .eq("id", targetId).then(() => {}).catch(() => {})
        );
      });
      if (clientEmail) {
        profilePromises.push(
          db.from("profiles")
            .update({
              role: "inativo" as any,
              status: "inativo",
              deleted_at: new Date().toISOString(),
            })
            .ilike("email", clientEmail).then(() => {}).catch(() => {})
        );
      }
      await Promise.allSettled(profilePromises);

      return { clientId, authUserId, clientEmail };
    },
    onMutate: async (input) => {
      const targetId = typeof input === "string" ? input : input.id;
      const targetEmail = typeof input === "object" ? input.email?.toLowerCase().trim() : undefined;

      await qc.cancelQueries({ queryKey: ["clients-list"] });
      const previousClients = qc.getQueryData<ClientItem[]>(["clients-list"]);

      if (previousClients) {
        qc.setQueryData<ClientItem[]>(
          ["clients-list"],
          previousClients.filter((c) => {
            if (c.id === targetId || c.auth_user_id === targetId || c.resolved_id === targetId)
              return false;
            if (targetEmail && c.email?.toLowerCase().trim() === targetEmail) return false;
            return true;
          })
        );
      }

      return { previousClients };
    },
    onError: (err: Error, _, context) => {
      if (context?.previousClients) {
        qc.setQueryData(["clients-list"], context.previousClients);
      }
      toast.error(`Erro ao excluir cliente: ${err.message}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Cliente e registros vinculados foram excluídos com sucesso.");
    },
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
        try {
          const { data } = await (supabase.from("clients") as any)
            .select("*")
            .or(`auth_user_id.eq.${userId},id.eq.${userId},email.ilike.${emailLower}`)
            .limit(1)
            .maybeSingle();
          clientRow = data;
        } catch {}

        if (!clientRow && (userId || emailLower)) {
          try {
            const { data: adminData } = await (supabaseAdmin.from("clients") as any)
              .select("*")
              .or(`auth_user_id.eq.${userId},id.eq.${userId},email.ilike.${emailLower}`)
              .limit(1)
              .maybeSingle();
            clientRow = adminData;
          } catch {}
        }
      }

      // Fetch profile data
      let profileRow: any = null;
      if (userId) {
        try {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          profileRow = pData;
        } catch {}

        if (!profileRow) {
          try {
            const { data: adminPData } = await supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .maybeSingle();
            profileRow = adminPData;
          } catch {}
        }
      }

      // If no client row exists, build a draft from profile
      if (!clientRow && profileRow) {
        clientRow = {
          id: profileRow.id,
          auth_user_id: profileRow.id,
          full_name: profileRow.full_name,
          email: profileRow.email,
          company_name: (profileRow as any).company_name || "",
          corporate_name: (profileRow as any).corporate_name || (profileRow as any).company_name || "",
          cnpj: profileRow.cpf_cnpj || profileRow.cnpj || "",
          segment: (profileRow as any).segment || "",
          address: (profileRow as any).address || "",
          city: (profileRow as any).city || "",
          state: (profileRow as any).state || "",
          cep: (profileRow as any).cep || "",
          role_position: (profileRow as any).cargo || "",
          phone: profileRow.phone || "",
          avatar_url: profileRow.avatar_url || "",
          onboarding_completed: profileRow.onboarding_completed || false,
          status: "ativo",
          created_at: profileRow.created_at,
        };
      }

      // Merge avatar_url if available
      const avatarUrl = clientRow?.avatar_url || profileRow?.avatar_url || "";

      // Fetch linked projects
      const resolvedId = clientRow?.id || userId;
      let projects: any[] = [];

      try {
        const queryIds = Array.from(
          new Set([resolvedId, userId, clientRow?.id, clientRow?.auth_user_id].filter(Boolean))
        );

        let query = supabase
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
          );

        if (queryIds.length === 1) {
          query = query.eq("client_id", queryIds[0]);
        } else if (queryIds.length > 1) {
          query = query.in("client_id", queryIds);
        }

        const { data: projData } = await query;

        if (projData) {
          projects = projData;
        }
      } catch (err) {
        console.warn("Error fetching client projects:", err);
      }

      return {
        ...clientRow,
        avatar_url: avatarUrl,
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
      const targetClientId = clientId || userId;
      const targetUserId = userId || clientId;

      // 1. Update/Upsert clients table
      if (targetClientId) {
        const clientPayload = {
          id: targetClientId,
          auth_user_id: targetUserId,
          full_name: patch.contact_name || patch.full_name || "Cliente",
          email: patch.email || "",
          ...patch,
          updated_at: new Date().toISOString(),
        };

        try {
          const { error: cErr } = await (supabase.from("clients") as any)
            .upsert(clientPayload, { onConflict: "id" });

          if (cErr) {
            console.warn("Primary client upsert warn, trying admin client:", cErr);
            await (supabaseAdmin.from("clients") as any).upsert(clientPayload, {
              onConflict: "id",
            });
          }
        } catch (err) {
          console.warn("Client upsert exception, trying admin client:", err);
          await (supabaseAdmin.from("clients") as any).upsert(clientPayload, {
            onConflict: "id",
          });
        }
      }

      // 2. Update profiles table if relevant fields changed
      if (targetUserId) {
        const profilePatch: any = {};
        if (patch.full_name || patch.contact_name) {
          profilePatch.full_name = patch.contact_name || patch.full_name;
        }
        if (patch.phone) profilePatch.phone = patch.phone;
        if (patch.cnpj) profilePatch.cpf_cnpj = patch.cnpj;
        if (patch.company_name) profilePatch.company_name = patch.company_name;
        if (patch.corporate_name) profilePatch.corporate_name = patch.corporate_name;
        if (patch.segment) profilePatch.segment = patch.segment;
        if (patch.email) profilePatch.email = patch.email;
        if (patch.address) profilePatch.address = patch.address;
        if (patch.city) profilePatch.city = patch.city;
        if (patch.state) profilePatch.state = patch.state;
        if (patch.cep) profilePatch.cep = patch.cep;
        if (patch.role_position) profilePatch.cargo = patch.role_position;
        if (patch.avatar_url) profilePatch.avatar_url = patch.avatar_url;
        if (typeof patch.onboarding_completed === "boolean") {
          profilePatch.onboarding_completed = patch.onboarding_completed;
        }
        profilePatch.updated_at = new Date().toISOString();

        if (Object.keys(profilePatch).length > 0) {
          try {
            const { error: pErr } = await supabase
              .from("profiles")
              .update(profilePatch)
              .eq("id", targetUserId);
            if (pErr) {
              await supabaseAdmin.from("profiles").update(profilePatch).eq("id", targetUserId);
            }
          } catch {
            await supabaseAdmin.from("profiles").update(profilePatch).eq("id", targetUserId);
          }
        }
      }

      return patch;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["current-client-profile"] });
      qc.invalidateQueries({ queryKey: ["client-detail", v.clientId] });
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Dados corporativos salvos com sucesso!");
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
      const res = await sendClientAccessInviteEmail({
        to: { name: client.name, email: client.email },
        companyName: client.companyName,
      });
      if (res && !res.success) {
        throw new Error(res.error || "Falha no envio de e-mail");
      }
      return res;
    },
    onSuccess: (_data, client) => toast.success(`Convite reenviado com sucesso para ${client.email}!`),
    onError: (e: Error) => {
      console.warn("Falha no reenvio de convite:", e.message);
    },
  });
}


