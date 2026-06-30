import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/team/invite/$token")({
  head: () => ({ meta: [{ title: "Accept team invite" }] }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvite);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState("working");
      try {
        const r = await accept({ data: { token } });
        if (cancelled) return;
        setTeamName(r.teamName ?? "the team");
        setState("done");
      } catch (e: any) {
        if (cancelled) return;
        setMessage(e?.message ?? "Unable to accept invite");
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, accept]);

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="glass max-w-md w-full rounded-3xl p-10 text-center">
        {state === "working" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />
            <p className="mt-4 font-display text-xl">Joining the team…</p>
          </>
        )}
        {state === "done" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="mt-4 font-display text-2xl">You're in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You now have access to <span className="text-gold">{teamName}</span>'s jobs,
              candidates, and interview replays.
            </p>
            <Button className="mt-6 rounded-full" onClick={() => navigate({ to: "/recruiter" })}>
              Go to recruiter dashboard
            </Button>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-4 font-display text-2xl">Invite unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button
              variant="outline"
              className="mt-6 rounded-full"
              onClick={() => navigate({ to: "/" })}
            >
              Back to home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
