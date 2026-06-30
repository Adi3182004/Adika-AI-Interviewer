import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Globe, Eye, EyeOff, Trash2 } from "lucide-react";
import { useTeamRecruiterIds } from "@/hooks/use-team-recruiter-ids";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/")({
  head: () => ({ meta: [{ title: "Jobs — Recruiter" }] }),
  component: Jobs,
});

function Jobs() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    seniority: "mid",
    employment_type: "full_time",
    salary_min: "",
    salary_max: "",
    description: "",
    skills: "",
  });

  const { data: teamIds = [] } = useTeamRecruiterIds();
  const { data: jobs } = useQuery({
    queryKey: ["my-jobs", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*, applications(id)")
        .in("recruiter_id", teamIds)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function create() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("jobs").insert({
      recruiter_id: u.user.id,
      title: form.title,
      company: form.company,
      location: form.location,
      seniority: form.seniority,
      employment_type: form.employment_type,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      description: form.description,
      skills: form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: "draft",
    });
    if (error) return toast.error(error.message);
    toast.success("Job created");
    setOpen(false);
    setForm({
      title: "",
      company: "",
      location: "",
      seniority: "mid",
      employment_type: "full_time",
      salary_min: "",
      salary_max: "",
      description: "",
      skills: "",
    });
    qc.invalidateQueries({ queryKey: ["my-jobs"] });
  }

  async function toggleStatus(id: string, status: string) {
    const next = status === "published" ? "draft" : "published";
    await supabase.from("jobs").update({ status: next }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-jobs"] });
    toast.success(next === "published" ? "Job published" : "Moved to draft");
  }

  async function remove(id: string) {
    if (!confirm("Delete this job?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-jobs"] });
  }

  return (
    <RecruiterShell
      eyebrow="Postings"
      title={
        <span>
          <span className="text-gold">Jobs</span>
        </span>
      }
    >
      <div className="glass flex items-center justify-between rounded-2xl p-6">
        <div>
          <p className="font-medium">Post and manage open roles</p>
          <p className="text-sm text-muted-foreground">
            Drafts are private; published jobs show up in the candidate job board.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-gold-soft text-gold border-gold hover:bg-gold-soft">
              <Plus className="mr-2 h-4 w-4" /> New job
            </Button>
          </DialogTrigger>
          <DialogContent className="recruiter max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-gold">New job posting</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
                <Input
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Salary min"
                  type="number"
                  value={form.salary_min}
                  onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                />
                <Input
                  placeholder="Salary max"
                  type="number"
                  value={form.salary_max}
                  onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                />
              </div>
              <Input
                placeholder="Skills (comma-separated)"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
              />
              <Textarea
                rows={5}
                placeholder="Job description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <Button
                onClick={create}
                className="w-full rounded-full bg-gold-soft text-gold border-gold"
              >
                Create draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(jobs ?? []).map((j) => (
          <div key={j.id} className="glass rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-xl">{j.title}</p>
                <p className="text-xs text-muted-foreground">
                  {j.company ?? "—"} · {j.location ?? "Remote"}
                </p>
              </div>
              <Badge
                className={
                  j.status === "published"
                    ? "bg-success/20 text-success rounded-full"
                    : "rounded-full"
                }
                variant="secondary"
              >
                {j.status}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(j.skills ?? []).slice(0, 5).map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="rounded-full text-[10px] border-gold/30 text-gold/80"
                >
                  {s}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {(j.applications as any[] | null)?.length ?? 0} applicants
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/recruiter/pipeline/$id" params={{ id: j.id }} className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-full">
                  Pipeline
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => toggleStatus(j.id, j.status)}>
                {j.status === "published" ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(j.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!jobs?.length && (
          <div className="glass col-span-full rounded-2xl p-12 text-center text-muted-foreground">
            No jobs yet — create your first above.
          </div>
        )}
      </div>
    </RecruiterShell>
  );
}
