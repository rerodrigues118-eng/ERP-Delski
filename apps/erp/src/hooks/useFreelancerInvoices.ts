import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import type {
  FreelancerInvoicesRow,
  FreelancerInvoiceStatus,
} from "@/types/database";
import { toast } from "sonner";

export interface FreelancerInvoiceItem extends FreelancerInvoicesRow {
  freelancer_name?: string;
  freelancer_email?: string;
}

// ── Query: Fetch freelancer invoices (Filtered by freelancerId or all for gestor) ─
export function useFreelancerInvoices(freelancerId?: string) {
  return useQuery({
    queryKey: ["freelancer_invoices", freelancerId],
    queryFn: async (): Promise<FreelancerInvoiceItem[]> => {
      let rawInvoices: any[] = [];

      // 1. Tentar busca padrão com client
      try {
        let q = (supabase.from("freelancer_invoices") as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (freelancerId) {
          q = q.eq("freelancer_id", freelancerId);
        }

        const { data, error } = await q;
        if (!error && data) {
          rawInvoices = data;
        }
      } catch (err) {
        console.warn("[useFreelancerInvoices] Client error:", err);
      }

      // 2. Fallback com supabaseAdmin se vazio
      if (rawInvoices.length === 0 && freelancerId) {
        try {
          const { data: adminData } = await (supabaseAdmin.from("freelancer_invoices") as any)
            .select("*")
            .eq("freelancer_id", freelancerId)
            .order("created_at", { ascending: false });

          if (adminData) {
            rawInvoices = adminData;
          }
        } catch {}
      }

      return rawInvoices.map((row: any) => ({
        ...row,
        freelancer_name: row.provider_name || "Prestador",
        freelancer_email: row.email,
      }));
    },
  });
}

// ── Mutation: Create/Upload Freelancer Invoice ────────────────────────────────
export function useCreateFreelancerInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      freelancerId,
      invoiceNumber,
      issueDate,
      competence,
      amount,
      providerName,
      pdfFile,
      xmlFile,
    }: {
      freelancerId: string;
      invoiceNumber: string;
      issueDate: string;
      competence: string;
      amount: number;
      providerName: string;
      pdfFile: File;
      xmlFile?: File | null;
    }) => {
      const timestamp = Date.now();
      const pdfExt = pdfFile.name.split(".").pop();
      const pdfPath = `${freelancerId}/nf_${invoiceNumber.replace(/\D/g, "")}_${timestamp}.${pdfExt}`;

      // 1. Upload PDF
      const { error: pdfErr } = await supabase.storage
        .from("freelancer-invoices")
        .upload(pdfPath, pdfFile, { upsert: true });

      if (pdfErr) throw pdfErr;

      const { data: pdfPub } = supabase.storage
        .from("freelancer-invoices")
        .getPublicUrl(pdfPath);
      const pdfUrl = pdfPub?.publicUrl || "";

      // 2. Upload XML if provided
      let xmlPath: string | null = null;
      let xmlUrl: string | null = null;

      if (xmlFile) {
        const xmlExt = xmlFile.name.split(".").pop();
        xmlPath = `${freelancerId}/nf_${invoiceNumber.replace(/\D/g, "")}_${timestamp}.${xmlExt}`;
        const { error: xmlErr } = await supabase.storage
          .from("freelancer-invoices")
          .upload(xmlPath, xmlFile, { upsert: true });

        if (!xmlErr) {
          const { data: xmlPub } = supabase.storage
            .from("freelancer-invoices")
            .getPublicUrl(xmlPath);
          xmlUrl = xmlPub?.publicUrl || null;
        }
      }

      // 3. Insert record into freelancer_invoices
      const { data: record, error: insertErr } = await (
        supabase.from("freelancer_invoices") as any
      )
        .insert([
          {
            freelancer_id: freelancerId,
            invoice_number: invoiceNumber.trim(),
            issue_date: issueDate,
            competence: competence.trim(),
            amount: Number(amount) || 0,
            provider_name: providerName.trim(),
            file_path: pdfPath,
            file_url: pdfUrl,
            xml_file_path: xmlPath,
            xml_file_url: xmlUrl,
            status: "Em análise",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;

      return record;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["freelancer_invoices"] });
      qc.invalidateQueries({ queryKey: ["freelancer_invoices", v.freelancerId] });
      toast.success("Nota Fiscal enviada para análise com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao cadastrar Nota Fiscal: ${err.message}`);
    },
  });
}

// ── Mutation: Review Freelancer Invoice (Gestor) ──────────────────────────────
export function useReviewFreelancerInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      status,
      reviewNotes,
      reviewedBy,
    }: {
      invoiceId: string;
      status: FreelancerInvoiceStatus;
      reviewNotes?: string;
      reviewedBy?: string;
    }) => {
      const { data, error } = await (
        supabase.from("freelancer_invoices") as any
      )
        .update({
          status,
          review_notes: reviewNotes || null,
          reviewed_by: reviewedBy || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["freelancer_invoices"] });
      toast.success(`Nota Fiscal alterada para "${v.status}".`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao revisar Nota Fiscal: ${err.message}`);
    },
  });
}

// ── Mutation: Delete Freelancer Invoice ──────────────────────────────────────
export function useDeleteFreelancerInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      filePath,
      xmlPath,
    }: {
      invoiceId: string;
      filePath?: string;
      xmlPath?: string | null;
    }) => {
      // Remove storage files
      const toRemove = [filePath, xmlPath].filter(Boolean) as string[];
      if (toRemove.length > 0) {
        try {
          await supabase.storage.from("freelancer-invoices").remove(toRemove);
        } catch (e) {
          console.warn("Failed to remove storage files:", e);
        }
      }

      const { error } = await (supabase.from("freelancer_invoices") as any)
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelancer_invoices"] });
      toast.success("Nota Fiscal excluída.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir Nota Fiscal: ${err.message}`);
    },
  });
}
