import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, MapPin, ArrowLeft, Sparkles, Building2 } from "lucide-react";
import { MeshBackground } from "@/components/MeshBackground";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  employment_type: string | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  skills: string[] | null;
  status: string;
};

export const Route = createFileRoute("/jobs/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("jobs")
      .select(
        "id,title,company,location,employment_type,seniority,salary_min,salary_max,description,skills,status",
      )
      .eq("id", params.id)
      .eq("status", "published")
      .maybeSingle();
    return { job: data as Job | null };
  },
  head: ({ loaderData }) => {
    const j = loaderData?.job;
    if (!j) return { meta: [{ title: "Job not found — Adika AI" }] };
    const title = `${j.title}${j.company ? ` at ${j.company}` : ""} — Adika AI`;
    const desc = (j.description ?? "").slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `/jobs/${j.id}` },
      ],
      links: [{ rel: "canonical", href: `/jobs/${j.id}` }],
    };
  },
  component: PublicJob,
});

function PublicJob() {
  const { job } = Route.useLoaderData();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [resumes, setResumes] = useState<Array<{ id: string; title: string; is_primary: boolean }>>(
    [],
  );
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return;
      setUser({ id: data.user.id });
      const [r, a] = await Promise.all([
        supabase.from("resumes").select("id,title,is_primary").eq("user_id", data.user.id),
        job
          ? supabase
              .from("applications")
              .select("id")
              .eq("candidate_id", data.user.id)
              .eq("job_id", job.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setResumes(r.data ?? []);
      setApplied(!!a.data);
    });
    return () => {
      mounted = false;
    };
  }, [job]);

  if (!job) {
    return (
      <div className="relative min-h-screen">
        <MeshBackground />
        <div className="relative z-10 mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">404</p>
          <h1 className="mt-3 font-display text-4xl">Job not found</h1>
          <p className="mt-2 text-muted-foreground">
            This role may have been closed or unpublished.
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button variant="outline" className="rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const primary = resumes.find((r) => r.is_primary) ?? resumes[0];
  const salary =
    job.salary_min || job.salary_max
      ? `${job.salary_min ? `$${job.salary_min.toLocaleString()}` : ""}${job.salary_min && job.salary_max ? " – " : ""}${job.salary_max ? `$${job.salary_max.toLocaleString()}` : ""}`
      : null;

  async function apply() {
    if (!user) {
      navigate({
        to: "/auth",
        search: { role: "candidate", mode: "register", redirect: `/jobs/${job!.id}` },
      });
      return;
    }
    if (!primary) {
      toast.info("Add a resume first");
      navigate({ to: "/candidate/resumes" });
      return;
    }
    setApplying(true);
    const { error } = await supabase.from("applications").insert({
      job_id: job!.id,
      candidate_id: user.id,
      resume_id: primary.id,
    });
    setApplying(false);
    if (error) return toast.error(error.message);
    setApplied(true);
    toast.success("Application submitted");
  }

  return (
    <div className="relative min-h-screen">
      <MeshBackground />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Adika AI
        </Link>

        <div className="glass mt-8 rounded-3xl p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Open role</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">{job.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {job.company && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {job.company}
              </span>
            )}
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </span>
            )}
            {job.employment_type && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" /> {job.employment_type}
              </span>
            )}
            {job.seniority && (
              <Badge variant="secondary" className="rounded-full">
                {job.seniority}
              </Badge>
            )}
            {salary && <span className="text-foreground">{salary}</span>}
          </div>

          {job.skills?.length ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {job.skills.map((s: string) => (
                <Badge key={s} variant="secondary" className="rounded-full text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="prose prose-invert mt-6 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {job.description}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/40 pt-6">
            {applied ? (
              <Badge className="rounded-full bg-success/15 text-success">You've applied</Badge>
            ) : (
              <Button onClick={apply} disabled={applying} className="rounded-full">
                <Sparkles className="mr-2 h-4 w-4" />
                {user ? "Apply now" : "Sign up to apply"}
              </Button>
            )}
            {!user && (
              <Link
                to="/auth"
                search={{ role: "candidate", mode: "login", redirect: `/jobs/${job.id}` }}
              >
                <Button variant="ghost" className="rounded-full">
                  Already a member? Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
