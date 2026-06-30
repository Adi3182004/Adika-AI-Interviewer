import { createFileRoute } from "@tanstack/react-router";
import { Telescope, TrendingUp, BookOpen } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/candidate/gap/")({
  head: () => ({ meta: [{ title: "Gap Analysis — Adika AI" }] }),
  component: GapPage,
});

const SKILLS = [
  { name: "System Design", have: 78, need: 90, gap: 12, priority: "high" },
  { name: "Distributed Systems", have: 82, need: 85, gap: 3, priority: "low" },
  { name: "Go", have: 35, need: 80, gap: 45, priority: "high" },
  { name: "Kafka / Streaming", have: 40, need: 75, gap: 35, priority: "high" },
  { name: "Postgres internals", have: 70, need: 75, gap: 5, priority: "low" },
  { name: "Observability", have: 88, need: 70, gap: 0, priority: "strong" },
  { name: "Communication", have: 80, need: 85, gap: 5, priority: "med" },
];

const PLAN = [
  {
    week: "Week 1-2",
    focus: "Go fundamentals",
    item: "‘Tour of Go’ + rebuild your webhook ingestor in Go",
    hours: 12,
  },
  {
    week: "Week 3-4",
    focus: "Kafka deep-dive",
    item: "Confluent course + ship a partitioned producer + consumer",
    hours: 14,
  },
  {
    week: "Week 5",
    focus: "System design",
    item: "5 mock design sessions (Rate limiter, Notification system, etc.)",
    hours: 8,
  },
  {
    week: "Week 6",
    focus: "Mock interviews",
    item: "3 adaptive interview sessions targeting Senior Backend",
    hours: 6,
  },
];

function GapPage() {
  return (
    <CandidateShell eyebrow="Gap analysis" title="Where you are vs. where the role is">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 text-primary">
            <Telescope className="h-4 w-4" />
            <p className="text-xs uppercase tracking-wider">Senior Backend Engineer · Stripe</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Compared against 412 successful hires for this role over the last 24 months.
          </p>

          <div className="mt-6 space-y-4">
            {SKILLS.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">
                    {s.have} / {s.need}
                  </span>
                </div>
                <div className="mt-1 relative">
                  <Progress value={s.have} className="h-2" />
                  <div
                    className="absolute top-0 h-2 w-px bg-primary"
                    style={{ left: `${s.need}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider">
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
                    className="rounded-full text-[9px]"
                  >
                    {s.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider">6-week ramp plan</p>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {PLAN.map((p) => (
                <li key={p.week} className="rounded-xl border border-border/40 bg-card/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {p.week} · {p.hours}h
                  </p>
                  <p className="mt-1 font-medium">{p.focus}</p>
                  <p className="text-xs text-muted-foreground">{p.item}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider">Top resources</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>· “Designing Data-Intensive Applications” — chs 5, 11</li>
              <li>· Kafka the Definitive Guide — chs 3-6</li>
              <li>· Go by Example — concurrency track</li>
              <li>· Adika Adaptive Interview · Backend track</li>
            </ul>
          </div>
        </div>
      </div>
    </CandidateShell>
  );
}
