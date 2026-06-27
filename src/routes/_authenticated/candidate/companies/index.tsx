import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Sparkles, MapPin, Users, TrendingUp, Search, ChevronDown, Calendar, DollarSign, Globe, Star } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/candidate/companies/")({
  head: () => ({ meta: [{ title: "Company Research — Adika AI" }] }),
  component: CompaniesPage,
});

type Company = {
  name: string;
  stage: string;
  hq: string;
  size: string;
  growth: string;
  summary: string;
  stack: string[];
  interview: string[];
  talkingPoints: string[];
  founded: string;
  funding: string;
  website: string;
  values: string[];
  perks: string[];
  recent: { date: string; note: string }[];
  competitors: string[];
  glassdoor: string;
};

const COMPANIES: Company[] = [
  {
    name: "Stripe", stage: "Late-stage", hq: "San Francisco", size: "8,000+", growth: "+12% YoY",
    summary: "Payments infrastructure for the internet. Engineering-driven culture, written-comms first, strong on backend craft.",
    stack: ["Ruby", "Go", "Scala", "Postgres", "Kafka"],
    interview: ["System design (deep)", "Codecraft (extend a small lib)", "Bar raiser", "Hiring manager"],
    talkingPoints: [
      "Cite your idempotent webhook design — mirrors their public API guarantees.",
      "Reference their 'increment by writing' culture in your behavioural answers.",
    ],
    founded: "2010", funding: "$8.7B raised · $50B valuation", website: "stripe.com",
    values: ["Move with urgency and focus", "Trust and amplify", "Optimise globally"],
    perks: ["Remote-first option", "Generous stock refresh", "Wellness budget", "Learning stipend"],
    recent: [
      { date: "May 2026", note: "Launched Stripe Tax for India and SEA" },
      { date: "Mar 2026", note: "Acquired Bridge for stablecoin rails" },
    ],
    competitors: ["Adyen", "Razorpay", "Square", "PayPal"],
    glassdoor: "4.3 / 5",
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
    founded: "2016", funding: "$343M raised · $10B valuation", website: "notion.so",
    values: ["Be a beginner", "Push for clarity", "Sweat the details"],
    perks: ["Hybrid SF/NYC", "$1k home-office", "Mental health days"],
    recent: [
      { date: "Apr 2026", note: "Released Notion AI Agents beta" },
      { date: "Jan 2026", note: "Crossed 100M users" },
    ],
    competitors: ["Coda", "ClickUp", "Confluence"],
    glassdoor: "4.1 / 5",
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
    founded: "2019", funding: "$52M raised · Series B", website: "linear.app",
    values: ["Quality over quantity", "Opinionated", "Speed matters"],
    perks: ["Fully remote", "4-week onboarding", "Equity for all"],
    recent: [
      { date: "Jun 2026", note: "Shipped Linear for Mobile 2.0" },
      { date: "Feb 2026", note: "Launched Initiatives + Projects" },
    ],
    competitors: ["Jira", "Height", "Shortcut"],
    glassdoor: "4.6 / 5",
  },
];

function CompaniesPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const filtered = COMPANIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <CandidateShell eyebrow="Company research" title="Walk in already knowing them">
      <div className="glass mb-6 flex items-center gap-3 rounded-2xl p-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Stripe, Notion, Linear…" className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
      </div>

      <div className="space-y-4">
        {filtered.map((c) => {
          const isOpen = open === c.name;
          return (
            <div key={c.name} className="glass rounded-2xl">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.name)}
                className="flex w-full items-start justify-between gap-3 p-6 text-left hover:bg-card/30 rounded-2xl"
              >
                <div className="flex-1">
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
                  <p className="mt-3 text-sm text-muted-foreground">{c.summary}</p>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-border/40 p-6 pt-5 space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <Stat icon={<Calendar className="h-3 w-3" />} label="Founded" value={c.founded} />
                    <Stat icon={<DollarSign className="h-3 w-3" />} label="Funding" value={c.funding} />
                    <Stat icon={<Globe className="h-3 w-3" />} label="Website" value={c.website} />
                    <Stat icon={<Star className="h-3 w-3" />} label="Glassdoor" value={c.glassdoor} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Section title="Stack">
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.stack.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                      </div>
                    </Section>
                    <Section title="Interview loop">
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {c.interview.map((i) => <li key={i}>· {i}</li>)}
                      </ul>
                    </Section>
                    <Section title={<><Sparkles className="mr-1 inline h-3 w-3" />Talking points</>}>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {c.talkingPoints.map((t) => <li key={t}>· {t}</li>)}
                      </ul>
                    </Section>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Section title="Core values">
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {c.values.map((v) => <li key={v}>· {v}</li>)}
                      </ul>
                    </Section>
                    <Section title="Perks & benefits">
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {c.perks.map((p) => <li key={p}>· {p}</li>)}
                      </ul>
                    </Section>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Section title="Recent news">
                      <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                        {c.recent.map((r) => (
                          <li key={r.date}>
                            <span className="text-primary">{r.date}</span> — {r.note}
                          </li>
                        ))}
                      </ul>
                    </Section>
                    <Section title="Competitors">
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.competitors.map((x) => <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>)}
                      </div>
                    </Section>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CandidateShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-3">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-primary">{title}</p>
      {children}
    </div>
  );
}
