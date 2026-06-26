import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Plus, Play, Download } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { exportInterviewReport } from "@/lib/interview-export";

export const Route = createFileRoute("/_authenticated/candidate/interviews/")({
  head: () => ({ meta: [{ title: "AI Interviewer — Adika AI" }] }),
  component: InterviewsList,
});

const ROLE_PRESETS = [
  "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full-Stack Engineer",
  "Mobile Engineer (iOS/Android)", "DevOps Engineer", "Cloud Engineer (AWS/GCP/Azure)",
  "Site Reliability Engineer", "Data Engineer", "Data Analyst", "Data Scientist",
  "Machine Learning Engineer", "AI/LLM Engineer", "Security Engineer",
  "QA / SDET", "UI/UX Designer", "Product Manager", "Engineering Manager",
];

const COMPANY_PRESETS = [
  "Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix",
  "Adobe", "Uber", "Airbnb", "Stripe", "Atlassian", "Salesforce",
  "Nvidia", "OpenAI", "Anthropic", "TCS", "Infosys", "Razorpay", "Zomato", "Swiggy",
];

const EXPERIENCE = [
  { v: "fresher", label: "Fresher (0–2 yr)" },
  { v: "junior",  label: "Junior (2–4 yr)" },
  { v: "mid",     label: "Mid-level (4–7 yr)" },
  { v: "senior",  label: "Senior (7+ yr)" },
  { v: "custom",  label: "Enter your own…" },
];

function InterviewsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [roleTarget, setRoleTarget] = useState("");
  const [roleMode, setRoleMode] = useState<"preset" | "custom">("preset");
  const [company, setCompany] = useState("");
  const [experience, setExperience] = useState("mid");
  const [customExp, setCustomExp] = useState("");
  const [jd, setJd] = useState("");
  const [open, setOpen] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: sessions } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("interview_sessions").select("*").eq("candidate_id", u.user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function start() {
    if (!roleTarget.trim()) return toast.info("Pick or enter a target role");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const expValue = experience === "custom" ? (customExp.trim() || "mid") : experience;
    const { data, error } = await supabase.from("interview_sessions").insert({
      candidate_id: u.user.id,
      role_target: roleTarget.trim(),
      difficulty: expValue,
      // @ts-ignore — new columns
      company: company.trim() || null,
      // @ts-ignore
      experience_level: expValue,
      // @ts-ignore
      job_description: jd.trim() || null,
      status: "in_progress",
    }).select().single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["interviews"] });
    setOpen(false);
    navigate({ to: "/candidate/interviews/$id", params: { id: data.id } });
  }

  async function handleExport(id: string) {
    setExportingId(id);
    try {
      await exportInterviewReport(id);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
    setExportingId(null);
  }

  return (
    <CandidateShell eyebrow="Adaptive practice" title="AI Interviewer">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-6">
        <div>
          <p className="font-medium">Start a calibrated mock interview</p>
          <p className="text-sm text-muted-foreground">Ten adaptive questions tuned to your target company, role, and experience. Per-answer analysis + exportable report.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full"><Plus className="mr-2 h-4 w-4" /> New session</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New interview session</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Target company <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  list="company-presets"
                  className="mt-1"
                  placeholder="e.g. Amazon, Google, Adobe…"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <datalist id="company-presets">
                  {COMPANY_PRESETS.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <Label className="text-xs">Target role</Label>
                {roleMode === "preset" ? (
                  <div className="mt-1 flex gap-2">
                    <Select value={roleTarget} onValueChange={setRoleTarget}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a role" /></SelectTrigger>
                      <SelectContent>
                        {ROLE_PRESETS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setRoleMode("custom"); setRoleTarget(""); }}>Custom</Button>
                  </div>
                ) : (
                  <div className="mt-1 flex gap-2">
                    <Input className="flex-1" placeholder="e.g. Robotics Perception Engineer" value={roleTarget} onChange={(e) => setRoleTarget(e.target.value)} />
                    <Button type="button" variant="outline" size="sm" onClick={() => { setRoleMode("preset"); setRoleTarget(""); }}>Presets</Button>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Experience</Label>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE.map(e => <SelectItem key={e.v} value={e.v}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {experience === "custom" && (
                  <Input
                    className="mt-2"
                    placeholder="Describe your level, e.g. 'Self-taught, 3 internships'"
                    value={customExp}
                    onChange={(e) => setCustomExp(e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label className="text-xs">Job description <span className="text-muted-foreground">(optional — pastes will tune questions)</span></Label>
                <Textarea
                  className="mt-1 max-h-40"
                  rows={4}
                  placeholder="Paste the JD here for sharper, role-specific questions…"
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                />
              </div>

              <Button onClick={start} className="w-full rounded-full"><Play className="mr-2 h-4 w-4" /> Begin 10-question session</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(sessions ?? []).map((s) => {
          const company = (s as any).company as string | null;
          return (
            <div key={s.id} className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
              <Link to="/candidate/interviews/$id" params={{ id: s.id }} className="block">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> {s.role_target}</p>
                    {company && <p className="text-xs text-muted-foreground">@ {company}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px] capitalize">{s.status.replace("_"," ")}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-[10px] uppercase text-muted-foreground">Q's</p><p className="font-display text-2xl">{s.question_count ?? 0}/10</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">Overall</p><p className="font-display text-2xl">{s.overall_score ?? "—"}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">Ready</p><p className="font-display text-2xl">{s.readiness_score ?? "—"}</p></div>
                </div>
              </Link>
              {s.status === "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full rounded-full"
                  disabled={exportingId === s.id}
                  onClick={() => handleExport(s.id)}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  {exportingId === s.id ? "Exporting…" : "Export PDF report"}
                </Button>
              )}
            </div>
          );
        })}
        {!sessions?.length && <div className="glass col-span-full rounded-2xl p-12 text-center text-muted-foreground">No sessions yet — start one above.</div>}
      </div>
    </CandidateShell>
  );
}
