import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X, FileText, Sparkles, UserCheck, Archive, RotateCcw, Trash2, GitCompare, KanbanSquare, Users, Trophy } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Stage flow: Sourced → AI Screen → Interview → Offer  ⇒  Accepted / Rejected
const FLOW = [
  { key: "new",       label: "Sourced",   prev: null,        next: "screen" },
  { key: "screen",    label: "AI Screen", prev: "new",       next: "interview" },
  { key: "interview", label: "Interview", prev: "screen",    next: "offer" },
  { key: "offer",     label: "Offer",     prev: "interview", next: null },
] as const;
const ACTIONABLE = new Set(["interview", "offer"]);
type Stage = "new" | "screen" | "interview" | "offer" | "hired" | "rejected";

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/$id")({
  head: () => ({ meta: [{ title: "Pipeline" }] }),
  component: PipelineBoard,
});

function PipelineBoard() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [resumeOpen, setResumeOpen] = useState<null | { name: string; resume: any }>(null);

  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await supabase.from("jobs").select("*").eq("id", id).single()).data,
  });

  const { data: apps } = useQuery({
    queryKey: ["pipeline", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, profiles!applications_candidate_id_fkey(full_name,email,experience_level), resumes(id,title,content,parsed_skills,ats_score)")
        .eq("job_id", id)
        .order("match_score", { ascending: false });
      if (!data) return [];
      const candidateIds = data.map((a: any) => a.candidate_id);
      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("candidate_id,overall_score")
        .eq("job_id", id)
        .in("candidate_id", candidateIds.length ? candidateIds : ["00000000-0000-0000-0000-000000000000"]);
      const scoreBy = new Map<string, number>();
      for (const s of sessions ?? []) if (s.overall_score != null) scoreBy.set(s.candidate_id, s.overall_score);
      return data.map((a: any) => ({ ...a, interview_score: scoreBy.get(a.candidate_id) ?? null }));
    },
  });

  async function move(appId: string, next: Stage) {
    const { error } = await supabase.from("applications").update({ stage: next }).eq("id", appId);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${next}`);
    qc.invalidateQueries({ queryKey: ["pipeline", id] });
  }

  async function remove(appId: string) {
    const { error } = await supabase.from("applications").delete().eq("id", appId);
    if (error) return toast.error(error.message);
    toast.success("Removed permanently");
    qc.invalidateQueries({ queryKey: ["pipeline", id] });
  }

  function Card({ a, stage, index }: { a: any; stage: Stage; index: number }) {
    const p = a.profiles;
    const stageDef = FLOW.find(f => f.key === stage);
    const canAct = ACTIONABLE.has(stage);

    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-3 text-sm backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[10px] font-medium text-gold">{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-medium">{p?.full_name ?? "Candidate"}</p>
              <p className="truncate text-[10px] text-muted-foreground">Applied · {job?.title ?? "—"}</p>
              <p className="truncate text-[10px] text-muted-foreground/80">{p?.experience_level ?? p?.email ?? ""}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] font-medium text-gold" title="Match score">
              {a.match_score ?? "—"}%
            </span>
            {a.interview_score != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400" title="Interview score">
                <Sparkles className="h-2.5 w-2.5" /> {a.interview_score}
              </span>
            )}
          </div>
        </div>

        {a.resumes && (
          <button
            type="button"
            onClick={() => setResumeOpen({ name: p?.full_name ?? "Candidate", resume: a.resumes })}
            className="mt-2 inline-flex w-full items-center gap-1 rounded-md border border-border/40 bg-background/40 px-2 py-1 text-[10px] text-muted-foreground transition hover:border-gold/40 hover:text-gold"
          >
            <FileText className="h-3 w-3" /> View resume
          </button>
        )}

        {/* Navigation arrows */}
        <div className="mt-2 flex items-center justify-between gap-1">
          {stageDef?.prev ? (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-gold" onClick={() => move(a.id, stageDef.prev as Stage)} title="Move back">
              <ArrowLeft className="h-3 w-3" />
            </Button>
          ) : <span />}
          {stageDef?.next ? (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-gold hover:bg-gold-soft" onClick={() => move(a.id, stageDef.next as Stage)} title="Move forward">
              Next <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          ) : <span />}
        </div>

        {/* Approve / Reject visible only at Interview & Offer */}
        {canAct && (
          <div className="mt-2 flex items-center gap-1 border-t border-border/40 pt-2">
            <Button size="sm" className="h-6 flex-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-700" onClick={() => move(a.id, "hired")}>
              <Check className="mr-1 h-3 w-3" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-6 flex-1 border-destructive/40 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => move(a.id, "rejected")}>
              <X className="mr-1 h-3 w-3" /> Reject
            </Button>
          </div>
        )}
      </div>
    );
  }

  function Column({ stageKey, label }: { stageKey: Stage; label: string }) {
    const items = (apps ?? []).filter(a => a.stage === stageKey);
    return (
      <div className="glass min-w-[230px] flex-1 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-gold">{label}</p>
          <span className="rounded-full bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground">{items.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {items.map((a, i) => <Card key={a.id} a={a} stage={stageKey} index={i} />)}
          {!items.length && <p className="py-6 text-center text-xs text-muted-foreground italic">empty</p>}
        </div>
      </div>
    );
  }

  const hired = (apps ?? []).filter(a => a.stage === "hired");
  const rejected = (apps ?? []).filter(a => a.stage === "rejected");

  return (
    <RecruiterShell eyebrow={job?.title ?? "Pipeline"}>
      <div className="mb-6">
        <Link to="/recruiter/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> All pipelines
        </Link>
      </div>

      <Tabs defaultValue="board" className="w-full">
        <TabsList className="glass rounded-2xl p-1">
          <TabsTrigger value="board" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><KanbanSquare className="mr-2 h-4 w-4" /> Board</TabsTrigger>
          <TabsTrigger value="compare" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><GitCompare className="mr-2 h-4 w-4" /> Compare</TabsTrigger>
          <TabsTrigger value="hired" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><Trophy className="mr-2 h-4 w-4" /> New Employees <span className="ml-2 text-[10px] opacity-70">{hired.length}</span></TabsTrigger>
          <TabsTrigger value="archive" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><Archive className="mr-2 h-4 w-4" /> Archive <span className="ml-2 text-[10px] opacity-70">{rejected.length}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-6">
          <div className="flex items-stretch gap-2 overflow-x-auto pb-4">
            {FLOW.map((s, i) => (
              <div key={s.key} className="flex items-stretch gap-2">
                <Column stageKey={s.key as Stage} label={s.label} />
                {i < FLOW.length - 1 && (
                  <div className="flex items-center text-gold/60">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tip: Use the arrows on each card to advance or step back a stage. Approve / Reject buttons appear automatically at the <span className="text-gold">Interview</span> and <span className="text-gold">Offer</span> stages.
          </p>
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <CompareTab apps={apps ?? []} />
        </TabsContent>

        <TabsContent value="hired" className="mt-6">
          <HiredTab items={hired} jobTitle={job?.title} setResumeOpen={setResumeOpen} />
        </TabsContent>

        <TabsContent value="archive" className="mt-6">
          <ArchiveTab items={rejected} jobTitle={job?.title} onRestore={(appId) => move(appId, "interview")} onDelete={remove} setResumeOpen={setResumeOpen} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!resumeOpen} onOpenChange={(o) => !o && setResumeOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{resumeOpen?.name} — Resume</DialogTitle>
          </DialogHeader>
          {resumeOpen?.resume && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>ATS score: <span className="font-medium text-gold">{resumeOpen.resume.ats_score ?? "—"}</span></span>
                <span>·</span>
                <span>{(resumeOpen.resume.parsed_skills ?? []).length} skills</span>
              </div>
              {resumeOpen.resume.content?.summary && (
                <section>
                  <p className="mb-1 text-xs uppercase tracking-wider text-gold">Summary</p>
                  <p className="text-muted-foreground">{resumeOpen.resume.content.summary}</p>
                </section>
              )}
              {!!(resumeOpen.resume.parsed_skills ?? []).length && (
                <section>
                  <p className="mb-1 text-xs uppercase tracking-wider text-gold">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(resumeOpen.resume.parsed_skills as string[]).map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </section>
              )}
              {!!(resumeOpen.resume.content?.experience?.length) && (
                <section>
                  <p className="mb-1 text-xs uppercase tracking-wider text-gold">Experience</p>
                  <div className="space-y-3">
                    {resumeOpen.resume.content.experience.map((e: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border/50 p-3">
                        <p className="font-medium">{e.role} · <span className="text-muted-foreground">{e.company}</span></p>
                        <p className="text-[11px] text-muted-foreground">{e.duration}</p>
                        <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                          {(e.bullets ?? []).map((b: string, j: number) => <li key={j}>{b}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {!!(resumeOpen.resume.content?.education?.length) && (
                <section>
                  <p className="mb-1 text-xs uppercase tracking-wider text-gold">Education</p>
                  {resumeOpen.resume.content.education.map((ed: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">{ed.degree} — {ed.school} ({ed.year})</p>
                  ))}
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RecruiterShell>
  );
}

function HiredTab({ items, jobTitle, setResumeOpen }: { items: any[]; jobTitle?: string; setResumeOpen: (v: any) => void }) {
  if (!items.length) return <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">No new employees yet — approve someone at Interview or Offer to move them here.</div>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((a, i) => (
        <div key={a.id} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1"><UserCheck className="h-3 w-3" /> Accepted · #{i + 1}</p>
              <p className="mt-1 font-display text-lg">{a.profiles?.full_name ?? "Candidate"}</p>
              <p className="text-xs text-muted-foreground">{jobTitle ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl text-gold">{a.match_score ?? "—"}%</p>
              {a.interview_score != null && <p className="text-[10px] text-emerald-400">Interview {a.interview_score}</p>}
            </div>
          </div>
          {a.resumes && (
            <Button size="sm" variant="outline" className="mt-3 h-7 w-full text-[11px]" onClick={() => setResumeOpen({ name: a.profiles?.full_name, resume: a.resumes })}>
              <FileText className="mr-1 h-3 w-3" /> View resume
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function ArchiveTab({ items, jobTitle, onRestore, onDelete, setResumeOpen }: { items: any[]; jobTitle?: string; onRestore: (id: string) => void; onDelete: (id: string) => void; setResumeOpen: (v: any) => void }) {
  if (!items.length) return <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">Archive is empty.</div>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((a, i) => (
        <div key={a.id} className="glass rounded-2xl p-5 opacity-90">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-destructive flex items-center gap-1"><Archive className="h-3 w-3" /> Archived · #{i + 1}</p>
              <p className="mt-1 font-display text-lg">{a.profiles?.full_name ?? "Candidate"}</p>
              <p className="text-xs text-muted-foreground">{jobTitle ?? "—"}</p>
            </div>
            <p className="font-display text-xl text-muted-foreground">{a.match_score ?? "—"}%</p>
          </div>
          {a.resumes && (
            <Button size="sm" variant="outline" className="mt-3 h-7 w-full text-[11px]" onClick={() => setResumeOpen({ name: a.profiles?.full_name, resume: a.resumes })}>
              <FileText className="mr-1 h-3 w-3" /> View resume
            </Button>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="h-7 flex-1 bg-gold text-background text-[11px] hover:bg-gold/90" onClick={() => onRestore(a.id)}>
              <RotateCcw className="mr-1 h-3 w-3" /> Add back to Interview
            </Button>
            <Button size="sm" variant="outline" className="h-7 border-destructive/40 text-[11px] text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Delete permanently?")) onDelete(a.id); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareTab({ apps }: { apps: any[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));
  const selected = useMemo(() => apps.filter((a) => picked.includes(a.id)), [apps, picked]);

  const stageLabel: Record<string, string> = { new: "Sourced", screen: "AI Screen", interview: "Interview", offer: "Offer", hired: "Accepted", rejected: "Rejected" };
  const dims: { key: string; label: string; get: (a: any) => number | string }[] = [
    { key: "match", label: "Match score", get: (a) => a.match_score ?? 0 },
    { key: "interview", label: "Interview score", get: (a) => a.interview_score ?? 0 },
    { key: "ats", label: "ATS score", get: (a) => a.resumes?.ats_score ?? 0 },
    { key: "skills", label: "Skills tracked", get: (a) => (a.resumes?.parsed_skills?.length ?? 0) },
    { key: "experience", label: "Experience level", get: (a) => a.profiles?.experience_level ?? "—" },
    { key: "stage", label: "Current stage", get: (a) => stageLabel[a.stage] ?? a.stage },
  ];

  const numericKeys = new Set(["match", "interview", "ats", "skills"]);
  const best = (key: string, get: (a: any) => any) => {
    if (!numericKeys.has(key)) return null;
    const nums = selected.map(get).map(Number).filter((n) => !isNaN(n));
    return nums.length ? Math.max(...nums) : null;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="glass rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-gold/80 flex items-center gap-2"><Users className="h-3 w-3" /> Select up to 4</p>
        <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {apps.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card/30 px-3 py-2 hover:bg-card/50">
              <Checkbox checked={picked.includes(a.id)} onCheckedChange={() => toggle(a.id)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.profiles?.full_name ?? "Candidate"}</p>
                <p className="text-[10px] text-muted-foreground">{stageLabel[a.stage]}</p>
              </div>
              <span className="font-display text-sm text-gold">{a.match_score ?? "—"}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        {selected.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Select candidates on the left to build a side-by-side comparison matrix.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Dimension</th>
                  {selected.map((a) => (
                    <th key={a.id} className="px-4 py-3 text-right">
                      <div className="font-display text-base text-foreground">{a.profiles?.full_name ?? "Candidate"}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">{stageLabel[a.stage]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dims.map((d) => {
                  const top = best(d.key, d.get);
                  return (
                    <tr key={d.key} className="border-b border-border/60">
                      <td className="px-4 py-3 text-muted-foreground">{d.label}</td>
                      {selected.map((a) => {
                        const v = d.get(a);
                        const isBest = top !== null && Number(v) === top && Number(v) > 0;
                        return (
                          <td key={a.id} className={`px-4 py-3 text-right font-display ${isBest ? "text-gold" : "text-foreground"}`}>
                            {v}{isBest && <Sparkles className="ml-1 inline h-3 w-3" />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
