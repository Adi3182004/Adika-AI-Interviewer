import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wand2, Sparkles, Loader2, Check } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/candidate/tailor/")({
  head: () => ({ meta: [{ title: "Resume Tailoring — Adika AI" }] }),
  component: TailorPage,
});

const DEFAULT_JD = `Senior Backend Engineer · Stripe

We're looking for an engineer to own our webhook ingestion platform. You'll design rate-limited pipelines processing 50K events/sec, work in Go and Python, and partner with payments infra.

Must-have: 5+ yrs backend, distributed systems, event-driven architecture, Postgres, observability.
Nice-to-have: Kafka, gRPC, FinTech, on-call experience.`;

function TailorPage() {
  const [jd, setJd] = useState(DEFAULT_JD);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | typeof MOCK>(null);

  function run() {
    setLoading(true);
    setTimeout(() => {
      setResult(MOCK);
      setLoading(false);
    }, 900);
  }

  return (
    <CandidateShell eyebrow="Resume tailoring" title="Tailor to the role">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="glass rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Paste job description
          </p>
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={16}
            className="mt-3 font-mono text-xs"
          />
          <Button onClick={run} disabled={loading} className="mt-4 w-full rounded-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Tailor my resume
          </Button>
        </div>

        <div className="space-y-4">
          {!result && !loading && (
            <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-sm">
                Run tailoring to see keyword coverage, rewritten bullets and a match score.
              </p>
            </div>
          )}
          {result && (
            <>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Match score
                    </p>
                    <p className="font-display text-5xl">
                      {result.score}
                      <span className="text-xl text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <Badge className="bg-primary/15 text-primary">Strong fit</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{result.summary}</p>
              </div>

              <div className="glass rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wider text-primary">Keyword coverage</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.keywords.map((k) => (
                    <Badge
                      key={k.term}
                      variant={k.hit ? "default" : "outline"}
                      className="rounded-full"
                    >
                      {k.hit && <Check className="mr-1 h-3 w-3" />}
                      {k.term}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wider text-primary">Rewritten bullets</p>
                <ul className="mt-3 space-y-3 text-sm">
                  {result.bullets.map((b, i) => (
                    <li key={i} className="rounded-xl border border-border/40 bg-card/40 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        before
                      </p>
                      <p className="text-muted-foreground line-through">{b.before}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-primary">
                        after
                      </p>
                      <p>{b.after}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </CandidateShell>
  );
}

const MOCK = {
  score: 87,
  summary:
    "Your distributed-systems and Postgres experience map directly. Surface concrete throughput numbers and on-call wins to close the gap.",
  keywords: [
    { term: "Distributed systems", hit: true },
    { term: "Event-driven", hit: true },
    { term: "Postgres", hit: true },
    { term: "Webhook", hit: true },
    { term: "Go", hit: false },
    { term: "Kafka", hit: false },
    { term: "Observability", hit: true },
    { term: "On-call", hit: false },
  ],
  bullets: [
    {
      before: "Built backend services for the payments team.",
      after:
        "Designed an event-driven webhook ingestor in Python + Postgres LISTEN/NOTIFY processing 22K events/sec p95 with idempotent retries.",
    },
    {
      before: "Improved observability across services.",
      after:
        "Rolled out OpenTelemetry tracing across 14 services, cutting MTTR on payment incidents from 42m → 11m within a quarter.",
    },
  ],
};
