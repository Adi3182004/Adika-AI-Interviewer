import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, CheckCircle2, Circle, Loader } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/candidate/learning/")({
  head: () => ({ meta: [{ title: "Learning Roadmap" }] }),
  component: Learning,
});

function Learning() {
  const qc = useQueryClient();
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
          <p className="mt-4">No items yet. Finish a mock interview and we'll seed skills to study.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {(["in_progress","todo","done"] as const).map(col => (
            <div key={col} className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground capitalize">{col.replace("_"," ")}</p>
              <p className="mt-1 font-display text-3xl">{grouped[col].length}</p>
              <ul className="mt-4 space-y-2">
                {grouped[col].map(i => (
                  <li key={i.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                    <span className="text-sm">{i.skill}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setStatus(i.id, "todo")} className={i.status === "todo" ? "text-primary" : "text-muted-foreground"}><Circle className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setStatus(i.id, "in_progress")} className={i.status === "in_progress" ? "text-primary" : "text-muted-foreground"}><Loader className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setStatus(i.id, "done")} className={i.status === "done" ? "text-success" : "text-muted-foreground"}><CheckCircle2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CandidateShell>
  );
}
