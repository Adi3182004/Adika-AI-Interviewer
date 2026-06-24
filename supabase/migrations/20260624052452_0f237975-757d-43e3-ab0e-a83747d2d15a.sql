
-- Application stage enum
DO $$ BEGIN
  CREATE TYPE public.application_stage AS ENUM ('new','screen','interview','offer','hired','rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.interview_status AS ENUM ('in_progress','completed','abandoned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('draft','published','closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ RESUMES ============
CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'My Resume',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  parsed_skills text[] NOT NULL DEFAULT '{}',
  ats_score int,
  ats_feedback jsonb,
  file_url text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates manage own resumes" ON public.resumes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_resumes_updated BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ JOBS ============
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text,
  location text,
  employment_type text,
  seniority text,
  salary_min int,
  salary_max int,
  description text,
  skills text[] NOT NULL DEFAULT '{}',
  status public.job_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads published jobs" ON public.jobs
  FOR SELECT USING (status = 'published' OR auth.uid() = recruiter_id);
CREATE POLICY "recruiters insert own jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "recruiters update own jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "recruiters delete own jobs" ON public.jobs
  FOR DELETE TO authenticated USING (auth.uid() = recruiter_id);
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_jobs_recruiter ON public.jobs(recruiter_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);

-- ============ APPLICATIONS ============
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  match_score int,
  skill_gaps text[] DEFAULT '{}',
  stage public.application_stage NOT NULL DEFAULT 'new',
  cover_note text,
  recruiter_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates manage own applications" ON public.applications
  FOR ALL TO authenticated USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "recruiters view applications to own jobs" ON public.applications
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.recruiter_id = auth.uid()));
CREATE POLICY "recruiters update applications to own jobs" ON public.applications
  FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.recruiter_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.recruiter_id = auth.uid()));
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);

-- ============ INTERVIEW SESSIONS ============
CREATE TABLE public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  role_target text NOT NULL,
  difficulty text NOT NULL DEFAULT 'mid',
  status public.interview_status NOT NULL DEFAULT 'in_progress',
  question_count int NOT NULL DEFAULT 0,
  overall_score int,
  readiness_score int,
  strengths text[],
  gaps text[],
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
GRANT ALL ON public.interview_sessions TO service_role;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates manage own interview sessions" ON public.interview_sessions
  FOR ALL TO authenticated USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "recruiters view sessions tied to own jobs" ON public.interview_sessions
  FOR SELECT TO authenticated USING (job_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.recruiter_id = auth.uid()));
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INTERVIEW MESSAGES ============
CREATE TABLE public.interview_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('assistant','user','system')),
  content text NOT NULL,
  score int,
  signals jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_messages TO authenticated;
GRANT ALL ON public.interview_messages TO service_role;
ALTER TABLE public.interview_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates manage own session messages" ON public.interview_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.candidate_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.interview_sessions s WHERE s.id = session_id AND s.candidate_id = auth.uid()));
CREATE POLICY "recruiters view session messages tied to own jobs" ON public.interview_messages
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.interview_sessions s JOIN public.jobs j ON j.id = s.job_id
    WHERE s.id = session_id AND j.recruiter_id = auth.uid()
  ));
CREATE INDEX idx_messages_session ON public.interview_messages(session_id);

-- ============ SAVED CANDIDATES ============
CREATE TABLE public.saved_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recruiter_id, candidate_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_candidates TO authenticated;
GRANT ALL ON public.saved_candidates TO service_role;
ALTER TABLE public.saved_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruiters manage own shortlist" ON public.saved_candidates
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);

-- ============ LEARNING ITEMS ============
CREATE TABLE public.learning_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  resource_url text,
  source_session_id uuid REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_items TO authenticated;
GRANT ALL ON public.learning_items TO service_role;
ALTER TABLE public.learning_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates manage own learning" ON public.learning_items
  FOR ALL TO authenticated USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
CREATE TRIGGER trg_learning_updated BEFORE UPDATE ON public.learning_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Allow recruiters to see candidate profiles tied to their jobs ============
CREATE POLICY "recruiters view applicant profiles" ON public.profiles
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = profiles.id AND j.recruiter_id = auth.uid()
  ));
