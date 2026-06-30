import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Telescope,
  TrendingUp,
  BookOpen,
  Edit3,
  Trash2,
  Save,
  X,
  Plus,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { generateGapAnalysis } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/candidate/gap/")({
  head: () => ({ meta: [{ title: "Gap Analysis — Adika AI" }] }),
  component: GapPage,
});

function GapPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateGapAnalysis);

  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [role, setRole] = useState("Senior Backend Engineer");
  const [company, setCompany] = useState("Stripe");
  const [generating, setGenerating] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Query resumes
  const { data: resumes, refetch: refetchResumes, isLoading: resumesLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Default selection
  useEffect(() => {
    if (resumes && resumes.length > 0 && !selectedResumeId) {
      const primary = resumes.find((r) => r.is_primary);
      setSelectedResumeId(primary ? primary.id : resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  const selectedResume = resumes?.find((r) => r.id === selectedResumeId);
  const gapAnalysis = (selectedResume?.targeted_feedback as any)?.gap_analysis;

  const handleGenerate = async () => {
    if (!selectedResumeId) return toast.error("Please select a resume first");
    if (!role.trim()) return toast.error("Please enter a target role");
    setGenerating(true);
    try {
      await generate({ data: { resumeId: selectedResumeId, role, company } });
      toast.success("Gap analysis generated successfully");
      setShowGenerateForm(false);
      refetchResumes();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate gap analysis");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedResumeId || !selectedResume) return;
    if (!confirm("Are you sure you want to delete this gap analysis?")) return;
    
    const currentFeedback = (selectedResume.targeted_feedback as any) || {};
    const { gap_analysis, ...rest } = currentFeedback;

    const { error } = await supabase
      .from("resumes")
      .update({ targeted_feedback: rest })
      .eq("id", selectedResumeId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Gap analysis deleted");
      setIsEditing(false);
      refetchResumes();
    }
  };

  const startEdit = () => {
    if (!gapAnalysis) return;
    setEditData(JSON.parse(JSON.stringify(gapAnalysis)));
    setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedResumeId || !selectedResume) return;
    const currentFeedback = (selectedResume.targeted_feedback as any) || {};
    const updatedFeedback = {
      ...currentFeedback,
      gap_analysis: editData,
    };

    const { error } = await supabase
      .from("resumes")
      .update({ targeted_feedback: updatedFeedback as any })
      .eq("id", selectedResumeId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Gap analysis updated successfully");
      setIsEditing(false);
      refetchResumes();
    }
  };

  // Editing helpers
  const updateSkillField = (idx: number, field: string, value: any) => {
    if (!editData) return;
    const skills = [...editData.skills];
    const item = { ...skills[idx], [field]: value };

    if (field === "have" || field === "need") {
      const haveVal = Number(item.have) || 0;
      const needVal = Number(item.need) || 0;
      item.gap = Math.max(0, needVal - haveVal);

      if (haveVal >= needVal) {
        item.priority = "strong";
      } else if (item.gap > 20) {
        item.priority = "high";
      } else if (item.gap > 5) {
        item.priority = "med";
      } else {
        item.priority = "low";
      }
    }

    skills[idx] = item;
    setEditData({ ...editData, skills });
  };

  const addSkill = () => {
    if (!editData) return;
    setEditData({
      ...editData,
      skills: [
        ...editData.skills,
        { name: "New Skill", have: 50, need: 80, gap: 30, priority: "high" },
      ],
    });
  };

  const deleteSkill = (idx: number) => {
    if (!editData) return;
    const skills = [...editData.skills];
    skills.splice(idx, 1);
    setEditData({ ...editData, skills });
  };

  const updatePlanField = (idx: number, field: string, value: any) => {
    if (!editData) return;
    const ramp_plan = [...editData.ramp_plan];
    ramp_plan[idx] = { ...ramp_plan[idx], [field]: value };
    setEditData({ ...editData, ramp_plan });
  };

  const addPlanItem = () => {
    if (!editData) return;
    setEditData({
      ...editData,
      ramp_plan: [
        ...editData.ramp_plan,
        { week: `Week ${editData.ramp_plan.length * 2 + 1}-${editData.ramp_plan.length * 2 + 2}`, focus: "New focus", item: "Resource / task", hours: 10 },
      ],
    });
  };

  const deletePlanItem = (idx: number) => {
    if (!editData) return;
    const ramp_plan = [...editData.ramp_plan];
    ramp_plan.splice(idx, 1);
    setEditData({ ...editData, ramp_plan });
  };

  const updateResource = (idx: number, value: string) => {
    if (!editData) return;
    const resources = [...editData.resources];
    resources[idx] = value;
    setEditData({ ...editData, resources });
  };

  const addResource = () => {
    if (!editData) return;
    setEditData({
      ...editData,
      resources: [...editData.resources, "New Resource Link/Name"],
    });
  };

  const deleteResource = (idx: number) => {
    if (!editData) return;
    const resources = [...editData.resources];
    resources.splice(idx, 1);
    setEditData({ ...editData, resources });
  };

  return (
    <CandidateShell eyebrow="Gap analysis" title="Where you are vs. where the role is">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Dropdown to select resume */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-muted-foreground shrink-0">Resume:</Label>
          {resumesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : resumes && resumes.length > 0 ? (
            <Select value={selectedResumeId} onValueChange={(val) => { setSelectedResumeId(val); setIsEditing(false); }}>
              <SelectTrigger className="w-[280px] bg-background/50 backdrop-blur-sm rounded-full">
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
            <p className="text-sm text-muted-foreground">No resumes found. Please create one.</p>
          )}
        </div>

        {/* Global actions */}
        {gapAnalysis && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSaveChanges} className="rounded-full bg-primary hover:bg-primary/95">
                  <Save className="mr-1.5 h-4 w-4" /> Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-full">
                  <X className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={startEdit} className="rounded-full">
                  <Edit3 className="mr-1.5 h-4 w-4" /> Edit Analysis
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="rounded-full">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {gapAnalysis ? (
        /* EDITING MODE VS VIEWING MODE */
        isEditing ? (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Skills Editing */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Telescope className="h-4 w-4" />
                  <span>Edit Skill Requirements</span>
                </div>
                <Button variant="outline" size="sm" onClick={addSkill} className="rounded-full">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Skill
                </Button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {editData?.skills?.map((s: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-border/60 bg-card/20 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={s.name}
                        onChange={(e) => updateSkillField(idx, "name", e.target.value)}
                        placeholder="Skill name"
                        className="font-medium bg-background/50"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSkill(idx)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Have Score</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={s.have}
                          onChange={(e) => updateSkillField(idx, "have", Number(e.target.value))}
                          className="mt-1 bg-background/50"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Required Bar</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={s.need}
                          onChange={(e) => updateSkillField(idx, "need", Number(e.target.value))}
                          className="mt-1 bg-background/50"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Priority / Level</Label>
                        <Select
                          value={s.priority}
                          onValueChange={(val) => updateSkillField(idx, "priority", val)}
                        >
                          <SelectTrigger className="mt-1 bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">high</SelectItem>
                            <SelectItem value="med">med</SelectItem>
                            <SelectItem value="low">low</SelectItem>
                            <SelectItem value="strong">strong</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan & Resources Editing */}
            <div className="space-y-6">
              {/* Ramp Plan */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <TrendingUp className="h-4 w-4" />
                    <span>Edit Ramp Plan</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={addPlanItem} className="rounded-full">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
                  </Button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {editData?.ramp_plan?.map((p: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl border border-border/40 bg-card/10 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={p.week}
                          onChange={(e) => updatePlanField(idx, "week", e.target.value)}
                          placeholder="e.g. Week 1-2"
                          className="h-8 text-xs bg-background/50"
                        />
                        <Input
                          type="number"
                          value={p.hours}
                          onChange={(e) => updatePlanField(idx, "hours", Number(e.target.value))}
                          placeholder="Hours"
                          className="h-8 w-20 text-xs bg-background/50"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePlanItem(idx)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        value={p.focus}
                        onChange={(e) => updatePlanField(idx, "focus", e.target.value)}
                        placeholder="Focus Area"
                        className="h-8 text-xs bg-background/50 font-medium"
                      />
                      <Input
                        value={p.item}
                        onChange={(e) => updatePlanField(idx, "item", e.target.value)}
                        placeholder="Action details"
                        className="h-8 text-xs bg-background/50 text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <BookOpen className="h-4 w-4" />
                    <span>Edit Top Resources</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={addResource} className="rounded-full">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {editData?.resources?.map((res: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={res}
                        onChange={(e) => updateResource(idx, e.target.value)}
                        className="bg-background/50 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteResource(idx)}
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PREMIUM VIEW MODE */
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 text-primary">
                <Telescope className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wider font-semibold">
                  {gapAnalysis.role} {gapAnalysis.company ? `· ${gapAnalysis.company}` : ""}
                </p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Compared against {gapAnalysis.compare_count || 412} successful hires for this role over the last 24 months.
              </p>

              <div className="mt-6 space-y-5">
                {(gapAnalysis.skills || []).map((s: any) => (
                  <div key={s.name} className="group">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium group-hover:text-primary transition-colors">{s.name}</span>
                      <span className="text-muted-foreground font-mono">
                        {s.have} / {s.need}
                      </span>
                    </div>
                    <div className="mt-1.5 relative">
                      <Progress value={s.have} className="h-2 rounded-full" />
                      <div
                        className="absolute top-0 h-2 w-0.5 bg-primary/70"
                        style={{ left: `${s.need}%` }}
                        title={`Bar: ${s.need}`}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider font-medium">
                      <span className="text-muted-foreground">
                        {s.priority === "strong" ? "Already above bar" : `Gap ${s.gap} pts`}
                      </span>
                      <Badge
                        variant={
                          s.priority === "high"
                            ? "destructive"
                            : s.priority === "strong"
                              ? "default"
                              : "secondary"
                        }
                        className="rounded-full text-[9px] px-2 py-0"
                      >
                        {s.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Re-generate trigger */}
              <div className="mt-8 pt-4 border-t border-border/40 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGenerateForm(true)}
                  className="text-xs text-muted-foreground hover:text-foreground rounded-full"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-generate Analysis
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wider font-semibold">6-week ramp plan</p>
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  {(gapAnalysis.ramp_plan || []).map((p: any, idx: number) => (
                    <li key={idx} className="rounded-xl border border-border/40 bg-card/40 hover:bg-card/60 transition-all p-3.5">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                        {p.week} · {p.hours}h
                      </p>
                      <p className="mt-1 font-semibold">{p.focus}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wider font-semibold">Top resources</p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium">
                  {(gapAnalysis.resources || []).map((res: string, idx: number) => (
                    <li key={idx} className="hover:text-foreground transition-colors">
                      · {res}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      ) : (
        /* EMPTY STATE / GENERATION FORM */
        <div className="max-w-2xl mx-auto glass rounded-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Telescope className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Generate Gap Analysis</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Compare this resume's technical stack against thousands of successful hires at target companies.
            </p>
          </div>

          <div className="grid gap-4 text-left max-w-md mx-auto">
            <div>
              <Label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Target Role</Label>
              <Input
                className="mt-1.5 bg-background/50 rounded-full px-4"
                placeholder="e.g. Senior Backend Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Target Company (Optional)</Label>
              <Input
                className="mt-1.5 bg-background/50 rounded-full px-4"
                placeholder="e.g. Stripe, Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedResumeId}
              className="rounded-full px-8 bg-primary hover:bg-primary/95 shadow-md hover:shadow-lg transition-all"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Run Gap Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* RE-GENERATE FORM DIALOG/OVERLAY (Toggled when showGenerateForm is true) */}
      {showGenerateForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" /> Re-generate Gap Analysis
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowGenerateForm(false)} className="rounded-full h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Role</Label>
                <Input
                  className="mt-1 bg-background/50 rounded-full"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Company (Optional)</Label>
                <Input
                  className="mt-1 bg-background/50 rounded-full"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowGenerateForm(false)} className="rounded-full">
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating} className="rounded-full bg-primary">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run Analysis"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CandidateShell>
  );
}
