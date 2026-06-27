import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, FileText, Briefcase, Bot, ArrowRight, CheckCircle2, Circle, Download } from "lucide-react";
import { toast } from "sonner";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { exportInterviewReport } from "@/lib/interview-export";

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
        supabase.from("profiles").select("full_name,phone,education,experience_level,avatar_url").eq("id", user.user.id).maybeSingle(),
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

  // Profile completeness
  const p = data?.profile;
  const profileFields = [p?.full_name, p?.phone, p?.education, p?.experience_level, p?.avatar_url];
  const profilePct = p ? Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100) : 0;

  // Onboarding checklist
  const steps = [
    { done: !!p?.full_name && !!p?.experience_level, label: "Complete your profile", to: "/candidate/profile" },
    { done: (data?.resumes.length ?? 0) > 0, label: "Upload your first resume", to: "/candidate/resumes" },
    { done: (data?.apps.length ?? 0) > 0, label: "Apply to a matching job", to: "/candidate/jobs" },
    { done: (data?.sessions.length ?? 0) > 0, label: "Run a mock interview", to: "/candidate/interviews" },
    { done: (data?.learning.length ?? 0) > 0, label: "Start a learning plan", to: "/candidate/learning" },
  ];
  const stepsDone = steps.filter(s => s.done).length;
  const showChecklist = stepsDone < steps.length;

  return (
    <CandidateShell eyebrow="Welcome back" title={data?.profile?.full_name ? `Hello, ${data.profile.full_name.split(" ")[0]}` : "Your career hub"}>
      <div className="grid gap-6 md:grid-cols-4">
        <Kpi label="Resume score" value={primary?.ats_score != null ? `${primary.ats_score}` : "—"} sub={primary ? primary.title : "Upload to compute"} />
        <Kpi label="Interview readiness" value={lastSession?.readiness_score != null ? `${lastSession.readiness_score}` : "—"} sub={lastSession ? lastSession.role_target : "Run a mock session"} />
        <Kpi label="Applications" value={`${data?.apps.length ?? 0}`} sub={`${data?.apps.filter(a => a.stage === "interview").length ?? 0} in interview`} />
        <Kpi label="Learning items" value={`${inProgress}`} sub={`${(data?.learning.length ?? 0) - inProgress} completed`} />
      </div>

      {showChecklist && (
        <div className="glass mt-8 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Get started</p>
              <p className="mt-1 font-display text-2xl">First-run checklist</p>
            </div>
            <p className="text-sm text-muted-foreground">{stepsDone} of {steps.length} complete</p>
          </div>
          <Progress value={(stepsDone / steps.length) * 100} className="mt-3 h-1.5" />
          <ul className="mt-5 grid gap-2 md:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link to={s.to} className={`flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm transition hover:bg-accent/30 ${s.done ? "opacity-60" : ""}`}>
                  {s.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  <span className={s.done ? "line-through" : ""}>{s.label}</span>
                  {!s.done && <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profilePct < 100 && (
        <div className="glass mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Profile {profilePct}% complete</p>
            <Progress value={profilePct} className="mt-2 h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">A complete profile improves match scores and recruiter visibility.</p>
          </div>
          <Link to="/candidate/profile"><Button size="sm" variant="outline" className="rounded-full">Finish profile</Button></Link>
        </div>
      )}

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
        <div id="interview-reports" className="glass mt-8 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="font-medium">Your interview reports</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">AI-generated reports from every completed session. Download the PDF for offline review.</p>
          <ul className="mt-4 divide-y divide-border/60">
            {data.sessions.map(s => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{s.role_target}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()} · {s.status}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-xs">Score</span>
                  <span className="font-display text-xl">{s.overall_score ?? "—"}</span>
                  <Link to="/candidate/interviews/$id" params={{ id: s.id }}><Button size="sm" variant="ghost">View</Button></Link>
                  {s.status === "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => exportInterviewReport(s.id).catch((e) => toast.error(e.message ?? "Failed"))}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Report
                    </Button>
                  )}
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
