import { createServerFn } from "@tanstack/react-start";

const DEMO = [
  {
    email: "candidate@adika.ai",
    password: "Demo@1234",
    role: "candidate" as const,
    meta: {
      primary_role: "candidate",
      full_name: "Aarav Sharma",
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
      full_name: "Priya Verma",
      company_name: "Adika Labs",
      company_size: "51-200",
      industry: "AI / SaaS",
      hiring_goals: "Hire 15 engineers in Q3",
    },
  },
];

export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const results: Array<{ email: string; status: string }> = [];

  for (const d of DEMO) {
    // Check if user exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === d.email);

    let userId: string;
    if (found) {
      userId = found.id;
      // Force reset password + confirm email to guarantee login works
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: d.password,
        email_confirm: true,
        user_metadata: d.meta,
      });
      results.push({ email: d.email, status: "updated" });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: d.email,
        password: d.password,
        email_confirm: true,
        user_metadata: d.meta,
      });
      if (error || !data.user) {
        results.push({ email: d.email, status: `error: ${error?.message ?? "unknown"}` });
        continue;
      }
      userId = data.user.id;
      results.push({ email: d.email, status: "created" });
    }

    // Ensure profile exists (trigger should handle, but upsert for safety)
    await supabaseAdmin.from("profiles").upsert(
      {
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
      },
      { onConflict: "id" },
    );

    // Ensure role row
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: d.role }, { onConflict: "user_id,role" });

    // Seed a starter resume for the candidate (idempotent by title)
    if (d.role === "candidate") {
      const { data: existingResume } = await supabaseAdmin
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .eq("title", "Aarav Sharma — Software Engineer")
        .maybeSingle();
      if (!existingResume) {
        await supabaseAdmin.from("resumes").insert({
          user_id: userId,
          title: "Aarav Sharma — Software Engineer",
          is_primary: true,
          parsed_skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Python", "Docker", "Kubernetes", "Redis", "GraphQL"],
          content: {
            summary:
              "Final-year CSE student at IIT Bombay with internships at Razorpay and Zomato. Built distributed systems serving 2M+ users. Open-source contributor to Next.js and tRPC.",
            skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Python", "Docker", "Kubernetes", "Redis", "GraphQL"],
            experience: [
              { company: "Razorpay", role: "SWE Intern", duration: "May 2025 – Aug 2025", bullets: ["Cut payment webhook latency 42% via Redis stream batching.", "Shipped idempotency layer handling 8M events/day."] },
              { company: "Zomato", role: "Backend Intern", duration: "Dec 2024 – Feb 2025", bullets: ["Rewrote search ranking in Go, +11% CTR.", "Owned migration of 4 services to Kubernetes."] },
            ],
            education: [{ school: "IIT Bombay", degree: "B.Tech, Computer Science", year: "2022 – 2026", gpa: "9.1/10" }],
          },
          ats_score: 78,
          role_target: "Software Engineer",
          targeted_feedback: {
            role: "Software Engineer",
            company: "Stripe",
            fit_score: 82,
            verdict: "Strong fit — emphasize distributed systems work and quantified impact.",
            plus_points: [
              "Payments domain experience (Razorpay) maps directly to Stripe.",
              "Quantified outcomes (42% latency, 8M events/day) — recruiter-friendly.",
              "Top-tier CS program with strong GPA.",
            ],
            drawbacks: [
              { severity: "high", point: "No production experience outside internships." },
              { severity: "medium", point: "Missing system-design write-up or RFCs in portfolio." },
              { severity: "low", point: "GraphQL listed but no project demonstrates it." },
            ],
            summary_rewrite:
              "Software engineer with payments-systems internships at Razorpay and Zomato. Shipped infra serving millions of users; comfortable across TypeScript, Go, and Kubernetes.",
            action_plan: [
              "Publish 1 system-design teardown of the Razorpay idempotency layer.",
              "Add a GraphQL side project with subscriptions + auth.",
              "Mirror Stripe job description keywords into the skills line.",
              "Add a link to the open-source PRs on the resume header.",
            ],
          },
        });
      }
    }

    // Seed a starter job for the recruiter (idempotent by title)
    if (d.role === "recruiter") {
      const { data: existingJob } = await supabaseAdmin
        .from("jobs")
        .select("id")
        .eq("recruiter_id", userId)
        .eq("title", "Senior Full-Stack Engineer")
        .maybeSingle();
      if (!existingJob) {
        await supabaseAdmin.from("jobs").insert({
          recruiter_id: userId,
          title: "Senior Full-Stack Engineer",
          company: "Adika Labs",
          location: "Bengaluru / Remote",
          employment_type: "Full-time",
          experience_level: "senior",
          salary_min: 3500000,
          salary_max: 6500000,
          description:
            "Build the candidate-facing intelligence layer of Adika AI. You'll own end-to-end features from React UI to Postgres schema, with a strong focus on AI-augmented workflows.",
          requirements: ["5+ years full-stack", "TypeScript + React", "Postgres + SQL fluency", "Comfort with LLM tooling"],
          skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "LLM", "AWS"],
          status: "open",
        });
      }
    }
  }

  return { results };
});
