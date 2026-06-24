import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Filter, Search, Star } from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/recruiter/demo")({
  head: () => ({ meta: [{ title: "Recruiter Demo — Adika AI" }] }),
  component: RecruiterDemo,
});

const candidates = [
  { name: "Priya Nair", role: "Senior AI Engineer", match: 94, skills: ["PyTorch", "RAG", "Kubernetes"], readiness: 91, location: "Bengaluru" },
  { name: "Marcus Reed", role: "Backend Engineer", match: 88, skills: ["Go", "Postgres", "Kafka"], readiness: 84, location: "Berlin" },
  { name: "Ana Silva", role: "Full Stack Engineer", match: 81, skills: ["React", "Node", "AWS"], readiness: 78, location: "São Paulo" },
  { name: "Daniel Cho", role: "ML Engineer", match: 79, skills: ["MLflow", "Spark", "GCP"], readiness: 80, location: "Seoul" },
  { name: "Sara Okonkwo", role: "Data Engineer", match: 76, skills: ["dbt", "Snowflake", "Airflow"], readiness: 72, location: "Lagos" },
  { name: "Leo Martin", role: "DevOps Engineer", match: 73, skills: ["Terraform", "K8s", "Argo"], readiness: 70, location: "Toronto" },
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
        <div className="glass rounded-3xl p-10 shadow-luxe">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pipeline · Senior AI Engineer</p>
          <h1 className="mt-3 font-display text-5xl">12 calibrated candidates</h1>
          <p className="mt-2 text-muted-foreground">Match scores derived from skills, projects, ATS analysis, and adaptive interview outcomes.</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by skill, role, location…" className="pl-9" />
            </div>
            <Button variant="outline" className="rounded-full"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((c) => (
            <div key={c.name} className="glass rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.role} · {c.location}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl">{c.match}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">match</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.skills.map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{s}</span>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs"><span>Readiness</span><span className="text-muted-foreground">{c.readiness}%</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${c.readiness}%` }} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <Button size="sm" variant="ghost" className="text-muted-foreground"><Star className="mr-1.5 h-4 w-4" /> Shortlist</Button>
                <Button size="sm" className="rounded-full">View profile</Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
