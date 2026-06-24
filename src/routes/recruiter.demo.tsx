import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Filter, Search, Star, GitCompare, MessageSquare, Briefcase, LineChart as LineChartIcon, KanbanSquare, Play } from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/recruiter/demo")({
  head: () => ({ meta: [{ title: "Recruiter Demo — Adika AI" }] }),
  component: RecruiterDemo,
});

type Candidate = {
  id: string;
  name: string;
  role: string;
  match: number;
  skills: string[];
  readiness: number;
  location: string;
  ats: number;
  comm: number;
  tech: number;
  problem: number;
  experience: string;
  learning: number;
  interviews: number;
  highlight: string;
};

const candidates: Candidate[] = [
  { id: "c1", name: "Priya Nair", role: "Senior AI Engineer", match: 94, skills: ["PyTorch", "RAG", "Kubernetes"], readiness: 91, location: "Bengaluru", ats: 92, comm: 88, tech: 94, problem: 90, experience: "6y · ex-Stripe", learning: 28, interviews: 7, highlight: "Strong system design + ML depth. RAG pipeline at scale." },
  { id: "c2", name: "Marcus Reed", role: "Backend Engineer", match: 88, skills: ["Go", "Postgres", "Kafka"], readiness: 84, location: "Berlin", ats: 90, comm: 82, tech: 88, problem: 86, experience: "5y · ex-Datadog", learning: 19, interviews: 6, highlight: "Event-driven systems. Built 50k events/sec ingestor." },
  { id: "c3", name: "Ana Silva", role: "Full Stack Engineer", match: 81, skills: ["React", "Node", "AWS"], readiness: 78, location: "São Paulo", ats: 83, comm: 84, tech: 79, problem: 78, experience: "4y · ex-Nubank", learning: 22, interviews: 5, highlight: "Product-minded full stack. Strong customer empathy." },
  { id: "c4", name: "Daniel Cho", role: "ML Engineer", match: 79, skills: ["MLflow", "Spark", "GCP"], readiness: 80, location: "Seoul", ats: 85, comm: 74, tech: 82, problem: 80, experience: "5y · ex-Naver", learning: 16, interviews: 4, highlight: "MLOps depth. Owned end-to-end model lifecycle." },
  { id: "c5", name: "Sara Okonkwo", role: "Data Engineer", match: 76, skills: ["dbt", "Snowflake", "Airflow"], readiness: 72, location: "Lagos", ats: 78, comm: 80, tech: 76, problem: 72, experience: "3y · ex-Flutterwave", learning: 14, interviews: 3, highlight: "Modern data stack expert. Clean modeling instincts." },
  { id: "c6", name: "Leo Martin", role: "DevOps Engineer", match: 73, skills: ["Terraform", "K8s", "Argo"], readiness: 70, location: "Toronto", ats: 80, comm: 70, tech: 75, problem: 72, experience: "4y · ex-Shopify", highlight: "Platform reliability. Cost optimization wins.", learning: 11, interviews: 3 },
];

const pipelineStages = [
  { key: "sourced", label: "Sourced", ids: ["c5", "c6"] },
  { key: "screen", label: "AI Screen", ids: ["c3"] },
  { key: "interview", label: "Interview", ids: ["c2", "c4"] },
  { key: "offer", label: "Offer", ids: ["c1"] },
];

const jobs = [
  { title: "Senior AI Engineer", applicants: 64, stage: "Open", score: 94 },
  { title: "Backend Engineer (Go)", applicants: 48, stage: "Open", score: 88 },
  { title: "Staff Data Engineer", applicants: 27, stage: "Draft", score: 0 },
];

const transcript = [
  { who: "AI", text: "Walk me through how you'd design a rate-limited webhook ingestor for 50K events / sec." },
  { who: "Marcus", text: "I'd front it with a stateless ingest layer behind a load balancer, use token-bucket rate limiting per source, then push to Kafka with idempotency keys…" },
  { who: "AI", text: "Good. How do you guarantee at-least-once delivery without duplicate side effects downstream?" },
  { who: "Marcus", text: "Consumers track processed message IDs in a fast KV (Redis with TTL) and the downstream side effects are idempotent by event_id." },
];

function RecruiterDemo() {
  return (
    <div className="recruiter relative min-h-screen text-foreground">
      <MeshBackground variant="constellation" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">Demo workspace · no signup</span>
          <Link to="/auth" search={{ role: "recruiter", mode: "register" }}>
            <Button size="sm" className="rounded-full">Create real account</Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="glass rounded-3xl p-8 shadow-luxe md:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Recruiter Pro · Live Demo</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">
            <span className="text-gold">Calibrated</span> hiring intelligence, in one workspace.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Browse pipeline, compare candidates side-by-side, replay adaptive interviews, and read AI-generated briefs — all backed by the same intelligence layer your candidates use.
          </p>
        </div>

        <Tabs defaultValue="pipeline" className="mt-8">
          <TabsList className="flex w-full flex-wrap gap-2 rounded-full bg-card/40 p-1">
            <TabsTrigger value="pipeline" className="rounded-full data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><KanbanSquare className="mr-2 h-4 w-4" /> Pipeline</TabsTrigger>
            <TabsTrigger value="candidates" className="rounded-full data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><Search className="mr-2 h-4 w-4" /> Candidates</TabsTrigger>
            <TabsTrigger value="compare" className="rounded-full data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><GitCompare className="mr-2 h-4 w-4" /> Compare</TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-full data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><Briefcase className="mr-2 h-4 w-4" /> Jobs</TabsTrigger>
            <TabsTrigger value="interview" className="rounded-full data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><MessageSquare className="mr-2 h-4 w-4" /> Interview Replay</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-full data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><LineChartIcon className="mr-2 h-4 w-4" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-6"><PipelineTab /></TabsContent>
          <TabsContent value="candidates" className="mt-6"><CandidatesTab /></TabsContent>
          <TabsContent value="compare" className="mt-6"><CompareTab /></TabsContent>
          <TabsContent value="jobs" className="mt-6"><JobsTab /></TabsContent>
          <TabsContent value="interview" className="mt-6"><InterviewTab /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><AnalyticsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  return (
    <div className="glass rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.role} · {c.location}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{c.experience}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-gold">{c.match}</p>
          <p className="text-[10px] uppercase tracking-wider text-gold/70">match</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {c.skills.map((s) => (
          <span key={s} className="rounded-full border border-border bg-card/40 px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{c.highlight}</p>
      <div className="mt-4">
        <div className="flex justify-between text-xs"><span>Readiness</span><span className="text-gold/80">{c.readiness}%</span></div>
        <div className="mt-1.5 h-1.5 rounded-full bg-card/60">
          <div className="h-full rounded-full bg-gradient-to-r from-[#A87E3F] via-[#C9A86A] to-[#DFC189]" style={{ width: `${c.readiness}%` }} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-gold"><Star className="mr-1.5 h-4 w-4" /> Shortlist</Button>
        <Button size="sm" className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold-soft">View profile</Button>
      </div>
    </div>
  );
}

function CandidatesTab() {
  return (
    <div>
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by skill, role, location…" className="pl-9" />
        </div>
        <Button variant="outline" className="rounded-full"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {candidates.map((c) => <CandidateCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

function PipelineTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {pipelineStages.map((s) => (
        <div key={s.key} className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80">{s.label}</p>
            <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] text-gold">{s.ids.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {s.ids.map((id) => {
              const c = candidates.find((x) => x.id === id)!;
              return (
                <div key={id} className="rounded-xl border border-border bg-card/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.name}</p>
                    <span className="font-display text-xl text-gold">{c.match}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{c.role}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.skills.slice(0, 2).map((sk) => (
                      <span key={sk} className="rounded-full border border-border bg-card/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{sk}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareTab() {
  const [picked, setPicked] = useState<string[]>(["c1", "c2", "c4"]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));
  const selected = useMemo(() => candidates.filter((c) => picked.includes(c.id)), [picked]);

  const dims: { key: keyof Candidate; label: string }[] = [
    { key: "match", label: "Match score" },
    { key: "tech", label: "Technical" },
    { key: "comm", label: "Communication" },
    { key: "problem", label: "Problem solving" },
    { key: "ats", label: "ATS score" },
    { key: "readiness", label: "Readiness" },
    { key: "learning", label: "Learning streak (d)" },
    { key: "interviews", label: "Interview sessions" },
  ];

  const best = (key: keyof Candidate) =>
    Math.max(...selected.map((c) => Number(c[key])));

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="glass rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Select up to 4</p>
        <div className="mt-3 space-y-2">
          {candidates.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card/30 px-3 py-2 hover:bg-card/50">
              <Checkbox checked={picked.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.role}</p>
              </div>
              <span className="font-display text-sm text-gold">{c.match}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        {selected.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Select candidates on the left to compare.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Dimension</th>
                  {selected.map((c) => (
                    <th key={c.id} className="px-4 py-3 text-right">
                      <div className="font-display text-base text-foreground">{c.name}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">{c.role}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dims.map((d) => {
                  const top = best(d.key);
                  return (
                    <tr key={d.key} className="border-b border-border/60">
                      <td className="px-4 py-3 text-muted-foreground">{d.label}</td>
                      {selected.map((c) => {
                        const v = Number(c[d.key]);
                        const isTop = v === top;
                        return (
                          <td key={c.id} className="px-4 py-3 text-right">
                            <span className={isTop ? "font-display text-lg text-gold" : "text-foreground"}>{v}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">AI brief</td>
                  {selected.map((c) => (
                    <td key={c.id} className="max-w-[260px] px-4 py-3 text-right text-xs text-muted-foreground">
                      {c.highlight}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function JobsTab() {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3">Applicants</th>
            <th className="px-5 py-3">Stage</th>
            <th className="px-5 py-3 text-right">Top match</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.title} className="border-b border-border/60">
              <td className="px-5 py-4 font-medium">{j.title}</td>
              <td className="px-5 py-4 text-muted-foreground">{j.applicants}</td>
              <td className="px-5 py-4"><span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs text-gold">{j.stage}</span></td>
              <td className="px-5 py-4 text-right font-display text-xl text-gold">{j.score || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InterviewTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Adaptive interview · Backend Engineer</p>
            <h3 className="mt-1 font-display text-2xl">Marcus Reed</h3>
          </div>
          <Button size="sm" className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold-soft">
            <Play className="mr-2 h-4 w-4" /> Replay
          </Button>
        </div>
        <div className="mt-6 space-y-3">
          {transcript.map((t, i) => (
            <div key={i} className={t.who === "AI" ? "rounded-xl border border-border bg-card/40 p-4" : "rounded-xl bg-gold-soft p-4 text-foreground"}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.who}</p>
              <p className="mt-1 text-sm leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Session scores</p>
        <div className="mt-4 space-y-4">
          {[
            ["Technical depth", 88],
            ["Communication", 82],
            ["Problem solving", 86],
            ["Role readiness", 84],
          ].map(([k, v]) => (
            <div key={k as string}>
              <div className="flex justify-between text-xs"><span>{k}</span><span className="text-gold/80">{v}%</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-card/60">
                <div className="h-full rounded-full bg-gradient-to-r from-[#A87E3F] via-[#C9A86A] to-[#DFC189]" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const funnel = [
    ["Applied", 248],
    ["AI Screen passed", 162],
    ["Interview", 74],
    ["Offer", 18],
    ["Hired", 11],
  ] as const;
  const max = funnel[0][1];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Hiring funnel (last 30d)</p>
        <div className="mt-6 space-y-3">
          {funnel.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-sm"><span>{k}</span><span className="text-muted-foreground">{v}</span></div>
              <div className="mt-1.5 h-2 rounded-full bg-card/60">
                <div className="h-full rounded-full bg-gradient-to-r from-[#A87E3F] via-[#C9A86A] to-[#DFC189]" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="glass grid grid-cols-2 gap-4 rounded-2xl p-6">
        {[
          ["38%", "Faster to offer"],
          ["94%", "Match→hire correlation"],
          ["7.2", "Avg interview score"],
          ["11", "Hires this month"],
        ].map(([v, l]) => (
          <div key={l as string} className="rounded-xl border border-border bg-card/30 p-4">
            <p className="font-display text-3xl text-gold">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
