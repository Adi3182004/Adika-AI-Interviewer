import { createServerFn } from "@tanstack/react-start";

const DEMO = [
  {
    email: "candidate@adika.ai",
    password: "Demo@1234",
    role: "candidate" as const,
    meta: {
      primary_role: "candidate",
      full_name: "Aditya Andhalkar",
      phone: "+91 98765 43210",
      education: "B.Tech CSE — IIT Bombay",
      experience_level: "fresher",
    },
  },
  {
    email: "recruiter@adika.ai",
    password: "Demo@1234",
    role: "recruiter" as const,
    meta: {
      primary_role: "recruiter",
      full_name: "Aditya Andhalkar",
      company_name: "Adika Labs",
      company_size: "51-200",
      industry: "AI / SaaS",
      hiring_goals: "Hire 15 engineers in Q3",
    },
  },
];

// 16 synthetic Indian candidates spread across pipeline stages
const PIPELINE_CANDIDATES: Array<{
  full_name: string;
  email: string;
  experience_level: string;
  education: string;
  stage: "new" | "screen" | "interview" | "offer" | "hired" | "rejected";
  role: string; // which seeded job they applied for
  match_score: number;
  interview_score: number | null;
  skills: string[];
  summary: string;
}> = [
  // Sourced (new) — 4
  { full_name: "Aarav Sharma",      email: "aarav.sharma@demo.adika.ai",     experience_level: "fresher", education: "B.Tech CSE — IIT Bombay",      stage: "new",       role: "Senior Full-Stack Engineer", match_score: 88, interview_score: null, skills: ["TypeScript","React","Node.js","PostgreSQL"], summary: "Final-year CSE student with internships at Razorpay; shipped infra for 2M+ users." },
  { full_name: "Isha Patel",        email: "isha.patel@demo.adika.ai",       experience_level: "junior",  education: "B.E IT — VJTI Mumbai",          stage: "new",       role: "Senior Full-Stack Engineer", match_score: 81, interview_score: null, skills: ["React","Next.js","Tailwind","Node.js"], summary: "Frontend-heavy full-stack engineer, 2 yrs at Swiggy on the consumer web team." },
  { full_name: "Rohan Mehta",       email: "rohan.mehta@demo.adika.ai",      experience_level: "mid",     education: "M.Tech — IIT Madras",           stage: "new",       role: "Backend Engineer",            match_score: 76, interview_score: null, skills: ["Go","Kafka","PostgreSQL","Redis"], summary: "Backend engineer at Flipkart payments; built rate-limited webhook ingestor at 30K rps." },
  { full_name: "Sneha Iyer",        email: "sneha.iyer@demo.adika.ai",       experience_level: "junior",  education: "B.Tech ECE — NIT Trichy",       stage: "new",       role: "Frontend Engineer",           match_score: 72, interview_score: null, skills: ["React","TypeScript","Storybook","Jest"], summary: "Design-system focused frontend engineer at Razorpay for 2 years." },

  // AI Screen — 3
  { full_name: "Karthik Reddy",     email: "karthik.reddy@demo.adika.ai",    experience_level: "mid",     education: "B.E CSE — BITS Pilani",         stage: "screen",    role: "Senior Full-Stack Engineer", match_score: 84, interview_score: 72, skills: ["TypeScript","React","Node.js","AWS","tRPC"], summary: "Full-stack engineer at Postman; led migration of internal tools to tRPC + Drizzle." },
  { full_name: "Ananya Nair",       email: "ananya.nair@demo.adika.ai",      experience_level: "mid",     education: "B.Tech — IIIT Hyderabad",       stage: "screen",    role: "Backend Engineer",            match_score: 79, interview_score: 68, skills: ["Java","Spring Boot","Kafka","Cassandra"], summary: "Backend at Walmart Global Tech; owns checkout-write path." },
  { full_name: "Vikram Singh",      email: "vikram.singh@demo.adika.ai",     experience_level: "senior",  education: "M.S CS — IIIT Delhi",           stage: "screen",    role: "Senior Full-Stack Engineer", match_score: 91, interview_score: 81, skills: ["TypeScript","React","Node.js","PostgreSQL","K8s"], summary: "8 yrs across Atlassian and Zomato; staff-level system design." },

  // Interview — 3
  { full_name: "Priya Krishnan",    email: "priya.krishnan@demo.adika.ai",   experience_level: "senior",  education: "B.Tech CSE — IIT Delhi",        stage: "interview", role: "Senior Full-Stack Engineer", match_score: 93, interview_score: 88, skills: ["TypeScript","React","Node.js","PostgreSQL","Redis","GraphQL"], summary: "Senior engineer at Stripe India; deep payments + idempotency expertise." },
  { full_name: "Aditya Joshi",      email: "aditya.joshi@demo.adika.ai",     experience_level: "mid",     education: "B.E — COEP Pune",               stage: "interview", role: "Backend Engineer",            match_score: 86, interview_score: 79, skills: ["Go","gRPC","PostgreSQL","NATS"], summary: "Backend engineer at Atlan; metadata graph + search infra." },
  { full_name: "Meera Pillai",      email: "meera.pillai@demo.adika.ai",     experience_level: "mid",     education: "B.Tech CSE — NIT Surathkal",    stage: "interview", role: "Frontend Engineer",           match_score: 83, interview_score: 76, skills: ["React","TypeScript","Vite","Playwright"], summary: "Frontend engineer at Razorpay; led web-vitals improvements (LCP -38%)." },

  // Offer — 2
  { full_name: "Arjun Kapoor",      email: "arjun.kapoor@demo.adika.ai",     experience_level: "senior",  education: "M.S CS — Georgia Tech",         stage: "offer",     role: "Senior Full-Stack Engineer", match_score: 95, interview_score: 92, skills: ["TypeScript","React","Node.js","PostgreSQL","AWS","Terraform"], summary: "Ex-Google SRE turned product engineer; led launch of 2 0→1 products." },
  { full_name: "Divya Rao",         email: "divya.rao@demo.adika.ai",        experience_level: "senior",  education: "B.Tech — IIT Kanpur",           stage: "offer",     role: "Backend Engineer",            match_score: 90, interview_score: 87, skills: ["Go","Kafka","PostgreSQL","K8s","gRPC"], summary: "Staff backend engineer at PhonePe; sub-50ms payment authorisation paths." },

  // Hired (Accepted) — 2
  { full_name: "Nikhil Bansal",     email: "nikhil.bansal@demo.adika.ai",    experience_level: "senior",  education: "B.Tech CSE — IIT Roorkee",      stage: "hired",     role: "Senior Full-Stack Engineer", match_score: 96, interview_score: 94, skills: ["TypeScript","React","Node.js","PostgreSQL","Redis"], summary: "Joined Adika Labs as founding engineer; ex-Razorpay senior." },
  { full_name: "Ritika Saxena",     email: "ritika.saxena@demo.adika.ai",    experience_level: "mid",     education: "B.E IT — DJSCE Mumbai",         stage: "hired",     role: "Frontend Engineer",           match_score: 89, interview_score: 85, skills: ["React","TypeScript","Tailwind","Figma"], summary: "Design-engineer hybrid; built component library for 40+ products at Browserstack." },

  // Rejected — 2
  { full_name: "Suresh Pawar",      email: "suresh.pawar@demo.adika.ai",     experience_level: "junior",  education: "B.E CSE — PICT Pune",           stage: "rejected",  role: "Senior Full-Stack Engineer", match_score: 54, interview_score: 41, skills: ["JavaScript","HTML","CSS","jQuery"], summary: "Web developer at agency; legacy stack, limited systems exposure." },
  { full_name: "Kavya Bhat",        email: "kavya.bhat@demo.adika.ai",       experience_level: "fresher", education: "B.Tech — VIT Vellore",          stage: "rejected",  role: "Backend Engineer",            match_score: 48, interview_score: 38, skills: ["Python","Flask","SQLite"], summary: "Fresh grad; only academic projects, no production exposure yet." },
];

function makeResumeContent(c: typeof PIPELINE_CANDIDATES[number]) {
  return {
    summary: c.summary,
    skills: c.skills,
    experience: [
      { company: "Previous Co.", role: c.role, duration: "2023 – Present", bullets: [
        "Owned end-to-end delivery of core product surface.",
        "Improved core metric by 30%+ via focused refactors.",
        "Mentored 2 junior engineers; ran weekly design reviews.",
      ]},
    ],
    education: [{ school: c.education.split("—")[1]?.trim() ?? c.education, degree: c.education.split("—")[0]?.trim() ?? "B.Tech", year: "2018 – 2022", gpa: "8.6/10" }],
  };
}

export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const results: Array<{ email: string; status: string }> = [];

  // List users once
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const byEmail = new Map<string, string>();
  for (const u of existing?.users ?? []) if (u.email) byEmail.set(u.email.toLowerCase(), u.id);

  async function upsertAuthUser(email: string, password: string, meta: Record<string, any>): Promise<string | null> {
    const found = byEmail.get(email.toLowerCase());
    if (found) {
      await supabaseAdmin.auth.admin.updateUserById(found, { password, email_confirm: true, user_metadata: meta });
      return found;
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
    if (error || !data.user) return null;
    byEmail.set(email.toLowerCase(), data.user.id);
    return data.user.id;
  }

  let recruiterId: string | null = null;
  let candidateId: string | null = null;

  for (const d of DEMO) {
    const userId = await upsertAuthUser(d.email, d.password, d.meta);
    if (!userId) { results.push({ email: d.email, status: "error" }); continue; }
    if (d.role === "recruiter") recruiterId = userId;
    if (d.role === "candidate") candidateId = userId;
    results.push({ email: d.email, status: "ok" });

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: d.email,
      full_name: d.meta.full_name,
      primary_role: d.role,
      phone: (d.meta as any).phone ?? null,
      education: (d.meta as any).education ?? null,
      experience_level: (d.meta as any).experience_level ?? null,
      company_name: (d.meta as any).company_name ?? null,
      company_size: (d.meta as any).company_size ?? null,
      industry: (d.meta as any).industry ?? null,
      hiring_goals: (d.meta as any).hiring_goals ?? null,
    }, { onConflict: "id" });

    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: d.role }, { onConflict: "user_id,role" });
  }

  // Seed candidate's own resume
  if (candidateId) {
    const { data: existingResume } = await supabaseAdmin
      .from("resumes").select("id").eq("user_id", candidateId).eq("title", "Aditya Andhalkar — Software Engineer").maybeSingle();
    if (!existingResume) {
      await supabaseAdmin.from("resumes").insert({
        user_id: candidateId,
        title: "Aditya Andhalkar — Software Engineer",
        is_primary: true,
        parsed_skills: ["TypeScript","React","Node.js","PostgreSQL","AWS","Python","Docker","Kubernetes","Redis","GraphQL"],
        content: {
          summary: "Final-year CSE student at IIT Bombay with internships at Razorpay and Zomato. Built distributed systems serving 2M+ users.",
          skills: ["TypeScript","React","Node.js","PostgreSQL","AWS","Python","Docker","Kubernetes","Redis","GraphQL"],
          experience: [
            { company: "Razorpay", role: "SWE Intern", duration: "May 2025 – Aug 2025", bullets: ["Cut payment webhook latency 42%.","Idempotency layer handling 8M events/day."] },
            { company: "Zomato",   role: "Backend Intern", duration: "Dec 2024 – Feb 2025", bullets: ["Search ranking in Go (+11% CTR).","Migrated 4 services to Kubernetes."] },
          ],
          education: [{ school: "IIT Bombay", degree: "B.Tech, Computer Science", year: "2022 – 2026", gpa: "9.1/10" }],
        },
        ats_score: 82,
        role_target: "Software Engineer",
        targeted_feedback: {
          role: "Software Engineer", company: "Stripe", fit_score: 84,
          verdict: "Strong fit — emphasize distributed-systems work and quantified impact.",
          plus_points: ["Payments domain (Razorpay) maps to Stripe.","Quantified outcomes.","Top-tier CS program."],
          drawbacks: [
            { severity: "medium", point: "Missing public system-design writeup." },
            { severity: "low", point: "GraphQL listed but no shipped project." },
          ],
          action_plan: ["Publish 1 system-design teardown.","Add a GraphQL side project.","Mirror JD keywords.","Link to OSS PRs."],
        },
      });
    }
  }

  // Recruiter: seed 3 jobs
  const JOBS: Array<{ title: string; skills: string[]; description: string; seniority: string; salary_min: number; salary_max: number }> = [
    { title: "Senior Full-Stack Engineer", seniority: "senior", salary_min: 3500000, salary_max: 6500000, skills: ["TypeScript","React","Node.js","PostgreSQL","LLM","AWS"], description: "Own the candidate-facing intelligence layer end-to-end." },
    { title: "Backend Engineer",            seniority: "mid",    salary_min: 2200000, salary_max: 4200000, skills: ["Go","PostgreSQL","Kafka","gRPC","Kubernetes"],          description: "Build the high-throughput matching and event pipelines." },
    { title: "Frontend Engineer",           seniority: "mid",    salary_min: 2000000, salary_max: 3800000, skills: ["React","TypeScript","Tailwind","Vite","Playwright"],   description: "Polish the candidate + recruiter web experiences." },
  ];

  const jobByTitle = new Map<string, string>();
  if (recruiterId) {
    for (const j of JOBS) {
      const { data: row } = await supabaseAdmin.from("jobs").select("id").eq("recruiter_id", recruiterId).eq("title", j.title).maybeSingle();
      if (row) { jobByTitle.set(j.title, row.id); continue; }
      const { data: ins } = await supabaseAdmin.from("jobs").insert({
        recruiter_id: recruiterId, title: j.title, company: "Adika Labs", location: "Bengaluru / Remote",
        employment_type: "Full-time", seniority: j.seniority, salary_min: j.salary_min, salary_max: j.salary_max,
        description: j.description, skills: j.skills, status: "published",
      }).select("id").single();
      if (ins) jobByTitle.set(j.title, ins.id);
    }
  }

  // Seed 16 candidates + applications + interview sessions
  if (recruiterId && jobByTitle.size) {
    for (const c of PIPELINE_CANDIDATES) {
      const cid = await upsertAuthUser(c.email, "Demo@1234", { primary_role: "candidate", full_name: c.full_name, experience_level: c.experience_level, education: c.education });
      if (!cid) continue;
      await supabaseAdmin.from("profiles").upsert({
        id: cid, email: c.email, full_name: c.full_name, primary_role: "candidate",
        education: c.education, experience_level: c.experience_level,
      }, { onConflict: "id" });
      await supabaseAdmin.from("user_roles").upsert({ user_id: cid, role: "candidate" }, { onConflict: "user_id,role" });

      // Resume
      const { data: existingR } = await supabaseAdmin.from("resumes").select("id").eq("user_id", cid).maybeSingle();
      let resumeId = existingR?.id ?? null;
      if (!resumeId) {
        const { data: ins } = await supabaseAdmin.from("resumes").insert({
          user_id: cid, title: `${c.full_name} — ${c.role}`, is_primary: true,
          parsed_skills: c.skills, content: makeResumeContent(c),
          ats_score: Math.min(98, c.match_score + 4),
        }).select("id").single();
        resumeId = ins?.id ?? null;
      }

      const jobId = jobByTitle.get(c.role);
      if (!jobId) continue;

      // Application
      const { data: existingApp } = await supabaseAdmin.from("applications").select("id").eq("job_id", jobId).eq("candidate_id", cid).maybeSingle();
      if (!existingApp) {
        await supabaseAdmin.from("applications").insert({
          job_id: jobId, candidate_id: cid, resume_id: resumeId, match_score: c.match_score, stage: c.stage,
          cover_note: `Excited about ${c.role} at Adika Labs.`,
        });
      } else {
        await supabaseAdmin.from("applications").update({ stage: c.stage, match_score: c.match_score, resume_id: resumeId }).eq("id", existingApp.id);
      }

      // Interview session if applicable
      if (c.interview_score != null) {
        const { data: existingSess } = await supabaseAdmin.from("interview_sessions").select("id").eq("candidate_id", cid).eq("job_id", jobId).maybeSingle();
        if (!existingSess) {
          await supabaseAdmin.from("interview_sessions").insert({
            candidate_id: cid, job_id: jobId, role_target: c.role, difficulty: "mid",
            status: "completed", question_count: 10, overall_score: c.interview_score, readiness_score: c.interview_score,
            company: "Adika Labs", experience_level: c.experience_level,
            summary: `Completed 10-question interview. Overall ${c.interview_score}/100.`,
            strengths: c.skills.slice(0, 3), gaps: c.match_score < 70 ? ["system design","scale"] : ["minor: domain depth"],
          });
        } else {
          await supabaseAdmin.from("interview_sessions").update({ overall_score: c.interview_score, readiness_score: c.interview_score, status: "completed" }).eq("id", existingSess.id);
        }
      }
    }
  }

  return { results, jobs: Array.from(jobByTitle.keys()), candidates: PIPELINE_CANDIDATES.length };
});
