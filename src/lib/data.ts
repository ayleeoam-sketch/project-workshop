import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FieldDef } from "./generate";
import type { PdfPosition } from "./recognition";

export const meQuery = queryOptions({
  queryKey: ["me"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    const isAdmin = !!roles?.some((r) => r.role === "admin") && profile?.status === "active";
    return { user, profile, isAdmin };
  },
});

export async function logActivity(action: string, entity_type: string, entity_id: string | null, details: Record<string, unknown> = {}) {
  await supabase.from("activity_logs").insert({ action, entity_type, entity_id, details: details as never });
}

export async function downloadFromStorage(bucket: "templates" | "generated", path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(error?.message ?? "Could not download file");
  return data;
}

export async function fetchTemplateFields(templateId: string): Promise<FieldDef[]> {
  const { data, error } = await supabase.from("template_fields").select("*").eq("template_id", templateId).order("sort_order");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    key: f.key, label: f.label, field_type: f.field_type, required: f.required,
    options: f.options ?? [], position: (f.position as unknown as PdfPosition | null) ?? null,
  }));
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    return data ?? { id: 1, business_name: "AY-LEE INTEGRATED VENTURES", max_upload_mb: 10, updated_at: "" };
  },
});

/** Save a generated file to private storage and record it. Returns the document id. */
export async function saveGeneratedDocument(opts: {
  userId: string; templateId: string; templateName: string; title: string;
  format: "docx" | "pdf"; blob: Blob; data: Record<string, string>; batchId?: string;
}) {
  const id = crypto.randomUUID();
  const path = `${opts.userId}/${id}.${opts.format}`;
  const up = await supabase.storage.from("generated").upload(path, opts.blob, { contentType: opts.blob.type });
  if (up.error) throw new Error(up.error.message);
  const { error } = await supabase.from("generated_documents").insert({
    id, template_id: opts.templateId, template_name: opts.templateName, title: opts.title,
    format: opts.format, storage_path: path, batch_id: opts.batchId ?? null, generated_by: opts.userId,
  });
  if (error) {
    await supabase.storage.from("generated").remove([path]);
    throw new Error(error.message);
  }
  await supabase.from("document_data").insert({ document_id: id, data: opts.data });
  return id;
}

export function fmtDate(s: string) {
  return new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
