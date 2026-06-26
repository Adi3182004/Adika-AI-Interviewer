import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bot, User, Download, Play, Pause, SkipBack, SkipForward, FileText, Building2, GraduationCap, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { exportInterviewReport } from "@/lib/interview-export";
import { useTeamRecruiterIds } from "@/hooks/use-team-recruiter-ids";

export const Route = createFileRoute("/_authenticated/recruiter/interviews/")({
  head: () => ({ meta: [{ title: "Interview Replays" }] }),
  component: Replays,
});

type Signals = {
  feedback?: string;
  what_was_good?: string[];
  what_to_improve?: string[];
  ideal_answer_sketch?: string;
};

function Replays() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeQ, setActiveQ] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: sessions } = useQuery({
    queryKey: ["recruiter-sessions"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("interview_sessions")
        .select("*, jobs!inner(title,recruiter_id), profiles!interview_sessions_candidate_id_fkey(full_name,email)")
        .eq("jobs.recruiter_id", u.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["recruiter-session-msgs", openId],
    queryFn: async () => {
      if (!openId) return [];
      const { data } = await supabase.from("interview_messages").select("*").eq("session_id", openId).order("created_at");
      return data ?? [];
    },
    enabled: !!openId,
  });

  const open = (sessions ?? []).find(s => s.id === openId);

  // Pair assistant question with the following user answer for clean playback
  const turns = useMemo(() => {
    const msgs = messages ?? [];
    const pairs: { q: typeof msgs[number]; a?: typeof msgs[number] }[] = [];
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].role === "assistant") {
        const next = msgs[i + 1];
        pairs.push({ q: msgs[i], a: next && next.role === "user" ? next : undefined });
      }
    }
    return pairs;
  }, [messages]);

  useEffect(() => { setActiveQ(0); setPlaying(false); }, [openId]);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (activeQ + 1 >= turns.length) { setPlaying(false); return; }
      setActiveQ(q => q + 1);
    }, 4500);
    return () => clearTimeout(t);
  }, [playing, activeQ, turns.length]);

  const filteredSessions = useMemo(() => {
    const list = sessions ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(s => {
      const p = (s as any).profiles;
      const j = (s as any).jobs;
      return (
        p?.full_name?.toLowerCase().includes(q) ||
        j?.title?.toLowerCase().includes(q) ||
        s.role_target?.toLowerCase().includes(q) ||
        (s as any).company?.toLowerCase().includes(q)
      );
    });
  }, [sessions, search]);

  const avgScore = useMemo(() => {
    const scored = (messages ?? []).filter(m => m.score != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, m) => s + (m.score ?? 0), 0) / scored.length);
  }, [messages]);

  async function downloadReport() {
    if (!openId) return;
    setDownloading(true);
    try { await exportInterviewReport(openId); }
    catch (e: any) { toast.error(e.message ?? "Export failed"); }
    setDownloading(false);
  }

  const activeTurn = turns[activeQ];
  const activeSignals = (activeTurn?.a?.signals ?? {}) as Signals;

  return (
    <RecruiterShell eyebrow="Adaptive interviews" title={<span>Replayable <span className="text-gold">Sessions</span></span>}>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Sidebar list */}
        <div className="space-y-3">
          <Input placeholder="Search candidate, role, company" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-full" />
          <div className="glass rounded-2xl p-2 max-h-[72vh] overflow-y-auto">
            {filteredSessions.map(s => {
              const p = (s as any).profiles;
              const j = (s as any).jobs;
              const co = (s as any).company as string | null;
              return (
                <button key={s.id} onClick={() => setOpenId(s.id)} className={`block w-full rounded-xl p-3 text-left transition ${openId === s.id ? "bg-gold-soft ring-1 ring-gold/40" : "hover:bg-card/40"}`}>
                  <p className="font-medium truncate">{p?.full_name ?? "Candidate"}</p>
                  <p className="text-xs text-muted-foreground truncate">{j?.title} · {s.role_target}{co ? ` · ${co}` : ""}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-display text-lg text-gold leading-none">{s.overall_score ?? "—"}</span>
                    <Badge variant="secondary" className="rounded-full text-[10px] capitalize">{s.status.replace("_", " ")}</Badge>
                    <span className="ml-auto text-[10px] text-muted-foreground">{s.question_count ?? 0}/10</span>
                  </div>
                </button>
              );
            })}
            {!filteredSessions.length && <p className="p-6 text-center text-sm text-muted-foreground">No replays yet.</p>}
          </div>
        </div>

        {/* Replay panel */}
        <div className="space-y-4">
          {!open ? (
            <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
              Pick a session on the left to replay the interview, see per-question analysis, and download a PDF report.
            </div>
          ) : (
            <>
              {/* Header card */}
              <div className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-[260px]">
                    <p className="text-[10px] uppercase tracking-wider text-gold">Replay</p>
                    <h2 className="mt-1 font-display text-2xl">{(open as any).profiles?.full_name ?? "Candidate"} <span className="text-muted-foreground font-normal text-base">· {open.role_target}</span></h2>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {(open as any).company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {(open as any).company}</span>}
                      {(open as any).experience_level && <span className="flex items-center gap-1 capitalize"><GraduationCap className="h-3 w-3" /> {(open as any).experience_level}</span>}
                      <span>{new Date(open.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button onClick={downloadReport} disabled={downloading} variant="outline" className="rounded-full border-gold/40 text-gold hover:bg-gold-soft">
                    <Download className="mr-2 h-4 w-4" /> {downloading ? "Generating…" : "PDF report"}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <ScoreTile label="Overall" value={open.overall_score} />
                  <ScoreTile label="Readiness" value={open.readiness_score} />
                  <ScoreTile label="Avg / answer" value={avgScore} />
                  <ScoreTile label="Questions" value={`${open.question_count ?? 0}/10`} />
                </div>

                {open.summary && (
                  <div className="mt-4 rounded-xl border border-gold/20 bg-gold-soft/40 p-3 text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-gold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Teacher summary</p>
                    {open.summary}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {!!open.strengths?.length && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" /> Strengths</p>
                      <div className="flex flex-wrap gap-1">
                        {open.strengths.map((s, i) => <Badge key={i} variant="outline" className="rounded-full border-emerald-500/30 text-emerald-500/90 text-[10px]">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {!!open.gaps?.length && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> Skills to build</p>
                      <div className="flex flex-wrap gap-1">
                        {open.gaps.map((s, i) => <Badge key={i} variant="outline" className="rounded-full border-amber-500/30 text-amber-500/90 text-[10px]">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Playback controls */}
              {turns.length > 0 && (
                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setActiveQ(0)} disabled={activeQ === 0}><SkipBack className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setActiveQ(q => Math.max(0, q - 1))} disabled={activeQ === 0}>Prev</Button>
                    <Button size="sm" onClick={() => setPlaying(p => !p)} className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold/20">
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      <span className="ml-1">{playing ? "Pause" : "Auto-play"}</span>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setActiveQ(q => Math.min(turns.length - 1, q + 1))} disabled={activeQ >= turns.length - 1}>Next</Button>
                    <Button size="sm" variant="ghost" onClick={() => setActiveQ(turns.length - 1)} disabled={activeQ >= turns.length - 1}><SkipForward className="h-4 w-4" /></Button>
                    <span className="ml-auto text-xs text-muted-foreground">Question {activeQ + 1} of {turns.length}</span>
                  </div>
                  <Progress value={((activeQ + 1) / turns.length) * 100} className="mt-3 h-1" />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {turns.map((t, i) => {
                      const sc = t.a?.score;
                      const tone = sc == null ? "border-border/30 text-muted-foreground" : sc >= 75 ? "border-emerald-500/40 text-emerald-500" : sc >= 50 ? "border-gold/40 text-gold" : "border-rose-500/40 text-rose-500";
                      return (
                        <button key={i} onClick={() => setActiveQ(i)} className={`h-7 w-7 rounded-full border text-[10px] font-medium transition ${i === activeQ ? "bg-gold-soft" : ""} ${tone}`}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active turn detail */}
              {activeTurn && (
                <div className="glass rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gold mb-1 flex items-center gap-1"><Bot className="h-3 w-3" /> Question {activeQ + 1}</p>
                    <p className="text-sm whitespace-pre-wrap">{activeTurn.q.content}</p>
                  </div>

                  {activeTurn.a ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Candidate answer {activeTurn.a.score != null && <span className="ml-auto text-gold">score {activeTurn.a.score}/100</span>}</p>
                      <p className="text-sm whitespace-pre-wrap rounded-xl bg-card/40 p-3">{activeTurn.a.content}</p>

                      {(activeSignals.feedback || activeSignals.what_was_good?.length || activeSignals.what_to_improve?.length || activeSignals.ideal_answer_sketch) && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {activeSignals.feedback && (
                            <AnalysisBlock title="AI feedback" tone="default">{activeSignals.feedback}</AnalysisBlock>
                          )}
                          {!!activeSignals.what_was_good?.length && (
                            <AnalysisBlock title="What worked" tone="good">
                              <ul className="list-disc pl-4 space-y-0.5">{activeSignals.what_was_good.map((x, i) => <li key={i}>{x}</li>)}</ul>
                            </AnalysisBlock>
                          )}
                          {!!activeSignals.what_to_improve?.length && (
                            <AnalysisBlock title="What to improve" tone="warn">
                              <ul className="list-disc pl-4 space-y-0.5">{activeSignals.what_to_improve.map((x, i) => <li key={i}>{x}</li>)}</ul>
                            </AnalysisBlock>
                          )}
                          {activeSignals.ideal_answer_sketch && (
                            <AnalysisBlock title="Model answer sketch" tone="info">{activeSignals.ideal_answer_sketch}</AnalysisBlock>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Candidate didn't answer this question.</p>
                  )}
                </div>
              )}

              {(open as any).job_description && (
                <div className="glass rounded-2xl p-4 text-xs">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Job description used</p>
                  <p className="whitespace-pre-wrap text-muted-foreground line-clamp-6">{(open as any).job_description}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RecruiterShell>
  );
}

function ScoreTile({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="rounded-xl border border-gold/20 bg-card/30 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl text-gold mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function AnalysisBlock({ title, tone, children }: { title: string; tone: "good" | "warn" | "info" | "default"; children: React.ReactNode }) {
  const ring = tone === "good" ? "border-emerald-500/30 bg-emerald-500/5" : tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : tone === "info" ? "border-indigo-400/30 bg-indigo-400/5" : "border-border/40 bg-card/40";
  const dot = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : tone === "info" ? "text-indigo-400" : "text-muted-foreground";
  return (
    <div className={`rounded-xl border p-3 text-xs ${ring}`}>
      <p className={`text-[10px] uppercase tracking-wider mb-1 ${dot}`}>{title}</p>
      <div className="text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}
