import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function randomToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns the user's team (creating a solo team on first call). */
export const ensureMyTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: mine } = await supabase
      .from("team_members")
      .select("team_id, role, recruiter_teams!inner(id,name,owner_id)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (mine) {
      const t = (mine as any).recruiter_teams;
      return { team: t, role: mine.role as string };
    }

    // Create a fresh team owned by this user
    const { data: team, error } = await supabase
      .from("recruiter_teams")
      .insert({ name: "My team", owner_id: userId })
      .select("id,name,owner_id")
      .single();
    if (error) throw new Error(error.message);

    const { error: memErr } = await supabase
      .from("team_members")
      .insert({ team_id: team.id, user_id: userId, role: "owner" });
    if (memErr) throw new Error(memErr.message);

    return { team, role: "owner" };
  });

export const renameMyTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(2).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: team } = await supabase.from("recruiter_teams").select("id").eq("owner_id", userId).maybeSingle();
    if (!team) throw new Error("Only the team owner can rename");
    const { error } = await supabase.from("recruiter_teams").update({ name: data.name }).eq("id", team.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const inviteTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().toLowerCase(), role: z.enum(["member", "admin"]).default("member") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: team } = await supabase.from("recruiter_teams").select("id").eq("owner_id", userId).maybeSingle();
    if (!team) throw new Error("Create a team first");

    const token = randomToken();
    const { data: invite, error } = await supabase
      .from("team_invites")
      .insert({ team_id: team.id, email: data.email, role: data.role, token, invited_by: userId })
      .select("id,email,role,token,expires_at")
      .single();
    if (error) throw new Error(error.message);
    return { invite };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_invites").delete().eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: team } = await supabase.from("recruiter_teams").select("id").eq("owner_id", userId).maybeSingle();
    if (!team) throw new Error("Only owner can remove members");
    if (data.userId === userId) throw new Error("Owners can't remove themselves");
    const { error } = await supabase.from("team_members").delete().eq("team_id", team.id).eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("team_invites")
      .select("id,team_id,email,role,expires_at,accepted_at,recruiter_teams(name)")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("Invite not found");
    if (invite.accepted_at) throw new Error("Invite already used");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite expired");

    // Add to team (idempotent)
    const { error: insErr } = await supabase
      .from("team_members")
      .upsert({ team_id: invite.team_id, user_id: userId, role: invite.role }, { onConflict: "team_id,user_id" });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin.from("team_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
    return { teamName: (invite as any).recruiter_teams?.name as string };
  });

/** Returns the recruiter user_ids visible to the caller (self + teammates). */
export const getTeamRecruiterIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("team_recruiter_ids");
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r: any) => (typeof r === "string" ? r : r.team_recruiter_ids)) as string[];
    if (!ids.includes(context.userId)) ids.push(context.userId);
    return { ids };
  });
