import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RecruiterShell } from "@/components/RecruiterShell";
import { ArrowRight, KanbanSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRecruiterIds } from "@/hooks/use-team-recruiter-ids";

export const Route = createFileRoute("/_authenticated/recruiter/pipeline/")({
  head: () => ({ meta: [{ title: "Pipeline — Recruiter" }] }),
  component: PipelineIndex,
});

function PipelineIndex() {
  const { data: teamIds = [] } = useTeamRecruiterIds();
  const { data: jobs } = useQuery({
    queryKey: ["pipeline-jobs", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id,title,status,applications(id,stage)").in("recruiter_id", teamIds);
      return data ?? [];
    },
  });

  return (
    <RecruiterShell eyebrow="Pick a role" title={<span className="text-gold">Pipeline</span>}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(jobs ?? []).map(j => {
          const apps = (j.applications as any[] | null) ?? [];
          return (
            <Link key={j.id} to="/recruiter/pipeline/$id" params={{ id: j.id }} className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
              <KanbanSquare className="h-5 w-5 text-gold" />
              <p className="mt-3 font-display text-xl">{j.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{j.status}</p>
              <p className="mt-4 text-3xl font-display text-gold">{apps.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">applicants</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold">Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          );
        })}
        {!jobs?.length && <div className="glass col-span-full rounded-2xl p-12 text-center text-muted-foreground">No jobs yet.</div>}
      </div>
    </RecruiterShell>
  );
}
