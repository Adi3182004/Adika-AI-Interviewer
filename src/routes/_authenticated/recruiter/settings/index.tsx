import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Shield, Users, Building2, Sparkles, Crown, UserCog, Mail, Copy, Trash2, UserPlus } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyTeam, inviteTeammate, revokeInvite, removeTeammate, renameMyTeam } from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/recruiter/settings/")({
  head: () => ({ meta: [{ title: "Settings — Recruiter" }] }),
  component: SettingsPage,
});

type RoleRow = { id: string; user_id: string; role: "candidate" | "recruiter" | "admin" };
type ProfileRow = { id: string; email: string | null; full_name: string | null; company_name: string | null; primary_role: string | null };

function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"workspace" | "team" | "invites" | "preferences">("workspace");

  const { data } = useQuery({
    queryKey: ["recruiter-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      return (await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle()).data;
    },
  });

  const { data: myRoles } = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as RoleRow[];
      return ((await supabase.from("user_roles").select("*").eq("user_id", u.user.id)).data ?? []) as RoleRow[];
    },
  });
  const isAdmin = useMemo(() => (myRoles ?? []).some(r => r.role === "admin"), [myRoles]);

  const { data: team } = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      const roles = ((await supabase.from("user_roles").select("*")).data ?? []) as RoleRow[];
      const ids = Array.from(new Set(roles.map(r => r.user_id)));
      if (!ids.length) return { roles, profiles: [] as ProfileRow[] };
      const profiles = ((await supabase.from("profiles").select("id,email,full_name,company_name,primary_role").in("id", ids)).data ?? []) as ProfileRow[];
      return { roles, profiles };
    },
  });

  const [form, setForm] = useState({ full_name: "", company_name: "", company_size: "", industry: "", hiring_goals: "" });
  const [prefs, setPrefs] = useState({ ai_briefs: true, email_digest: true, auto_match: true, redact_pii: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({
      full_name: data.full_name ?? "", company_name: data.company_name ?? "",
      company_size: data.company_size ?? "", industry: data.industry ?? "",
      hiring_goals: data.hiring_goals ?? "",
    });
  }, [data]);

  async function save() {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", data.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Workspace updated");
    qc.invalidateQueries({ queryKey: ["recruiter-profile"] });
  }

  async function changeRole(userId: string, newRole: RoleRow["role"]) {
    if (!isAdmin) return toast.error("Only admins can change roles");
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["team-roles"] });
  }

  const tabs = [
    { id: "workspace", label: "Workspace", icon: Building2 },
    { id: "invites", label: "Recruiter team", icon: UserPlus },
    { id: "team", label: "Roles", icon: Users },
    { id: "preferences", label: "AI Preferences", icon: Sparkles },
  ] as const;

  return (
    <RecruiterShell
      eyebrow="Workspace"
      title={<span>Recruiter <span className="text-gold">Command Settings</span></span>}
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${active ? "border-gold bg-gold-soft text-gold" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "workspace" && (
        <div className="glass mt-6 max-w-3xl rounded-2xl p-8 space-y-4">
          <div className="flex items-center gap-3 border-b border-gold/20 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-soft text-gold"><Building2 className="h-5 w-5" /></div>
            <div><p className="font-display text-lg text-gold">Workspace identity</p><p className="text-xs text-muted-foreground">Public profile for outbound messages and offer letters.</p></div>
          </div>
          <div><Label>Email</Label><Input value={data?.email ?? ""} disabled className="mt-1" /></div>
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" /></div>
          <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Company size</Label><Input value={form.company_size} onChange={(e) => setForm({ ...form, company_size: e.target.value })} className="mt-1" placeholder="e.g. 50-200" /></div>
            <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="mt-1" /></div>
          </div>
          <div><Label>Hiring goals</Label><Textarea value={form.hiring_goals} onChange={(e) => setForm({ ...form, hiring_goals: e.target.value })} className="mt-1" rows={3} placeholder="e.g. 10 engineers in Q1, focus on senior backend with payments domain" /></div>
          <Button onClick={save} disabled={saving} className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold/20">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save workspace
          </Button>
        </div>
      )}

      {tab === "team" && (
        <div className="glass mt-6 rounded-2xl p-8">
          <div className="flex items-center justify-between border-b border-gold/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-soft text-gold"><Shield className="h-5 w-5" /></div>
              <div>
                <p className="font-display text-lg text-gold">Team & role management</p>
                <p className="text-xs text-muted-foreground">{isAdmin ? "You can promote, demote, and assign workspace roles." : "Viewing only — admin permission required to edit roles."}</p>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full border-gold/40 text-gold">{(team?.profiles?.length ?? 0)} members</Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
            <table className="w-full text-sm">
              <thead className="bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(team?.profiles ?? []).map(p => {
                  const userRoles = (team?.roles ?? []).filter(r => r.user_id === p.id);
                  const primary = userRoles[0]?.role ?? "candidate";
                  return (
                    <tr key={p.id} className="border-t border-border/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {primary === "admin" && <Crown className="h-3.5 w-3.5 text-gold" />}
                          <span className="font-medium">{p.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map(r => (
                            <Badge key={r.id} variant="outline" className={`rounded-full text-[10px] ${r.role === "admin" ? "border-gold text-gold" : ""}`}>{r.role}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Select value={primary} onValueChange={(v) => changeRole(p.id, v as RoleRow["role"])} disabled={!isAdmin}>
                          <SelectTrigger className="ml-auto h-8 w-36 rounded-full text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="candidate">Candidate</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
                {!team?.profiles?.length && (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No team members yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {!isAdmin && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold-soft/30 p-3 text-xs text-gold">
              <UserCog className="h-4 w-4" /> Ask a workspace admin to elevate your account to manage roles.
            </p>
          )}
        </div>
      )}

      {tab === "invites" && <TeamInvitesPanel />}

      {tab === "preferences" && (
        <div className="glass mt-6 max-w-3xl rounded-2xl p-8 space-y-2">
          <div className="flex items-center gap-3 border-b border-gold/20 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-soft text-gold"><Sparkles className="h-5 w-5" /></div>
            <div><p className="font-display text-lg text-gold">AI hiring intelligence</p><p className="text-xs text-muted-foreground">Tune how AI augments your pipeline.</p></div>
          </div>
          {[
            { k: "ai_briefs", t: "Auto-generate recruiter briefs", d: "Summarize every new applicant with strengths, gaps, and signal score." },
            { k: "email_digest", t: "Daily pipeline digest", d: "Get a morning email of moves, replies, and at-risk candidates." },
            { k: "auto_match", t: "Auto-rank applicants", d: "Run match scoring the moment a new application is received." },
            { k: "redact_pii", t: "Redact PII for blind review", d: "Hide names, photos, and addresses on the pipeline board." },
          ].map(row => (
            <div key={row.k} className="flex items-center justify-between gap-4 rounded-xl border border-border/30 bg-card/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{row.t}</p>
                <p className="text-xs text-muted-foreground">{row.d}</p>
              </div>
              <Switch checked={(prefs as any)[row.k]} onCheckedChange={(v) => setPrefs(p => ({ ...p, [row.k]: v }))} />
            </div>
          ))}
          <Button onClick={() => toast.success("Preferences saved")} className="mt-4 rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold/20">
            <Save className="mr-2 h-4 w-4" /> Save preferences
          </Button>
        </div>
      )}
    </RecruiterShell>
  );
}

function TeamInvitesPanel() {
  const qc = useQueryClient();
  const ensure = useServerFn(ensureMyTeam);
  const invite = useServerFn(inviteTeammate);
  const revoke = useServerFn(revokeInvite);
  const remove = useServerFn(removeTeammate);
  const rename = useServerFn(renameMyTeam);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["my-team"],
    queryFn: async () => {
      const { team, role } = await ensure();
      const [members, invites] = await Promise.all([
        supabase.from("team_members").select("user_id,role,created_at").eq("team_id", team.id),
        supabase.from("team_invites").select("id,email,role,token,accepted_at,expires_at,created_at").eq("team_id", team.id).order("created_at", { ascending: false }),
      ]);
      const ids = (members.data ?? []).map(m => m.user_id);
      const profiles = ids.length
        ? (await supabase.from("profiles").select("id,email,full_name").in("id", ids)).data ?? []
        : [];
      return { team, role, members: members.data ?? [], invites: invites.data ?? [], profiles };
    },
  });

  const [email, setEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (teamData?.team?.name) setNewName(teamData.team.name); }, [teamData?.team?.name]);

  const isOwner = teamData?.role === "owner";

  async function doInvite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { invite: inv } = await invite({ data: { email: email.trim().toLowerCase(), role: "member" } });
      const link = `${window.location.origin}/team/invite/${inv.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Invite created · link copied", { description: link });
      setEmail("");
      qc.invalidateQueries({ queryKey: ["my-team"] });
    } catch (e: any) { toast.error(e.message ?? "Invite failed"); }
    setBusy(false);
  }

  async function doRevoke(id: string) {
    try { await revoke({ data: { inviteId: id } }); qc.invalidateQueries({ queryKey: ["my-team"] }); toast.success("Invite revoked"); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  async function doRemove(uid: string) {
    if (!confirm("Remove this teammate? They will lose access to your team's pipeline.")) return;
    try { await remove({ data: { userId: uid } }); qc.invalidateQueries({ queryKey: ["my-team"] }); toast.success("Removed"); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  async function doRename() {
    if (!newName.trim() || newName === teamData?.team?.name) return;
    try { await rename({ data: { name: newName.trim() } }); qc.invalidateQueries({ queryKey: ["my-team"] }); toast.success("Team renamed"); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/team/invite/${token}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copied"));
  }

  if (isLoading) return <div className="glass mt-6 rounded-2xl p-12 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;

  return (
    <div className="glass mt-6 rounded-2xl p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gold/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-soft text-gold"><UserPlus className="h-5 w-5" /></div>
          <div>
            <p className="font-display text-lg text-gold">Recruiter team</p>
            <p className="text-xs text-muted-foreground">Invite teammates so they can see the same jobs, applicants, and interview replays as you.</p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full border-gold/40 text-gold capitalize">{teamData?.role ?? "member"}</Badge>
      </div>

      {isOwner && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <Label>Team name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" placeholder="e.g. Acme Talent" />
          </div>
          <Button onClick={doRename} variant="outline" className="rounded-full border-gold/40 text-gold">Rename</Button>
        </div>
      )}

      {isOwner && (
        <div className="rounded-xl border border-gold/20 bg-gold-soft/30 p-4">
          <Label className="text-gold flex items-center gap-1"><Mail className="h-3 w-3" /> Invite a teammate by email</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input type="email" placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-[200px]" />
            <Button onClick={doInvite} disabled={busy || !email.trim()} className="rounded-full bg-gold text-background hover:bg-gold/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create invite link"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">A single-use link is generated and copied to your clipboard. Invites expire after 14 days.</p>
        </div>
      )}

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Members ({teamData?.members.length ?? 0})</p>
        <div className="overflow-hidden rounded-xl border border-border/30">
          <table className="w-full text-sm">
            <thead className="bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {(teamData?.members ?? []).map(m => {
                const p = (teamData?.profiles ?? []).find(x => x.id === m.user_id);
                return (
                  <tr key={m.user_id} className="border-t border-border/20">
                    <td className="px-4 py-3 flex items-center gap-2">{m.role === "owner" && <Crown className="h-3.5 w-3.5 text-gold" />}{p?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p?.email ?? "—"}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`rounded-full text-[10px] capitalize ${m.role === "owner" ? "border-gold text-gold" : ""}`}>{m.role}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {isOwner && m.role !== "owner" && (
                        <Button size="sm" variant="ghost" onClick={() => doRemove(m.user_id)} className="text-xs text-muted-foreground hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!!teamData?.invites?.filter(i => !i.accepted_at).length && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pending invites</p>
          <div className="space-y-2">
            {teamData!.invites.filter(i => !i.accepted_at).map(i => (
              <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/30 px-4 py-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{i.email}</span>
                <span className="text-[11px] text-muted-foreground">expires {new Date(i.expires_at).toLocaleDateString()}</span>
                <Button size="sm" variant="ghost" onClick={() => copyLink(i.token)} className="text-xs"><Copy className="mr-1 h-3 w-3" /> Copy link</Button>
                {isOwner && <Button size="sm" variant="ghost" onClick={() => doRevoke(i.id)} className="text-xs text-rose-500/80 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
