ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS job_description text;