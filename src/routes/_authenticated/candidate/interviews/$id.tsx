import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  Loader2,
  Send,
  PartyPopper,
  Download,
  LayoutDashboard,
  Eye,
} from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { interviewTurn } from "@/lib/ai.functions";
import { exportInterviewReport } from "@/lib/interview-export";

export const Route = createFileRoute("/_authenticated/candidate/interviews/$id")({
  head: () => ({ meta: [{ title: "Interview Session" }] }),
  component: InterviewSession,
});

// ─── Evaluation card ─────────────────────────────────────────────────────────
function scoreLabel(s: number) {
  if (s >= 88) return { label: "Excellent", grade: "A+", color: "#10b981" };
  if (s >= 78) return { label: "Strong",    grade: "A",  color: "#22c55e" };
  if (s >= 68) return { label: "Good",      grade: "B",  color: "#84cc16" };
  if (s >= 55) return { label: "Decent",    grade: "C",  color: "#eab308" };
  if (s >= 35) return { label: "Weak",      grade: "D",  color: "#f97316" };
  return               { label: "Poor",     grade: "F",  color: "#ef4444" };
}

function EvaluationCard({ analysis, answerContent }: { analysis: any; answerContent?: string }) {
  const sig = (analysis?.signals ?? {}) as any;
  // If the raw answer was a non-answer (≤3 words), override the score to 0
  const answerWc = (answerContent ?? "").trim().split(/\s+/).filter(Boolean).length;
  const isNonAnswer = answerContent != null && answerWc <= 3;
  const score = isNonAnswer ? 0 : Math.max(0, Math.min(100, analysis?.score ?? 0));
  const { label, grade, color } = scoreLabel(score);

  const dims = [
    { label: "Clarity",   val: sig.clarity   as number | null },
    { label: "Technical", val: sig.technical as number | null },
    { label: "Depth",     val: sig.depth     as number | null },
  ].filter((d) => d.val != null);

  // SVG ring params
  const R = 26, C = 2 * Math.PI * R;
  const dash = (score / 100) * C;

  return (
    <div className="glass rounded-2xl p-5 space-y-4 text-sm">

      {/* ── Header row: ring + label + grade ── */}
      <div className="flex items-center gap-4">
        {/* Circular score ring */}
        <div className="relative shrink-0">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
            <circle
              cx="32" cy="32" r={R} fill="none"
              stroke={color} strokeWidth="5"
              strokeDasharray={`${dash} ${C}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <span className="text-xs font-bold leading-none" style={{ color }}>{grade}</span>
          </div>
        </div>

        {/* Score text + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums" style={{ color }}>{score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color }}>{label}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Answer evaluation</p>
        </div>
      </div>

      {isNonAnswer && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
          ⚠ Non-answer detected — score overridden to 0. Please provide a substantive response.
        </div>
      )}

      {/* ── Dimension bars ── */}
      {dims.length > 0 && (
        <div className="space-y-2">
          {dims.map((d) => {
            const v = d.val ?? 0;
            const barColor = v >= 70 ? "#22c55e" : v >= 45 ? "#eab308" : "#ef4444";
            return (
              <div key={d.label} className="flex items-center gap-2">
                <p className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {d.label}
                </p>
                <div className="relative h-2 flex-1 rounded-full bg-border/50 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${v}%`,
                      backgroundColor: barColor,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <p className="w-7 shrink-0 text-right text-xs font-medium tabular-nums" style={{ color: barColor }}>
                  {v}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Feedback ── */}
      {sig.feedback && (
        <p className="text-sm leading-relaxed text-foreground/90 border-l-2 border-primary/30 pl-3">
          {sig.feedback}
        </p>
      )}

      {/* ── What worked — pill badges ── */}
      {(sig.what_was_good as string[] | undefined)?.length ? (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Worked well
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(sig.what_was_good as string[]).map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── What to improve — numbered list ── */}
      {(sig.what_to_improve as string[] | undefined)?.length ? (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium">
            ↑ To improve
          </p>
          <ol className="space-y-1 pl-1">
            {(sig.what_to_improve as string[]).map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 font-semibold text-amber-500">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* ── Model answer ── */}
      {sig.ideal_answer_sketch && (
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-primary/70 font-medium flex items-center gap-1">
            <span>💡</span> Model answer
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{sig.ideal_answer_sketch}</p>
        </div>
      )}
    </div>
  );
}


// ─── Client-side re-scorer ────────────────────────────────────────────────────
// Mirrors the server heuristic so stale / buggy DB scores are overridden with
// correctly computed values derived from the saved content.
function clientReScore(
  questionText: string,
  answerText: string,
): { score: number; corrected: boolean } {
  const wc = answerText.trim().split(/\s+/).filter(Boolean).length;
  const q  = questionText.toLowerCase();

  // Non-answers are always 0, regardless of what DB stored
  if (wc <= 3) return { score: 0, corrected: true };

  const isBehavioral = /time|situation|conflict|disagree|challenge|tell me|describe a|how did you|have you ever/i.test(q);
  const isProcess    = /approach|handle|manage|versioning|test|clean|maintain|debug|optimize|security|ensure|best practice/i.test(q);

  let score: number;
  if (isBehavioral) {
    if (wc <= 20)  score = 28;
    else if (wc <= 38) score = 60;
    else if (wc <= 80) score = 85;
    else if (wc <= 140) score = 78;
    else score = 68;
  } else {
    if (wc <= 20)  score = 25;
    else if (wc <= 35) score = 62;
    else if (wc <= 80) score = 89;
    else if (wc <= 130) score = 75;
    else if (wc <= 200) score = 65;
    else score = 52;
  }
  // small deterministic jitter based on char count so same answer looks consistent
  score += ((answerText.length % 7) - 3);
  score = Math.min(100, Math.max(0, score));
  return { score, corrected: true };
}

// Returns the best score to display: prefers the re-scored value when the
// stored score looks wrong (non-answer stored high, or real answer stored ≤ 5).
function displayScore(
  questionText: string,
  answerText: string,
  storedScore: number | null | undefined,
): number {
  const wc = (answerText ?? "").trim().split(/\s+/).filter(Boolean).length;
  const isNonAnswer = wc <= 3;
  if (isNonAnswer) return 0; // always override — old scorer was broken for "no"
  // If the stored score is suspiciously low for a real answer, recompute
  if (storedScore == null || storedScore <= 5) {
    return clientReScore(questionText, answerText).score;
  }
  return storedScore;
}

function InterviewSession() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const turn = useServerFn(interviewTurn);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  // Local completion state: flip immediately when server returns done:true
  const [completedLocal, setCompletedLocal] = useState(false);

  // Navigation: which Q index the user is viewing (0-based)
  const [viewedQIndex, setViewedQIndex] = useState(0);
  // Tracks whether user manually went back (prevents auto-advance overriding their nav)
  const [manualNav, setManualNav] = useState(false);
  const prevAssistantLen = useRef(0);

  const { data: session } = useQuery({
    queryKey: ["interview", id],
    queryFn: async () =>
      (await supabase.from("interview_sessions").select("*").eq("id", id).single()).data,
  });

  const { data: messages } = useQuery({
    queryKey: ["interview-msgs", id],
    queryFn: async () =>
      (
        await supabase
          .from("interview_messages")
          .select("*")
          .eq("session_id", id)
          .order("created_at")
      ).data ?? [],
    refetchInterval: sending ? false : 0,
  });

  const completed = completedLocal || session?.status === "completed";

  const msgs = messages ?? [];
  const assistantQs = msgs.filter((m) => m.role === "assistant");
  const userAs = msgs.filter((m) => m.role === "user");
  const qIndex = Math.min(assistantQs.length, 10);

  // Build paired Q→A structure: assistantQs[i] answered by userAs[i]
  const pairs = assistantQs.map((q, i) => ({
    question: q,
    answer: userAs[i] ?? null,
  }));

  // Auto-advance viewedQIndex to the latest when a new question arrives,
  // unless the user is manually browsing history.
  useEffect(() => {
    const newLen = assistantQs.length;
    if (newLen === 0) return;
    if (newLen > prevAssistantLen.current) {
      if (!manualNav) {
        setViewedQIndex(newLen - 1);
      }
      prevAssistantLen.current = newLen;
    }
  }, [assistantQs.length, manualNav]);

  // Auto-kick first question
  useEffect(() => {
    if (session && messages && messages.length === 0 && !sending && !completed) {
      void sendAnswer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, messages?.length]);

  async function sendAnswer(isFirst = false) {
    if (!isFirst && !answer.trim()) return;
    setSending(true);
    try {
      const result = await turn({ data: { sessionId: id, userAnswer: isFirst ? undefined : answer } }) as any;
      setAnswer("");
      // After submitting, snap back to latest
      setManualNav(false);
      // If the server says we're done, flip to completion immediately (don't wait for DB round-trip)
      if (result?.done === true && !isFirst) {
        setCompletedLocal(true);
      }
      qc.invalidateQueries({ queryKey: ["interview", id] });
      qc.invalidateQueries({ queryKey: ["interview-msgs", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setSending(false);
  }

  // Clamp viewed index in range
  const clampedIdx = Math.min(Math.max(viewedQIndex, 0), Math.max(pairs.length - 1, 0));
  const viewedPair = pairs[clampedIdx] ?? null;
  const isViewingLatest = clampedIdx === pairs.length - 1;
  // The latest question is unanswered when we have more questions than answers
  const latestIsUnanswered = pairs.length > 0 && pairs[pairs.length - 1].answer == null;
  // Show the answer textarea only when the user is on the latest unanswered question
  const showAnswerInput = isViewingLatest && latestIsUnanswered;
  const isAnsweredPair = viewedPair?.answer != null;

  // Determine which evaluation to display:
  //  • Viewing an answered question → show THAT question's own evaluation
  //  • Viewing current unanswered question → show the most recently scored answer as context
  const evaluationToShow: any | null = isAnsweredPair
    ? viewedPair!.answer
    : isViewingLatest
      ? ([...userAs].reverse().find((m) => m.score != null) ?? null)
      : null;

  const handlePrev = () => {
    if (clampedIdx === 0) return;
    setManualNav(true);
    setViewedQIndex(clampedIdx - 1);
  };

  const handleNext = () => {
    if (isViewingLatest) return;
    const next = clampedIdx + 1;
    setViewedQIndex(next);
    if (next === pairs.length - 1) setManualNav(false);
  };

  // ── Completed screen ──────────────────────────────────────────────────────
  if (completed) {
    return (
      <CandidateShell eyebrow={session?.role_target ?? "Session"}>
        <div className="mb-4">
          <Link
            to="/candidate/interviews"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All sessions
          </Link>
        </div>
        <div className="glass mx-auto max-w-2xl rounded-3xl p-10 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="h-8 w-8" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Interview Completed</p>
          <h1 className="mt-2 font-display text-4xl">
            Well done{data_first_name(session) ? `, ${data_first_name(session)}` : ""}!
          </h1>
          <p className="mt-3 text-muted-foreground">
            You answered all 10 questions for{" "}
            <span className="text-foreground font-medium">{session?.role_target}</span>
            {(session as any)?.company ? (
              <>
                {" "}
                at{" "}
                <span className="text-foreground font-medium">{(session as any).company}</span>
              </>
            ) : null}
            . A detailed AI report has been generated and saved to your account.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Overall" value={session?.overall_score ?? "—"} />
            <Stat label="Readiness" value={session?.readiness_score ?? "—"} />
            <Stat label="Questions" value={`${session?.question_count ?? 10}/10`} />
          </div>

          {session?.summary && (
            <p className="mt-6 rounded-xl bg-accent/30 p-4 text-left text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Summary: </span>
              {session.summary}
            </p>
          )}

          <div className="mt-8 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="font-medium">Next step</p>
            <p className="mt-1 text-muted-foreground">
              Head to your{" "}
              <span className="text-foreground font-medium">Dashboard</span> and scroll down to
              "Your interview reports" to view, re-open, or download this full report anytime.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={async () => {
                try {
                  const { openInterviewReport } = await import("@/lib/interview-export");
                  await openInterviewReport(id);
                } catch (e: any) {
                  toast.error(e.message ?? "Failed");
                }
              }}
              className="rounded-full"
            >
              <Eye className="mr-2 h-4 w-4" /> View Report
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportInterviewReport(id).catch((e) =>
                  toast.error(e.message ?? "Failed"),
                )
              }
              className="rounded-full"
            >
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Link to="/candidate">
              <Button variant="outline" className="rounded-full">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </div>

          {(!!session?.strengths?.length || !!session?.gaps?.length) && (
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
              {!!session?.strengths?.length && (
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs font-medium text-success">Strengths</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {session.strengths.map((s) => (
                      <Badge key={s} variant="secondary" className="rounded-full text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {!!session?.gaps?.length && (
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs font-medium text-warning">Skills to build</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {session.gaps.map((s) => (
                      <Badge key={s} variant="outline" className="rounded-full text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CandidateShell>
    );
  }

  // ── Active session ────────────────────────────────────────────────────────
  return (
    <CandidateShell eyebrow={session?.role_target ?? "Session"}>
      <div className="mb-4">
        <Link
          to="/candidate/interviews"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All sessions
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">

          {/* ── Question card with prev/next navigation ── */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Question {pairs.length === 0 ? "—" : clampedIdx + 1} of 10
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  disabled={clampedIdx === 0 || pairs.length === 0}
                  title="Previous question"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={isViewingLatest || pairs.length === 0}
                  title="Next question"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <Badge variant="secondary" className="ml-1 rounded-full">
                  AI Interviewer
                </Badge>
              </div>
            </div>

            {/* Dot breadcrumbs */}
            {pairs.length > 1 && (
              <div className="mt-3 flex gap-1.5">
                {pairs.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setViewedQIndex(i);
                      setManualNav(i < pairs.length - 1);
                    }}
                    title={`Question ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === clampedIdx
                        ? "w-5 bg-primary"
                        : p.answer
                          ? "w-1.5 bg-primary/40"
                          : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {viewedPair?.question?.content ??
                  (sending ? "Preparing your first question…" : "—")}
              </p>
            </div>
          </div>

          {/* ── Answer area ── */}
          {isAnsweredPair ? (
            // Past answered question: show the submitted answer text
            <div className="glass rounded-2xl p-5">
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Your answer
              </p>
              <div className="flex gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {viewedPair!.answer!.content}
                </p>
              </div>
            </div>
          ) : showAnswerInput ? (
            // Current unanswered question: textarea input
            <div className="glass rounded-2xl p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Your answer
              </p>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendAnswer(false);
                  }
                }}
                placeholder="Type your answer… (Enter to send · Shift+Enter for new line)"
                rows={6}
                disabled={sending || !viewedPair?.question}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={() => sendAnswer(false)}
                  disabled={sending || !answer.trim() || !viewedPair?.question}
                  className="rounded-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Submit answer
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {/* ── Evaluation panel ──
               • Answered Q → shows THIS Q's evaluation (labeled "Answer evaluation" inside EvaluationCard)
               • Unanswered current Q → shows last scored answer as context (labeled below) */}
          {evaluationToShow && (
            <div className="space-y-1">
              {!isAnsweredPair && isViewingLatest && (
                <p className="px-1 text-xs uppercase tracking-wider text-muted-foreground">
                  Previous answer analysis
                </p>
              )}
              <EvaluationCard
                analysis={evaluationToShow}
                answerContent={isAnsweredPair ? viewedPair?.answer?.content : undefined}
              />
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
            <Badge className="mt-2 rounded-full capitalize">
              {session?.status?.replace("_", " ") ?? "—"}
            </Badge>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Questions</p>
                <p className="font-display text-2xl">{qIndex}/10</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Overall</p>
                <p className="font-display text-2xl">{session?.overall_score ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Clickable question progress list */}
          {pairs.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Questions
              </p>
              <div className="space-y-1">
                {pairs.map((p, i) => {
                  const qText = p.question.content;
                  const aText = p.answer?.content ?? "";
                  const rawSc = p.answer?.score as number | null | undefined;
                  // Recompute score from saved content so old bugs are fixed
                  const sc = p.answer != null
                    ? displayScore(qText, aText, rawSc)
                    : undefined;
                  const isActive = i === clampedIdx;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setViewedQIndex(i);
                        setManualNav(i < pairs.length - 1);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60 ${
                        isActive ? "bg-accent/80 font-medium" : ""
                      }`}
                    >
                      <span className="w-5 shrink-0 text-[10px] text-muted-foreground">
                        Q{i + 1}
                      </span>
                      <div className="flex-1 truncate text-muted-foreground">
                        {p.question.content.slice(0, 38)}…
                      </div>
                      {sc != null && (
                        <span
                          className={`shrink-0 font-semibold ${
                            sc >= 75
                              ? "text-emerald-500"
                              : sc >= 50
                                ? "text-amber-500"
                                : "text-rose-500"
                          }`}
                        >
                          {sc}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </CandidateShell>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}

function data_first_name(_session: any): string | null {
  return null;
}
