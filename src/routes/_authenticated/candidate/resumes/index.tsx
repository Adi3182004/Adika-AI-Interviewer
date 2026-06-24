import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, FileText, Sparkles, Trash2 } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/candidate/resumes/")({
  head: () => ({ meta: [{ title: "Resume Library — Adika AI" }] }),
  component: ResumesList,
});

function ResumesList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");

  const { data: resumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("resumes").select("*").eq("user_id", u.user.id).order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  async function create() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase.from("resumes").insert({
      user_id: u.user.id,
      title: title || "Untitled Resume",
      content: { summary: "", experience: [], education: [], skills: [], projects: [] },
      is_primary: !(resumes?.length),
    }).select().single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["resumes"] });
    setTitle("");
    navigate({ to: "/candidate/resumes/$id", params: { id: data.id } });
  }

  async function remove(id: string) {
    if (!confirm("Delete this resume?")) return;
    await supabase.from("resumes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["resumes"] });
  }

  return (
    <CandidateShell eyebrow="Resume" title="Resume Library">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">New resume title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" className="mt-1" />
          </div>
          <Button onClick={create} className="rounded-full"><Plus className="mr-2 h-4 w-4" /> Create resume</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(resumes ?? []).map((r) => (
          <div key={r.id} className="glass group flex flex-col rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 text-primary" /> {r.title}
                  {r.is_primary && <Badge variant="secondary" className="ml-1 rounded-full text-[10px]">Primary</Badge>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => remove(r.id)} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ATS</p>
                <p className="font-display text-3xl">{r.ats_score ?? "—"}</p>
              </div>
              <div className="flex flex-wrap gap-1 max-w-[60%]">
                {(r.parsed_skills ?? []).slice(0, 4).map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{s}</span>
                ))}
              </div>
            </div>
            <Link to="/candidate/resumes/$id" params={{ id: r.id }} className="mt-5">
              <Button size="sm" className="w-full rounded-full"><Sparkles className="mr-2 h-3.5 w-3.5" /> Open editor</Button>
            </Link>
          </div>
        ))}
        {!resumes?.length && (
          <div className="glass col-span-full rounded-2xl p-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-8 w-8 text-primary/60" />
            <p className="mt-4">No resumes yet — create your first above.</p>
          </div>
        )}
      </div>
    </CandidateShell>
  );
}
