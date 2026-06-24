import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MeshBackground } from "@/components/MeshBackground";
import { CreatorShowcase } from "@/components/CreatorShowcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const search = z.object({
  role: z.enum(["candidate", "recruiter"]).catch("candidate"),
  mode: z.enum(["login", "register"]).catch("login"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — Adika AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { role: initialRole, mode: initialMode, redirect } = Route.useSearch();
  const [role, setRole] = useState<"candidate" | "recruiter">(initialRole);
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  useEffect(() => { setRole(initialRole); setMode(initialMode); }, [initialRole, initialMode]);

  // If already signed in, bounce to the right portal.
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
          {/* Left — pitch */}
          <div className="hidden flex-col justify-between lg:flex">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Adika AI
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {isRecruiter ? "Recruiter Pro" : "Candidate Portal"}
              </p>
              <h1 className="mt-4 font-display text-5xl leading-tight">
                {isRecruiter ? <>Hire with <em className="text-primary">evidence</em>, not instinct.</> : <>Your career, <em className="text-primary">one intelligence layer</em>.</>}
              </h1>
              <p className="mt-4 max-w-md text-muted-foreground">
                {isRecruiter
                  ? "Calibrated match scores, replayable interviews, and an audit trail behind every hiring decision."
                  : "Resume, skills, interviews, learning — every workflow reads from the same profile, so you only enter things once."}
              </p>
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

              <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")} className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="register">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <LoginForm role={role} />
                </TabsContent>
                <TabsContent value="register" className="mt-6">
                  {role === "candidate" ? <CandidateRegisterForm /> : <RecruiterRegisterForm />}
                </TabsContent>
              </Tabs>
            </Tabs>
          </div>
        </div>
      </div>

      <CreatorShowcase />
    </div>
  );
}

function LoginForm({ role }: { role: "candidate" | "recruiter" }) {
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Work email" id="email"><Input id="email" type="email" placeholder="example@gmail.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Enter password" id="password"><Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Button type="submit" className="w-full rounded-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
      </Button>
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
        <Field label="Create password" id="password"><Input id="password" type="password" placeholder="At least 8 characters" required value={form.password} onChange={set("password")} /></Field>
        <Field label="Confirm password" id="confirm"><Input id="confirm" type="password" placeholder="Re-enter password" required value={form.confirm} onChange={set("confirm")} /></Field>
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
        <Field label="Create password" id="password"><Input id="password" type="password" placeholder="At least 8 characters" required value={form.password} onChange={set("password")} /></Field>
        <Field label="Confirm password" id="confirm"><Input id="confirm" type="password" placeholder="Re-enter password" required value={form.confirm} onChange={set("confirm")} /></Field>
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
