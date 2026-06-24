import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/candidate")({
  head: () => ({ meta: [{ title: "Candidate Dashboard — Adika AI" }] }),
  component: CandidateHome,
});

function CandidateHome() {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
      setName(p?.full_name ?? data.user.email ?? "");
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen">
      <MeshBackground />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background font-display">A</span>
          <span className="font-display text-xl">Candidate Portal</span>
        </Link>
        <Button variant="outline" size="sm" onClick={logout} className="rounded-full">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="glass rounded-3xl p-10 shadow-luxe">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Welcome back</p>
          <h1 className="mt-3 font-display text-5xl">{name || "Candidate"}.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Your career intelligence layer is live. The full candidate portal — resume library, ATS analysis,
            adaptive interviews, learning roadmap, job matching — is being assembled into this shell next.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["Profile completion", "20%", "Add resume to unlock more"],
            ["Resume score", "—", "Upload to compute"],
            ["Interview readiness", "—", "Run a mock session"],
          ].map(([k, v, d]) => (
            <div key={k} className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="mt-2 font-display text-4xl">{v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="font-medium">Coming online next</p>
          </div>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <li>· Resume upload, builder & ATS analysis</li>
            <li>· Adaptive AI Interviewer + session replay</li>
            <li>· Job matching with skill-gap explainers</li>
            <li>· Learning execution dashboard</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
