import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/candidate/readiness/")({
  head: () => ({ meta: [{ title: "Readiness Hub — Adika AI" }] }),
  component: ReadinessPage,
});

const PILLARS = [
  { name: "Resume strength",     score: 86, weight: 0.15 },
  { name: "Skill coverage",      score: 71, weight: 0.25 },
  { name: "Interview performance", score: 78, weight: 0.30 },
  { name: "Communication",       score: 84, weight: 0.15 },
  { name: "Domain knowledge",    score: 68, weight: 0.15 },
];

const overall = Math.round(PILLARS.reduce((s, p) => s + p.score * p.weight, 0));

const CHECKLIST = [
  { done: true,  label: "Uploaded primary resume" },
  { done: true,  label: "Completed 7 of 10 adaptive interview rounds" },
  { done: true,  label: "Closed 3 skill gaps (Postgres, Observability, Testing)" },
  { done: false, label: "Reach 85+ on system design rubric (currently 78)" },
  { done: false, label: "Ship a Go side-project to validate gap-closure" },
  { done: false, label: "Complete a Stripe-style mock loop end-to-end" },
];

function ReadinessPage() {
  return (
    <CandidateShell eyebrow="Readiness hub" title="One number that tells you if you're ready">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="glass rounded-2xl p-8 text-center">
          <Target className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Senior Backend · target</p>
          <p className="mt-2 font-display text-7xl">{overall}<span className="text-2xl text-muted-foreground">%</span></p>
          <Badge className="mt-3 bg-primary/15 text-primary">On track · 7 / 10 sessions</Badge>
          <p className="mt-4 text-sm text-muted-foreground">
            You're 9 points away from the typical bar for this role. Closing two pillars below would put you over.
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-primary">Readiness pillars</p>
          <div className="mt-4 space-y-4">
            {PILLARS.map(p => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.score} <span className="text-[10px]">· weight {Math.round(p.weight * 100)}%</span></span>
                </div>
                <Progress value={p.score} className="mt-1 h-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-primary">What to do this week</p>
          <Link to="/candidate/interviews" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Start next session <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {CHECKLIST.map(c => (
            <li key={c.label} className="flex items-start gap-2 rounded-xl border border-border/40 bg-card/40 p-3 text-sm">
              {c.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />}
              <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </CandidateShell>
  );
}
