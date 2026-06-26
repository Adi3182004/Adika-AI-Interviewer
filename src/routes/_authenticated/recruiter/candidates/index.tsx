import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Sparkles, Loader2, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { summarizeCandidate } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/recruiter/candidates/")({
  head: () => ({ meta: [{ title: "Candidates — Recruiter" }] }),
  component: Candidates,
});

const STAGES = ["sourced", "screen", "interview", "offer", "accepted", "rejected"] as const;
const EXPERIENCE = ["junior", "mid", "senior", "lead", "principal"];

function Candidates() {
  const summarize = useServerFn(summarizeCandidate);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // advanced filters
  const [activeStages, setActiveStages] = useState<string[]>([]);
  const [minMatch, setMinMatch] = useState<number>(0);
  const [experience, setExperience] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"match" | "ats" | "recent">("match");

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

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    (apps ?? []).forEach(a => ((a as any).resumes?.parsed_skills ?? []).forEach((s: string) => set.add(s)));
    return Array.from(set).sort();
  }, [apps]);

  const filtered = useMemo(() => {
    let list = (apps ?? []).filter(a => {
      const p = (a as any).profiles;
      const j = (a as any).jobs;
      const r = (a as any).resumes;
      const skills: string[] = r?.parsed_skills ?? [];
      const hay = `${p?.full_name ?? ""} ${j?.title ?? ""} ${skills.join(" ")}`.toLowerCase();
      if (search && !hay.includes(search.toLowerCase())) return false;
      if (activeStages.length && !activeStages.includes(a.stage as string)) return false;
      if ((a.match_score ?? 0) < minMatch) return false;
      if (experience !== "all" && p?.experience_level !== experience) return false;
      if (skillFilter.length && !skillFilter.every(s => skills.includes(s))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "ats") return (((b as any).resumes?.ats_score ?? 0) - ((a as any).resumes?.ats_score ?? 0));
      if (sortBy === "recent") return (new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime());
      return ((b.match_score ?? 0) - (a.match_score ?? 0));
    });
    return list;
  }, [apps, search, activeStages, minMatch, experience, skillFilter, sortBy]);

  const open = filtered.find(a => a.id === openId);

  function toggleStage(s: string) {
    setActiveStages(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  function toggleSkill(s: string) {
    setSkillFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  function resetFilters() {
    setActiveStages([]); setMinMatch(0); setExperience("all"); setSkillFilter([]); setSearch("");
  }

  async function runSummary(appId: string) {
    setLoadingSummary(true); setSummary("");
    try {
      const r = await summarize({ data: { applicationId: appId } });
      setSummary(r.summary);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    setLoadingSummary(false);
  }

  const activeFilterCount = activeStages.length + skillFilter.length + (minMatch > 0 ? 1 : 0) + (experience !== "all" ? 1 : 0);

  return (
    <RecruiterShell eyebrow="All applicants" title={<span>Talent <span className="text-gold">Intelligence</span></span>}>
      {/* Search + sort header */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, role, or skill" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-44 rounded-full">
              <ArrowUpDown className="mr-2 h-4 w-4" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Best match</SelectItem>
              <SelectItem value="ats">Top ATS score</SelectItem>
              <SelectItem value="recent">Most recent</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="rounded-full text-xs text-gold">
              <X className="mr-1 h-3 w-3" /> Clear {activeFilterCount}
            </Button>
          )}
        </div>

        {/* Advanced filter rail */}
        <div className="mt-4 grid gap-4 border-t border-gold/15 pt-4 lg:grid-cols-[1fr_220px_220px]">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><SlidersHorizontal className="h-3 w-3" /> Pipeline stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => {
                const active = activeStages.includes(s);
                return (
                  <button key={s} onClick={() => toggleStage(s)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize transition ${active ? "border-gold bg-gold-soft text-gold" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Min match score · <span className="text-gold">{minMatch}</span></p>
            <Slider value={[minMatch]} onValueChange={(v) => setMinMatch(v[0])} min={0} max={100} step={5} />
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Experience</p>
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger className="h-9 rounded-full text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {EXPERIENCE.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!!allSkills.length && (
          <div className="mt-4 border-t border-gold/15 pt-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Required skills (AND)</p>
            <div className="flex flex-wrap gap-1.5">
              {allSkills.slice(0, 24).map(s => {
                const active = skillFilter.includes(s);
                return (
                  <button key={s} onClick={() => toggleSkill(s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${active ? "border-gold bg-gold-soft text-gold" : "border-border/30 text-muted-foreground hover:text-foreground"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{filtered.length} of {(apps ?? []).length} candidates</p>

      <div className="glass mt-2 overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-border/40 bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Match</th><th className="px-4 py-3">ATS</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const p = (a as any).profiles;
              const j = (a as any).jobs;
              const r = (a as any).resumes;
              return (
                <tr key={a.id} className="border-b border-border/20 hover:bg-card/30">
                  <td className="px-4 py-3"><p className="font-medium">{p?.full_name ?? "—"}</p><p className="text-xs text-muted-foreground capitalize">{p?.experience_level ?? ""}</p></td>
                  <td className="px-4 py-3">{j?.title}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="rounded-full capitalize">{a.stage}</Badge></td>
                  <td className="px-4 py-3 font-display text-lg text-gold">{a.match_score ?? "—"}</td>
                  <td className="px-4 py-3 font-display text-base text-gold/80">{r?.ats_score ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => { setOpenId(a.id); setSummary(""); }}>Open</Button></td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No candidates match these filters.</td></tr>}
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
                <Button onClick={() => runSummary(open.id)} disabled={loadingSummary} className="rounded-full bg-gold-soft text-gold border border-gold hover:bg-gold/20">
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
