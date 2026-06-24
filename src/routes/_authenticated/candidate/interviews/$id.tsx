import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bot, Loader2, Send, User } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { interviewTurn } from "@/lib/ai.functions";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery({
    queryKey: ["interview", id],
    queryFn: async () => (await supabase.from("interview_sessions").select("*").eq("id", id).single()).data,
  });

  const { data: messages } = useQuery({
    queryKey: ["interview-msgs", id],
    queryFn: async () => (await supabase.from("interview_messages").select("*").eq("session_id", id).order("created_at")).data ?? [],
    refetchInterval: sending ? false : 0,
  });

  const completed = session?.status === "completed";
  const hasFirstQuestion = (messages ?? []).some(m => m.role === "assistant");

  useEffect(() => {
    // Auto-kick the first question if not started yet
    if (session && !hasFirstQuestion && !sending && !completed) {
      void send(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, hasFirstQuestion]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages?.length]);

  async function send(isFirst = false) {
    if (!isFirst && !answer.trim()) return;
    setSending(true);
    try {
      await turn({ data: { sessionId: id, userAnswer: isFirst ? undefined : answer } });
      setAnswer("");
      qc.invalidateQueries({ queryKey: ["interview", id] });
      qc.invalidateQueries({ queryKey: ["interview-msgs", id] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    setSending(false);
  }

  return (
    <CandidateShell eyebrow={session?.role_target ?? "Session"}>
      <div className="mb-4">
        <Link to="/candidate/interviews" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All sessions
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass flex h-[70vh] flex-col rounded-2xl">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
            {(messages ?? []).map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-secondary" : "bg-primary text-primary-foreground"}`}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-secondary" : "bg-card border border-border"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.score != null && <p className="mt-2 text-[10px] uppercase text-muted-foreground">Score: {m.score}</p>}
                </div>
              </div>
            ))}
            {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> AI is thinking…</div>}
          </div>

          {!completed && (
            <div className="border-t border-border/60 p-4">
              <div className="flex gap-2">
                <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer…" rows={2} className="flex-1" disabled={sending} />
                <Button onClick={() => send(false)} disabled={sending || !answer.trim()} className="rounded-full"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
            <Badge className="mt-2 rounded-full capitalize">{session?.status?.replace("_"," ") ?? "—"}</Badge>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div><p className="text-[10px] uppercase text-muted-foreground">Questions</p><p className="font-display text-2xl">{session?.question_count ?? 0}/6</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Overall</p><p className="font-display text-2xl">{session?.overall_score ?? "—"}</p></div>
            </div>
          </div>
          {completed && (
            <div className="glass rounded-2xl p-6 space-y-3">
              <p className="text-sm font-medium">Final Summary</p>
              <p className="text-sm text-muted-foreground">{session?.summary}</p>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Readiness</p>
                <p className="font-display text-4xl">{session?.readiness_score}</p>
              </div>
              {!!session?.strengths?.length && (
                <div>
                  <p className="text-xs font-medium text-success">Strengths</p>
                  <div className="mt-1 flex flex-wrap gap-1">{session.strengths.map(s => <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>)}</div>
                </div>
              )}
              {!!session?.gaps?.length && (
                <div>
                  <p className="text-xs font-medium text-warning">Skills to build</p>
                  <div className="mt-1 flex flex-wrap gap-1">{session.gaps.map(s => <Badge key={s} variant="outline" className="rounded-full text-[10px]">{s}</Badge>)}</div>
                  <Link to="/candidate/learning" className="mt-3 inline-block text-xs text-primary">Open learning roadmap →</Link>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </CandidateShell>
  );
}
