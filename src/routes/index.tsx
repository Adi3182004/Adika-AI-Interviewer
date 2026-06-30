import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  LineChart,
  Workflow,
  Quote,
  Shield,
  Building2,
  UserRound,
} from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { GetStartedDialog } from "@/components/GetStartedDialog";
import { CreatorShowcase } from "@/components/CreatorShowcase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Adika AI — AI-Powered Career Intelligence & Hiring Decisions" },
      {
        name: "description",
        content:
          "One intelligence layer for candidates to grow careers and recruiters to make better hiring decisions.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <MeshBackground />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background font-display text-lg">
            A
          </span>
          <span className="font-display text-2xl">
            Adika<span className="text-muted-foreground"> AI</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#candidate" className="hover:text-foreground">
            For Candidates
          </a>
          <a href="#recruiter" className="hover:text-foreground">
            For Recruiters
          </a>
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{ role: "candidate", mode: "login" }}
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link to="/recruiter/demo">
            <Button variant="outline" size="sm" className="rounded-full">
              Live demo
            </Button>
          </Link>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            One profile · Every workflow
          </p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">
            A single intelligence layer connects everything.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              i: Brain,
              t: "Resume Intelligence",
              d: "Parse, score, and rebuild resumes against any JD with ATS-grade analysis.",
            },
            {
              i: Target,
              t: "Adaptive Interviews",
              d: "Difficulty bends to the candidate — weak topics surface, strengths get tested deeper.",
            },
            {
              i: LineChart,
              t: "Readiness Analytics",
              d: "Track ATS, skill, interview and learning growth on a single readiness curve.",
            },
            {
              i: Workflow,
              t: "Career Roadmaps",
              d: "From role recommendations to weekly tasks — execution lives next to recommendation.",
            },
            {
              i: Shield,
              t: "Recruiter Decisions",
              d: "Calibrated match scores, evidence trails, and replayable interview sessions.",
            },
            {
              i: Sparkles,
              t: "Zero Duplication",
              d: "Every module reads the same profile. Update once, propagate everywhere.",
            },
          ].map(({ i: Icon, t, d }) => (
            <div
              key={t}
              className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe"
            >
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-xl">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Candidate journey */}
      <section id="candidate" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" /> For Candidates
            </div>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              Grow with a system that grows with you.
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Upload a resume once. Adika builds your skill graph, recommends roles, generates
              learning plans, runs adaptive interviews, and tracks readiness — all from one profile.
            </p>
            <ul className="mt-6 grid gap-3 text-sm">
              {[
                "AI resume builder & tailoring",
                "ATS analysis with per-section breakdown",
                "Skill gap → weekly learning execution",
                "Adaptive mock interviews with replay",
              ].map((l) => (
                <li key={l} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  {l}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              search={{ role: "candidate", mode: "register" }}
              className="mt-8 inline-block"
            >
              <Button className="rounded-full" size="lg">
                Start your career profile <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="glass rounded-3xl p-8 shadow-luxe">
            <p className="font-display text-2xl">Career readiness</p>
            <p className="text-sm text-muted-foreground">Updated weekly from your full activity.</p>
            <div className="mt-6 space-y-4">
              {[
                ["ATS Score", 86, "+4"],
                ["Skill Coverage", 72, "+9"],
                ["Interview Readiness", 64, "+12"],
                ["Learning Streak", 91, "+2"],
              ].map(([k, v, d]) => (
                <div key={k as string}>
                  <div className="flex justify-between text-sm">
                    <span>{k}</span>
                    <span className="text-muted-foreground">
                      {v}% <span className="text-success">{d}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recruiter journey */}
      <section id="recruiter" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-3xl bg-[#0a0816] p-10 text-white md:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                <Building2 className="h-3.5 w-3.5" /> For Recruiters
              </div>
              <h2 className="mt-4 font-display text-4xl md:text-5xl">
                Decide with evidence, not gut.
              </h2>
              <p className="mt-4 max-w-lg text-white/70">
                Adika Recruiter Pro surfaces calibrated candidate intelligence — match scores backed
                by skills, interview transcripts, learning velocity, and replayable sessions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth" search={{ role: "recruiter", mode: "register" }}>
                  <Button
                    size="lg"
                    className="rounded-full bg-white text-[#0a0816] hover:bg-white/90"
                  >
                    Create recruiter account
                  </Button>
                </Link>
                <Link to="/recruiter/demo">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    Open live demo
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Pipeline · Senior AI Engineer
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ["Priya N.", 94, "Strong system design · 4 sessions"],
                  ["Marcus R.", 88, "ML depth · ATS 92"],
                  ["Ana S.", 81, "Backend hybrid · learning streak 22d"],
                ].map(([n, s, m]) => (
                  <div
                    key={n as string}
                    className="flex items-center justify-between rounded-xl bg-white/5 p-4"
                  >
                    <div>
                      <p className="font-medium">{n}</p>
                      <p className="text-xs text-white/60">{m}</p>
                    </div>
                    <span className="font-display text-2xl">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-display text-4xl md:text-5xl">How the ecosystem works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            ["01", "Profile", "One unified candidate profile feeds every module."],
            [
              "02",
              "Intelligence",
              "AI parses, scores, and gap-analyzes across resume, skills, projects.",
            ],
            ["03", "Execution", "Tasks, learning, interview sessions — all tracked on one curve."],
            ["04", "Decision", "Recruiters see calibrated scores with evidence and replays."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border border-border p-6">
              <p className="font-display text-3xl text-primary">{n}</p>
              <p className="mt-4 font-medium">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              q: "Adika replaced four tools in our hiring stack. The interview replay alone changed how we calibrate.",
              a: "Head of Talent · Series C SaaS",
            },
            {
              q: "My readiness went from 41 to 86 in eight weeks. The roadmap actually made sense.",
              a: "Backend Engineer · hired at Stripe",
            },
            {
              q: "Match scores you can actually defend in a hiring debrief.",
              a: "VP Engineering · fintech",
            },
          ].map((t) => (
            <div key={t.a} className="glass rounded-2xl p-6">
              <Quote className="h-5 w-5 text-primary" />
              <p className="mt-4 text-balance">{t.q}</p>
              <p className="mt-6 text-xs text-muted-foreground">{t.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hero — bottom of landing */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> AI Hiring Intelligence · v1
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[1.02] text-balance md:text-7xl">
              The hiring layer that thinks <em className="text-primary">with</em> you.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              Adika AI unifies resumes, interviews, learning and matching into one intelligence
              layer — so candidates grow faster and recruiters decide with clarity.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:max-w-md">
              <GetStartedDialog
                trigger={
                  <Button size="lg" className="w-full justify-between rounded-full">
                    Get started <ArrowRight className="h-4 w-4" />
                  </Button>
                }
              />
              <Link to="/recruiter/demo">
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full justify-between rounded-full border border-dashed border-border"
                >
                  Try the Recruiter Pro Demo — no signup <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="glass relative overflow-hidden rounded-3xl p-1 shadow-luxe">
              <div className="rounded-[1.4rem] bg-gradient-to-br from-white/80 to-secondary/60 p-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Live Interview · Backend Engineer</span>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                    Adaptive
                  </span>
                </div>
                <p className="mt-4 font-display text-2xl leading-snug">
                  "Walk me through how you'd design a rate-limited webhook ingestor for 50K events /
                  sec."
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { k: "Technical", v: 88 },
                    { k: "Communication", v: 76 },
                    { k: "Problem-solving", v: 92 },
                  ].map((m) => (
                    <div key={m.k} className="rounded-xl bg-surface/80 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {m.k}
                      </p>
                      <p className="mt-1 font-display text-2xl">{m.v}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${m.v}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent" />
                    <div>
                      <p className="font-medium">Role readiness</p>
                      <p className="text-xs text-muted-foreground">
                        Senior Backend · 7 / 10 sessions
                      </p>
                    </div>
                  </div>
                  <span className="font-display text-2xl">82%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["120K+", "Candidate profiles"],
            ["3.4M", "Interview turns scored"],
            ["94%", "Match-to-hire correlation"],
            ["38%", "Faster time to offer"],
          ].map(([v, l]) => (
            <div key={l} className="glass rounded-2xl p-6">
              <p className="font-display text-4xl">{v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Creator showcase — near footer */}
      <CreatorShowcase />

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-background font-display">
              A
            </span>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Adika AI — Hiring Intelligence Ecosystem
            </span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <Link to="/recruiter/demo" className="hover:text-foreground">
              Demo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
