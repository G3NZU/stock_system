-- =========================
-- Fix: Infinite recursion in "projects" RLS
--
-- Root cause: "project_user_roles" SELECT policy "Project roles: owner read all"
-- (added in 20260311000000) contains an inline subquery that reads public.projects.
-- The "projects" SELECT policy in turn reads public.project_user_roles, creating a
-- cycle.  The rule established in 20260226195823 is:
--   project_user_roles policies must NOT read projects (directly or indirectly via RLS).
--
-- The "Project roles: owner read all" policy is also unnecessary because every call
-- that needs to read other users' project_user_roles rows (e.g. get_project_members)
-- is a SECURITY DEFINER function that bypasses RLS entirely.
--
-- Additionally the "Enquiries: scoped read" policy introduced in 20260312000000 also
-- has an inline projects subquery for the site-owner arm.  We replace it with a safe
-- SECURITY DEFINER helper.
-- =========================

-- =========================
-- 1) Safe helper: is the current user the site owner of a given project?
--    SECURITY DEFINER means it runs as the function owner (postgres), bypassing RLS,
--    so it can safely query public.projects without re-entering any policy.
-- =========================
create or replace function public.user_is_project_site_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.projects p
      where p.id = p_project_id
        and public.user_is_site_owner(p.site_id)
    );
$$;

revoke all on function public.user_is_project_site_owner(uuid) from anon;
grant execute on function public.user_is_project_site_owner(uuid) to authenticated;

-- =========================
-- 2) Drop the "Project roles: owner read all" policy that causes the recursion.
--    The only place that needs to read all roles for a project is get_project_members(),
--    which is already SECURITY DEFINER and bypasses RLS — so this policy is not needed.
-- =========================
drop policy if exists "Project roles: owner read all" on public.project_user_roles;

-- =========================
-- 3) Replace the "Enquiries: scoped read" policy (from 20260312000000) with a version
--    that uses the safe SECURITY DEFINER helper for the site-owner arm instead of an
--    inline projects subquery.
-- =========================
drop policy if exists "Enquiries: scoped read" on public.enquiries;

create policy "Enquiries: scoped read"
on public.enquiries
for select
using (
  -- The user who raised the enquiry can always see it
  requested_by = auth.uid()
  -- The role assigned to handle this enquiry can see it
  or public.user_has_project_role(project_id, array[assigned_role])
  -- Project admins can see all enquiries for their project
  or public.user_has_project_role(project_id, array['admin'])
  -- Site owners can see all enquiries across their projects (safe SECURITY DEFINER path)
  or public.user_is_project_site_owner(project_id)
);
