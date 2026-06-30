import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, GitCompare } from "lucide-react";
import { RecruiterShell } from "@/components/RecruiterShell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRecruiterIds } from "@/hooks/use-team-recruiter-ids";

export const Route = createFileRoute("/_authenticated/recruiter/compare")({
  head: () => ({ meta: [{ title: "Compare Candidates — Recruiter Pro" }] }),
  component: CompareCandidatesPage,
});

function CompareCandidatesPage() {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const { data: teamIds = [] } = useTeamRecruiterIds();

  const { data: apps = [] } = useQuery({
    queryKey: ["compare-applications", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select(
          "*, profiles!applications_candidate_id_fkey(full_name,email,experience_level), jobs!inner(title,recruiter_id), resumes(parsed_skills,ats_score,content)",
        )
        .in("jobs.recruiter_id", teamIds);
      if (!data) return [];

      // Load interview sessions scores
      const candidateIds = data.map((a: any) => a.candidate_id);
      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("candidate_id,overall_score,readiness_score,summary")
        .in(
          "candidate_id",
          candidateIds.length ? candidateIds : ["00000000-0000-0000-0000-000000000000"],
        );

      const sessionBy = new Map<
        string,
        { overall: number | null; readiness: number | null; summary: string | null }
      >();
      for (const s of sessions ?? []) {
        sessionBy.set(s.candidate_id, {
          overall: s.overall_score,
          readiness: s.readiness_score,
          summary: s.summary,
        });
      }

      return data.map((a: any) => {
        const s = sessionBy.get(a.candidate_id);
        return {
          ...a,
          interview_score: s?.overall ?? null,
          readiness_score: s?.readiness ?? null,
          ai_summary: s?.summary ?? (a.resumes as any)?.content?.summary ?? "No summary available",
        };
      });
    },
  });

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      const name = (a as any).profiles?.full_name ?? "";
      const role = (a as any).jobs?.title ?? "";
      const query = search.toLowerCase();
      return name.toLowerCase().includes(query) || role.toLowerCase().includes(query);
    });
  }, [apps, search]);

  const selected = useMemo(() => apps.filter((a) => picked.includes(a.id)), [apps, picked]);

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));
  };

  const dims = [
    { key: "match_score", label: "Match score" },
    { key: "ats_score", label: "ATS score", source: "resumes" },
    { key: "interview_score", label: "Interview score" },
    { key: "readiness_score", label: "Readiness score" },
  ];

  const best = (key: string, source?: string) => {
    const values = selected.map((a) => {
      if (source === "resumes") return (a as any).resumes?.[key] ?? 0;
      return (a as any)[key] ?? 0;
    });
    return Math.max(...values, 0);
  };

  return (
    <RecruiterShell
      eyebrow="Talent Evaluation"
      title={
        <span>
          Compare <span className="text-gold">Candidates</span>
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="glass rounded-2xl p-4 flex flex-col gap-3 h-[calc(100vh-220px)] min-h-[400px]">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Select up to 4</p>
            <p className="text-[10px] text-muted-foreground">Select side-by-side matches</p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search candidate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8 rounded-lg"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.map((a) => {
              const p = (a as any).profiles;
              const j = (a as any).jobs;
              return (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/55 bg-card/10 px-3 py-2 hover:bg-card/30 transition"
                >
                  <Checkbox checked={picked.includes(a.id)} onCheckedChange={() => toggle(a.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{p?.full_name ?? "Candidate"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{j?.title}</p>
                  </div>
                  <span className="font-display text-xs text-gold">{a.match_score ?? "—"}</span>
                </label>
              );
            })}
            {!filtered.length && (
              <p className="text-center text-xs text-muted-foreground py-8 italic">
                No candidates found
              </p>
            )}
          </div>
        </div>

        <div className="glass overflow-hidden rounded-2xl h-[calc(100vh-220px)] min-h-[400px] flex flex-col">
          {selected.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground gap-3">
              <div className="h-10 w-10 rounded-full bg-gold-soft flex items-center justify-center text-gold">
                <GitCompare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">No candidates selected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select candidates on the left to start comparing side-by-side.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl">
                  <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 bg-card/20">Dimension</th>
                    {selected.map((a) => {
                      const p = (a as any).profiles;
                      const j = (a as any).jobs;
                      return (
                        <th key={a.id} className="px-4 py-3 text-right bg-card/20 min-w-[180px]">
                          <div className="font-display text-sm text-foreground">{p?.full_name}</div>
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {j?.title}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {dims.map((d) => {
                    const top = best(d.key, d.source);
                    return (
                      <tr key={d.key} className="border-b border-border/20 hover:bg-card/10">
                        <td className="px-4 py-3 text-muted-foreground font-medium text-xs">
                          {d.label}
                        </td>
                        {selected.map((a) => {
                          const val =
                            d.source === "resumes"
                              ? (a as any).resumes?.[d.key]
                              : (a as any)[d.key];
                          const isTop = val != null && Number(val) === top && top > 0;
                          return (
                            <td key={a.id} className="px-4 py-3 text-right">
                              <span
                                className={
                                  isTop
                                    ? "font-display text-base text-gold font-bold"
                                    : "text-foreground text-xs"
                                }
                              >
                                {val ?? "—"}
                                {val != null &&
                                  d.key.endsWith("score") &&
                                  !d.key.startsWith("ats") &&
                                  !d.key.startsWith("interview") &&
                                  "%"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  <tr className="border-b border-border/20 hover:bg-card/10">
                    <td className="px-4 py-3 text-muted-foreground font-medium text-xs">Skills</td>
                    {selected.map((a) => {
                      const skills: string[] = (a as any).resumes?.parsed_skills ?? [];
                      return (
                        <td key={a.id} className="px-4 py-3 text-right">
                          <div className="flex flex-wrap gap-1 justify-end max-w-[240px] ml-auto">
                            {skills.slice(0, 5).map((s: string) => (
                              <span
                                key={s}
                                className="rounded bg-accent/40 px-1 py-0.5 text-[9px] text-foreground"
                              >
                                {s}
                              </span>
                            ))}
                            {skills.length > 5 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{skills.length - 5} more
                              </span>
                            )}
                            {!skills.length && (
                              <span className="text-[10px] text-muted-foreground/50">—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="px-4 py-3 text-muted-foreground font-medium text-xs">
                      AI Evaluation Brief
                    </td>
                    {selected.map((a) => (
                      <td
                        key={a.id}
                        className="px-4 py-3 text-right text-xs text-muted-foreground max-w-[260px] leading-relaxed"
                      >
                        {(a as any).ai_summary}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RecruiterShell>
  );
}
