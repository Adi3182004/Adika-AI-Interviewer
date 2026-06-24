import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recruiter")({
  head: () => ({ meta: [{ title: "Recruiter Pro — Adika AI" }] }),
  component: RecruiterHome,
});

function RecruiterHome() {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [company, setCompany] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name,company_name").eq("id", data.user.id).maybeSingle();
      setName(p?.full_name ?? data.user.email ?? "");
      setCompany(p?.company_name ?? "");
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <div className="recruiter relative min-h-screen text-foreground">
      <MeshBackground variant="constellation" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display">A</span>
          <span className="font-display text-xl">Recruiter Pro</span>
        </Link>
        <Button variant="outline" size="sm" onClick={logout} className="rounded-full border-border bg-transparent">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="glass rounded-3xl p-10 shadow-luxe">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{company || "Your team"}</p>
          <h1 className="mt-3 font-display text-5xl">Welcome, {name || "Recruiter"}.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Your hiring decision platform is initialized. Pipeline, candidate intelligence, interview replays
            and team calibration tools are coming next.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/recruiter/demo"><Button className="rounded-full">Open live demo workspace</Button></Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            ["Open roles", "0"], ["Candidates in pipeline", "0"], ["Interviews this week", "0"], ["Avg. time to offer", "—"],
          ].map(([k, v]) => (
            <div key={k} className="glass rounded-2xl p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="mt-2 font-display text-4xl">{v}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
