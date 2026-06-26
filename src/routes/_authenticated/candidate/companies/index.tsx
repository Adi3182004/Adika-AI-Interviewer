import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Sparkles, MapPin, Users, TrendingUp, Search } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/candidate/companies/")({
  head: () => ({ meta: [{ title: "Company Research — Adika AI" }] }),
  component: CompaniesPage,
});

const COMPANIES = [
  {
    name: "Stripe", stage: "Late-stage", hq: "San Francisco", size: "8,000+", growth: "+12% YoY",
    summary: "Payments infrastructure for the internet. Engineering-driven culture, written-comms first, strong on backend craft.",
    stack: ["Ruby", "Go", "Scala", "Postgres", "Kafka"],
    interview: ["System design (deep)", "Codecraft (extend a small lib)", "Bar raiser", "Hiring manager"],
    talkingPoints: [
      "Cite your idempotent webhook design — mirrors their public API guarantees.",
      "Reference their ‘increment by writing’ culture in your behavioural answers.",
    ],
  },
  {
    name: "Notion", stage: "Late-stage", hq: "San Francisco", size: "600+", growth: "+38% YoY",
    summary: "Connected workspace. Heavy investment in AI features. Design + engineering tightly coupled.",
    stack: ["TypeScript", "React", "Rust", "Postgres"],
    interview: ["Take-home", "Pairing", "Product sense", "Team match"],
    talkingPoints: [
      "Show real-time / CRDT understanding — they shipped offline mode last year.",
      "Bring opinions on AI in productivity tools, not just hype.",
    ],
  },
  {
    name: "Linear", stage: "Growth", hq: "Remote (EU/US)", size: "80+", growth: "+60% YoY",
    summary: "Issue tracking with extreme craft. Small, senior team, raises the bar each hire.",
    stack: ["TypeScript", "Node", "GraphQL", "Postgres"],
    interview: ["Async take-home", "Live pairing", "Founder chat"],
    talkingPoints: [
      "Quality > quantity — bring one project you obsessed over.",
      "They value taste; reference design + perf decisions you made yourself.",
    ],
  },
];

function CompaniesPage() {
  const [q, setQ] = useState("");
  const filtered = COMPANIES.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <CandidateShell eyebrow="Company research" title="Walk in already knowing them">
      <div className="glass mb-6 flex items-center gap-3 rounded-2xl p-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Stripe, Notion, Linear…" className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
      </div>

      <div className="space-y-4">
        {filtered.map(c => (
          <div key={c.name} className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-2xl">{c.name}</h2>
                </div>
                <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.hq}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{c.size}</span>
                  <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{c.growth}</span>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{c.stage}</Badge>
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{c.summary}</p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary">Stack</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.stack.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary">Interview loop</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {c.interview.map(i => <li key={i}>· {i}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary"><Sparkles className="mr-1 inline h-3 w-3" />Talking points</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {c.talkingPoints.map(t => <li key={t}>· {t}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CandidateShell>
  );
}
