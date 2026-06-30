import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function GetStartedDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden">
        <div className="p-8">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">
              Choose how you want to start
            </DialogTitle>
            <DialogDescription>
              One intelligence layer — two tailored experiences.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {/* Candidate */}
            <div className="glass rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-xl">Candidate</p>
                  <p className="text-xs text-muted-foreground">Grow your career profile</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                AI resume, adaptive interviews, learning roadmaps and readiness tracking.
              </p>
              <div className="mt-6 grid gap-2">
                <Link to="/auth" search={{ role: "candidate", mode: "register" }}>
                  <Button size="lg" className="w-full justify-between rounded-full">
                    Register as candidate <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ role: "candidate", mode: "login" }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full justify-between rounded-full"
                  >
                    Login <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recruiter */}
            <div className="rounded-2xl border border-border bg-[#0a0816] p-6 text-white transition hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-gold">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-xl">Recruiter Pro</p>
                  <p className="text-xs text-white/60">Decide with calibrated evidence</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/70">
                Match scores, replayable interviews, pipeline kanban and analytics.
              </p>
              <div className="mt-6 grid gap-2">
                <Link to="/auth" search={{ role: "recruiter", mode: "register" }}>
                  <Button
                    size="lg"
                    className="w-full justify-between rounded-full bg-white text-[#0a0816] hover:bg-white/90"
                  >
                    Register as recruiter <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ role: "recruiter", mode: "login" }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full justify-between rounded-full border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    Login <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
