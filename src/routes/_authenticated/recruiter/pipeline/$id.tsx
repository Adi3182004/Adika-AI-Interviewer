import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Display flow: Sourced → AI Screen → Interview → Offer → Accepted / Rejected
// Mapped to DB enum values: new, screen, interview, offer, hired, rejected
const FLOW = [
  { key: "new",       label: "Sourced",   next: "screen" },
  { key: "screen",    label: "AI Screen", next: "interview" },
  { key: "interview", label: "Interview", next: "offer" },
  { key: "offer",     label: "Offer",     next: "hired" },
  { key: "hired",     label: "Accepted",  next: null },
] as const;

const REJECTED = { key: "rejected", label: "Rejected" } as const;
type Stage = "new" | "screen" | "interview" | "offer" | "hired" | "rejected";

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
    toast.success(`Moved to ${next}`);
    qc.invalidateQueries({ queryKey: ["pipeline", id] });
  }

  function Card({ a, stage }: { a: any; stage: Stage }) {
    const p = a.profiles;
    const stageDef = FLOW.find(f => f.key === stage);
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-3 text-sm backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{p?.full_name ?? "Candidate"}</p>
            <p className="truncate text-[10px] text-muted-foreground">{p?.experience_level ?? p?.email ?? ""}</p>
          </div>
          <span className="shrink-0 rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] text-gold">{a.match_score ?? "—"}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-1">
          {stage !== "rejected" && stage !== "hired" && stageDef?.next && (
            <Button size="sm" variant="ghost" className="h-6 flex-1 justify-start px-2 text-[10px] text-gold hover:bg-gold-soft" onClick={() => move(a.id, stageDef.next as Stage)}>
              Advance <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
          {stage !== "rejected" && stage !== "hired" && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive" onClick={() => move(a.id, "rejected")}>
              <X className="h-3 w-3" />
            </Button>
          )}
          {stage === "hired" && <Badge className="bg-gold-soft text-gold text-[10px]"><Check className="mr-1 h-3 w-3" />Accepted</Badge>}
          {stage === "rejected" && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => move(a.id, "new")}>
              Restore
            </Button>
          )}
        </div>
      </div>
    );
  }

  function Column({ stageKey, label }: { stageKey: Stage; label: string }) {
    const items = (apps ?? []).filter(a => a.stage === stageKey);
    return (
      <div className="glass min-w-[220px] flex-1 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-gold">{label}</p>
          <span className="rounded-full bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground">{items.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {items.map(a => <Card key={a.id} a={a} stage={stageKey} />)}
          {!items.length && <p className="py-6 text-center text-xs text-muted-foreground italic">empty</p>}
        </div>
      </div>
    );
  }

  return (
    <RecruiterShell eyebrow={job?.title ?? "Pipeline"}>
      <div className="mb-6">
        <Link to="/recruiter/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> All pipelines
        </Link>
      </div>

      {/* Main flow with arrow connectors */}
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

      {/* Rejected lane */}
      <div className="mt-6">
        <Column stageKey="rejected" label={REJECTED.label} />
      </div>
    </RecruiterShell>
  );
}
