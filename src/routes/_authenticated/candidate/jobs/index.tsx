import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Briefcase, Sparkles, Loader2, Send, Globe, Building2, Users, Calendar, DollarSign } from "lucide-react";
import { CandidateShell } from "@/components/CandidateShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { matchJob } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/candidate/jobs/")({
  head: () => ({ meta: [{ title: "Job Matching — Adika AI" }] }),
  component: Jobs,
});

function getCompanyData(name: string | null) {
  const normalized = (name || "Adika Labs").trim();
  const lower = normalized.toLowerCase();
  
  if (lower.includes("google")) {
    return {
      name: "Google",
      logo: "G",
      logoBg: "bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500",
      size: "150k+ employees",
      industry: "Technology & Search",
      tagline: "Organizing the world's information and making it universally accessible.",
      founded: "1998",
      website: "google.com"
    };
  }
  if (lower.includes("stripe")) {
    return {
      name: "Stripe",
      logo: "S",
      logoBg: "bg-gradient-to-br from-indigo-500 to-purple-600",
      size: "8k+ employees",
      industry: "Financial Technology",
      tagline: "Financial infrastructure for the internet.",
      founded: "2010",
      website: "stripe.com"
    };
  }
  if (lower.includes("adobe")) {
    return {
      name: "Adobe",
      logo: "A",
      logoBg: "bg-gradient-to-br from-red-600 to-rose-700",
      size: "26k+ employees",
      industry: "Creative Software",
      tagline: "Changing the world through digital experiences.",
      founded: "1982",
      website: "adobe.com"
    };
  }
  if (lower.includes("meta")) {
    return {
      name: "Meta",
      logo: "M",
      logoBg: "bg-gradient-to-br from-sky-500 to-blue-600",
      size: "70k+ employees",
      industry: "Social Technology",
      tagline: "Giving people the power to build community and bring the world closer.",
      founded: "2004",
      website: "meta.com"
    };
  }
  if (lower.includes("amazon")) {
    return {
      name: "Amazon",
      logo: "Am",
      logoBg: "bg-gradient-to-br from-amber-500 to-orange-600",
      size: "1.5M+ employees",
      industry: "E-Commerce & Cloud",
      tagline: "Earth's most customer-centric company.",
      founded: "1994",
      website: "amazon.com"
    };
  }
  if (lower.includes("adika")) {
    return {
      name: "Adika Labs",
      logo: "AL",
      logoBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      size: "10-50 employees",
      industry: "Artificial Intelligence",
      tagline: "Building the next generation of AI-powered candidate assessments.",
      founded: "2024",
      website: "adikalabs.com"
    };
  }
  // Generic fallback:
  const firstLetter = normalized.slice(0, 2).toUpperCase();
  const colors = [
    "from-purple-500 to-indigo-600",
    "from-pink-500 to-rose-600",
    "from-teal-500 to-emerald-600",
    "from-amber-500 to-yellow-600",
    "from-blue-500 to-sky-600",
  ];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const logoBg = colors[Math.abs(hash) % colors.length];
  return {
    name: normalized,
    logo: firstLetter,
    logoBg: `bg-gradient-to-br ${logoBg}`,
    size: "100-500 employees",
    industry: "Technology",
    tagline: "Innovative services and technology matching the future of work.",
    founded: "2021",
    website: `${normalized.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`
  };
}

function Jobs() {
  const qc = useQueryClient();
  const match = useServerFn(matchJob);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);

  const { data: jobs } = useQuery({
    queryKey: ["jobs-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: resumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("resumes")
        .select("id,title,is_primary")
        .eq("user_id", u.user.id);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (resumes && resumes.length > 0 && !selectedResume) {
      const primary = resumes.find((r) => r.is_primary);
      setSelectedResume(primary ? primary.id : resumes[0].id);
    }
  }, [resumes, selectedResume]);

  const { data: myApps } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("applications")
        .select("job_id,stage")
        .eq("candidate_id", u.user.id);
      return data ?? [];
    },
  });

  const applied = new Set((myApps ?? []).map((a) => a.job_id));
  const filtered = (jobs ?? []).filter(
    (j) =>
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      (j.skills ?? []).some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );
  const openJob = filtered.find((j) => j.id === openId);

  async function runMatch(jobId: string) {
    if (!selectedResume) return toast.info("Pick a resume first");
    setMatching(true);
    setMatchResult(null);
    try {
      const r = await match({ data: { jobId, resumeId: selectedResume } });
      setMatchResult(r);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
    setMatching(false);
  }

  async function apply(jobId: string) {
    if (!selectedResume) return toast.info("Pick a resume first");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      candidate_id: u.user.id,
      resume_id: selectedResume,
      match_score: matchResult?.match_score,
      skill_gaps: matchResult?.skill_gaps ?? [],
    });
    if (error) return toast.error(error.message);
    toast.success("Application submitted");
    qc.invalidateQueries({ queryKey: ["my-applications"] });
    setOpenId(null);
  }

  return (
    <CandidateShell eyebrow="Browse roles" title="Job Matching">
      {/* Top Selector & Search Bar */}
      <div className="glass rounded-2xl p-6 grid md:grid-cols-2 gap-6 items-end mb-6">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Target Resume (Used for match scoring & application)
          </Label>
          {resumes?.length ? (
            <Select value={selectedResume} onValueChange={setSelectedResume}>
              <SelectTrigger className="w-full bg-background/40 backdrop-blur-md border border-border/60 rounded-full h-11 px-4">
                <SelectValue placeholder="Select resume" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} {r.is_primary ? "(Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-yellow-500 py-2">
              No resumes found. Please create/upload a resume first.
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Search Jobs by Title or Skill
          </Label>
          <div className="relative">
            <Input
              placeholder="Search e.g. React, Go, Backend..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background/40 backdrop-blur-md border border-border/60 rounded-full h-11 px-4 pr-10"
            />
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((j) => {
          const comp = getCompanyData(j.company);
          const hasApplied = applied.has(j.id);
          return (
            <div key={j.id} className="glass rounded-2xl p-6 hover:shadow-lg transition-all duration-300 flex flex-col justify-between border border-border/20">
              <div>
                {/* Company Header */}
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-md ${comp.logoBg}`}>
                    {comp.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold truncate leading-snug">{j.title}</h3>
                    <p className="text-sm font-medium text-primary mt-0.5">{comp.name}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {j.location ?? "Remote"}
                    </p>
                  </div>
                </div>

                {/* Company & Job Tagline / Metadata */}
                <p className="mt-3 text-xs italic text-muted-foreground line-clamp-1 border-l-2 border-primary/20 pl-2">
                  "{comp.tagline}"
                </p>

                {/* Info Badges */}
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium">
                  <span className="bg-secondary/40 px-2 py-0.5 rounded text-muted-foreground capitalize">
                    {j.seniority?.replace("_", " ") ?? "Mid-level"}
                  </span>
                  <span className="bg-secondary/40 px-2 py-0.5 rounded text-muted-foreground capitalize">
                    {j.employment_type?.replace("_", " ") ?? "Full-time"}
                  </span>
                  {(j.salary_min || j.salary_max) && (
                    <span className="bg-primary/5 px-2 py-0.5 rounded text-primary">
                      💰 {j.salary_min ? `$${(j.salary_min/1000).toFixed(0)}k` : ""}
                      {j.salary_min && j.salary_max ? "-" : ""}
                      {j.salary_max ? `$${(j.salary_max/1000).toFixed(0)}k` : ""}
                    </span>
                  )}
                </div>

                {/* Skills */}
                <div className="mt-4 flex flex-wrap gap-1">
                  {(j.skills ?? []).slice(0, 5).map((s) => (
                    <Badge key={s} variant="secondary" className="rounded-full text-[9px] px-2 py-0">
                      {s}
                    </Badge>
                  ))}
                  {(j.skills ?? []).length > 5 && (
                    <span className="text-[9px] text-muted-foreground self-center">
                      +{j.skills.length - 5} more
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-4 line-clamp-3 text-sm text-muted-foreground leading-relaxed">{j.description}</p>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                {hasApplied ? (
                  <Badge className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Applied
                  </Badge>
                ) : (
                  <span />
                )}
                <Dialog
                  open={openId === j.id}
                  onOpenChange={(o) => {
                    setOpenId(o ? j.id : null);
                    setMatchResult(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-full px-5">
                      View & apply
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="border-b border-border/40 pb-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-md ${comp.logoBg}`}>
                          {comp.logo}
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-display leading-tight">{j.title}</DialogTitle>
                          <p className="text-sm font-semibold text-primary mt-1">{comp.name}</p>
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="grid md:grid-cols-5 gap-6">
                      {/* Left: Job Details */}
                      <div className="md:col-span-3 space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Role Description
                          </h4>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {j.description}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Key Skills Needed
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(j.skills ?? []).map((s) => (
                              <Badge key={s} variant="secondary" className="rounded-full text-[10px] px-2.5">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Company Profile */}
                      <div className="md:col-span-2 space-y-4 bg-secondary/20 rounded-2xl p-4 border border-border/40 h-fit">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" /> About {comp.name}
                          </h4>
                          <p className="text-xs italic text-muted-foreground leading-relaxed">
                            "{comp.tagline}"
                          </p>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-3.5 w-3.5 shrink-0" />
                            <a
                              href={`https://${comp.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              {comp.website}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span>{comp.size}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            <span className="capitalize">{j.employment_type?.replace("_", " ") ?? "Full-time"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>Founded in {comp.founded}</span>
                          </div>
                          {j.salary_min || j.salary_max ? (
                            <div className="flex items-center gap-2 text-muted-foreground font-medium text-foreground">
                              <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              <span>
                                {j.salary_min ? `$${j.salary_min.toLocaleString()}` : ""}
                                {j.salary_min && j.salary_max ? " - " : ""}
                                {j.salary_max ? `$${j.salary_max.toLocaleString()}` : ""}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Resume & Match Calculation */}
                    <div className="border-t border-border/40 pt-4 mt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5 rounded-2xl p-4 border border-primary/10">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Selected Resume for Application</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {resumes?.find((r) => r.id === selectedResume)?.title || "No resume selected"}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-left sm:text-right">
                          To change, select a different resume in the main page selector.
                        </div>
                      </div>

                      {matchResult && (
                        <div className="mt-4 rounded-2xl bg-secondary/50 p-4 border border-border/60">
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-4xl font-extrabold text-primary">{matchResult.match_score}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ATS Match Score</span>
                          </div>
                          <p className="mt-2 text-sm text-foreground leading-relaxed">{matchResult.recommendation}</p>
                          {matchResult.skill_gaps?.length ? (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Skill Gaps:</span>
                              {matchResult.skill_gaps.map((gap: string) => (
                                <Badge key={gap} variant="destructive" className="rounded-full text-[9px] bg-red-500/10 text-red-500 hover:bg-red-500/10 border-none font-medium">
                                  {gap}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className="mt-6 flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => runMatch(j.id)}
                          disabled={matching || !selectedResume}
                          className="flex-1 rounded-full h-11 border-border/60 hover:bg-secondary/40"
                        >
                          {matching ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4 text-primary" />
                          )}
                          Analyze Match Fit
                        </Button>
                        <Button
                          onClick={() => apply(j.id)}
                          disabled={!selectedResume || hasApplied}
                          className="flex-1 rounded-full h-11"
                        >
                          <Send className="mr-2 h-4 w-4" /> Apply Now
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <div className="glass col-span-full rounded-2xl p-16 text-center text-muted-foreground border border-dashed border-border/60">
            No published jobs match your search keywords.
          </div>
        )}
      </div>
    </CandidateShell>
  );
}
