import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  LayoutDashboard, FileText, Briefcase, Bot, GraduationCap, UserCircle2, LogOut, Menu,
  Wand2, Telescope, Building2, Target,
} from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

const nav: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/candidate", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/candidate/resumes", label: "Resume Center", icon: FileText },
  { to: "/candidate/tailor", label: "Resume Tailoring", icon: Wand2 },
  { to: "/candidate/gap", label: "Gap Analysis", icon: Telescope },
  { to: "/candidate/companies", label: "Company Research", icon: Building2 },
  { to: "/candidate/jobs", label: "Job Matching", icon: Briefcase },
  { to: "/candidate/interviews", label: "Adaptive Interview", icon: Bot },
  { to: "/candidate/readiness", label: "Readiness Hub", icon: Target },
  { to: "/candidate/learning", label: "Learning Center", icon: GraduationCap },
  { to: "/candidate/profile", label: "Profile", icon: UserCircle2 },
];

export function CandidateShell({ children, title, eyebrow }: { children: ReactNode; title?: string; eyebrow?: string }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const SideNav = () => (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background font-display">A</span>
        <span className="font-display text-lg">Candidate</span>
      </Link>
      {nav.map((item) => {
        const active = item.exact ? path === item.to : path.startsWith(item.to);
        return (
          <Link key={item.to} to={item.to}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active ? "bg-primary/15 text-foreground font-medium" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}>
            <item.icon className="h-4 w-4" />{item.label}
          </Link>
        );
      })}
      <div className="mt-auto">
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="relative min-h-screen">
      <MeshBackground />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/40 backdrop-blur md:block">
          <SideNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border/40 bg-card/30 px-4 py-3 md:px-8 backdrop-blur">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64"><SideNav /></SheetContent>
              </Sheet>
              {eyebrow && <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{eyebrow}</p>}
            </div>
            <NotificationBell />
          </header>
          <main className="flex-1 px-4 py-8 md:px-10 md:py-12">
            {title && <h1 className="mb-8 font-display text-4xl md:text-5xl">{title}</h1>}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
