import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Sparkles, Wand2, Target, ThumbsUp, ThumbsDown, ListChecks } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { analyzeResume, improveResumeSection, analyzeResumeForRole } from "@/lib/ai.functions";

type Content = {
  summary: string;
  experience: { company: string; role: string; period: string; bullets: string }[];
  education: { school: string; degree: string; year: string }[];
  skills: string[];
  projects: { name: string; description: string }[];
};

const empty: Content = { summary: "", experience: [], education: [], skills: [], projects: [] };

export const Route = createFileRoute("/_authenticated/candidate/resumes/$id")({
  head: () => ({ meta: [{ title: "Edit Resume" }] }),
  component: ResumeEditor,
});

function ResumeEditor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeResume);
  const improve = useServerFn(improveResumeSection);
  const targetAnalyze = useServerFn(analyzeResumeForRole);
  const [roleForm, setRoleForm] = useState({ role: "", company: "", experienceLevel: "Student / Intern", jobDescription: "" });
  const [targeting, setTargeting] = useState(false);

  async function runRoleAnalysis() {
    if (!roleForm.role.trim()) return toast.error("Enter a target role");
    setTargeting(true);
    try {
      await targetAnalyze({ data: {
        resumeId: id,
        role: roleForm.role,
        company: roleForm.company || undefined,
        experienceLevel: roleForm.experienceLevel,
        jobDescription: roleForm.jobDescription || undefined,
      }});
      toast.success("Role analysis ready");
      qc.invalidateQueries({ queryKey: ["resume", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setTargeting(false);
  }

  const { data: resume } = useQuery({
    queryKey: ["resume", id],
    queryFn: async () => {
      const { data } = await supabase.from("resumes").select("*").eq("id", id).single();
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<Content>(empty);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [improving, setImproving] = useState(false);

  useEffect(() => {
    if (resume) {
      setTitle(resume.title);
      setContent({ ...empty, ...(resume.content as object as Content) });
    }
  }, [resume]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("resumes")
      .update({ title, content: content as any })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["resume", id] });
    qc.invalidateQueries({ queryKey: ["resumes"] });
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await save();
      await analyze({ data: { resumeId: id } });
      toast.success("ATS analysis complete");
      qc.invalidateQueries({ queryKey: ["resume", id] });
    } catch (e: any) {
      toast.error(e.message ?? "AI analysis failed");
    }
    setAnalyzing(false);
  }

  async function improveSummary() {
    if (!content.summary.trim()) return toast.info("Write a summary first");
    setImproving(true);
    try {
      const { improved } = await improve({ data: { section: "Professional Summary", current: content.summary } });
      setContent({ ...content, summary: improved });
      toast.success("Improved with AI");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setImproving(false);
  }

  return (
    <CandidateShell eyebrow="Resume editor">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/candidate/resumes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All resumes
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runAnalysis} disabled={analyzing} className="rounded-full">
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            ATS Analysis
          </Button>
          <Button onClick={save} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Section>

          <Section title="Professional Summary" action={
            <Button size="sm" variant="ghost" onClick={improveSummary} disabled={improving} className="text-primary">
              {improving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1 h-3.5 w-3.5" />} Improve with AI
            </Button>
          }>
            <Textarea rows={4} value={content.summary} onChange={(e) => setContent({ ...content, summary: e.target.value })} placeholder="2-3 sentences positioning you." />
          </Section>

          <Section title="Skills (comma-separated)">
            <Input value={content.skills.join(", ")} onChange={(e) => setContent({ ...content, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {content.skills.map((s, i) => <Badge key={`${s}-${i}`} variant="secondary" className="rounded-full">{s}</Badge>)}
            </div>
          </Section>

          <Section title="Experience" action={
            <Button size="sm" variant="ghost" onClick={() => setContent({ ...content, experience: [...content.experience, { company: "", role: "", period: "", bullets: "" }] })}>+ Add role</Button>
          }>
            <div className="space-y-4">
              {content.experience.map((e, i) => (
                <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input placeholder="Company" value={e.company} onChange={(ev) => updateArray(setContent, content, "experience", i, { company: ev.target.value })} />
                    <Input placeholder="Role" value={e.role} onChange={(ev) => updateArray(setContent, content, "experience", i, { role: ev.target.value })} />
                    <Input placeholder="2022 — Present" value={e.period} onChange={(ev) => updateArray(setContent, content, "experience", i, { period: ev.target.value })} />
                  </div>
                  <Textarea rows={3} placeholder="Achievement bullets, one per line" value={e.bullets} onChange={(ev) => updateArray(setContent, content, "experience", i, { bullets: ev.target.value })} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Education" action={
            <Button size="sm" variant="ghost" onClick={() => setContent({ ...content, education: [...content.education, { school: "", degree: "", year: "" }] })}>+ Add</Button>
          }>
            <div className="space-y-2">
              {content.education.map((e, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-3 rounded-xl border border-border/60 p-3">
                  <Input placeholder="School" value={e.school} onChange={(ev) => updateArray(setContent, content, "education", i, { school: ev.target.value })} />
                  <Input placeholder="Degree" value={e.degree} onChange={(ev) => updateArray(setContent, content, "education", i, { degree: ev.target.value })} />
                  <Input placeholder="Year" value={e.year} onChange={(ev) => updateArray(setContent, content, "education", i, { year: ev.target.value })} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Projects" action={
            <Button size="sm" variant="ghost" onClick={() => setContent({ ...content, projects: [...content.projects, { name: "", description: "" }] })}>+ Add</Button>
          }>
            <div className="space-y-2">
              {content.projects.map((p, i) => (
                <div key={i} className="rounded-xl border border-border/60 p-3 space-y-2">
                  <Input placeholder="Project name" value={p.name} onChange={(ev) => updateArray(setContent, content, "projects", i, { name: ev.target.value })} />
                  <Textarea rows={2} placeholder="What you built and why it mattered" value={p.description} onChange={(ev) => updateArray(setContent, content, "projects", i, { description: ev.target.value })} />
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ATS sidebar */}
        <aside className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">ATS Score</p>
            <p className="mt-2 font-display text-5xl">{resume?.ats_score ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Run analysis to refresh.</p>
          </div>
          {resume?.ats_feedback ? (
            <div className="glass rounded-2xl p-6">
              <p className="text-sm font-medium">Feedback</p>
              <p className="mt-2 text-sm text-muted-foreground">{(resume.ats_feedback as any)?.summary}</p>
              <ul className="mt-4 space-y-3">
                {((resume.ats_feedback as any)?.sections ?? []).map((s: any) => (
                  <li key={s.name}>
                    <div className="flex justify-between text-xs"><span>{s.name}</span><span className="text-muted-foreground">{s.score}</span></div>
                    <div className="mt-1 h-1 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${s.score}%` }} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">Run ATS Analysis to get per-section feedback.</div>
          )}
        </aside>
      </div>

      {/* Role-targeted analysis */}
      <div className="glass mt-8 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl">Role-Targeted Analysis</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Tell us the role you're targeting — we'll list concrete plus points and drawbacks for THIS role, not generic feedback.</p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Target role *</label>
            <Input className="mt-1" placeholder="e.g. Frontend Engineer Intern" value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Target company (optional)</label>
            <Input className="mt-1" placeholder="e.g. Google, Stripe" value={roleForm.company} onChange={(e) => setRoleForm({ ...roleForm, company: e.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Experience level *</label>
            <Input className="mt-1" placeholder="Student / Intern / 0-1 yr / 2-4 yr" value={roleForm.experienceLevel} onChange={(e) => setRoleForm({ ...roleForm, experienceLevel: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Job description (optional)</label>
            <Textarea rows={4} className="mt-1" placeholder="Paste the JD to get the most precise analysis" value={roleForm.jobDescription} onChange={(e) => setRoleForm({ ...roleForm, jobDescription: e.target.value })} />
          </div>
        </div>
        <Button onClick={runRoleAnalysis} disabled={targeting} className="mt-4 rounded-full">
          {targeting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Analyze for this role
        </Button>

        {resume?.targeted_feedback ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="glass rounded-2xl border border-primary/30 p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Role fit</p>
              <p className="mt-1 font-display text-5xl text-primary">{(resume.targeted_feedback as any).role_fit_score}</p>
              <p className="mt-2 text-sm">{(resume.targeted_feedback as any).verdict}</p>
              <p className="mt-3 rounded-lg bg-secondary/50 p-3 text-xs"><span className="font-medium">Tailored summary:</span> {(resume.targeted_feedback as any).tailored_summary}</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium"><ThumbsUp className="h-4 w-4 text-success" /> Plus points</p>
              <ul className="space-y-3">
                {((resume.targeted_feedback as any).plus_points ?? []).map((p: any, i: number) => (
                  <li key={i} className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                    <p className="font-medium">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium"><ThumbsDown className="h-4 w-4 text-destructive" /> Drawbacks</p>
              <ul className="space-y-3">
                {((resume.targeted_feedback as any).drawbacks ?? []).map((d: any, i: number) => (
                  <li key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{d.title}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{d.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{d.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-5 lg:col-span-3">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium"><ListChecks className="h-4 w-4 text-primary" /> 30-day action plan</p>
              <ol className="grid gap-2 md:grid-cols-2">
                {((resume.targeted_feedback as any).action_items ?? []).map((a: string, i: number) => (
                  <li key={i} className="flex gap-2 rounded-lg border border-border/60 p-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-medium text-primary">{i + 1}</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
              {((resume.targeted_feedback as any).missing_skills ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Skills to add:</span>
                  {((resume.targeted_feedback as any).missing_skills ?? []).map((s: string) => (
                    <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">→ added to your Learning Center</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">No role analysis yet. Fill the form above to generate one.</p>
        )}
      </div>
    </CandidateShell>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium">{title}</p>{action}</div>
      {children}
    </div>
  );
}

function updateArray<K extends "experience" | "education" | "projects">(
  setContent: (c: Content) => void, content: Content, key: K, i: number, patch: Partial<Content[K][number]>
) {
  const arr = [...content[key]];
  arr[i] = { ...arr[i], ...patch } as Content[K][number];
  setContent({ ...content, [key]: arr });
}
