import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  CheckCircle2,
  Circle,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  FileText,
  Mic2,
  Brain,
  MessageSquare,
  BookOpen,
  RefreshCw,
  Loader2,
  AlertCircle,
  Star,
  TrendingUp,
  Award,
  Zap,
  ChevronRight,
} from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/candidate/readiness/")({
  head: () => ({ meta: [{ title: "Readiness Hub — Adika AI" }] }),
  component: ReadinessPage,
});

type Item = { id: string; done: boolean; label: string };

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 65) return "text-amber-500";
  return "text-rose-500";
}
function scoreBarColor(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 65) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-rose-500";
}
function statusBadge(overall: number) {
  if (overall >= 80) return { label: "Job-ready 🎯", cls: "bg-emerald-500/15 text-emerald-600" };
  if (overall >= 65) return { label: "On track", cls: "bg-primary/15 text-primary" };
  if (overall >= 40) return { label: "Needs work", cls: "bg-amber-500/15 text-amber-600" };
  return { label: "Just starting", cls: "bg-rose-500/15 text-rose-600" };
}

function ReadinessPage() {
  const qc = useQueryClient();

  // ── Selected resume ──────────────────────────────────────────────────────────
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");

  // ── Local checklist state ────────────────────────────────────────────────────
  const [localItems, setLocalItems] = useState<Item[]>([]);
  const [itemsSeeded, setItemsSeeded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const toggle = (id: string) =>
    setLocalItems((xs) => xs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const removeItem = (id: string) => setLocalItems((xs) => xs.filter((x) => x.id !== id));
  const startEdit = (it: Item) => { setEditingId(it.id); setEditText(it.label); };
  const saveEdit = () => {
    if (!editingId) return;
    setLocalItems((xs) => xs.map((x) => (x.id === editingId ? { ...x, label: editText.trim() || x.label } : x)));
    setEditingId(null);
  };
  const addNew = () => {
    const t = newText.trim();
    if (!t) return;
    setLocalItems((xs) => [...xs, { id: crypto.randomUUID(), done: false, label: t }]);
    setNewText("");
    setAdding(false);
  };

  // ── Fetch all data ───────────────────────────────────────────────────────────
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["readiness-hub"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;

      const [resumeRes, sessionsRes, learningRes, profileRes] = await Promise.all([
        supabase
          .from("resumes")
          .select("id,title,ats_score,is_primary,targeted_feedback,role_target,parsed_skills,content")
          .eq("user_id", uid),
        supabase
          .from("interview_sessions")
          .select("id,readiness_score,overall_score,status,role_target,created_at")
          .eq("candidate_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("learning_items")
          .select("id,skill,status,roadmap")
          .eq("candidate_id", uid),
        supabase
          .from("profiles")
          .select("full_name,experience_level,hiring_goals")
          .eq("id", uid)
          .maybeSingle(),
      ]);

      return {
        resumes: resumeRes.data ?? [],
        sessions: sessionsRes.data ?? [],
        learning: learningRes.data ?? [],
        profile: profileRes.data,
      };
    },
  });

  // Auto-select primary resume on load
  useEffect(() => {
    if (data?.resumes && data.resumes.length > 0 && !selectedResumeId) {
      const primary = data.resumes.find((r) => r.is_primary);
      setSelectedResumeId(primary ? primary.id : data.resumes[0].id);
    }
  }, [data?.resumes, selectedResumeId]);

  // Reset checklist when resume changes
  useEffect(() => {
    setLocalItems([]);
    setItemsSeeded(false);
  }, [selectedResumeId]);

  if (isLoading) {
    return (
      <CandidateShell eyebrow="Readiness hub" title="One number that tells you if you're ready">
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your readiness data…
        </div>
      </CandidateShell>
    );
  }

  // ── Derive data from selected resume ─────────────────────────────────────────
  const resumes = data?.resumes ?? [];
  const selectedResume = resumes.find((r) => r.id === selectedResumeId) ?? resumes[0];
  const tf = (selectedResume?.targeted_feedback as any) ?? null;

  const sessions = data?.sessions ?? [];
  const learning = data?.learning ?? [];

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalSessions = sessions.length;
  const doneLearning = learning.filter((l) => l.status === "done").length;
  const totalLearning = learning.length;

  // ── Pillar score computation ─────────────────────────────────────────────────
  // 1. Resume strength — ATS score of selected resume
  const resumeScore = selectedResume?.ats_score ?? 0;

  // 2. Skill coverage — from targeted analysis role_fit_score + learning progress
  const skillCoverage = tf?.role_fit_score != null
    ? Math.round(
        tf.role_fit_score * 0.80 +
        (totalLearning > 0 ? (doneLearning / totalLearning) * 20 : 0)
      )
    : totalLearning > 0
    ? Math.round((doneLearning / totalLearning) * 70 + 15)
    : resumeScore > 0 ? Math.round(resumeScore * 0.4) : 0;

  // 3. Interview performance — avg readiness_score from completed sessions
  const interviewScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((s, x) => s + (x.readiness_score ?? x.overall_score ?? 0), 0) /
            completedSessions.length
        )
      : 0;

  // 4. Communication — avg overall_score
  const commScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((s, x) => s + (x.overall_score ?? 0), 0) /
            completedSessions.length
        )
      : 0;

  // 5. Domain knowledge — role_fit_score * 0.9 or interview fallback
  const domainScore = tf?.role_fit_score != null
    ? Math.round(tf.role_fit_score * 0.9)
    : interviewScore > 0
    ? Math.round(interviewScore * 0.85)
    : resumeScore > 0 ? Math.round(resumeScore * 0.45) : 0;

  const PILLARS = [
    {
      name: "Resume strength",
      score: resumeScore,
      weight: 0.15,
      icon: FileText,
      detail: selectedResume
        ? `"${selectedResume.title}" · ATS ${resumeScore}/100`
        : "No resume selected",
    },
    {
      name: "Skill coverage",
      score: skillCoverage,
      weight: 0.25,
      icon: BookOpen,
      detail: `${doneLearning}/${totalLearning} skills mastered${tf?.role_fit_score != null ? ` · Role fit ${tf.role_fit_score}%` : ""}`,
    },
    {
      name: "Interview performance",
      score: interviewScore,
      weight: 0.3,
      icon: Mic2,
      detail: completedSessions.length > 0
        ? `Avg ${interviewScore}/100 across ${completedSessions.length} session${completedSessions.length !== 1 ? "s" : ""}`
        : "No completed sessions yet",
    },
    {
      name: "Communication",
      score: commScore,
      weight: 0.15,
      icon: MessageSquare,
      detail: commScore > 0
        ? `Avg response quality ${commScore}/100`
        : "Complete interview sessions to measure",
    },
    {
      name: "Domain knowledge",
      score: domainScore,
      weight: 0.15,
      icon: Brain,
      detail: tf?.role_fit_score != null
        ? `Derived from Role-Targeted Analysis`
        : interviewScore > 0
        ? `Inferred from interview performance`
        : "Run a Role-Targeted Analysis to measure",
    },
  ];

  const overall = Math.round(PILLARS.reduce((s, p) => s + p.score * p.weight, 0));
  const badge = statusBadge(overall);
  const pointsToTarget = Math.max(0, 85 - overall);
  const weakestPillar = [...PILLARS].sort((a, b) => a.score - b.score)[0];

  const targetRole =
    selectedResume?.role_target ??
    sessions[0]?.role_target ??
    (data?.profile?.hiring_goals as any)?.target_role ??
    null;

  const missingSkills: string[] = tf?.missing_skills ?? [];
  const actionItems: string[] = tf?.action_items ?? [];
  const drawbacks: any[] = tf?.drawbacks ?? [];
  const plusPoints: any[] = tf?.plus_points ?? [];

  // ── Smart checklist seeds ────────────────────────────────────────────────────
  const smartSeeds: Item[] = [
    selectedResume
      ? { id: "resume-upload", done: true, label: `Uploaded${selectedResume.is_primary ? " primary" : ""} resume: "${selectedResume.title}"` }
      : { id: "resume-upload", done: false, label: "Upload a resume to get started" },
    tf
      ? { id: "role-analysis", done: true, label: `Completed Role-Targeted Analysis for "${targetRole}"` }
      : { id: "role-analysis", done: false, label: `Run a Role-Targeted Analysis${selectedResume ? ` on "${selectedResume.title}"` : ""}` },
    completedSessions.length > 0
      ? { id: "sessions", done: completedSessions.length >= 5, label: `Completed ${completedSessions.length} of ${Math.max(10, totalSessions)} adaptive interview rounds` }
      : { id: "sessions", done: false, label: "Start your first adaptive mock interview session" },
    doneLearning > 0
      ? { id: "gaps", done: doneLearning >= 3, label: `Closed ${doneLearning} skill gap${doneLearning !== 1 ? "s" : ""}: ${learning.filter((l) => l.status === "done").slice(0, 3).map((l) => l.skill).join(", ")}` }
      : totalLearning > 0
      ? { id: "gaps", done: false, label: `Work through ${totalLearning} skill${totalLearning !== 1 ? "s" : ""} in your Learning Roadmap` }
      : { id: "gaps", done: false, label: "Open Learning Roadmap and apply your resume to generate skill tasks" },
    ...actionItems.slice(0, 3).map((a, i) => ({ id: `action-${i}`, done: false, label: a })),
    ...missingSkills.slice(0, 2).map((s, i) => ({
      id: `skill-${i}`,
      done: !!learning.find((l) => l.skill.toLowerCase() === s.toLowerCase() && l.status === "done"),
      label: `Master "${s}"${targetRole ? ` to close a key gap for ${targetRole}` : ""}`,
    })),
  ].slice(0, 8);

  // Seed local items on first load per resume
  if (!itemsSeeded && smartSeeds.length > 0) {
    setLocalItems(smartSeeds);
    setItemsSeeded(true);
  }

  const displayItems = localItems.length > 0 ? localItems : smartSeeds;

  return (
    <CandidateShell eyebrow="Readiness hub" title="One number that tells you if you're ready">

      {/* Resume selector bar */}
      <div className="glass rounded-2xl px-4 py-3 mb-6 flex flex-wrap items-center gap-3 border border-border/20">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          Resume context:
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
          <span className="text-xs text-amber-500">No resumes yet.</span>
        )}
        {selectedResume && (
          <Badge variant="outline" className="text-xs rounded-full">
            ATS: {selectedResume.ats_score ?? "—"}/100
          </Badge>
        )}
        {targetRole && (
          <Badge className="bg-primary/15 text-primary text-xs rounded-full">
            <Target className="h-3 w-3 mr-1" /> {targetRole}
          </Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { qc.invalidateQueries({ queryKey: ["readiness-hub"] }); refetch(); }}
          disabled={isRefetching}
          className="ml-auto gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Main score + pillars */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">

        {/* ── Score card ── */}
        <div className="glass rounded-2xl p-6 md:p-8 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {targetRole ?? "Your target"} · readiness
          </p>

          {/* Circular score display */}
          <div className="relative mt-4 mb-2">
            <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
              <circle cx="70" cy="70" r="58" fill="none" stroke="currentColor" strokeWidth="10" className="text-border/30" />
              <circle
                cx="70" cy="70" r="58"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={`${(overall / 100) * 364.4} 364.4`}
                strokeLinecap="round"
                className={overall >= 80 ? "text-emerald-500" : overall >= 65 ? "text-amber-500" : "text-rose-500"}
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl leading-none">{overall}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          <Badge className={`${badge.cls} text-xs px-3 py-1`}>
            {badge.label} · {completedSessions.length} / {Math.max(10, totalSessions)} sessions
          </Badge>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[260px]">
            {pointsToTarget > 0 ? (
              <>You're <span className="font-semibold text-foreground">{pointsToTarget} points</span> away from the
              typical bar. Boosting <span className="font-semibold text-foreground">{weakestPillar.name}</span> would
              push you over.</>
            ) : (
              <span className="text-emerald-600 font-medium">🎉 You've crossed the typical bar for this role!</span>
            )}
          </p>

          {/* Role analysis snapshot */}
          {tf ? (
            <div className="mt-5 w-full rounded-xl border border-border/40 bg-card/30 p-3 text-left space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Role analysis · {targetRole}</p>
              {tf.verdict && (
                <div className="flex items-start gap-2">
                  <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-snug">{tf.verdict}</p>
                </div>
              )}
              {missingSkills.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Skills to acquire:</p>
                  <div className="flex flex-wrap gap-1">
                    {missingSkills.slice(0, 6).map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 text-rose-500 border-rose-500/30">{s}</Badge>
                    ))}
                    {missingSkills.length > 6 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{missingSkills.length - 6}</Badge>
                    )}
                  </div>
                </div>
              )}
              {plusPoints.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Plus points:</p>
                  <ul className="space-y-0.5">
                    {plusPoints.slice(0, 2).map((p: any, i: number) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        {p.title ?? p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : selectedResume ? (
            <div className="mt-4 w-full flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3 text-left">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Run a <strong>Role-Targeted Analysis</strong> on this resume to unlock precise scoring.{" "}
                <Link to={`/candidate/resumes/${selectedResume.id}`} className="underline font-medium text-primary">
                  Analyze now →
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-4 w-full flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-left">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Upload a resume to unlock readiness scoring.{" "}
                <Link to="/candidate/resumes" className="underline font-medium">Go to Resumes →</Link>
              </p>
            </div>
          )}
        </div>

        {/* ── Pillars + gaps ── */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-primary mb-4">Readiness pillars</p>
            <div className="space-y-5">
              {PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-semibold tabular-nums ${scoreColor(p.score)}`}>{p.score}</span>
                        <span className="text-[10px] text-muted-foreground">· {Math.round(p.weight * 100)}%</span>
                      </div>
                    </div>
                    <Progress value={p.score} className={`h-2 ${scoreBarColor(p.score)}`} />
                    <p className="mt-1 text-[11px] text-muted-foreground">{p.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drawbacks / gaps */}
          {drawbacks.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-primary mb-3">Key gaps to close</p>
              <ul className="space-y-2">
                {drawbacks.map((d: any, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-card/30 p-2.5">
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                      d.severity === "high" ? "bg-rose-500" :
                      d.severity === "medium" ? "bg-amber-500" : "bg-muted-foreground"
                    }`} />
                    <div>
                      <p className="text-xs font-medium">{d.title ?? d.point}</p>
                      {d.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{d.detail}</p>}
                    </div>
                    <Badge variant="outline" className={`ml-auto shrink-0 text-[10px] px-1.5 py-0 ${
                      d.severity === "high" ? "border-rose-500/30 text-rose-500" :
                      d.severity === "medium" ? "border-amber-500/30 text-amber-500" : ""
                    }`}>
                      {d.severity}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Mic2, label: "Sessions done", value: completedSessions.length, color: "text-primary" },
              { icon: BookOpen, label: "Skills closed", value: doneLearning, color: "text-emerald-500" },
              { icon: Award, label: "ATS score", value: resumeScore ? `${resumeScore}` : "—", color: "text-amber-500" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="glass rounded-xl p-3 flex flex-col items-center text-center">
                  <Icon className={`h-4 w-4 ${stat.color} mb-1`} />
                  <p className={`text-xl font-display font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What to do this week */}
      <div className="glass mt-6 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">What to do this week</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Personalised actions based on your resume & analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add task
            </Button>
            <Link
              to="/candidate/interviews"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Start next session <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {adding && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Input
              autoFocus
              placeholder="e.g. Practice 2 hard-tier DSA problems"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNew()}
              className="flex-1 min-w-[200px]"
            />
            <Button size="sm" onClick={addNew}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewText(""); }}>Cancel</Button>
          </div>
        )}

        <ul className="grid gap-2 sm:grid-cols-2">
          {displayItems.map((c) => (
            <li
              key={c.id}
              className="group flex items-start gap-2 rounded-xl border border-border/40 bg-card/40 p-3 text-sm"
            >
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className="mt-0.5 shrink-0"
                aria-label={c.done ? "Mark not done" : "Mark done"}
              >
                {c.done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                )}
              </button>

              {editingId === c.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    className="h-7"
                  />
                  <Button size="sm" variant="ghost" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 leading-snug ${c.done ? "text-muted-foreground line-through" : ""}`}>
                    {c.label}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 shrink-0">
                    <button onClick={() => startEdit(c)} className="text-muted-foreground hover:text-primary" aria-label="Edit">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeItem(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </CandidateShell>
  );
}
