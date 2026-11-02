import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "is_admin", args: { _user_id: string }) => PromiseLike<{ data: boolean | null }> }; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Only an active administrator can do this.");
}

function checkPassword(p: string) {
  if (typeof p !== "string" || p.length < 8) throw new Error("Password must be at least 8 characters.");
}

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; fullName: string; password: string }) => {
    const email = String(d.email ?? "").trim().toLowerCase();
    const fullName = String(d.fullName ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
    if (!fullName || fullName.length > 120) throw new Error("Enter the staff member's name.");
    checkPassword(d.password);
    return { email, fullName, password: d.password };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
      app_metadata: { created_by_admin: true },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    await context.supabase.from("activity_logs").insert({
      action: "Created staff account", entity_type: "staff", entity_id: created.user.id, details: { email: data.email, name: data.fullName },
    });
    return { id: created.user.id };
  });

export const setStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; status: "active" | "suspended" }) => {
    if (!["active", "suspended"].includes(d.status)) throw new Error("Invalid status");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("You can't suspend your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.status === "suspended" ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.userId);
    await context.supabase.from("activity_logs").insert({
      action: data.status === "suspended" ? "Suspended staff" : "Reactivated staff", entity_type: "staff", entity_id: data.userId,
    });
    return { ok: true };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "staff" }) => {
    if (!["admin", "staff"].includes(d.role)) throw new Error("Invalid role");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("You can't change your own role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await context.supabase.from("activity_logs").insert({
      action: `Changed role to ${data.role.toUpperCase()}`, entity_type: "staff", entity_id: data.userId,
    });
    return { ok: true };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; password: string }) => {
    checkPassword(d.password);
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    await context.supabase.from("activity_logs").insert({ action: "Reset staff password", entity_type: "staff", entity_id: data.userId });
    return { ok: true };
  });
