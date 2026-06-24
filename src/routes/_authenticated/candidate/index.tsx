import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, FileText, Briefcase, Bot, ArrowRight } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/candidate/")({
  head: () => ({ meta: [{ title: "Dashboard — Candidate" }] }),
  component: CandidateDashboard,
});

function CandidateDashboard() {
  const { data } = useQuery({
    queryKey: ["candidate-dashboard"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const [profile, resumes, apps, sessions, learning] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.user.id).maybeSingle(),
        supabase.from("resumes").select("id,ats_score,is_primary,title").eq("user_id", user.user.id),
        supabase.from("applications").select("id,stage,match_score").eq("candidate_id", user.user.id),
        supabase.from("interview_sessions").select("id,readiness_score,overall_score,status,role_target,created_at").eq("candidate_id", user.user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("learning_items").select("id,status").eq("candidate_id", user.user.id),
      ]);
      return { profile: profile.data, resumes: resumes.data ?? [], apps: apps.data ?? [], sessions: sessions.data ?? [], learning: learning.data ?? [] };
    },
  });

  const primary = data?.resumes.find(r => r.is_primary) ?? data?.resumes[0];
  const lastSession = data?.sessions[0];
  const inProgress = data?.learning.filter(l => l.status !== "done").length ?? 0;

  return (
    <CandidateShell eyebrow="Welcome back" title={data?.profile?.full_name ? `Hello, ${data.profile.full_name.split(" ")[0]}` : "Your career hub"}>
      <div className="grid gap-6 md:grid-cols-4">
        <Kpi label="Resume score" value={primary?.ats_score != null ? `${primary.ats_score}` : "—"} sub={primary ? primary.title : "Upload to compute"} />
        <Kpi label="Interview readiness" value={lastSession?.readiness_score != null ? `${lastSession.readiness_score}` : "—"} sub={lastSession ? lastSession.role_target : "Run a mock session"} />
        <Kpi label="Applications" value={`${data?.apps.length ?? 0}`} sub={`${data?.apps.filter(a => a.stage === "interview").length ?? 0} in interview`} />
        <Kpi label="Learning items" value={`${inProgress}`} sub={`${(data?.learning.length ?? 0) - inProgress} completed`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Link to="/candidate/resumes" className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
          <FileText className="h-6 w-6 text-primary" />
          <p className="mt-4 font-display text-2xl">Resume Library</p>
          <p className="mt-1 text-sm text-muted-foreground">Build, edit, score and rewrite with AI.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
        </Link>
        <Link to="/candidate/jobs" className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
          <Briefcase className="h-6 w-6 text-primary" />
          <p className="mt-4 font-display text-2xl">Job Matching</p>
          <p className="mt-1 text-sm text-muted-foreground">Browse roles and see why you match.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
        </Link>
        <Link to="/candidate/interviews" className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
          <Bot className="h-6 w-6 text-primary" />
          <p className="mt-4 font-display text-2xl">AI Interviewer</p>
          <p className="mt-1 text-sm text-muted-foreground">Adaptive mock interviews with scoring.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">Start a session <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
        </Link>
      </div>

      {data?.sessions.length ? (
        <div className="glass mt-8 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" /><p className="font-medium">Recent interview sessions</p>
          </div>
          <ul className="mt-4 divide-y divide-border/60">
            {data.sessions.map(s => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{s.role_target}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()} · {s.status}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-xs">Score</span>
                  <span className="font-display text-xl">{s.overall_score ?? "—"}</span>
                  <Link to="/candidate/interviews/$id" params={{ id: s.id }}><Button size="sm" variant="ghost">View</Button></Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </CandidateShell>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
