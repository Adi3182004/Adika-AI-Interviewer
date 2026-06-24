import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Plus, Play } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/candidate/interviews/")({
  head: () => ({ meta: [{ title: "AI Interviewer — Adika AI" }] }),
  component: InterviewsList,
});

function InterviewsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [roleTarget, setRoleTarget] = useState("");
  const [difficulty, setDifficulty] = useState("mid");
  const [open, setOpen] = useState(false);

  const { data: sessions } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("interview_sessions").select("*").eq("candidate_id", u.user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function start() {
    if (!roleTarget.trim()) return toast.info("Tell us the role");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase.from("interview_sessions").insert({
      candidate_id: u.user.id, role_target: roleTarget, difficulty, status: "in_progress",
    }).select().single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["interviews"] });
    setOpen(false);
    navigate({ to: "/candidate/interviews/$id", params: { id: data.id } });
  }

  return (
    <CandidateShell eyebrow="Adaptive practice" title="AI Interviewer">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-6">
        <div>
          <p className="font-medium">Start a calibrated mock interview</p>
          <p className="text-sm text-muted-foreground">Six adaptive questions. Per-answer scoring and a readiness rating at the end.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full"><Plus className="mr-2 h-4 w-4" /> New session</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New interview session</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Target role</label>
                <Input className="mt-1" placeholder="e.g. Senior Backend Engineer" value={roleTarget} onChange={(e) => setRoleTarget(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="staff">Staff+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={start} className="w-full rounded-full"><Play className="mr-2 h-4 w-4" /> Begin</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(sessions ?? []).map((s) => (
          <Link key={s.id} to="/candidate/interviews/$id" params={{ id: s.id }} className="glass group rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-luxe">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> {s.role_target}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
              </div>
              <Badge variant="secondary" className="rounded-full text-[10px] capitalize">{s.status.replace("_"," ")}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div><p className="text-[10px] uppercase text-muted-foreground">Overall</p><p className="font-display text-2xl">{s.overall_score ?? "—"}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Readiness</p><p className="font-display text-2xl">{s.readiness_score ?? "—"}</p></div>
            </div>
          </Link>
        ))}
        {!sessions?.length && <div className="glass col-span-full rounded-2xl p-12 text-center text-muted-foreground">No sessions yet — start one above.</div>}
      </div>
    </CandidateShell>
  );
}
