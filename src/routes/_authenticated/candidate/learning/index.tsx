import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  CheckCircle2,
  Circle,
  Loader,
  Map,
  Loader2,
  Trophy,
  Flag,
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
  const [addOpen, setAddOpen] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  async function applyResumeContext() {
    if (!selectedResumeId) {
      toast.error("Please select a resume first.");
      return;
    }

    const tf = (selectedResume?.targeted_feedback as any);
    if (!tf?.role_fit_score) {
      toast.error(
        "This resume has no Role-Targeted Analysis yet. Open the resume → fill in a Target Role → click \"Analyze for this role\" first."
      );
      return;
    }

    setApplying(true);

    const promise = (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      // 1. Collect skills to seed: missing_skills + action_items phrased as skills
      const missingSkills: string[] = tf.missing_skills ?? [];
      const actionItems: string[] = (tf.action_items ?? []).map((a: string) =>
        // Extract a short skill label from the action item text (first ~40 chars)
        a.length > 50 ? a.slice(0, 47) + "…" : a
      );

      // Combine: missing skills first, then action items as additional tasks
      const candidateSkills = [
        ...missingSkills,
        ...actionItems.filter(
          (a) => !missingSkills.some((s) => a.toLowerCase().includes(s.toLowerCase()))
        ),
      ].slice(0, 12); // Cap at 12 auto-generated tasks

      // 2. Load existing tasks to avoid duplicates
      const { data: existing } = await supabase
        .from("learning_items")
        .select("id,skill")
        .eq("candidate_id", u.user.id);

      const existingSkillsLower = new Set(
        (existing ?? []).map((e) => e.skill.toLowerCase().trim())
      );

      // 3. Insert any new skills not already present
      const toInsert = candidateSkills.filter(
        (s) => !existingSkillsLower.has(s.toLowerCase().trim())
      );

      if (toInsert.length > 0) {
        await supabase.from("learning_items").insert(
          toInsert.map((skill) => ({
            candidate_id: u.user!.id,
            skill,
            status: "todo",
          }))
        );
      }

      // 4. Re-fetch ALL items (existing + newly added) and generate/regenerate roadmaps
      const { data: allItems } = await supabase
        .from("learning_items")
        .select("id,skill,status")
        .eq("candidate_id", u.user.id);

      for (const item of allItems ?? []) {
        // Clear existing roadmap so fresh role-targeted one is created
        await supabase.from("learning_items").update({ roadmap: null }).eq("id", item.id);
        await buildRoadmap({ data: { itemId: item.id, resumeId: selectedResumeId } });
      }

      qc.invalidateQueries({ queryKey: ["learning"] });
    })();

    toast.promise(promise, {
      loading: "Seeding tasks from resume analysis & generating roadmaps…",
      success: "Learning roadmap updated based on your resume & target role!",
      error: "Something went wrong generating roadmaps.",
    });

    try {
      await promise;
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  }


  const { data: resumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("resumes")
        .select("id,title,is_primary,targeted_feedback")
        .eq("user_id", u.user.id);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (resumes && resumes.length > 0 && !selectedResumeId) {
      const primary = resumes.find((r) => r.is_primary);
      setSelectedResumeId(primary ? primary.id : resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  // Load full resume object when a resume is selected
  useEffect(() => {
    if (selectedResumeId && resumes) {
      const found = resumes.find((r) => r.id === selectedResumeId);
      setSelectedResume(found || null);
    }
  }, [selectedResumeId, resumes]);

  async function forceGenerateRoadmap(itemId: string) {
    setBusyId(itemId);
    try {
      const rm = await buildRoadmap({ data: { itemId, resumeId: selectedResumeId || undefined } });
      toast.success("Roadmap generated successfully!");
      if (openItem && openItem.id === itemId) {
        setOpenItem({ ...openItem, roadmap: rm });
      }
      qc.invalidateQueries({ queryKey: ["learning"] });
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    }
    setBusyId(null);
  }

  async function addCustom() {
    if (!newSkill.trim()) return;
    setAdding(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("learning_items").insert({
        candidate_id: u.user.id,
        skill: newSkill.trim(),
        resource_url: newUrl.trim() || null,
        status: "todo",
      });
      if (error) throw error;
      toast.success("Task added");
      setNewSkill("");
      setNewUrl("");
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["learning"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setAdding(false);
  }

  async function deleteRoadmap(id: string) {
    await supabase.from("learning_items").update({ roadmap: null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["learning"] });
    toast.success("Roadmap cleared");
  }

  async function deleteAllInColumn(status: "todo" | "in_progress" | "done") {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase
      .from("learning_items")
      .delete()
      .eq("candidate_id", u.user.id)
      .eq("status", status);
    qc.invalidateQueries({ queryKey: ["learning"] });
    toast.success("All items in column deleted");
  }

  async function removeItem(id: string) {
    await supabase.from("learning_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["learning"] });
  }

  const { data: items } = useQuery({
    queryKey: ["learning"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("learning_items")
        .select("*")
        .eq("candidate_id", u.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "todo" | "in_progress" | "done") {
    await supabase.from("learning_items").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["learning"] });
  }

  async function openRoadmap(item: any) {
    if (item.roadmap && item.roadmap.resume_id === selectedResumeId) {
      setOpenItem(item);
      return;
    }
    setBusyId(item.id);
    try {
      const rm = await buildRoadmap({ data: { itemId: item.id, resumeId: selectedResumeId || undefined } });
      const updated = { ...item, roadmap: rm };
      setOpenItem(updated);
      qc.invalidateQueries({ queryKey: ["learning"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setBusyId(null);
  }

  const grouped = {
    in_progress: (items ?? []).filter((i) => i.status === "in_progress"),
    todo: (items ?? []).filter((i) => i.status === "todo"),
    done: (items ?? []).filter((i) => i.status === "done"),
  };

  return (
    <CandidateShell eyebrow="Skills to grow" title="Learning Roadmap">

      {/* Target Resume selector — Apply and New task in one compact row */}
      <div className="glass rounded-2xl px-4 py-3 mb-6 flex flex-wrap items-center gap-2 border border-border/20">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          Target Resume context:
        </Label>
        {resumes?.length ? (
          <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
            <SelectTrigger className="w-[200px] sm:w-[240px] bg-background/40 backdrop-blur-md border border-border/60 rounded-full h-9 px-4 text-sm">
              <SelectValue placeholder="Select resume" />
            </SelectTrigger>
            <SelectContent>
              {resumes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title} {r.is_primary ? "(Primary)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-yellow-500">No resumes found.</span>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full h-9 px-4 border border-border/60 hover:bg-secondary/60 transition-all font-medium text-xs flex items-center gap-1.5 shrink-0"
          onClick={applyResumeContext}
          disabled={applying || !selectedResumeId}
        >
          {applying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          )}
          Apply
        </Button>
        <Button
          size="sm"
          className="rounded-full h-9 px-4 ml-auto flex items-center gap-1.5"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Tasks seeded from interview gaps and resume analysis. Add your own anytime.
        </p>
      </div>

      {!items?.length ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto h-8 w-8 text-primary/60" />
          <p className="mt-4">
            No items yet. Finish a mock interview, run a role-targeted resume analysis, or add a
            custom task above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {(["todo", "in_progress", "done"] as const).map((col) => (
            <div key={col} className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {col === "todo" ? "To do" : col === "in_progress" ? "In progress" : "Done"}
                  </p>
                  <p className="mt-1 font-display text-3xl">{grouped[col].length}</p>
                </div>
                {grouped[col].length > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    title={`Delete all ${col === "todo" ? "To Do" : col === "in_progress" ? "In Progress" : "Done"} items`}
                    onClick={() => deleteAllInColumn(col)}
                    className="mt-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <ul className="mt-4 space-y-2">
                {grouped[col].map((i) => (
                  <li key={i.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{i.skill}</span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="To do"
                          onClick={() => setStatus(i.id, "todo")}
                          className={i.status === "todo" ? "text-primary" : "text-muted-foreground"}
                        >
                          <Circle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="In progress"
                          onClick={() => setStatus(i.id, "in_progress")}
                          className={
                            i.status === "in_progress" ? "text-primary" : "text-muted-foreground"
                          }
                        >
                          <Loader className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Done"
                          onClick={() => setStatus(i.id, "done")}
                          className={i.status === "done" ? "text-success" : "text-muted-foreground"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {i.source_session_id && (
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        From interview gap
                      </p>
                    )}
                    {i.roadmap ? (
                      <div className="flex flex-wrap gap-2 mt-2 w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-w-[100px] rounded-full text-xs"
                          onClick={() => openRoadmap(i)}
                          disabled={busyId === i.id}
                        >
                          <Map className="mr-1.5 h-3.5 w-3.5" />
                          View roadmap
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-primary shrink-0 border border-border/60 hover:bg-secondary/40"
                          title="Regenerate with current resume"
                          onClick={() => forceGenerateRoadmap(i.id)}
                          disabled={busyId === i.id}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${busyId === i.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0 border border-border/60 hover:bg-destructive/10"
                          title="Delete roadmap"
                          onClick={() => deleteRoadmap(i.id)}
                          disabled={busyId === i.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full rounded-full text-xs"
                        onClick={() => openRoadmap(i)}
                        disabled={busyId === i.id}
                      >
                        {busyId === i.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        )}
                        Generate roadmap
                      </Button>
                    )}
                  </li>
                ))}
                {grouped[col].length === 0 && (
                  <li className="rounded-xl border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
                    Nothing here yet
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add a learning task</DialogTitle>
            <DialogDescription>
              Track any skill you want to grow. Generate an AI roadmap after.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Skill or topic
              </label>
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g. System design fundamentals"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Reference link (optional)
              </label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCustom} disabled={adding || !newSkill.trim()}>
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openItem} onOpenChange={(o) => !o && setOpenItem(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {openItem?.roadmap && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider rounded-full border-primary/40 text-primary bg-primary/5 px-2 py-0.5">
                    Tailored with: {resumes?.find(r => r.id === openItem.roadmap.resume_id)?.title || "Default Context"}
                  </Badge>
                </div>
                <DialogTitle className="font-display text-2xl">
                  {openItem.roadmap.skill} — Learning Roadmap
                </DialogTitle>
                <DialogDescription>{openItem.roadmap.overview}</DialogDescription>
              </DialogHeader>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  ⏱ {openItem.roadmap.estimated_weeks} weeks
                  {openItem.roadmap.total_days ? ` · ${openItem.roadmap.total_days} days` : ""}
                </span>
                {openItem.roadmap.hours_per_week && (
                  <span className="rounded-full bg-secondary px-3 py-1">
                    🕐 {openItem.roadmap.hours_per_week}
                  </span>
                )}
                {openItem.roadmap.difficulty && (
                  <span className="rounded-full bg-secondary px-3 py-1">
                    📊 {openItem.roadmap.difficulty}
                  </span>
                )}
                {openItem.roadmap.prerequisites?.length > 0 && (
                  <span className="rounded-full bg-secondary px-3 py-1">
                    Prereqs: {openItem.roadmap.prerequisites.join(", ")}
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-5">
                {openItem.roadmap.phases?.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl border border-border/60 bg-card/40 p-5"
                  >
                    <div className="absolute -left-3 top-5 grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {idx + 1}
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-display text-lg">{p.title}</h3>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          {p.week_range}
                        </span>
                        {p.day_range && (
                          <span className="rounded-full bg-secondary px-2 py-0.5">
                            {p.day_range}
                          </span>
                        )}
                        {p.time_commitment && (
                          <span className="rounded-full bg-secondary px-2 py-0.5">
                            ⏱ {p.time_commitment}
                          </span>
                        )}
                      </div>
                    </div>
                    {p.goals?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Goals
                        </p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {p.goals.map((g: string, i: number) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {p.topics?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.topics.map((t: string) => (
                          <Badge key={t} variant="secondary" className="rounded-full">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {p.daily_plan?.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Day-by-day plan
                        </p>
                        <ol className="space-y-1.5">
                          {p.daily_plan.map((d: any, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm"
                            >
                              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {d.day}
                              </span>
                              <span className="flex-1">{d.focus}</span>
                              {d.time && (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  ⏱ {d.time}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {p.project && (
                      <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium uppercase tracking-wider text-primary">
                            Build this
                          </p>
                          {p.project_time && (
                            <span className="text-[11px] text-muted-foreground">
                              ⏱ {p.project_time}
                            </span>
                          )}
                        </div>
                        <p className="mt-1">{p.project}</p>
                      </div>
                    )}
                    {p.resources?.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          <BookOpen className="h-3 w-3" /> Resources
                        </p>
                        <ul className="space-y-1.5">
                          {p.resources.map((r: any, i: number) => (
                            <li
                              key={i}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
                            >
                              <span className="flex-1 truncate">
                                {r.url ? (
                                  <a
                                    className="hover:text-primary underline-offset-2 hover:underline"
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {r.name}
                                  </a>
                                ) : (
                                  r.name
                                )}
                              </span>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {r.time && (
                                  <span className="text-[11px] text-muted-foreground">
                                    ⏱ {r.time}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {r.type}
                                </Badge>
                              </div>
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
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Flag className="h-4 w-4 text-success" /> Milestones
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {openItem.roadmap.milestones.map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {openItem.roadmap.final_capstone && (
                <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Trophy className="h-4 w-4 text-primary" /> Final capstone
                    </p>
                    {openItem.roadmap.capstone_time && (
                      <span className="text-xs text-muted-foreground">
                        ⏱ {openItem.roadmap.capstone_time}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{openItem.roadmap.final_capstone}</p>
                </div>
              )}

              <DialogFooter className="border-t border-border/40 pt-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground text-left w-full sm:w-auto">
                  Target Resume: <span className="font-semibold text-foreground">{resumes?.find((r) => r.id === selectedResumeId)?.title || "Default Profile"}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => forceGenerateRoadmap(openItem.id)}
                  disabled={busyId === openItem.id}
                  className="rounded-full shrink-0 w-full sm:w-auto"
                >
                  {busyId === openItem.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4 text-primary" />
                  )}
                  Regenerate Roadmap
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CandidateShell>
  );
}
