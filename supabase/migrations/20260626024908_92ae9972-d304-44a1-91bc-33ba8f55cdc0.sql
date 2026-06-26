ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS role_target text,
  ADD COLUMN IF NOT EXISTS targeted_feedback jsonb;

ALTER TABLE public.learning_items
  ADD COLUMN IF NOT EXISTS roadmap jsonb;