import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Send,
  PartyPopper,
  Download,
  LayoutDashboard,
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

function InterviewSession() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const turn = useServerFn(interviewTurn);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);

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

  const completed = session?.status === "completed";
  const hasFirstQuestion = (messages ?? []).some((m) => m.role === "assistant");

  useEffect(() => {
    // Auto-kick the first question only if no questions exist yet
    if (session && messages && messages.length === 0 && !sending && !completed) {
      void send(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, messages?.length]);

  async function send(isFirst = false) {
    if (!isFirst && !answer.trim()) return;
    setSending(true);
    try {
      await turn({ data: { sessionId: id, userAnswer: isFirst ? undefined : answer } });
      setAnswer("");
      qc.invalidateQueries({ queryKey: ["interview", id] });
      qc.invalidateQueries({ queryKey: ["interview-msgs", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setSending(false);
  }

  const msgs = messages ?? [];
  const assistantQs = msgs.filter((m) => m.role === "assistant");
  const userAs = msgs.filter((m) => m.role === "user");
  const currentQ = assistantQs[assistantQs.length - 1];
  const lastAnalyzed = [...userAs].reverse().find((m) => m.score != null);
  const sig = (lastAnalyzed?.signals ?? {}) as any;
  const qIndex = Math.min(assistantQs.length, 10);

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
                at <span className="text-foreground font-medium">{(session as any).company}</span>
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
              Head to your <span className="text-foreground font-medium">Dashboard</span> and scroll
              down to "Your interview reports" to view, re-open, or download this full report
              anytime.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() =>
                exportInterviewReport(id).catch((e) => toast.error(e.message ?? "Failed"))
              }
              className="rounded-full"
            >
              <Download className="mr-2 h-4 w-4" /> Download report (PDF)
            </Button>
            <Link to="/candidate">
              <Button variant="outline" className="rounded-full">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
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
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Question {qIndex || "—"} of 10
              </p>
              <Badge variant="secondary" className="rounded-full">
                AI Interviewer
              </Badge>
            </div>
            <div className="mt-3 flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {currentQ?.content ?? (sending ? "Preparing your first question…" : "—")}
              </p>
            </div>
          </div>

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
                  void send(false);
                }
              }}
              placeholder="Type your answer… (Enter to send · Shift+Enter for new line)"
              rows={6}
              disabled={sending || !currentQ}
            />
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => send(false)}
                disabled={sending || !answer.trim() || !currentQ}
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

          {lastAnalyzed && (
            <div className="glass rounded-2xl p-6 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Previous answer analysis
                </p>
                <Badge className="rounded-full">Score {lastAnalyzed.score}/100</Badge>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Your answer: "{lastAnalyzed.content.slice(0, 140)}
                {lastAnalyzed.content.length > 140 ? "…" : ""}"
              </p>
              {sig.feedback && <p className="text-foreground/90">{sig.feedback}</p>}
              {sig.what_was_good?.length > 0 && (
                <div className="text-xs">
                  <span className="text-success font-medium">✓ Worked:</span>{" "}
                  <span className="text-muted-foreground">{sig.what_was_good.join(" · ")}</span>
                </div>
              )}
              {sig.what_to_improve?.length > 0 && (
                <div className="text-xs">
                  <span className="text-warning font-medium">↑ Improve:</span>{" "}
                  <span className="text-muted-foreground">{sig.what_to_improve.join(" · ")}</span>
                </div>
              )}
              {sig.ideal_answer_sketch && (
                <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">Model answer:</span>{" "}
                  {sig.ideal_answer_sketch}
                </div>
              )}
              {(sig.clarity != null || sig.technical != null || sig.depth != null) && (
                <div className="flex gap-3 pt-1 text-[10px] text-muted-foreground">
                  {sig.clarity != null && <span>Clarity {sig.clarity}</span>}
                  {sig.technical != null && <span>Technical {sig.technical}</span>}
                  {sig.depth != null && <span>Depth {sig.depth}</span>}
                </div>
              )}
            </div>
          )}
        </div>

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

function data_first_name(session: any): string | null {
  // best-effort: not always available on the session row
  return null;
}
