import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Filter, Search, Star, GitCompare, MessageSquare, Briefcase,
  LineChart as LineChartIcon, KanbanSquare, Play, Pause, ArrowRight,
  ArrowLeft as ArrowLeftIcon, Check, X, UserCheck, Archive, RotateCcw,
  Trash2, Heart, Mail, MapPin, GraduationCap, FileText, Calendar, User as UserIcon,
  Sparkles, Languages, Trophy, ChevronDown, ChevronUp, Building2, Clock, TrendingUp,
} from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
  // extended profile
  age: number;
  gender: string;
  email: string;
  phone: string;
  appliedFor: string;
  qualifications: string[];
  certifications: string[];
  languages: string[];
  hobbies: string[];
  projects: { name: string; desc: string }[];
  resumeBullets: string[];
  extracted: { years: number; pastCompanies: string[]; topSkills: string[] };
};

const candidates: Candidate[] = [
  {
    id: "c1", name: "Priya Nair", role: "Senior AI Engineer", match: 94, skills: ["PyTorch", "RAG", "Kubernetes"],
    readiness: 91, location: "Bengaluru", ats: 92, comm: 88, tech: 94, problem: 90,
    experience: "6y · ex-Stripe", learning: 28, interviews: 7,
    highlight: "Strong system design + ML depth. RAG pipeline at scale.",
    age: 29, gender: "Female", email: "priya.nair@example.com", phone: "+91 98xxxx2210",
    appliedFor: "Senior AI Engineer",
    qualifications: ["B.Tech Computer Science, IIT Bombay", "M.S. Machine Learning, Stanford"],
    certifications: ["AWS ML Specialty", "GCP Professional ML Engineer"],
    languages: ["English (Native)", "Hindi (Native)", "Kannada (Fluent)"],
    hobbies: ["Long-distance running", "Open-source contributing", "Classical music"],
    projects: [
      { name: "RAG Search at Stripe", desc: "Cut support resolution time 38% with retrieval-augmented LLM workflow." },
      { name: "Kube-Autoscaler", desc: "OSS HPA replacement using time-series forecasting." },
    ],
    resumeBullets: [
      "Led 6-person ML platform team; shipped feature store powering 40+ models.",
      "Designed RAG pipeline serving 12M monthly queries with p95 < 220ms.",
      "Reduced GPU spend 27% via batched inference + INT8 quantization.",
    ],
    extracted: { years: 6, pastCompanies: ["Stripe", "Atlassian"], topSkills: ["PyTorch", "RAG", "Kubernetes", "Python", "AWS"] },
  },
  {
    id: "c2", name: "Marcus Reed", role: "Backend Engineer", match: 88, skills: ["Go", "Postgres", "Kafka"],
    readiness: 84, location: "Berlin", ats: 90, comm: 82, tech: 88, problem: 86,
    experience: "5y · ex-Datadog", learning: 19, interviews: 6,
    highlight: "Event-driven systems. Built 50k events/sec ingestor.",
    age: 31, gender: "Male", email: "marcus.reed@example.com", phone: "+49 30xxxx88",
    appliedFor: "Backend Engineer (Go)",
    qualifications: ["B.Sc. Computer Science, TU Berlin"],
    certifications: ["CKA — Certified Kubernetes Administrator"],
    languages: ["English (Native)", "German (Fluent)"],
    hobbies: ["Bouldering", "Mechanical keyboards", "Brewing coffee"],
    projects: [
      { name: "Webhook Ingestor", desc: "50K events/sec, exactly-once via Kafka + Redis dedup." },
      { name: "PG Connection Pooler", desc: "Drop-in pgbouncer alt in Go, 30% lower latency." },
    ],
    resumeBullets: [
      "Owned core ingestion at Datadog (handled $4M ARR worth of customer traffic).",
      "Mentored 4 juniors; introduced load-test gate in CI.",
      "Speaker at GopherCon 2024 on concurrency patterns.",
    ],
    extracted: { years: 5, pastCompanies: ["Datadog", "N26"], topSkills: ["Go", "Postgres", "Kafka", "Redis", "Terraform"] },
  },
  {
    id: "c3", name: "Ana Silva", role: "Full Stack Engineer", match: 81, skills: ["React", "Node", "AWS"],
    readiness: 78, location: "São Paulo", ats: 83, comm: 84, tech: 79, problem: 78,
    experience: "4y · ex-Nubank", learning: 22, interviews: 5,
    highlight: "Product-minded full stack. Strong customer empathy.",
    age: 27, gender: "Female", email: "ana.silva@example.com", phone: "+55 11xxxx55",
    appliedFor: "Full Stack Engineer",
    qualifications: ["B.Eng Software Engineering, USP"],
    certifications: ["AWS Solutions Architect Associate"],
    languages: ["Portuguese (Native)", "English (Fluent)", "Spanish (Conversational)"],
    hobbies: ["Surfing", "Cooking", "Travel photography"],
    projects: [
      { name: "Nubank Onboarding Funnel", desc: "Lifted activation 14% via UX experiments." },
      { name: "OSS React Hooks Library", desc: "1.4k stars on GitHub." },
    ],
    resumeBullets: [
      "Shipped 30+ A/B tests in onboarding; owned conversion KPI.",
      "Led migration from monolith → microservices for auth.",
      "Mentor at Reprograma (women in tech NGO).",
    ],
    extracted: { years: 4, pastCompanies: ["Nubank", "iFood"], topSkills: ["React", "Node", "AWS", "TypeScript", "GraphQL"] },
  },
  {
    id: "c4", name: "Daniel Cho", role: "ML Engineer", match: 79, skills: ["MLflow", "Spark", "GCP"],
    readiness: 80, location: "Seoul", ats: 85, comm: 74, tech: 82, problem: 80,
    experience: "5y · ex-Naver", learning: 16, interviews: 4,
    highlight: "MLOps depth. Owned end-to-end model lifecycle.",
    age: 30, gender: "Male", email: "daniel.cho@example.com", phone: "+82 10xxxx77",
    appliedFor: "Senior AI Engineer",
    qualifications: ["B.S. CS, KAIST", "M.S. Data Science, SNU"],
    certifications: ["GCP Professional Data Engineer", "Databricks Certified ML"],
    languages: ["Korean (Native)", "English (Fluent)"],
    hobbies: ["Go (board game)", "Cycling", "Coffee roasting"],
    projects: [
      { name: "Naver Search Ranking", desc: "Re-ranking model lifted CTR 6%." },
      { name: "MLflow → Vertex bridge", desc: "Open-sourced; 300+ stars." },
    ],
    resumeBullets: [
      "Owned model lifecycle for 8 production models at Naver.",
      "Built feature monitoring; cut drift incidents 60%.",
      "Authored internal MLOps playbook used by 40+ engineers.",
    ],
    extracted: { years: 5, pastCompanies: ["Naver", "Kakao"], topSkills: ["MLflow", "Spark", "GCP", "Python", "Airflow"] },
  },
  {
    id: "c5", name: "Sara Okonkwo", role: "Data Engineer", match: 76, skills: ["dbt", "Snowflake", "Airflow"],
    readiness: 72, location: "Lagos", ats: 78, comm: 80, tech: 76, problem: 72,
    experience: "3y · ex-Flutterwave", learning: 14, interviews: 3,
    highlight: "Modern data stack expert. Clean modeling instincts.",
    age: 26, gender: "Female", email: "sara.okonkwo@example.com", phone: "+234 80xxxx12",
    appliedFor: "Staff Data Engineer",
    qualifications: ["B.Sc. Statistics, University of Lagos"],
    certifications: ["dbt Analytics Engineer", "Snowflake SnowPro Core"],
    languages: ["English (Native)", "Yoruba (Native)"],
    hobbies: ["Chess", "Afrobeat DJing", "Marathon training"],
    projects: [
      { name: "Flutterwave Reporting Layer", desc: "Rebuilt dbt models, 4× faster dashboards." },
      { name: "African Tech Salary Survey", desc: "Open dataset cited by TechCabal." },
    ],
    resumeBullets: [
      "Owned 200+ dbt models across finance + product domains.",
      "Cut Snowflake spend 22% via warehouse right-sizing.",
      "Founded LagosData meetup (600+ members).",
    ],
    extracted: { years: 3, pastCompanies: ["Flutterwave", "Andela"], topSkills: ["dbt", "Snowflake", "Airflow", "SQL", "Python"] },
  },
  {
    id: "c6", name: "Leo Martin", role: "DevOps Engineer", match: 73, skills: ["Terraform", "K8s", "Argo"],
    readiness: 70, location: "Toronto", ats: 80, comm: 70, tech: 75, problem: 72,
    experience: "4y · ex-Shopify", learning: 11, interviews: 3,
    highlight: "Platform reliability. Cost optimization wins.",
    age: 32, gender: "Male", email: "leo.martin@example.com", phone: "+1 416xxxx04",
    appliedFor: "Backend Engineer (Go)",
    qualifications: ["B.Eng Software Engineering, University of Waterloo"],
    certifications: ["CKA", "HashiCorp Terraform Associate"],
    languages: ["English (Native)", "French (Fluent)"],
    hobbies: ["Ice hockey", "Woodworking", "Sci-fi novels"],
    projects: [
      { name: "Shopify EKS Migration", desc: "Migrated 80+ services, zero downtime." },
      { name: "Terraform Cost Dashboard", desc: "Internal tool, saved $1.2M/yr." },
    ],
    resumeBullets: [
      "On-call rotation lead for platform team (12 engineers).",
      "Built GitOps pipeline with Argo CD across 3 regions.",
      "Authored Shopify's internal SRE handbook.",
    ],
    extracted: { years: 4, pastCompanies: ["Shopify", "RBC"], topSkills: ["Terraform", "K8s", "Argo", "AWS", "Go"] },
  },
];

// 18 candidates distributed across the pipeline stages
type Stage = "applied" | "sourced" | "screen" | "interview" | "offer";
const STAGES: { key: Stage; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "sourced", label: "Sourced" },
  { key: "screen", label: "AI Screen" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
];

type PipeCard = { id: string; name: string; role: string; match: number; stage: Stage };

const INITIAL_PIPELINE: PipeCard[] = [
  { id: "p1", name: "Aarav Sharma", role: "Backend Engineer", match: 78, stage: "applied" },
  { id: "p2", name: "Diya Patel", role: "Frontend Engineer", match: 72, stage: "applied" },
  { id: "p3", name: "Kabir Singh", role: "Data Engineer", match: 81, stage: "applied" },
  { id: "p4", name: "Ananya Iyer", role: "ML Engineer", match: 69, stage: "applied" },
  { id: "p5", name: "Vihaan Mehta", role: "DevOps Engineer", match: 83, stage: "sourced" },
  { id: "p6", name: "Ishaan Verma", role: "Backend Engineer", match: 76, stage: "sourced" },
  { id: "p7", name: "Riya Kapoor", role: "Full Stack Engineer", match: 88, stage: "sourced" },
  { id: "p8", name: "Aditi Joshi", role: "ML Engineer", match: 85, stage: "screen" },
  { id: "p9", name: "Rohan Gupta", role: "Senior AI Engineer", match: 91, stage: "screen" },
  { id: "p10", name: "Saanvi Reddy", role: "Backend Engineer", match: 79, stage: "screen" },
  { id: "p11", name: "Arjun Nair", role: "Frontend Engineer", match: 74, stage: "screen" },
  { id: "p12", name: "Meera Pillai", role: "Backend Engineer", match: 87, stage: "interview" },
  { id: "p13", name: "Aryan Khanna", role: "Data Engineer", match: 82, stage: "interview" },
  { id: "p14", name: "Sneha Bose", role: "Full Stack Engineer", match: 84, stage: "interview" },
  { id: "p15", name: "Devansh Rao", role: "ML Engineer", match: 92, stage: "offer" },
  { id: "p16", name: "Tara Menon", role: "Senior AI Engineer", match: 95, stage: "offer" },
  { id: "p17", name: "Kavya Desai", role: "Backend Engineer", match: 89, stage: "offer" },
  { id: "p18", name: "Neel Bhatia", role: "DevOps Engineer", match: 86, stage: "offer" },
];

type Job = { id: string; title: string; applicants: number; stage: "Open" | "Draft"; topMatchIds: string[] };
const jobs: Job[] = [
  { id: "j1", title: "Senior AI Engineer", applicants: 64, stage: "Open", topMatchIds: ["c1", "c4"] },
  { id: "j2", title: "Backend Engineer (Go)", applicants: 48, stage: "Open", topMatchIds: ["c2", "c6"] },
  { id: "j3", title: "Staff Data Engineer", applicants: 27, stage: "Draft", topMatchIds: ["c5"] },
];

type ReplaySession = {
  id: string; candidateId: string; role: string; company: string; duration: string; date: string;
  scores: { tech: number; comm: number; problem: number; readiness: number };
  signals: { typingSpeed: string; pasteRatio: string; aiLikelihood: string; sentiment: string };
  transcript: { who: "AI" | "Candidate"; text: string; analysis?: string }[];
};

const replays: ReplaySession[] = [
  {
    id: "r1", candidateId: "c2", role: "Backend Engineer (Go)", company: "Adika AI", duration: "38 min", date: "Jun 24, 2026",
    scores: { tech: 88, comm: 82, problem: 86, readiness: 84 },
    signals: { typingSpeed: "72 WPM", pasteRatio: "4%", aiLikelihood: "Low (8%)", sentiment: "Confident" },
    transcript: [
      { who: "AI", text: "Walk me through how you'd design a rate-limited webhook ingestor for 50K events / sec." },
      { who: "Candidate", text: "I'd front it with a stateless ingest layer behind a load balancer, use token-bucket rate limiting per source, then push to Kafka with idempotency keys…", analysis: "Strong opener — names concrete primitives (token bucket, idempotency keys). Structures answer top-down." },
      { who: "AI", text: "Good. How do you guarantee at-least-once delivery without duplicate side effects downstream?" },
      { who: "Candidate", text: "Consumers track processed message IDs in a fast KV (Redis with TTL) and the downstream side effects are idempotent by event_id.", analysis: "Correct pattern; explicitly distinguishes delivery semantics from side-effect semantics." },
      { who: "AI", text: "What's your TTL strategy when retries can exceed the window?" },
      { who: "Candidate", text: "I size TTL to 3× the worst-case retry envelope and ship dedup metrics so we catch drift early.", analysis: "Demonstrates operational maturity (alerts on dedup-hit ratio)." },
    ],
  },
  {
    id: "r2", candidateId: "c1", role: "Senior AI Engineer", company: "Adika AI", duration: "44 min", date: "Jun 23, 2026",
    scores: { tech: 94, comm: 88, problem: 90, readiness: 91 },
    signals: { typingSpeed: "84 WPM", pasteRatio: "2%", aiLikelihood: "Very Low (3%)", sentiment: "Composed" },
    transcript: [
      { who: "AI", text: "How would you architect a RAG system for a 12M monthly query workload?" },
      { who: "Candidate", text: "Hybrid retrieval — BM25 + dense vectors, reranker on top-K=50, cache embeddings per session, async chunk refresh.", analysis: "Production-grade design — names latency budget components." },
      { who: "AI", text: "How do you evaluate hallucination rate?" },
      { who: "Candidate", text: "I sample 200 queries weekly with a faithfulness grader (LLM-as-judge + spot human review).", analysis: "Pairs automated + human eval — recognises grader bias." },
    ],
  },
  {
    id: "r3", candidateId: "c3", role: "Full Stack Engineer", company: "Adika AI", duration: "31 min", date: "Jun 22, 2026",
    scores: { tech: 79, comm: 84, problem: 78, readiness: 78 },
    signals: { typingSpeed: "68 WPM", pasteRatio: "6%", aiLikelihood: "Low (12%)", sentiment: "Warm" },
    transcript: [
      { who: "AI", text: "Walk me through a product experiment you owned end-to-end." },
      { who: "Candidate", text: "Onboarding funnel at Nubank — I hypothesised that delaying KYC by one screen would lift activation. Ran 50/50 A/B, +14% in 2 weeks.", analysis: "Clear hypothesis → outcome storytelling. Names guardrail metrics implicitly." },
    ],
  },
  {
    id: "r4", candidateId: "c4", role: "Senior AI Engineer", company: "Adika AI", duration: "41 min", date: "Jun 21, 2026",
    scores: { tech: 82, comm: 74, problem: 80, readiness: 80 },
    signals: { typingSpeed: "61 WPM", pasteRatio: "9%", aiLikelihood: "Medium (28%)", sentiment: "Methodical" },
    transcript: [
      { who: "AI", text: "How do you detect feature drift in production?" },
      { who: "Candidate", text: "PSI on training vs serving distributions, weekly cron, alerts above 0.2.", analysis: "Correct primary metric; could mention alternative tests (KS, JS divergence)." },
    ],
  },
];

function RecruiterDemo() {
  const [pipeline, setPipeline] = useState<PipeCard[]>(INITIAL_PIPELINE);
  const [hired, setHired] = useState<PipeCard[]>([]);
  const [archive, setArchive] = useState<PipeCard[]>([]);
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [profileId, setProfileId] = useState<string | null>(null);

  const toggleShortlist = (id: string) =>
    setShortlisted((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const advance = (id: string) =>
    setPipeline((p) =>
      p.map((c) => {
        if (c.id !== id) return c;
        const idx = STAGES.findIndex((s) => s.key === c.stage);
        return idx < STAGES.length - 1 ? { ...c, stage: STAGES[idx + 1].key } : c;
      }),
    );
  const back = (id: string) =>
    setPipeline((p) =>
      p.map((c) => {
        if (c.id !== id) return c;
        const idx = STAGES.findIndex((s) => s.key === c.stage);
        return idx > 0 ? { ...c, stage: STAGES[idx - 1].key } : c;
      }),
    );
  const approve = (id: string) => {
    const card = pipeline.find((c) => c.id === id);
    if (!card) return;
    setPipeline((p) => p.filter((c) => c.id !== id));
    setHired((h) => [...h, card]);
  };
  const reject = (id: string) => {
    const card = pipeline.find((c) => c.id === id);
    if (!card) return;
    setPipeline((p) => p.filter((c) => c.id !== id));
    setArchive((a) => [...a, card]);
  };
  const addAgain = (id: string) => {
    const card = archive.find((c) => c.id === id);
    if (!card) return;
    setArchive((a) => a.filter((c) => c.id !== id));
    setPipeline((p) => [...p, { ...card, stage: "offer" }]);
  };
  const deleteForever = (id: string) =>
    setArchive((a) => a.filter((c) => c.id !== id));

  const profileCandidate = useMemo(
    () => candidates.find((c) => c.id === profileId) ?? null,
    [profileId],
  );

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
            Browse pipeline, shortlist top talent, compare side-by-side, replay adaptive interviews, and read AI-generated briefs — all backed by the same intelligence layer your candidates use.
          </p>
        </div>

        <Tabs defaultValue="pipeline" className="mt-8">
          <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl bg-card/40 p-1">
            <TabsTrigger value="pipeline" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><KanbanSquare className="mr-2 h-4 w-4" /> Pipeline</TabsTrigger>
            <TabsTrigger value="shortlist" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold">
              <Heart className="mr-2 h-4 w-4" /> Shortlist
              <span className="ml-2 rounded-full bg-gold-soft px-1.5 text-[10px] text-gold">{shortlisted.size}</span>
            </TabsTrigger>
            <TabsTrigger value="hired" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><UserCheck className="mr-2 h-4 w-4" /> New Employees <span className="ml-2 rounded-full bg-gold-soft px-1.5 text-[10px] text-gold">{hired.length}</span></TabsTrigger>
            <TabsTrigger value="archive" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><Archive className="mr-2 h-4 w-4" /> Archive <span className="ml-2 rounded-full bg-gold-soft px-1.5 text-[10px] text-gold">{archive.length}</span></TabsTrigger>
            <TabsTrigger value="candidates" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><Search className="mr-2 h-4 w-4" /> Candidates</TabsTrigger>
            <TabsTrigger value="compare" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><GitCompare className="mr-2 h-4 w-4" /> Compare</TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><Briefcase className="mr-2 h-4 w-4" /> Jobs</TabsTrigger>
            <TabsTrigger value="interview" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><MessageSquare className="mr-2 h-4 w-4" /> Interview Replay</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-gold-soft data-[state=active]:text-gold"><LineChartIcon className="mr-2 h-4 w-4" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-6">
            <PipelineTab pipeline={pipeline} onAdvance={advance} onBack={back} onApprove={approve} onReject={reject} />
          </TabsContent>
          <TabsContent value="shortlist" className="mt-6">
            <ShortlistTab shortlisted={shortlisted} onToggle={toggleShortlist} onView={setProfileId} />
          </TabsContent>
          <TabsContent value="hired" className="mt-6"><HiredTab hired={hired} /></TabsContent>
          <TabsContent value="archive" className="mt-6"><ArchiveTab archive={archive} onAddAgain={addAgain} onDelete={deleteForever} /></TabsContent>
          <TabsContent value="candidates" className="mt-6">
            <CandidatesTab shortlisted={shortlisted} onShortlist={toggleShortlist} onView={setProfileId} />
          </TabsContent>
          <TabsContent value="compare" className="mt-6"><CompareTab /></TabsContent>
          <TabsContent value="jobs" className="mt-6"><JobsTab onView={setProfileId} /></TabsContent>
          <TabsContent value="interview" className="mt-6"><InterviewTab /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><AnalyticsTab /></TabsContent>
        </Tabs>
      </main>

      <ProfileDialog
        candidate={profileCandidate}
        shortlisted={profileCandidate ? shortlisted.has(profileCandidate.id) : false}
        onShortlist={() => profileCandidate && toggleShortlist(profileCandidate.id)}
        onClose={() => setProfileId(null)}
      />
    </div>
  );
}

/* ---------------- Candidate card + tabs ---------------- */

function CandidateCard({
  c, shortlisted, onShortlist, onView,
}: {
  c: Candidate; shortlisted: boolean; onShortlist: () => void; onView: () => void;
}) {
  return (
    <div className={`glass rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe ${shortlisted ? "ring-1 ring-gold/60" : ""}`}>
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
        <Button
          size="sm"
          variant={shortlisted ? "default" : "ghost"}
          onClick={onShortlist}
          className={
            shortlisted
              ? "rounded-full bg-gradient-to-r from-[#A87E3F] via-[#C9A86A] to-[#DFC189] text-black hover:opacity-90"
              : "text-muted-foreground hover:text-gold"
          }
        >
          <Heart
            className={`mr-1.5 h-4 w-4 ${shortlisted ? "fill-[#E11D48] text-[#E11D48]" : ""}`}
          />
          {shortlisted ? "Shortlisted" : "Shortlist"}
        </Button>
        <Button
          size="sm"
          onClick={onView}
          className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold-soft"
        >
          View profile
        </Button>
      </div>
    </div>
  );
}

function CandidatesTab({
  shortlisted, onShortlist, onView,
}: {
  shortlisted: Set<string>; onShortlist: (id: string) => void; onView: (id: string) => void;
}) {
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
        {candidates.map((c) => (
          <CandidateCard
            key={c.id} c={c}
            shortlisted={shortlisted.has(c.id)}
            onShortlist={() => onShortlist(c.id)}
            onView={() => onView(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ShortlistTab({
  shortlisted, onToggle, onView,
}: {
  shortlisted: Set<string>; onToggle: (id: string) => void; onView: (id: string) => void;
}) {
  const list = candidates.filter((c) => shortlisted.has(c.id));
  if (list.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
        Tap the <Heart className="mx-1 inline h-4 w-4 text-[#E11D48]" /> heart on any candidate to add them to your shortlist.
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((c) => (
        <CandidateCard
          key={c.id} c={c}
          shortlisted
          onShortlist={() => onToggle(c.id)}
          onView={() => onView(c.id)}
        />
      ))}
    </div>
  );
}

/* ---------------- Pipeline / Hired / Archive ---------------- */

function PipelineTab({
  pipeline, onAdvance, onBack, onApprove, onReject,
}: {
  pipeline: PipeCard[];
  onAdvance: (id: string) => void;
  onBack: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {STAGES.map((s, stageIdx) => {
        const cards = pipeline.filter((c) => c.stage === s.key);
        const isFirst = stageIdx === 0;
        const isLast = stageIdx === STAGES.length - 1;
        const showApproveReject = s.key === "interview" || s.key === "offer";
        return (
          <div key={s.key} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-gold/80">{s.label}</p>
              <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] text-gold">{cards.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {cards.map((c, i) => (
                <div key={c.id} className="rounded-xl border border-border bg-card/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        <span className="mr-1.5 text-[10px] text-muted-foreground">#{i + 1}</span>
                        {c.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.role}</p>
                    </div>
                    <span className="font-display text-lg text-gold shrink-0">{c.match}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-1">
                    {!isFirst ? (
                      <button
                        onClick={() => onBack(c.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card/40 px-2 py-1 text-[10px] text-muted-foreground hover:bg-card/70 hover:text-foreground"
                        aria-label="Move back"
                      >
                        <ArrowLeftIcon className="h-3 w-3" /> Prev
                      </button>
                    ) : <span />}
                    {!isLast ? (
                      <button
                        onClick={() => onAdvance(c.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-gold bg-gold-soft px-2 py-1 text-[10px] text-gold hover:opacity-90"
                        aria-label="Move forward"
                      >
                        Next <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : <span />}
                  </div>

                  {showApproveReject && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => onApprove(c.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/25"
                      >
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button
                        onClick={() => onReject(c.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/25"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {cards.length === 0 && (
                <p className="rounded-xl border border-dashed border-border/40 p-3 text-center text-[11px] text-muted-foreground">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HiredTab({ hired }: { hired: PipeCard[] }) {
  if (hired.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
        Approve candidates from the Interview or Offer stage to move them here as new employees.
      </div>
    );
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 w-12">#</th>
            <th className="px-5 py-3">Name</th>
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3 text-right">Match</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {hired.map((c, i) => (
            <tr key={c.id} className="border-b border-border/60">
              <td className="px-5 py-4 text-muted-foreground">{i + 1}</td>
              <td className="px-5 py-4 font-medium">{c.name}</td>
              <td className="px-5 py-4 text-muted-foreground">{c.role}</td>
              <td className="px-5 py-4 text-right font-display text-lg text-gold">{c.match}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">Hired</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArchiveTab({ archive, onAddAgain, onDelete }: { archive: PipeCard[]; onAddAgain: (id: string) => void; onDelete: (id: string) => void }) {
  if (archive.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
        Rejected candidates land here temporarily. You can re-add them to Offer or delete them permanently.
      </div>
    );
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 w-12">#</th>
            <th className="px-5 py-3">Name</th>
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3 text-right">Match</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {archive.map((c, i) => (
            <tr key={c.id} className="border-b border-border/60">
              <td className="px-5 py-4 text-muted-foreground">{i + 1}</td>
              <td className="px-5 py-4 font-medium">{c.name}</td>
              <td className="px-5 py-4 text-muted-foreground">{c.role}</td>
              <td className="px-5 py-4 text-right font-display text-lg text-gold">{c.match}</td>
              <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => onAddAgain(c.id)}>
                    <RotateCcw className="mr-1.5 h-3 w-3" /> Add again
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full text-red-400 hover:text-red-300" onClick={() => onDelete(c.id)}>
                    <Trash2 className="mr-1.5 h-3 w-3" /> Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Compare ---------------- */

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

/* ---------------- Jobs ---------------- */

function JobsTab({ onView }: { onView: (id: string) => void }) {
  // per-job pointer into topMatchIds for "next best match"
  const [picks, setPicks] = useState<Record<string, number>>({});
  const nextBest = (jobId: string, total: number) =>
    setPicks((p) => ({ ...p, [jobId]: ((p[jobId] ?? 0) + 1) % total }));

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3">Applicants</th>
            <th className="px-5 py-3">Stage</th>
            <th className="px-5 py-3">Top match</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => {
            const idx = picks[j.id] ?? 0;
            const topId = j.topMatchIds[idx];
            const top = topId ? candidates.find((c) => c.id === topId) : null;
            return (
              <tr key={j.id} className="border-b border-border/60 align-top">
                <td className="px-5 py-4 font-medium">{j.title}</td>
                <td className="px-5 py-4 text-muted-foreground">{j.applicants}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${j.stage === "Open" ? "bg-gold-soft text-gold" : "bg-card/60 text-muted-foreground"}`}>{j.stage}</span>
                </td>
                <td className="px-5 py-4">
                  {top ? (
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{top.name}</p>
                        <p className="text-[11px] text-muted-foreground">{top.role} · {top.location}</p>
                      </div>
                      <span className="font-display text-xl text-gold">{top.match}</span>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {top && (
                      <>
                        <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground hover:text-gold" onClick={() => onView(top.id)}>
                          View profile
                        </Button>
                        <Button size="sm" className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold-soft">
                          <Check className="mr-1.5 h-3 w-3" /> Select
                        </Button>
                        {j.topMatchIds.length > 1 && (
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => nextBest(j.id, j.topMatchIds.length)}>
                            Next best <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Interview Replay ---------------- */

function InterviewTab() {
  const [openId, setOpenId] = useState<string | null>(replays[0]?.id ?? null);
  return (
    <div className="space-y-4">
      {replays.map((r) => {
        const c = candidates.find((x) => x.id === r.candidateId);
        const isOpen = openId === r.id;
        return (
          <div key={r.id} className="glass rounded-2xl">
            <button
              onClick={() => setOpenId(isOpen ? null : r.id)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80">{r.role} · {r.company}</p>
                <p className="mt-1 font-display text-xl">{c?.name ?? "Candidate"}</p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" /> {r.duration} · {r.date}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden text-right md:block">
                  <p className="font-display text-2xl text-gold">{r.scores.tech}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">tech</p>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5 text-gold" /> : <ChevronDown className="h-5 w-5 text-gold" />}
              </div>
            </button>
            {isOpen && <ReplayBody session={r} candidate={c} />}
          </div>
        );
      })}
    </div>
  );
}

function ReplayBody({ session, candidate }: { session: ReplaySession; candidate?: Candidate }) {
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (step >= session.transcript.length - 1) { setPlaying(false); return; }
    timer.current = setTimeout(() => setStep((s) => s + 1), 1800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, step, session.transcript.length]);

  const toggle = () => {
    if (step >= session.transcript.length - 1 && !playing) setStep(0);
    setPlaying((p) => !p);
  };

  const visible = session.transcript.slice(0, step + 1);

  return (
    <div className="border-t border-border/60 p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Transcript</p>
            <Button
              size="sm" onClick={toggle}
              className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold-soft"
            >
              {playing
                ? <><Pause className="mr-2 h-4 w-4" /> Pause</>
                : <><Play className="mr-2 h-4 w-4" /> {step === 0 ? "Replay" : step >= session.transcript.length - 1 ? "Restart" : "Resume"}</>}
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {visible.map((t, i) => (
              <div key={i}>
                <div className={t.who === "AI"
                  ? "rounded-xl border border-border bg-card/40 p-4"
                  : "rounded-xl bg-gold-soft p-4 text-foreground"}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.who}</p>
                  <p className="mt-1 text-sm leading-relaxed">{t.text}</p>
                </div>
                {t.analysis && (
                  <p className="mt-1 ml-2 border-l-2 border-gold/40 pl-3 text-[11px] italic text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3 text-gold" />
                    {t.analysis}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-card/60">
            <div
              className="h-full bg-gradient-to-r from-[#A87E3F] via-[#C9A86A] to-[#DFC189] transition-all"
              style={{ width: `${((step + 1) / session.transcript.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Session scores</p>
            <div className="mt-4 space-y-3">
              {([
                ["Technical depth", session.scores.tech],
                ["Communication", session.scores.comm],
                ["Problem solving", session.scores.problem],
                ["Role readiness", session.scores.readiness],
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs"><span>{k}</span><span className="text-gold/80">{v}%</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-card/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#A87E3F] via-[#C9A86A] to-[#DFC189]" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4 text-xs">
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80">Behavioral signals</p>
            <dl className="mt-3 space-y-2">
              <Row label="Typing speed" value={session.signals.typingSpeed} />
              <Row label="Paste ratio" value={session.signals.pasteRatio} />
              <Row label="AI-assistance likelihood" value={session.signals.aiLikelihood} />
              <Row label="Sentiment" value={session.signals.sentiment} />
            </dl>
          </div>
          {candidate && (
            <div className="rounded-xl border border-gold/40 bg-gold-soft/30 p-4 text-xs">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Why this candidate stands out</p>
              <p className="mt-2 text-muted-foreground">{candidate.highlight}</p>
              <p className="mt-2 text-muted-foreground">
                Most suitable for <span className="text-gold">{candidate.appliedFor}</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-gold/90">{value}</dd>
    </div>
  );
}

/* ---------------- Analytics ---------------- */

function AnalyticsTab() {
  const funnel = [
    ["Applied", 248],
    ["AI Screen passed", 162],
    ["Interview", 74],
    ["Offer", 18],
    ["Hired", 11],
  ] as const;
  const max = funnel[0][1];
  const weekly = [12, 18, 22, 17, 25, 31, 28]; // hires per week
  const weeklyMax = Math.max(...weekly);
  const sources = [
    ["LinkedIn", 42],
    ["Referrals", 28],
    ["Inbound", 18],
    ["Adika AI", 12],
  ] as const;
  const sourcesTotal = sources.reduce((s, [, v]) => s + v, 0);

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
        <p className="mt-6 text-[11px] text-muted-foreground">
          Conversion screen→offer: <span className="text-gold">11%</span> · offer→hire: <span className="text-gold">61%</span>
        </p>
      </div>

      <div className="glass grid grid-cols-2 gap-4 rounded-2xl p-6">
        {[
          ["38%", "Faster to offer", TrendingUp],
          ["94%", "Match→hire correlation", Sparkles],
          ["7.2", "Avg interview score", LineChartIcon],
          ["11", "Hires this month", UserCheck],
        ].map(([v, l, Icon]) => {
          const I = Icon as typeof TrendingUp;
          return (
            <div key={l as string} className="rounded-xl border border-border bg-card/30 p-4">
              <I className="mb-2 h-4 w-4 text-gold" />
              <p className="font-display text-3xl text-gold">{v as string}</p>
              <p className="mt-1 text-xs text-muted-foreground">{l as string}</p>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Hires per week</p>
        <div className="mt-6 flex h-40 items-end gap-3">
          {weekly.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-[#A87E3F] via-[#C9A86A] to-[#DFC189] transition-all"
                style={{ height: `${(v / weeklyMax) * 100}%` }}
                title={`${v} hires`}
              />
              <span className="text-[10px] text-muted-foreground">W{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Source mix</p>
        <div className="mt-6 flex h-4 w-full overflow-hidden rounded-full bg-card/60">
          {sources.map(([k, v], i) => {
            const tones = ["#A87E3F", "#C9A86A", "#DFC189", "#7A5E2F"];
            return (
              <div
                key={k}
                style={{ width: `${(v / sourcesTotal) * 100}%`, background: tones[i] }}
                title={`${k}: ${v}%`}
              />
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {sources.map(([k, v], i) => {
            const tones = ["#A87E3F", "#C9A86A", "#DFC189", "#7A5E2F"];
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: tones[i] }} />
                <span className="flex-1 text-muted-foreground">{k}</span>
                <span className="text-gold">{v}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Profile Dialog ---------------- */

function ProfileDialog({
  candidate, shortlisted, onShortlist, onClose,
}: {
  candidate: Candidate | null;
  shortlisted: boolean;
  onShortlist: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!candidate} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="recruiter max-h-[90vh] max-w-3xl overflow-y-auto">
        {candidate && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="font-display text-2xl text-gold">{candidate.name}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {candidate.role} · {candidate.location} · {candidate.experience}
                  </DialogDescription>
                </div>
                <div className="text-right">
                  <p className="font-display text-4xl text-gold">{candidate.match}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gold/70">match</p>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Info icon={UserIcon} label="Age / Gender" value={`${candidate.age} · ${candidate.gender}`} />
              <Info icon={Briefcase} label="Applied for" value={candidate.appliedFor} />
              <Info icon={Mail} label="Email" value={candidate.email} />
              <Info icon={MapPin} label="Location" value={candidate.location} />
            </div>

            <Section icon={GraduationCap} title="Qualifications">
              <ul className="ml-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {candidate.qualifications.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </Section>

            <Section icon={Trophy} title="Certifications">
              <div className="flex flex-wrap gap-1.5">
                {candidate.certifications.map((c) => (
                  <Badge key={c} variant="outline" className="rounded-full border-gold/40 text-gold">{c}</Badge>
                ))}
              </div>
            </Section>

            <Section icon={Languages} title="Languages & hobbies">
              <p className="text-sm text-muted-foreground"><span className="text-gold/80">Languages:</span> {candidate.languages.join(" · ")}</p>
              <p className="mt-1 text-sm text-muted-foreground"><span className="text-gold/80">Hobbies:</span> {candidate.hobbies.join(" · ")}</p>
            </Section>

            <Section icon={FileText} title="Resume highlights">
              <ul className="ml-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {candidate.resumeBullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </Section>

            <Section icon={Building2} title="Projects">
              <div className="space-y-2">
                {candidate.projects.map((p) => (
                  <div key={p.name} className="rounded-xl border border-border bg-card/30 p-3">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section icon={Sparkles} title="Extracted from resume">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl border border-border bg-card/30 p-3">
                  <p className="font-display text-xl text-gold">{candidate.extracted.years}y</p>
                  <p className="mt-1 text-muted-foreground">Experience</p>
                </div>
                <div className="rounded-xl border border-border bg-card/30 p-3">
                  <p className="font-display text-xl text-gold">{candidate.extracted.pastCompanies.length}</p>
                  <p className="mt-1 text-muted-foreground">Past companies</p>
                </div>
                <div className="rounded-xl border border-border bg-card/30 p-3">
                  <p className="font-display text-xl text-gold">{candidate.extracted.topSkills.length}</p>
                  <p className="mt-1 text-muted-foreground">Top skills</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="text-gold/80">Past companies:</span> {candidate.extracted.pastCompanies.join(", ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-gold/80">Top skills:</span> {candidate.extracted.topSkills.join(", ")}
              </p>
            </Section>

            <Section icon={Calendar} title="Scorecard">
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                {[
                  ["Tech", candidate.tech],
                  ["Comm", candidate.comm],
                  ["Problem", candidate.problem],
                  ["ATS", candidate.ats],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl border border-border bg-card/30 p-3">
                    <p className="font-display text-xl text-gold">{v as number}</p>
                    <p className="mt-1 text-muted-foreground">{k as string}</p>
                  </div>
                ))}
              </div>
            </Section>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                onClick={onShortlist}
                variant={shortlisted ? "default" : "outline"}
                className={
                  shortlisted
                    ? "rounded-full bg-gradient-to-r from-[#A87E3F] via-[#C9A86A] to-[#DFC189] text-black hover:opacity-90"
                    : "rounded-full"
                }
              >
                <Heart className={`mr-1.5 h-4 w-4 ${shortlisted ? "fill-[#E11D48] text-[#E11D48]" : ""}`} />
                {shortlisted ? "Shortlisted" : "Shortlist"}
              </Button>
              <Button onClick={onClose} variant="ghost" className="rounded-full">Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card/30 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-gold" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Mail; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold/80">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}
