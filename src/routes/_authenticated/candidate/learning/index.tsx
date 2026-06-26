import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, CheckCircle2, Circle, Loader, Map, Loader2, Trophy, Flag, BookOpen } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { generateLearningRoadmap } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/candidate/learning/")({
  head: () => ({ meta: [{ title: "Learning Roadmap" }] }),
  component: Learning,
});

function Learning() {
  const qc = useQueryClient();
  const buildRoadmap = useServerFn(generateLearningRoadmap);
  const [openItem, setOpenItem] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: items } = useQuery({
    queryKey: ["learning"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("learning_items").select("*").eq("candidate_id", u.user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "todo" | "in_progress" | "done") {
    await supabase.from("learning_items").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["learning"] });
  }

  async function openRoadmap(item: any) {
    if (item.roadmap) {
      setOpenItem(item);
      return;
    }
    setBusyId(item.id);
    try {
      const rm = await buildRoadmap({ data: { itemId: item.id } });
      const updated = { ...item, roadmap: rm };
      setOpenItem(updated);
      qc.invalidateQueries({ queryKey: ["learning"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setBusyId(null);
  }

  const grouped = {
    in_progress: (items ?? []).filter(i => i.status === "in_progress"),
    todo: (items ?? []).filter(i => i.status === "todo"),
    done: (items ?? []).filter(i => i.status === "done"),
  };

  return (
    <CandidateShell eyebrow="Skills to grow" title="Learning Roadmap">
      {!items?.length ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto h-8 w-8 text-primary/60" />
          <p className="mt-4">No items yet. Finish a mock interview or run a role-targeted resume analysis to seed skills.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {(["in_progress","todo","done"] as const).map(col => (
            <div key={col} className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground capitalize">{col.replace("_"," ")}</p>
              <p className="mt-1 font-display text-3xl">{grouped[col].length}</p>
              <ul className="mt-4 space-y-2">
                {grouped[col].map(i => (
                  <li key={i.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{i.skill}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setStatus(i.id, "todo")} className={i.status === "todo" ? "text-primary" : "text-muted-foreground"}><Circle className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setStatus(i.id, "in_progress")} className={i.status === "in_progress" ? "text-primary" : "text-muted-foreground"}><Loader className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setStatus(i.id, "done")} className={i.status === "done" ? "text-success" : "text-muted-foreground"}><CheckCircle2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 w-full rounded-full" onClick={() => openRoadmap(i)} disabled={busyId === i.id}>
                      {busyId === i.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Map className="mr-2 h-3.5 w-3.5" />}
                      {i.roadmap ? "View roadmap" : "Generate roadmap"}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!openItem} onOpenChange={(o) => !o && setOpenItem(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {openItem?.roadmap && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{openItem.roadmap.skill} — Learning Roadmap</DialogTitle>
                <DialogDescription>{openItem.roadmap.overview}</DialogDescription>
              </DialogHeader>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">⏱ {openItem.roadmap.estimated_weeks} weeks</span>
                {openItem.roadmap.prerequisites?.length > 0 && (
                  <span className="rounded-full bg-secondary px-3 py-1">Prereqs: {openItem.roadmap.prerequisites.join(", ")}</span>
                )}
              </div>

              <div className="mt-6 space-y-5">
                {openItem.roadmap.phases?.map((p: any, idx: number) => (
                  <div key={idx} className="relative rounded-2xl border border-border/60 bg-card/40 p-5">
                    <div className="absolute -left-3 top-5 grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">{idx + 1}</div>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-lg">{p.title}</h3>
                      <span className="text-xs text-muted-foreground">{p.week_range}</span>
                    </div>
                    {p.goals?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Goals</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {p.goals.map((g: string, i: number) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    )}
                    {p.topics?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.topics.map((t: string) => <Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>)}
                      </div>
                    )}
                    {p.project && (
                      <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary">Build this</p>
                        <p className="mt-1">{p.project}</p>
                      </div>
                    )}
                    {p.resources?.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><BookOpen className="h-3 w-3" /> Resources</p>
                        <ul className="space-y-1.5">
                          {p.resources.map((r: any, i: number) => (
                            <li key={i} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm">
                              <span>{r.url ? <a className="hover:text-primary underline-offset-2 hover:underline" href={r.url} target="_blank" rel="noreferrer">{r.name}</a> : r.name}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {openItem.roadmap.milestones?.length > 0 && (
                <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-5">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Flag className="h-4 w-4 text-success" /> Milestones</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {openItem.roadmap.milestones.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}

              {openItem.roadmap.final_capstone && (
                <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Trophy className="h-4 w-4 text-primary" /> Final capstone</p>
                  <p className="text-sm">{openItem.roadmap.final_capstone}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </CandidateShell>
  );
}
