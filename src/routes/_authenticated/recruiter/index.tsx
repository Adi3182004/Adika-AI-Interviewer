import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, KanbanSquare, ArrowRight, Bot } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRecruiterIds } from "@/hooks/use-team-recruiter-ids";

export const Route = createFileRoute("/_authenticated/recruiter/")({
  head: () => ({ meta: [{ title: "Dashboard — Recruiter Pro" }] }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const { data: teamIds = [] } = useTeamRecruiterIds();
  const { data } = useQuery({
    queryKey: ["recruiter-dashboard", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [jobs, apps, sessions, profile] = await Promise.all([
        supabase.from("jobs").select("id,title,status").in("recruiter_id", teamIds),
        supabase.from("applications").select("id,stage,match_score,job_id,created_at,candidate_id,jobs!inner(recruiter_id)").in("jobs.recruiter_id", teamIds),
        supabase.from("interview_sessions").select("id,role_target,overall_score,created_at,job_id,jobs!inner(recruiter_id)").in("jobs.recruiter_id", teamIds).order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("full_name,company_name").eq("id", u.user.id).maybeSingle(),
      ]);
      return { jobs: jobs.data ?? [], apps: apps.data ?? [], sessions: sessions.data ?? [], profile: profile.data };
    },
  });

  const openRoles = data?.jobs.filter(j => j.status === "published").length ?? 0;
  const inInterview = data?.apps.filter(a => a.stage === "interview").length ?? 0;
  const avgMatch = data?.apps.length ? Math.round(data.apps.reduce((s, a) => s + (a.match_score ?? 0), 0) / data.apps.length) : 0;

  return (
    <RecruiterShell eyebrow={data?.profile?.company_name ?? "Your team"} title={<span><span className="text-gold">Welcome,</span> {data?.profile?.full_name?.split(" ")[0] ?? "Recruiter"}.</span>}>
      <div className="grid gap-6 md:grid-cols-4">
        <Kpi label="Open roles" value={`${openRoles}`} />
        <Kpi label="In pipeline" value={`${data?.apps.length ?? 0}`} />
        <Kpi label="In interview" value={`${inInterview}`} />
        <Kpi label="Avg match" value={avgMatch ? `${avgMatch}` : "—"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Tile to="/recruiter/jobs" icon={<Briefcase className="h-6 w-6" />} title="Jobs" sub="Post and publish roles" />
        <Tile to="/recruiter/pipeline" icon={<KanbanSquare className="h-6 w-6" />} title="Pipeline" sub="Move candidates through stages" />
        <Tile to="/recruiter/candidates" icon={<Users className="h-6 w-6" />} title="Candidates" sub="Search and shortlist" />
      </div>

      {!!data?.sessions.length && (
        <div className="glass mt-8 rounded-2xl p-6">
          <div className="flex items-center gap-3"><Bot className="h-5 w-5 text-gold" /><p className="font-medium">Recent interview replays</p></div>
          <ul className="mt-4 divide-y divide-border/40">
            {data.sessions.map(s => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <div><p className="font-medium">{s.role_target}</p><p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p></div>
                <div className="flex items-center gap-4"><span className="font-display text-xl text-gold">{s.overall_score ?? "—"}</span></div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </RecruiterShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl text-gold">{value}</p>
    </div>
  );
}

function Tile({ to, icon, title, sub }: { to: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link to={to as any} className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
      <span className="text-gold">{icon}</span>
      <p className="mt-4 font-display text-2xl">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
    </Link>
  );
}
