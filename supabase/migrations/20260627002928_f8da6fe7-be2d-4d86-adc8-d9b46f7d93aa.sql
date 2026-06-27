
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger: notify recruiter when a new application arrives
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_recruiter UUID; v_title TEXT;
BEGIN
  SELECT recruiter_id, title INTO v_recruiter, v_title FROM public.jobs WHERE id = NEW.job_id;
  IF v_recruiter IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link)
    VALUES (v_recruiter, 'application', 'New applicant', 'A candidate applied to ' || COALESCE(v_title,'your job'), '/recruiter/pipeline');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_application AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- Trigger: notify candidate when application stage changes
CREATE OR REPLACE FUNCTION public.notify_application_stage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_title TEXT;
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    SELECT title INTO v_title FROM public.jobs WHERE id = NEW.job_id;
    INSERT INTO public.notifications(user_id, kind, title, body, link)
    VALUES (NEW.candidate_id, 'stage', 'Application moved to ' || NEW.stage::text,
      'Your application for ' || COALESCE(v_title,'a role') || ' is now in ' || NEW.stage::text,
      '/candidate/jobs');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_application_stage AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_stage();
