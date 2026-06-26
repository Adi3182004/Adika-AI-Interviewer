
-- TEAMS
create table public.recruiter_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.recruiter_teams to authenticated;
grant all on public.recruiter_teams to service_role;
alter table public.recruiter_teams enable row level security;

-- TEAM MEMBERS
create table public.team_members (
  team_id uuid not null references public.recruiter_teams(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
grant select, insert, update, delete on public.team_members to authenticated;
grant all on public.team_members to service_role;
alter table public.team_members enable row level security;

-- INVITES
create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.recruiter_teams(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null unique,
  invited_by uuid not null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.team_invites to authenticated;
grant all on public.team_invites to service_role;
alter table public.team_invites enable row level security;

-- HELPERS (SECURITY DEFINER to avoid recursive RLS on team_members)
create or replace function public.is_team_member(_team uuid, _user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.team_members where team_id = _team and user_id = _user)
$$;

create or replace function public.is_team_owner(_team uuid, _user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.recruiter_teams where id = _team and owner_id = _user)
$$;

-- Returns the set of recruiter user_ids visible to the current user (self + teammates).
create or replace function public.team_recruiter_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select auth.uid()
  union
  select tm2.user_id
  from public.team_members tm1
  join public.team_members tm2 on tm1.team_id = tm2.team_id
  where tm1.user_id = auth.uid()
$$;

-- POLICIES
create policy "members can read their team" on public.recruiter_teams
  for select to authenticated using (public.is_team_member(id, auth.uid()));
create policy "anyone can create a team they own" on public.recruiter_teams
  for insert to authenticated with check (owner_id = auth.uid());
create policy "owners can update team" on public.recruiter_teams
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners can delete team" on public.recruiter_teams
  for delete to authenticated using (owner_id = auth.uid());

create policy "see teammates" on public.team_members
  for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "owner can add members" on public.team_members
  for insert to authenticated with check (public.is_team_owner(team_id, auth.uid()) or user_id = auth.uid());
create policy "owner can remove members" on public.team_members
  for delete to authenticated using (public.is_team_owner(team_id, auth.uid()) or user_id = auth.uid());

create policy "members read invites" on public.team_invites
  for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "owner creates invites" on public.team_invites
  for insert to authenticated with check (public.is_team_owner(team_id, auth.uid()) and invited_by = auth.uid());
create policy "owner deletes invites" on public.team_invites
  for delete to authenticated using (public.is_team_owner(team_id, auth.uid()));
