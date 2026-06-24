import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Sparkles, Loader2, X } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { summarizeCandidate } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/")({
  head: () => ({ meta: [{ title: "Candidates — Recruiter" }] }),
  component: Candidates,
});

function Candidates() {
  const summarize = useServerFn(summarizeCandidate);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  const { data: apps } = useQuery({
    queryKey: ["all-applications"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("applications")
        .select("*, profiles!applications_candidate_id_fkey(full_name,email,experience_level,education), jobs!inner(title,recruiter_id), resumes(parsed_skills,ats_score,content)")
        .eq("jobs.recruiter_id", u.user.id)
        .order("match_score", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = (apps ?? []).filter(a => {
    const p = (a as any).profiles;
    const j = (a as any).jobs;
    const r = (a as any).resumes;
    const hay = `${p?.full_name ?? ""} ${j?.title ?? ""} ${(r?.parsed_skills ?? []).join(" ")}`.toLowerCase();
    return !search || hay.includes(search.toLowerCase());
  });

  const open = filtered.find(a => a.id === openId);

  async function runSummary(appId: string) {
    setLoadingSummary(true); setSummary("");
    try {
      const r = await summarize({ data: { applicationId: appId } });
      setSummary(r.summary);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    setLoadingSummary(false);
  }

  return (
    <RecruiterShell eyebrow="All applicants" title={<span><span className="text-gold">Candidates</span></span>}>
      <div className="glass rounded-2xl p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, role, or skill" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="glass mt-6 overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-border/40 bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Match</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const p = (a as any).profiles;
              const j = (a as any).jobs;
              return (
                <tr key={a.id} className="border-b border-border/20 hover:bg-card/30">
                  <td className="px-4 py-3"><p className="font-medium">{p?.full_name ?? "—"}</p><p className="text-xs text-muted-foreground">{p?.experience_level ?? ""}</p></td>
                  <td className="px-4 py-3">{j?.title}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="rounded-full capitalize">{a.stage}</Badge></td>
                  <td className="px-4 py-3 font-display text-lg text-gold">{a.match_score ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => { setOpenId(a.id); setSummary(""); }}>Open</Button></td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No candidates yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="recruiter w-full max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle className="text-gold">{(open as any)?.profiles?.full_name ?? "Candidate"}</SheetTitle></SheetHeader>
          {open && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-card/40 p-4 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Applied to</p>
                <p className="mt-1 font-medium">{(open as any).jobs?.title}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-[10px] uppercase text-muted-foreground">Match</p><p className="font-display text-2xl text-gold">{open.match_score ?? "—"}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">ATS</p><p className="font-display text-2xl text-gold">{(open as any).resumes?.ats_score ?? "—"}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">Stage</p><p className="font-display text-base capitalize">{open.stage}</p></div>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Skills</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {((open as any).resumes?.parsed_skills ?? []).map((s: string) => <Badge key={s} variant="outline" className="rounded-full text-[10px] border-gold/30 text-gold/80">{s}</Badge>)}
                </div>
              </div>
              {!!open.skill_gaps?.length && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Skill gaps</p>
                  <div className="mt-2 flex flex-wrap gap-1">{open.skill_gaps.map(s => <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>)}</div>
                </div>
              )}
              <div>
                <Button onClick={() => runSummary(open.id)} disabled={loadingSummary} className="rounded-full bg-gold-soft text-gold border-gold">
                  {loadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  AI recruiter brief
                </Button>
                {summary && <p className="mt-3 rounded-xl border border-gold/30 bg-card/40 p-4 text-sm">{summary}</p>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </RecruiterShell>
  );
}
