import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles, Copy, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ensureDemoAccounts } from "@/lib/seed.functions";
import { MeshBackground } from "@/components/MeshBackground";
import { CreatorShowcase } from "@/components/CreatorShowcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const search = z.object({
  role: z.enum(["candidate", "recruiter"]).catch("candidate"),
  mode: z.enum(["login", "register", "forgot"]).catch("login"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Adika AI" }] }),
  component: AuthPage,
});

const DEMO = {
  candidate: { email: "candidate@adika.ai", password: "Demo@1234" },
  recruiter: { email: "recruiter@adika.ai", password: "Demo@1234" },
};

function AuthPage() {
  const navigate = useNavigate();
  const { role: initialRole, mode: initialMode, redirect } = Route.useSearch();
  const [role, setRole] = useState<"candidate" | "recruiter">(initialRole);
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);

  useEffect(() => { setRole(initialRole); setMode(initialMode); }, [initialRole, initialMode]);

  // Idempotently provision demo accounts on first visit so "Use demo" always works.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("adika_demo_seeded") === "1") return;
    ensureDemoAccounts()
      .then(() => sessionStorage.setItem("adika_demo_seeded", "1"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const has = (r: string) => roles?.some((x) => x.role === r);
      const dest = redirect ?? (has("recruiter") ? "/recruiter" : "/candidate");
      navigate({ to: dest });
    });
  }, [navigate, redirect]);

  const isRecruiter = role === "recruiter";

  return (
    <div className={isRecruiter ? "recruiter relative min-h-screen" : "relative min-h-screen"}>
      <MeshBackground variant={isRecruiter ? "constellation" : "mint"} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-12 lg:grid-cols-[1fr_1fr]">
          {/* Left — welcome / pitch */}
          <div className="hidden flex-col justify-between lg:flex">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Adika AI
            </Link>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Welcome back
              </span>
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {isRecruiter ? "Recruiter Pro" : "Candidate Portal"}
              </p>
              <h1 className="mt-3 font-display text-5xl leading-tight">
                {isRecruiter
                  ? <>Hire with <em className="text-primary">evidence</em>, not instinct.</>
                  : <>Your career, <em className="text-primary">one intelligence layer</em>.</>}
              </h1>
              <p className="mt-4 max-w-md text-muted-foreground">
                {isRecruiter
                  ? "Calibrated match scores, replayable interviews, and an audit trail behind every hiring decision."
                  : "Resume, skills, interviews, learning — every workflow reads from the same profile, so you only enter things once."}
              </p>

              {/* Demo creds card */}
              <div className="mt-8 rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Try the live demo
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Two preloaded accounts come with seeded resumes, jobs, applications and interview replays.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DemoCard label="Candidate" creds={DEMO.candidate} onUse={() => { setRole("candidate"); setMode("login"); }} />
                  <DemoCard label="Recruiter" creds={DEMO.recruiter} onUse={() => { setRole("recruiter"); setMode("login"); }} />
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Adika AI</div>
          </div>

          {/* Right — form */}
          <div className="glass mx-auto w-full max-w-md rounded-3xl p-8 shadow-luxe">
            <Tabs value={role} onValueChange={(v) => setRole(v as "candidate" | "recruiter")}>
              <TabsList className="grid w-full grid-cols-2 rounded-full">
                <TabsTrigger value="candidate" className="rounded-full">Candidate</TabsTrigger>
                <TabsTrigger value="recruiter" className="rounded-full">Recruiter</TabsTrigger>
              </TabsList>

              {mode === "forgot" ? (
                <div className="mt-6">
                  <ForgotForm onBack={() => setMode("login")} />
                </div>
              ) : (
                <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")} className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Sign in</TabsTrigger>
                    <TabsTrigger value="register">Create account</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-6">
                    <LoginForm role={role} onForgot={() => setMode("forgot")} />
                  </TabsContent>
                  <TabsContent value="register" className="mt-6">
                    {role === "candidate" ? <CandidateRegisterForm /> : <RecruiterRegisterForm />}
                  </TabsContent>
                </Tabs>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      <CreatorShowcase />
    </div>
  );
}

function DemoCard({ label, creds, onUse }: { label: string; creds: { email: string; password: string }; onUse: () => void }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-xs">{creds.email}</p>
      <p className="font-mono text-xs text-muted-foreground">{creds.password}</p>
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px]" onClick={onUse}>Use</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { navigator.clipboard.writeText(`${creds.email} / ${creds.password}`); toast.success("Copied"); }}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function LoginForm({ role, onForgot }: { role: "candidate" | "recruiter"; onForgot: () => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed in");
    navigate({ to: role === "recruiter" ? "/recruiter" : "/candidate" });
  }

  function fillDemo() {
    const d = DEMO[role];
    setEmail(d.email);
    setPassword(d.password);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Work email" id="email">
        <Input id="email" type="email" placeholder="example@gmail.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Enter password" id="password">
        <PasswordInput id="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={fillDemo} className="text-primary hover:underline">Use demo {role}</button>
        <button type="button" onClick={onForgot} className="text-muted-foreground hover:text-foreground">Forgot password?</button>
      </div>
      <Button type="submit" className="w-full rounded-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Reset link sent");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="font-display text-2xl">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll email you a secure link to set a new password.
        </p>
      </div>
      {sent ? (
        <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
          Check <span className="text-foreground">{email}</span> for a reset link. It can take a minute to arrive.
        </div>
      ) : (
        <Field label="Account email" id="forgot-email">
          <Input id="forgot-email" type="email" placeholder="example@gmail.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1 rounded-full" onClick={onBack}>Back to sign in</Button>
        {!sent && (
          <Button type="submit" className="flex-1 rounded-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send link
          </Button>
        )}
      </div>
    </form>
  );
}

function CandidateRegisterForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", confirm: "",
    phone: "", education: "", experience_level: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/candidate`,
        data: {
          primary_role: "candidate",
          full_name: form.full_name,
          phone: form.phone,
          education: form.education,
          experience_level: form.experience_level,
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to Adika AI");
    navigate({ to: "/candidate" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name" id="full_name"><Input id="full_name" placeholder="Aditya Andhalkar" required value={form.full_name} onChange={set("full_name")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" id="email"><Input id="email" type="email" placeholder="example@gmail.com" required value={form.email} onChange={set("email")} /></Field>
        <Field label="Phone" id="phone"><Input id="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Create password" id="password"><PasswordInput id="password" placeholder="At least 8 characters" required value={form.password} onChange={set("password")} /></Field>
        <Field label="Confirm password" id="confirm"><PasswordInput id="confirm" placeholder="Re-enter password" required value={form.confirm} onChange={set("confirm")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Education" id="education"><Input id="education" placeholder="B.Tech CSE" value={form.education} onChange={set("education")} /></Field>
        <div>
          <Label className="text-xs">Experience</Label>
          <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="fresher">Fresher (0-1y)</SelectItem>
              <SelectItem value="junior">Junior (1-3y)</SelectItem>
              <SelectItem value="mid">Mid (3-6y)</SelectItem>
              <SelectItem value="senior">Senior (6y+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full rounded-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create candidate account
      </Button>
    </form>
  );
}

function RecruiterRegisterForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", company_name: "", email: "", password: "", confirm: "",
    company_size: "", industry: "", hiring_goals: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/recruiter`,
        data: {
          primary_role: "recruiter",
          full_name: form.full_name,
          company_name: form.company_name,
          company_size: form.company_size,
          industry: form.industry,
          hiring_goals: form.hiring_goals,
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to Recruiter Pro");
    navigate({ to: "/recruiter" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your name" id="full_name"><Input id="full_name" placeholder="Aditya Andhalkar" required value={form.full_name} onChange={set("full_name")} /></Field>
        <Field label="Company" id="company_name"><Input id="company_name" placeholder="Acme Inc." required value={form.company_name} onChange={set("company_name")} /></Field>
      </div>
      <Field label="Work email" id="email"><Input id="email" type="email" placeholder="you@company.com" required value={form.email} onChange={set("email")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Create password" id="password"><PasswordInput id="password" placeholder="At least 8 characters" required value={form.password} onChange={set("password")} /></Field>
        <Field label="Confirm password" id="confirm"><PasswordInput id="confirm" placeholder="Re-enter password" required value={form.confirm} onChange={set("confirm")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Company size</Label>
          <Select value={form.company_size} onValueChange={(v) => setForm({ ...form, company_size: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10</SelectItem>
              <SelectItem value="11-50">11-50</SelectItem>
              <SelectItem value="51-200">51-200</SelectItem>
              <SelectItem value="201-1000">201-1000</SelectItem>
              <SelectItem value="1000+">1000+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Industry" id="industry"><Input id="industry" placeholder="SaaS, Fintech…" value={form.industry} onChange={set("industry")} /></Field>
      </div>
      <Field label="Hiring goals" id="hiring_goals"><Input id="hiring_goals" placeholder="10 engineers in Q1" value={form.hiring_goals} onChange={set("hiring_goals")} /></Field>
      <Button type="submit" className="w-full rounded-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create recruiter account
      </Button>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
