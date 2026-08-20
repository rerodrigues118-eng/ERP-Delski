import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { WikiArticle } from "@/mocks/types";

function normalizeArticle(row: any): WikiArticle {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
    audience: row.audience ?? "todos",
    attachmentUrl: row.attachment_url ?? row.attachmentUrl ?? null,
    createdBy: row.created_by ?? row.createdBy ?? null,
  } as WikiArticle;
}

function canReadArticleByAudience(
  audience: WikiArticle["audience"] | undefined,
  role: string | null,
) {
  const normalizedRole = (role || "").toLowerCase();
  const resolvedAudience = audience ?? "todos";

  if (
    normalizedRole === "gestor" ||
    normalizedRole === "admin" ||
    normalizedRole === "manager" ||
    normalizedRole === "administrator"
  ) {
    return true;
  }

  if (normalizedRole === "freelancer") {
    return resolvedAudience === "todos" || resolvedAudience === "freelancers";
  }

  if (normalizedRole === "cliente" || normalizedRole === "client") {
    return resolvedAudience === "todos" || resolvedAudience === "clientes";
  }

  return resolvedAudience === "todos";
}

export function useWikiArticles() {
  const { role } = useAuth();

  return useQuery({
    queryKey: ["wiki-articles", role],
    queryFn: async (): Promise<WikiArticle[]> => {
      const { data, error } = await supabase
        .from("wiki_articles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const filtered = (data ?? []).filter((row) =>
        canReadArticleByAudience(row.audience ?? "todos", role),
      );
      return filtered.map(normalizeArticle);
    },
  });
}

export function useSaveWikiArticle() {
  const qc = useQueryClient();
  const { isGestor } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      category: WikiArticle["category"];
      content: string;
      audience?: WikiArticle["audience"];
      attachmentUrl?: string | null;
    }) => {
      if (!isGestor) {
        throw new Error("Somente gestores podem criar ou editar artigos da Wiki.");
      }

      const { data: userData } = await supabase.auth.getUser();
      const createdBy = userData.user?.id ?? null;
      const nowIso = new Date().toISOString();

      if (input.id) {
        const { data, error } = await supabase
          .from("wiki_articles")
          .update({
            title: input.title,
            category: input.category,
            content: input.content,
            audience: input.audience ?? "todos",
            attachment_url: input.attachmentUrl ?? null,
            updated_at: nowIso,
          })
          .eq("id", input.id)
          .select()
          .maybeSingle();

        if (error) throw error;
        return normalizeArticle(
          data ?? { id: input.id, ...input, updated_at: nowIso, created_by: createdBy },
        );
      }

      const { data, error } = await supabase
        .from("wiki_articles")
        .insert({
          title: input.title,
          category: input.category,
          content: input.content,
          audience: input.audience ?? "todos",
          attachment_url: input.attachmentUrl ?? null,
          created_by: createdBy,
          updated_at: nowIso,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return normalizeArticle(
        data ?? { id: input.id, ...input, updated_at: nowIso, created_by: createdBy },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wiki-articles"] });
      toast.success("Artigo salvo.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível salvar o artigo.");
    },
  });
}

export function useDeleteWikiArticle() {
  const qc = useQueryClient();
  const { isGestor } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isGestor) {
        throw new Error("Somente gestores podem remover artigos da Wiki.");
      }

      const { error } = await supabase.from("wiki_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wiki-articles"] });
      toast.success("Artigo removido.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível remover o artigo.");
    },
  });
}
