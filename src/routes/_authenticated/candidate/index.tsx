import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Briefcase,
  Bot,
  ArrowRight,
  CheckCircle2,
  Circle,
  Download,
  Target,
  BookOpen,
  TrendingUp,
  Award,
  RefreshCw,
  Mic2,
  ChevronRight,
  LayoutDashboard,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { exportInterviewReport } from "@/lib/interview-export";

export const Route = createFileRoute("/_authenticated/candidate/")({
  head: () => ({ meta: [{ title: "Dashboard — Candidate" }] }),
  component: CandidateDashboard,
});

function scoreColor(n: number) {
  if (n >= 80) return "text-emerald-500";
  if (n >= 65) return "text-amber-500";
  return "text-rose-500";
}

function CandidateDashboard() {
  const qc = useQueryClient();
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["candidate-dashboard"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const [profile, resumes, apps, sessions, learning] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,phone,education,experience_level,avatar_url,hiring_goals")
          .eq("id", user.user.id)
          .maybeSingle(),
        supabase
          .from("resumes")
          .select("id,ats_score,is_primary,title,role_target,targeted_feedback,parsed_skills")
          .eq("user_id", user.user.id),
        supabase
          .from("applications")
          .select("id,stage,match_score")
          .eq("candidate_id", user.user.id),
        supabase
          .from("interview_sessions")
          .select("id,readiness_score,overall_score,status,role_target,created_at")
          .eq("candidate_id", user.user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("learning_items")
          .select("id,status,skill")
          .eq("candidate_id", user.user.id),
      ]);
      return {
        profile: profile.data,
        resumes: resumes.data ?? [],
        apps: apps.data ?? [],
        sessions: sessions.data ?? [],
        learning: learning.data ?? [],
      };
    },
  });

  // Auto-select primary resume
  useEffect(() => {
    if (data?.resumes && data.resumes.length > 0 && !selectedResumeId) {
      const primary = data.resumes.find((r) => r.is_primary);
      setSelectedResumeId(primary ? primary.id : data.resumes[0].id);
    }
  }, [data?.resumes, selectedResumeId]);

  // ─── Derived data from selected resume ────────────────────────────────────
  const resumes = data?.resumes ?? [];
  const selectedResume = resumes.find((r) => r.id === selectedResumeId) ?? resumes[0];
  const tf = (selectedResume?.targeted_feedback as any) ?? null;

  const sessions = data?.sessions ?? [];
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const lastSession = sessions[0];
  const avgReadiness =
    completedSessions.length > 0
      ? Math.round(completedSessions.reduce((s, x) => s + (x.readiness_score ?? 0), 0) / completedSessions.length)
      : null;

  const learning = data?.learning ?? [];
  const doneLearning = learning.filter((l) => l.status === "done").length;
  const inProgress = learning.filter((l) => l.status === "in_progress").length;
  const todoLearning = learning.filter((l) => l.status === "todo").length;

  const apps = data?.apps ?? [];
  const inInterview = apps.filter((a) => a.stage === "interview").length;

  // Profile completeness
  const p = data?.profile;
  const profileFields = [p?.full_name, p?.phone, p?.education, p?.experience_level, p?.avatar_url];
  const profilePct = p
    ? Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100)
    : 0;

  // Target role from selected resume or sessions
  const targetRole = selectedResume?.role_target ?? sessions[0]?.role_target ?? null;

  // Onboarding checklist
  const steps = [
    { done: !!p?.full_name && !!p?.experience_level, label: "Complete your profile", to: "/candidate/profile" },
    { done: resumes.length > 0, label: "Upload your first resume", to: "/candidate/resumes" },
    { done: !!tf, label: "Run a Role-Targeted Analysis", to: selectedResume ? `/candidate/resumes/${selectedResume.id}` : "/candidate/resumes" },
    { done: apps.length > 0, label: "Apply to a matching job", to: "/candidate/jobs" },
    { done: completedSessions.length > 0, label: "Complete a mock interview", to: "/candidate/interviews" },
    { done: doneLearning > 0, label: "Close your first skill gap", to: "/candidate/learning" },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const showChecklist = stepsDone < steps.length;

  // Quick actions for feature cards
  const featureCards = [
    {
      icon: FileText,
      title: "Resume Center",
      desc: "Build, score and AI-tailor your resume.",
      link: "/candidate/resumes",
      cta: "Open",
      badge: selectedResume ? `ATS ${selectedResume.ats_score ?? "—"}` : undefined,
    },
    {
      icon: Target,
      title: "Resume Tailoring",
      desc: "Rewrite bullets to match any job description.",
      link: "/candidate/tailor",
      cta: "Tailor",
      badge: undefined,
    },
    {
      icon: TrendingUp,
      title: "Gap Analysis",
      desc: "See skill gaps vs your target role.",
      link: "/candidate/gap",
      cta: "Analyze",
      badge: tf ? `${(tf.drawbacks ?? []).length} gaps` : undefined,
    },
    {
      icon: Briefcase,
      title: "Job Matching",
      desc: "Browse roles and see why you match.",
      link: "/candidate/jobs",
      cta: "Browse",
      badge: apps.length > 0 ? `${apps.length} applied` : undefined,
    },
    {
      icon: Bot,
      title: "Adaptive Interview",
      desc: "Adaptive mock interviews with AI scoring.",
      link: "/candidate/interviews",
      cta: "Start session",
      badge: completedSessions.length > 0 ? `${completedSessions.length} done` : undefined,
    },
    {
      icon: Zap,
      title: "Readiness Hub",
      desc: "One score that tells you if you're ready.",
      link: "/candidate/readiness",
      cta: "View score",
      badge: undefined,
    },
    {
      icon: BookOpen,
      title: "Learning Center",
      desc: "AI roadmaps for every skill gap.",
      link: "/candidate/learning",
      cta: "Open",
      badge: learning.length > 0 ? `${doneLearning}/${learning.length} done` : undefined,
    },
  ];

  return (
    <CandidateShell
      eyebrow="Welcome back"
      title={p?.full_name ? `Hello, ${p.full_name.split(" ")[0]}` : "Your career hub"}
    >
      {/* ── Resume selector bar ── */}
      <div className="glass rounded-2xl px-4 py-3 mb-6 flex flex-wrap items-center gap-3 border border-border/20">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          Active resume:
        </Label>
        {resumes.length > 0 ? (
          <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
            <SelectTrigger className="w-[200px] sm:w-[260px] bg-background/40 backdrop-blur-md border border-border/60 rounded-full h-9 px-4 text-sm">
              <SelectValue placeholder="Select resume" />
            </SelectTrigger>
            <SelectContent>
              {resumes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title} {r.is_primary ? "(Primary)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Link to="/candidate/resumes">
            <Button size="sm" variant="outline" className="rounded-full h-9 text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Upload resume
            </Button>
          </Link>
        )}
        {selectedResume?.ats_score != null && (
          <Badge variant="outline" className="rounded-full text-xs">
            ATS {selectedResume.ats_score}/100
          </Badge>
        )}
        {targetRole && (
          <Badge className="bg-primary/15 text-primary rounded-full text-xs gap-1">
            <Target className="h-3 w-3" /> {targetRole}
          </Badge>
        )}
        {tf && (
          <Badge className="bg-emerald-500/15 text-emerald-600 rounded-full text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" /> Role analysis done
          </Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { qc.invalidateQueries({ queryKey: ["candidate-dashboard"] }); refetch(); }}
          disabled={isRefetching}
          className="ml-auto gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Resume score */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Resume score</p>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`font-display text-4xl ${selectedResume?.ats_score != null ? scoreColor(selectedResume.ats_score) : "text-foreground"}`}>
            {selectedResume?.ats_score != null ? selectedResume.ats_score : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {selectedResume ? selectedResume.title : "Upload a resume"}
          </p>
          {selectedResume?.ats_score != null && (
            <Progress value={selectedResume.ats_score} className="mt-2 h-1.5" />
          )}
        </div>

        {/* Interview readiness */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Interview readiness</p>
            <Mic2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`font-display text-4xl ${avgReadiness != null ? scoreColor(avgReadiness) : "text-foreground"}`}>
            {avgReadiness != null ? avgReadiness : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedSessions.length > 0
              ? `${completedSessions.length} session${completedSessions.length !== 1 ? "s" : ""} completed`
              : "Run a mock session"}
          </p>
          {avgReadiness != null && (
            <Progress value={avgReadiness} className="mt-2 h-1.5" />
          )}
        </div>

        {/* Applications */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Applications</p>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl">{apps.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {inInterview > 0 ? `${inInterview} in interview` : "None in interview yet"}
          </p>
          {apps.length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {["applied","screening","interview","offer","rejected"].map((stage) => {
                const count = apps.filter((a) => a.stage === stage).length;
                if (!count) return null;
                return (
                  <Badge key={stage} variant="outline" className="text-[10px] px-1.5 py-0">
                    {stage} {count}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Learning */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Learning</p>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl">{learning.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {doneLearning} done · {inProgress} in progress · {todoLearning} to do
          </p>
          {learning.length > 0 && (
            <Progress value={(doneLearning / learning.length) * 100} className="mt-2 h-1.5 [&>div]:bg-emerald-500" />
          )}
        </div>
      </div>

      {/* ── Role analysis snapshot (if available) ── */}
      {tf && (
        <div className="glass mt-6 rounded-2xl p-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary mb-2">Role fit · {targetRole}</p>
            <p className={`font-display text-4xl ${scoreColor(tf.role_fit_score ?? 0)}`}>
              {tf.role_fit_score ?? "—"}
              <span className="text-lg text-muted-foreground">%</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{tf.verdict ?? ""}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Skills to acquire</p>
            <div className="flex flex-wrap gap-1">
              {(tf.missing_skills ?? []).slice(0, 6).map((s: string) => (
                <Badge key={s} variant="outline" className="text-[10px] px-1.5 text-rose-500 border-rose-500/30">{s}</Badge>
              ))}
              {(tf.missing_skills ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">None identified</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Next actions</p>
            <ul className="space-y-1">
              {(tf.action_items ?? []).slice(0, 3).map((a: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span className="leading-snug">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Onboarding checklist ── */}
      {showChecklist && (
        <div className="glass mt-6 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Get started</p>
              <p className="mt-1 font-display text-2xl">Setup checklist</p>
            </div>
            <p className="text-sm text-muted-foreground">{stepsDone} of {steps.length} complete</p>
          </div>
          <Progress value={(stepsDone / steps.length) * 100} className="mt-3 h-1.5" />
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link
                  to={s.to}
                  className={`flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm transition hover:bg-accent/30 ${s.done ? "opacity-60" : ""}`}
                >
                  {s.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={s.done ? "line-through text-muted-foreground" : ""}>{s.label}</span>
                  {!s.done && <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground shrink-0" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Profile completion ── */}
      {profilePct < 100 && (
        <div className="glass mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Profile {profilePct}% complete</p>
            <Progress value={profilePct} className="mt-2 h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              A complete profile improves match scores and recruiter visibility.
            </p>
          </div>
          <Link to="/candidate/profile">
            <Button size="sm" variant="outline" className="rounded-full">Finish profile</Button>
          </Link>
        </div>
      )}

      {/* ── Feature grid ── */}
      <div className="mt-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">All features</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.link}
                className="glass group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-luxe flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  {card.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{card.badge}</Badge>
                  )}
                </div>
                <p className="mt-3 font-display text-lg leading-tight">{card.title}</p>
                <p className="mt-1 text-xs text-muted-foreground flex-1 leading-relaxed">{card.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium">
                  {card.cta} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Recent interview sessions ── */}
      {sessions.length > 0 && (
        <div id="interview-reports" className="glass mt-8 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="font-medium">Recent interview sessions</p>
            </div>
            <Link to="/candidate/interviews" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {sessions.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.role_target ?? "Untitled session"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    <span className={
                      s.status === "completed" ? "text-emerald-500" :
                      s.status === "active" ? "text-amber-500" : "text-muted-foreground"
                    }>{s.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {s.overall_score != null && (
                    <span className={`font-display text-2xl ${scoreColor(s.overall_score)}`}>
                      {s.overall_score}
                    </span>
                  )}
                  <Link to="/candidate/interviews/$id" params={{ id: s.id }}>
                    <Button size="sm" variant="ghost">View</Button>
                  </Link>
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
      )}
    </CandidateShell>
  );
}
