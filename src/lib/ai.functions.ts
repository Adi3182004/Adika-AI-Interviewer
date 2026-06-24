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
    const { data: resume, error } = await supabase
      .from("resumes").select("*").eq("id", data.resumeId).eq("user_id", userId).single();
    if (error || !resume) throw new Error("Resume not found");

    const { output } = await generateText({
      model: gateway(),
      output: Output.object({
        schema: z.object({
          ats_score: z.number().min(0).max(100),
          parsed_skills: z.array(z.string()),
          feedback: z.object({
            summary: z.string(),
            sections: z.array(z.object({
              name: z.string(),
              score: z.number().min(0).max(100),
              tip: z.string(),
            })),
          }),
        }),
      }),
      prompt: `You are an ATS auditor. Analyze this resume JSON and return an ATS score (0-100), extracted skills (lowercase, deduped), and per-section feedback.\n\nRESUME:\n${JSON.stringify(resume.content)}`,
    });

    await supabase.from("resumes").update({
      ats_score: output.ats_score,
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
