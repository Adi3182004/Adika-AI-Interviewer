# Adika AI — Full Ecosystem Build Plan

Building the complete two-portal hiring platform on top of the foundation already in place (landing, auth, light mint candidate shell, dark crystal+gold recruiter shell, profiles + roles tables).

## Phase 1 — Data Layer (one migration)

Add the schema for everything below in a single migration with GRANTs + RLS:

- `resumes` — user_id, title, content (jsonb), ats_score, parsed_skills, file_url, updated_at
- `jobs` — recruiter_id, title, company, location, employment_type, description, skills (text[]), seniority, salary_range, status, created_at
- `applications` — job_id, candidate_id, resume_id, match_score, stage (enum: new/screen/interview/offer/hired/rejected), notes
- `interview_sessions` — candidate_id, job_id (nullable), role_target, status, overall_score, readiness_score, transcript (jsonb), created_at
- `interview_messages` — session_id, role (user/assistant), content, score, signals (jsonb), created_at
- `saved_candidates` — recruiter_id, candidate_id, tag
- `learning_items` — candidate_id, skill, status, resource_url
- App role enum already includes admin/recruiter/candidate.

## Phase 2 — Shared UI Shells

- `CandidateShell` — light mint sidebar (Dashboard, Resume, Jobs, Interviews, Learning, Profile) + top bar
- `RecruiterShell` — dark crystal sidebar with gold accents (Dashboard, Jobs, Pipeline, Candidates, Interviews, Analytics, Settings) + top bar
- Both use `shadcn/sidebar` with collapse, active-route highlighting, sign out

## Phase 3 — Candidate Portal Modules

1. **Dashboard** — live KPIs (resume score, readiness, applications, learning)
2. **Resume Library** — list, create, edit (sections: summary, experience, education, skills, projects), AI "Improve with AI" server fn, ATS scoring server fn that returns per-section feedback
3. **Job Matching** — browse public `jobs`, compute match score client-side from candidate's resume skills, apply flow creates `applications`
4. **AI Interviewer** — start session (role + difficulty), live chat UI streaming questions adaptively via Lovable AI, session save, session detail with transcript + scores + replay
5. **Learning Roadmap** — derived from latest interview's gap skills; mark in-progress / done
6. **Profile** — edit `profiles` row

## Phase 4 — Recruiter Pro Modules

1. **Dashboard** — open roles, pipeline counts, recent interviews, top matches (gold accents)
2. **Jobs** — CRUD posting with skills tags + seniority + JD; publish toggles `status`
3. **Pipeline (Kanban)** — drag-style stages (new → screen → interview → offer → hired/rejected) per job; update `applications.stage`
4. **Candidates** — searchable list of all applications across jobs, filters (skill, score, location), detail drawer with resume preview, AI summary, interview replay
5. **Interview Replays** — list of completed sessions; detail = transcript + scoring breakdown + AI insights
6. **Analytics** — funnel chart, avg match, time-to-stage (Recharts)
7. **Settings** — company profile, team (single-user for now)

## Phase 5 — AI Server Functions (Lovable AI, gemini-3-flash-preview)

All in `src/lib/ai.functions.ts`, gated by `requireSupabaseAuth`:

- `analyzeResume({ resumeId })` — returns ATS score, per-section feedback, extracted skills; persists to `resumes`
- `improveResumeSection({ resumeId, section })` — returns rewritten section
- `matchJob({ jobId, resumeId })` — returns match score + skill gaps
- `startInterview({ sessionId, role, difficulty })` — first question
- `nextInterviewTurn({ sessionId, userAnswer })` — adaptive next question + per-answer score + signals; on session end returns overall + readiness + gap skills
- `summarizeCandidate({ candidateId })` — recruiter-side concise profile

Helper: `src/lib/ai-gateway.server.ts`.

## Phase 6 — Public Recruiter Demo

Upgrade existing `/recruiter/demo` to a multi-tab demo (Pipeline, Candidate detail, Interview replay) using rich mock data — no DB writes, no auth.

## Phase 7 — Polish

- Update landing CTAs to point at the new portals
- Loading skeletons, empty states, error boundaries on every route
- Mobile-responsive sidebars
- SEO meta on every route

## Technical notes

- Routes nested under `src/routes/_authenticated/candidate/*` and `_authenticated/recruiter/*` with layout routes for each shell.
- Read shape: `ensureQueryData` + `useSuspenseQuery` in components.
- Mutations: `useServerFn` + `useMutation` invalidating relevant query keys.
- Recruiter visual language: crystal_bg fixed background, `text-gold` for headings/numbers/CTAs, `glass` cards, Instrument Serif display font already wired.
- Candidate visual language: mint mesh, soft glass, teal primary, no gold.

## Execution order

Phase 1 (migration) → Phase 2 (shells) → Phase 5 (AI fns scaffolded) → Phases 3 + 4 module by module → Phase 6 → Phase 7. I'll ship in batched commits and check builds along the way; given the scope this will span several iterations within this session.
