import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  LayoutDashboard, Briefcase, KanbanSquare, Users, Bot, LineChart, Settings as SettingsIcon, LogOut, Menu,
} from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const nav: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/recruiter", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/recruiter/jobs", label: "Jobs", icon: Briefcase },
  { to: "/recruiter/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/recruiter/candidates", label: "Candidates", icon: Users },
  { to: "/recruiter/interviews", label: "Interview Replays", icon: Bot },
  { to: "/recruiter/analytics", label: "Analytics", icon: LineChart },
  { to: "/recruiter/settings", label: "Settings", icon: SettingsIcon },
];

export function RecruiterShell({ children, title, eyebrow }: { children: ReactNode; title?: ReactNode; eyebrow?: string }) {
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
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-soft font-display">A</span>
        <span className="font-display text-lg text-gold">Recruiter Pro</span>
      </Link>
      {nav.map((item) => {
        const active = item.exact ? path === item.to : path.startsWith(item.to);
        return (
          <Link key={item.to} to={item.to}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active ? "bg-gold-soft text-gold font-medium" : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
            }`}>
            <item.icon className="h-4 w-4" />{item.label}
          </Link>
        );
      })}
      <div className="mt-auto">
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-gold">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="recruiter relative min-h-screen text-foreground">
      <MeshBackground variant="constellation" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-xl md:block">
          <SideNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border/30 bg-card/20 px-4 py-3 md:px-8 backdrop-blur">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="recruiter p-0 w-64 bg-card/95"><SideNav /></SheetContent>
              </Sheet>
              {eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>}
            </div>
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
