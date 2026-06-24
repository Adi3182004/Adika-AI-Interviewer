import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STAGES = ["new", "screen", "interview", "offer", "hired", "rejected"] as const;
type Stage = typeof STAGES[number];

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/$id")({
  head: () => ({ meta: [{ title: "Pipeline" }] }),
  component: PipelineBoard,
});

function PipelineBoard() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await supabase.from("jobs").select("*").eq("id", id).single()).data,
  });

  const { data: apps } = useQuery({
    queryKey: ["pipeline", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, profiles!applications_candidate_id_fkey(full_name,email,experience_level)")
        .eq("job_id", id)
        .order("match_score", { ascending: false });
      return data ?? [];
    },
  });

  async function move(appId: string, next: Stage) {
    const { error } = await supabase.from("applications").update({ stage: next }).eq("id", appId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["pipeline", id] });
  }

  return (
    <RecruiterShell eyebrow={job?.title ?? "Pipeline"}>
      <div className="mb-6">
        <Link to="/recruiter/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> All pipelines
        </Link>
      </div>

      <div className="grid gap-4 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map(stage => {
          const items = (apps ?? []).filter(a => a.stage === stage);
          return (
            <div key={stage} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-gold">{stage}</p>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {items.map(a => {
                  const p = (a as any).profiles;
                  return (
                    <div key={a.id} className="rounded-xl border border-border/50 bg-card/40 p-3 text-sm">
                      <p className="font-medium">{p?.full_name ?? "Candidate"}</p>
                      <p className="text-[10px] text-muted-foreground">{p?.experience_level ?? ""}</p>
                      <p className="mt-1 text-[10px]"><span className="text-gold">{a.match_score ?? "—"}</span> match</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {STAGES.filter(s => s !== stage).slice(0, 3).map(s => (
                          <Button key={s} size="sm" variant="ghost" className="h-6 px-2 text-[10px] capitalize" onClick={() => move(a.id, s)}>
                            → {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {!items.length && <p className="text-xs text-muted-foreground italic">empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </RecruiterShell>
  );
}
