import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(MODEL);
}

// ------------- RESUME ANALYSIS -------------
export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ resumeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { data: resume, error } = await supabase
      .from("resumes").select("*").eq("id", data.resumeId).eq("user_id", userId).single();
    if (error || !resume) throw new Error("Resume not found");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: "user",
          content: `You are an ATS auditor. Score this resume (0-100), extract skills (lowercase, deduped), and give per-section feedback for Summary, Experience, Education, Skills, Projects. Return JSON only.\n\nRESUME:\n${JSON.stringify(resume.content)}`,
        }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ats", strict: true,
            schema: {
              type: "object", additionalProperties: false,
              required: ["ats_score", "parsed_skills", "feedback"],
              properties: {
                ats_score: { type: "number" },
                parsed_skills: { type: "array", items: { type: "string" } },
                feedback: {
                  type: "object", additionalProperties: false,
                  required: ["summary", "sections"],
                  properties: {
                    summary: { type: "string" },
                    sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["name","score","tip"], properties: { name: { type: "string" }, score: { type: "number" }, tip: { type: "string" } } } },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`ATS analysis failed [${res.status}]`);
    const json = await res.json();
    const output = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");

    await supabase.from("resumes").update({
      ats_score: Math.round(Number(output.ats_score) || 0),
      parsed_skills: output.parsed_skills,
      ats_feedback: output.feedback,
    }).eq("id", data.resumeId);

    return output;
  });

// ------------- IMPROVE RESUME SECTION -------------
export const improveResumeSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    section: z.string(),
    current: z.string(),
    role: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { text } = await generateText({
      model: gateway(),
      prompt: `Rewrite this resume "${data.section}" section to be ATS-friendly, concise, and impact-driven${data.role ? ` for a ${data.role} role` : ""}. Use strong verbs and metrics. Return ONLY the rewritten text, no preamble.\n\n---\n${data.current}`,
    });
    return { improved: text.trim() };
  });

// ------------- MATCH JOB -------------
export const matchJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    jobId: z.string().uuid(),
    resumeId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: job }, { data: resume }] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", data.jobId).single(),
      supabase.from("resumes").select("*").eq("id", data.resumeId).eq("user_id", userId).single(),
    ]);
    if (!job || !resume) throw new Error("Not found");

    const { output } = await generateText({
      model: gateway(),
      output: Output.object({
        schema: z.object({
          match_score: z.number().min(0).max(100),
          skill_gaps: z.array(z.string()),
          strengths: z.array(z.string()),
          recommendation: z.string(),
        }),
      }),
      prompt: `Score the candidate's fit for this job 0-100, list missing skills (skill_gaps) and matching strengths.\n\nJOB: ${job.title} — required skills: ${(job.skills || []).join(", ")}\nJD: ${job.description ?? ""}\n\nCANDIDATE SKILLS: ${(resume.parsed_skills || []).join(", ")}\nRESUME: ${JSON.stringify(resume.content).slice(0, 4000)}`,
    });
    return output;
  });

// ------------- INTERVIEW: NEXT TURN -------------
export const interviewTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    sessionId: z.string().uuid(),
    userAnswer: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions").select("*").eq("id", data.sessionId).eq("candidate_id", userId).single();
    if (!session) throw new Error("Session not found");

    const { data: messages } = await supabase
      .from("interview_messages").select("*").eq("session_id", data.sessionId).order("created_at");

    // Save user message + score it
    let userScore: number | null = null;
    if (data.userAnswer) {
      const { output: ev } = await generateText({
        model: gateway(),
        output: Output.object({
          schema: z.object({
            score: z.number().min(0).max(100),
            signals: z.object({
              clarity: z.number().min(0).max(100),
              technical: z.number().min(0).max(100),
              depth: z.number().min(0).max(100),
            }),
            feedback: z.string(),
          }),
        }),
        prompt: `Evaluate this interview answer for a ${session.role_target} (${session.difficulty}) candidate.\nQUESTION: ${[...(messages ?? [])].reverse().find((m: { role: string }) => m.role === "assistant")?.content ?? ""}\nANSWER: ${data.userAnswer}`,
      });
      userScore = ev.score;
      await supabase.from("interview_messages").insert({
        session_id: data.sessionId, role: "user", content: data.userAnswer, score: ev.score, signals: ev.signals,
      });
    }

    const turnCount = (session.question_count ?? 0) + (data.userAnswer ? 1 : 0);
    const MAX_QUESTIONS = 6;
    const isFinal = turnCount >= MAX_QUESTIONS;

    if (isFinal) {
      const { data: allMsgs } = await supabase
        .from("interview_messages").select("*").eq("session_id", data.sessionId).order("created_at");
      const { output: fin } = await generateText({
        model: gateway(),
        output: Output.object({
          schema: z.object({
            overall_score: z.number().min(0).max(100),
            readiness_score: z.number().min(0).max(100),
            strengths: z.array(z.string()),
            gaps: z.array(z.string()),
            summary: z.string(),
          }),
        }),
        prompt: `Summarize this ${session.role_target} interview. Return overall_score (avg of answer scores), readiness_score, strengths, gaps (skills to study), and a 3-sentence summary.\n\nTRANSCRIPT:\n${(allMsgs || []).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}`,
      });
      await supabase.from("interview_sessions").update({
        status: "completed",
        question_count: turnCount,
        overall_score: fin.overall_score,
        readiness_score: fin.readiness_score,
        strengths: fin.strengths,
        gaps: fin.gaps,
        summary: fin.summary,
      }).eq("id", data.sessionId);
      // Seed learning items from gaps
      if (fin.gaps?.length) {
        await supabase.from("learning_items").insert(
          fin.gaps.slice(0, 8).map(skill => ({
            candidate_id: userId, skill, source_session_id: data.sessionId, status: "todo",
          })),
        );
      }
      return { done: true, final: fin, userScore };
    }

    // Generate next question
    const transcript = (messages || []).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const { text: nextQ } = await generateText({
      model: gateway(),
      prompt: `You are an adaptive interviewer for a ${session.difficulty} ${session.role_target}. Based on the transcript, ask ONE next question that probes the candidate's weak areas. Return only the question.\n\nTRANSCRIPT SO FAR:\n${transcript}${data.userAnswer ? `\nUSER: ${data.userAnswer}` : ""}`,
    });
    await supabase.from("interview_messages").insert({
      session_id: data.sessionId, role: "assistant", content: nextQ.trim(),
    });
    await supabase.from("interview_sessions").update({ question_count: turnCount }).eq("id", data.sessionId);

    return { done: false, question: nextQ.trim(), userScore };
  });

// ------------- RECRUITER: CANDIDATE SUMMARY -------------
export const summarizeCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: app } = await supabase
      .from("applications")
      .select("*, resumes(*), profiles!applications_candidate_id_fkey(*), jobs!inner(title, recruiter_id, skills)")
      .eq("id", data.applicationId).single();
    if (!app) throw new Error("Application not found");
    const { text } = await generateText({
      model: gateway(),
      prompt: `Write a 4-sentence recruiter brief for this candidate. Cover fit, top strengths, risks, and a recommended next step.\n\nROLE: ${(app as any).jobs?.title}\nMATCH: ${app.match_score}\nGAPS: ${(app.skill_gaps || []).join(", ")}\nRESUME: ${JSON.stringify((app as any).resumes?.content ?? {}).slice(0, 3000)}`,
    });
    return { summary: text.trim() };
  });

// ------------- UPLOAD & PARSE RESUME (PDF/DOCX/TXT base64 data URL) -------------
const ResumeContentSchema = z.object({
  summary: z.string(),
  experience: z.array(z.object({ company: z.string(), role: z.string(), period: z.string(), bullets: z.string() })),
  education: z.array(z.object({ school: z.string(), degree: z.string(), year: z.string() })),
  skills: z.array(z.string()),
  projects: z.array(z.object({ name: z.string(), description: z.string() })),
});

export const uploadAndParseResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1).max(120),
    fileName: z.string(),
    fileType: z.string(),
    fileDataUrl: z.string().startsWith("data:"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Call gateway directly to send file content block
    const isText = data.fileType.startsWith("text/") || data.fileName.toLowerCase().endsWith(".txt");
    const isImage = data.fileType.startsWith("image/");

    const userContent: any[] = [
      { type: "text", text: "Extract this resume into clean structured JSON. Use empty strings/arrays for missing fields. For experience.bullets, join achievement lines with newlines." },
    ];
    if (isText) {
      // decode base64 text
      const b64 = data.fileDataUrl.split(",")[1] ?? "";
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      userContent[0].text += `\n\nRESUME TEXT:\n${decoded.slice(0, 30000)}`;
    } else if (isImage) {
      userContent.push({ type: "image_url", image_url: { url: data.fileDataUrl } });
    } else {
      userContent.push({ type: "file", file: { filename: data.fileName, file_data: data.fileDataUrl } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: userContent }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "resume",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "experience", "education", "skills", "projects"],
              properties: {
                summary: { type: "string" },
                experience: { type: "array", items: { type: "object", additionalProperties: false, required: ["company","role","period","bullets"], properties: { company: { type: "string" }, role: { type: "string" }, period: { type: "string" }, bullets: { type: "string" } } } },
                education: { type: "array", items: { type: "object", additionalProperties: false, required: ["school","degree","year"], properties: { school: { type: "string" }, degree: { type: "string" }, year: { type: "string" } } } },
                skills: { type: "array", items: { type: "string" } },
                projects: { type: "array", items: { type: "object", additionalProperties: false, required: ["name","description"], properties: { name: { type: "string" }, description: { type: "string" } } } },
              },
            },
          },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Parse failed [${res.status}]: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = ResumeContentSchema.parse(JSON.parse(raw));

    const { data: existing } = await supabase.from("resumes").select("id").eq("user_id", userId);
    const { data: inserted, error: insErr } = await supabase.from("resumes").insert({
      user_id: userId,
      title: data.title,
      content: parsed as any,
      parsed_skills: parsed.skills.map(s => s.toLowerCase()),
      is_primary: !(existing && existing.length),
    }).select().single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "Insert failed");

    // Auto-run ATS analysis so the candidate immediately sees a score
    try {
      const atsRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "user",
            content: `You are an ATS auditor. Score this resume (0-100), extract skills (lowercase, deduped), and give per-section feedback for Summary, Experience, Education, Skills, Projects. Return JSON only.\n\nRESUME:\n${JSON.stringify(parsed)}`,
          }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ats", strict: true,
              schema: {
                type: "object", additionalProperties: false,
                required: ["ats_score", "parsed_skills", "feedback"],
                properties: {
                  ats_score: { type: "number" },
                  parsed_skills: { type: "array", items: { type: "string" } },
                  feedback: {
                    type: "object", additionalProperties: false,
                    required: ["summary", "sections"],
                    properties: {
                      summary: { type: "string" },
                      sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["name","score","tip"], properties: { name: { type: "string" }, score: { type: "number" }, tip: { type: "string" } } } },
                    },
                  },
                },
              },
            },
          },
        }),
      });
      if (atsRes.ok) {
        const aj = await atsRes.json();
        const atsRaw = aj.choices?.[0]?.message?.content ?? "{}";
        const ats = JSON.parse(atsRaw);
        await supabase.from("resumes").update({
          ats_score: Math.round(Number(ats.ats_score) || 0),
          parsed_skills: Array.isArray(ats.parsed_skills) ? ats.parsed_skills : parsed.skills.map(s => s.toLowerCase()),
          ats_feedback: ats.feedback,
        }).eq("id", inserted.id);
      }
    } catch (e) {
      console.error("ATS auto-analysis failed", e);
    }

    return { resumeId: inserted.id };
  });

// ------------- ROLE-TARGETED ANALYSIS (plus points / drawbacks) -------------
export const analyzeResumeForRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    resumeId: z.string().uuid(),
    role: z.string().min(2).max(120),
    company: z.string().max(120).optional(),
    experienceLevel: z.string().min(1).max(60),
    jobDescription: z.string().max(8000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: resume } = await supabase.from("resumes").select("*").eq("id", data.resumeId).eq("user_id", userId).single();
    if (!resume) throw new Error("Resume not found");

    const FeedbackSchema = z.object({
      role_fit_score: z.number().min(0).max(100),
      verdict: z.string(),
      plus_points: z.array(z.object({ title: z.string(), detail: z.string() })),
      drawbacks: z.array(z.object({ title: z.string(), detail: z.string(), severity: z.enum(["low","medium","high"]) })),
      missing_skills: z.array(z.string()),
      action_items: z.array(z.string()),
      tailored_summary: z.string(),
    });

    const { text } = await generateText({
      model: gateway(),
      prompt: `You are a senior tech recruiter coaching a STUDENT/early-career candidate. Analyze this resume for the specific target role and produce honest, role-specific plus points and drawbacks.\n\nTARGET ROLE: ${data.role}\nTARGET COMPANY: ${data.company ?? "(any)"}\nCANDIDATE EXPERIENCE LEVEL: ${data.experienceLevel}\nJOB DESCRIPTION:\n${data.jobDescription ?? "(none provided — infer industry-standard expectations for the role)"}\n\nRESUME:\n${JSON.stringify(resume.content).slice(0, 6000)}\n\nReturn ONLY a JSON object (no markdown, no commentary) with EXACTLY this shape:\n{\n  "role_fit_score": number 0-100,\n  "verdict": "one sentence",\n  "plus_points": [{ "title": string, "detail": string }, ... 3-5 items],\n  "drawbacks": [{ "title": string, "detail": string, "severity": "low"|"medium"|"high" }, ... 3-6 items],\n  "missing_skills": [lowercase skill strings],\n  "action_items": [4-6 concrete 30-day actions],\n  "tailored_summary": "one rewritten resume summary"\n}`,
    });

    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.search(/[\{]/);
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("AI did not return JSON");
    const output = FeedbackSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));

    await supabase.from("resumes").update({
      role_target: data.role,
      targeted_feedback: { ...output, company: data.company, experience_level: data.experienceLevel, generated_at: new Date().toISOString() } as any,
    }).eq("id", data.resumeId);

    // Seed missing skills into learning items
    if (output.missing_skills?.length) {
      const existing = await supabase.from("learning_items").select("skill").eq("candidate_id", userId);
      const have = new Set((existing.data ?? []).map(r => r.skill.toLowerCase()));
      const toInsert = output.missing_skills.filter(s => !have.has(s.toLowerCase())).slice(0, 6);
      if (toInsert.length) {
        await supabase.from("learning_items").insert(toInsert.map(skill => ({ candidate_id: userId, skill, status: "todo" })));
      }
    }

    return output;
  });

// ------------- LEARNING ROADMAP -------------
export const generateLearningRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: item } = await supabase.from("learning_items").select("*").eq("id", data.itemId).eq("candidate_id", userId).single();
    if (!item) throw new Error("Item not found");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const RoadmapSchema = z.object({
      skill: z.string(),
      overview: z.string(),
      estimated_weeks: z.number(),
      total_days: z.number().optional(),
      hours_per_week: z.string().optional(),
      difficulty: z.string().optional(),
      prerequisites: z.array(z.string()),
      phases: z.array(z.object({
        week_range: z.string(),
        day_range: z.string().optional(),
        duration_days: z.number().optional(),
        time_commitment: z.string().optional(),
        title: z.string(),
        goals: z.array(z.string()),
        topics: z.array(z.string()),
        daily_plan: z.array(z.object({
          day: z.string(),
          focus: z.string(),
          time: z.string().optional(),
        })).optional(),
        project: z.string(),
        project_time: z.string().optional(),
        resources: z.array(z.object({ name: z.string(), type: z.string(), url: z.string().optional(), time: z.string().optional() })),
      })),
      milestones: z.array(z.string()),
      final_capstone: z.string(),
      capstone_time: z.string().optional(),
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: "user",
          content: `Build a STUDENT-FRIENDLY, time-explicit week-by-week learning roadmap to master "${item.skill}" from scratch to job-ready. Assume ~10-15 hours/week. Make timing crystal clear: total days, days per phase, a daily breakdown (e.g. "Day 1-2: ...", "Day 3: ..."), and time estimates on each project/resource (e.g. "~4 hours", "2 days"). 3-5 phases. Resource type must be one of: course, docs, book, video, article, practice. Return ONLY JSON:\n{\n  "skill": string,\n  "overview": string (2-3 sentences, beginner friendly),\n  "estimated_weeks": number,\n  "total_days": number,\n  "hours_per_week": string e.g. "10-12 hrs/week",\n  "difficulty": "Beginner"|"Intermediate"|"Advanced",\n  "prerequisites": [string],\n  "phases": [{\n    "week_range": string e.g. "Week 1-2",\n    "day_range": string e.g. "Day 1-14",\n    "duration_days": number,\n    "time_commitment": string e.g. "~20 hours total",\n    "title": string,\n    "goals": [string],\n    "topics": [string],\n    "daily_plan": [{ "day": string e.g. "Day 1-2", "focus": string, "time": string e.g. "3 hrs" }],\n    "project": string,\n    "project_time": string e.g. "~6 hours",\n    "resources": [{ "name": string, "type": string, "url": string, "time": string e.g. "2 hrs" }]\n  }],\n  "milestones": [string],\n  "final_capstone": string,\n  "capstone_time": string e.g. "1 week (~15 hours)"\n}`,
        }],
      }),
    });
    if (!res.ok) throw new Error(`Roadmap failed [${res.status}]`);
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.search(/[\{]/);
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("AI did not return JSON");
    const output = RoadmapSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));

    await supabase.from("learning_items").update({ roadmap: output as any }).eq("id", data.itemId);
    return output;
  });
