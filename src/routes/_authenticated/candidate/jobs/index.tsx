import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Briefcase, Sparkles, Loader2, Send } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { matchJob } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/candidate/jobs/")({
  head: () => ({ meta: [{ title: "Job Matching — Adika AI" }] }),
  component: Jobs,
});

function Jobs() {
  const qc = useQueryClient();
  const match = useServerFn(matchJob);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);

  const { data: jobs } = useQuery({
    queryKey: ["jobs-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: resumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("resumes")
        .select("id,title,is_primary")
        .eq("user_id", u.user.id);
      return data ?? [];
    },
  });

  const { data: myApps } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("applications")
        .select("job_id,stage")
        .eq("candidate_id", u.user.id);
      return data ?? [];
    },
  });

  const applied = new Set((myApps ?? []).map((a) => a.job_id));
  const filtered = (jobs ?? []).filter(
    (j) =>
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      (j.skills ?? []).some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );
  const openJob = filtered.find((j) => j.id === openId);

  async function runMatch(jobId: string) {
    if (!selectedResume) return toast.info("Pick a resume first");
    setMatching(true);
    setMatchResult(null);
    try {
      const r = await match({ data: { jobId, resumeId: selectedResume } });
      setMatchResult(r);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setMatching(false);
  }

  async function apply(jobId: string) {
    if (!selectedResume) return toast.info("Pick a resume first");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      candidate_id: u.user.id,
      resume_id: selectedResume,
      match_score: matchResult?.match_score,
      skill_gaps: matchResult?.skill_gaps ?? [],
    });
    if (error) return toast.error(error.message);
    toast.success("Application submitted");
    qc.invalidateQueries({ queryKey: ["my-applications"] });
    setOpenId(null);
  }

  return (
    <CandidateShell eyebrow="Browse roles" title="Job Matching">
      <div className="glass rounded-2xl p-4">
        <Input
          placeholder="Search by title or skill…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((j) => (
          <div key={j.id} className="glass rounded-2xl p-6">
            <p className="font-display text-xl">{j.title}</p>
            <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-2">
              <Briefcase className="h-3 w-3" /> {j.company ?? "—"} · <MapPin className="h-3 w-3" />{" "}
              {j.location ?? "Remote"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {(j.skills ?? []).slice(0, 5).map((s) => (
                <Badge key={s} variant="secondary" className="rounded-full text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{j.description}</p>
            <div className="mt-5 flex items-center justify-between">
              {applied.has(j.id) ? (
                <Badge className="rounded-full bg-success/15 text-success">Applied</Badge>
              ) : (
                <span />
              )}
              <Dialog
                open={openId === j.id}
                onOpenChange={(o) => {
                  setOpenId(o ? j.id : null);
                  setMatchResult(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full">
                    View & apply
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{openJob?.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">{openJob?.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(openJob?.skills ?? []).map((s) => (
                      <Badge key={s} variant="secondary" className="rounded-full text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="text-xs text-muted-foreground">Resume to use</label>
                    <Select value={selectedResume} onValueChange={setSelectedResume}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose resume" />
                      </SelectTrigger>
                      <SelectContent>
                        {(resumes ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.title}
                            {r.is_primary ? " (primary)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {matchResult && (
                    <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-3xl">{matchResult.match_score}</span>
                        <span className="text-muted-foreground">match</span>
                      </div>
                      <p className="mt-2 text-muted-foreground">{matchResult.recommendation}</p>
                      {matchResult.skill_gaps?.length ? (
                        <p className="mt-2 text-xs">
                          <strong>Gaps:</strong> {matchResult.skill_gaps.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openJob && runMatch(openJob.id)}
                      disabled={matching || !selectedResume}
                      className="flex-1 rounded-full"
                    >
                      {matching ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}{" "}
                      Compute match
                    </Button>
                    <Button
                      onClick={() => openJob && apply(openJob.id)}
                      disabled={!selectedResume || applied.has(openJob?.id ?? "")}
                      className="flex-1 rounded-full"
                    >
                      <Send className="mr-2 h-4 w-4" /> Apply
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="glass col-span-full rounded-2xl p-12 text-center text-muted-foreground">
            No published jobs match.
          </div>
        )}
      </div>
    </CandidateShell>
  );
}
