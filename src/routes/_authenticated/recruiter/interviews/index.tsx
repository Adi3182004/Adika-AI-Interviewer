import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bot } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/recruiter/interviews/")({
  head: () => ({ meta: [{ title: "Interview Replays" }] }),
  component: Replays,
});

function Replays() {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: sessions } = useQuery({
    queryKey: ["recruiter-sessions"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("interview_sessions")
        .select("*, jobs!inner(title,recruiter_id), profiles!interview_sessions_candidate_id_fkey(full_name)")
        .eq("jobs.recruiter_id", u.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["recruiter-session-msgs", openId],
    queryFn: async () => {
      if (!openId) return [];
      const { data } = await supabase.from("interview_messages").select("*").eq("session_id", openId).order("created_at");
      return data ?? [];
    },
    enabled: !!openId,
  });

  const open = (sessions ?? []).find(s => s.id === openId);

  return (
    <RecruiterShell eyebrow="Adaptive interviews" title={<span><span className="text-gold">Replays</span></span>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="glass rounded-2xl p-2 max-h-[70vh] overflow-y-auto">
          {(sessions ?? []).map(s => (
            <button key={s.id} onClick={() => setOpenId(s.id)} className={`block w-full rounded-xl p-4 text-left transition ${openId === s.id ? "bg-gold-soft" : "hover:bg-card/40"}`}>
              <p className="font-medium">{(s as any).profiles?.full_name ?? "Candidate"}</p>
              <p className="text-xs text-muted-foreground">{(s as any).jobs?.title} · {s.role_target}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-display text-lg text-gold">{s.overall_score ?? "—"}</span>
                <Badge variant="secondary" className="rounded-full text-[10px] capitalize">{s.status.replace("_"," ")}</Badge>
              </div>
            </button>
          ))}
          {!sessions?.length && <p className="p-6 text-center text-sm text-muted-foreground">No replays yet.</p>}
        </div>

        <div className="glass rounded-2xl p-6 max-h-[70vh] overflow-y-auto">
          {!open ? (
            <p className="text-center text-sm text-muted-foreground">Pick a session to view the transcript.</p>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wider text-gold">Replay</p>
              <h2 className="mt-1 font-display text-2xl">{open.role_target}</h2>
              <div className="mt-3 flex gap-3 text-sm">
                <span><span className="text-muted-foreground">Overall</span> <span className="text-gold font-medium">{open.overall_score ?? "—"}</span></span>
                <span><span className="text-muted-foreground">Readiness</span> <span className="text-gold font-medium">{open.readiness_score ?? "—"}</span></span>
              </div>
              {open.summary && <p className="mt-3 text-sm text-muted-foreground">{open.summary}</p>}
              <div className="mt-6 space-y-3">
                {(messages ?? []).map(m => (
                  <div key={m.id} className={`rounded-xl p-3 text-sm ${m.role === "assistant" ? "bg-card/50 border border-border/40" : "bg-gold-soft"}`}>
                    <p className="text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">{m.role === "assistant" && <Bot className="h-3 w-3" />}{m.role}{m.score != null && <span className="ml-auto text-gold">score {m.score}</span>}</p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </RecruiterShell>
  );
}
