
-- 1) Move SECURITY DEFINER helpers out of the public API schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Drop policies that reference the helpers (will recreate with new schema)
DROP POLICY IF EXISTS "members can read their team" ON public.recruiter_teams;
DROP POLICY IF EXISTS "members read invites" ON public.team_invites;
DROP POLICY IF EXISTS "owner creates invites" ON public.team_invites;
DROP POLICY IF EXISTS "owner deletes invites" ON public.team_invites;
DROP POLICY IF EXISTS "owner can add members" ON public.team_members;
DROP POLICY IF EXISTS "owner can remove members" ON public.team_members;
DROP POLICY IF EXISTS "see teammates" ON public.team_members;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_team_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_team_owner(uuid, uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_team_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_team_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_team_owner(uuid, uuid) TO authenticated, service_role;

-- team_recruiter_ids: rebuild as SECURITY INVOKER so it isn't a definer in the public API.
-- RLS on team_members is satisfied via private.is_team_member (security definer, bypasses recursion).
CREATE OR REPLACE FUNCTION public.team_recruiter_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT auth.uid()
  UNION
  SELECT tm2.user_id
  FROM public.team_members tm1
  JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
  WHERE tm1.user_id = auth.uid()
$$;

-- Recreate policies using private.* helpers
CREATE POLICY "members can read their team" ON public.recruiter_teams
  FOR SELECT TO authenticated
  USING (private.is_team_member(id, auth.uid()));

CREATE POLICY "owner creates invites" ON public.team_invites
  FOR INSERT TO authenticated
  WITH CHECK (private.is_team_owner(team_id, auth.uid()) AND invited_by = auth.uid());

CREATE POLICY "owner deletes invites" ON public.team_invites
  FOR DELETE TO authenticated
  USING (private.is_team_owner(team_id, auth.uid()));

-- 2) team_invites token exposure: only owners can read invites (not regular members)
CREATE POLICY "owner reads invites" ON public.team_invites
  FOR SELECT TO authenticated
  USING (private.is_team_owner(team_id, auth.uid()));

CREATE POLICY "see teammates" ON public.team_members
  FOR SELECT TO authenticated
  USING (private.is_team_member(team_id, auth.uid()));

CREATE POLICY "owner can add members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (private.is_team_owner(team_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "owner can remove members" ON public.team_members
  FOR DELETE TO authenticated
  USING (private.is_team_owner(team_id, auth.uid()) OR user_id = auth.uid());

-- 3) Applications: candidates can no longer write recruiter-only fields
DROP POLICY IF EXISTS "candidates manage own applications" ON public.applications;

CREATE POLICY "candidates read own applications" ON public.applications
  FOR SELECT TO authenticated
  USING (auth.uid() = candidate_id);

CREATE POLICY "candidates insert own applications" ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "candidates update own applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "candidates delete own applications" ON public.applications
  FOR DELETE TO authenticated
  USING (auth.uid() = candidate_id);

-- Trigger-based guard: when the modifying user is the candidate (and not the job's recruiter),
-- force recruiter-controlled fields to safe defaults / prior values.
CREATE OR REPLACE FUNCTION public.guard_application_candidate_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_is_recruiter boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.jobs j
    WHERE j.id = NEW.job_id AND j.recruiter_id = auth.uid()
  ) INTO v_is_recruiter;

  IF auth.uid() = NEW.candidate_id AND NOT v_is_recruiter THEN
    IF TG_OP = 'INSERT' THEN
      NEW.match_score := NULL;
      NEW.skill_gaps := '{}'::text[];
      NEW.recruiter_notes := NULL;
      NEW.stage := 'new'::public.application_stage;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.match_score := OLD.match_score;
      NEW.skill_gaps := OLD.skill_gaps;
      NEW.recruiter_notes := OLD.recruiter_notes;
      NEW.stage := OLD.stage;
      NEW.candidate_id := OLD.candidate_id;
      NEW.job_id := OLD.job_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_application_candidate_writes ON public.applications;
CREATE TRIGGER trg_guard_application_candidate_writes
BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_candidate_writes();
