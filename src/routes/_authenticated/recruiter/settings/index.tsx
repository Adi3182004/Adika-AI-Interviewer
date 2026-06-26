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
