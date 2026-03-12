-- =========================
-- 1) Allow project members to see each other's public profile
--    (needed to display enquiry requestors by email/name)
-- =========================

-- Drop any previous "members see each other" policy to avoid duplicates
drop policy if exists "Users: project members can view each other" on public.users;

create policy "Users: project members can view each other"
on public.users
for select
using (
  -- Users can always see their own profile
  id = auth.uid()
  -- OR: the viewed user shares at least one active project with the viewer
  or exists (
    select 1
    from public.project_user_roles my_pur
    join public.project_user_roles their_pur
      on their_pur.project_id = my_pur.project_id
    where my_pur.user_id  = auth.uid()
      and their_pur.user_id = users.id
      and my_pur.is_active   = true
      and their_pur.is_active = true
  )
  -- OR: the viewer is the site owner (admin sees all members)
  or exists (
    select 1
    from public.project_user_roles pur
    join public.projects p on p.id = pur.project_id
    where pur.user_id = users.id
      and pur.is_active = true
      and public.user_is_site_owner(p.site_id)
  )
);

-- =========================
-- 2) Allow site owners to read ALL project_user_roles for their projects
--    (admin member list)
-- =========================

drop policy if exists "Project roles: owner read all" on public.project_user_roles;

create policy "Project roles: owner read all"
on public.project_user_roles
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_user_roles.project_id
      and public.user_is_site_owner(p.site_id)
  )
);

-- =========================
-- 3) RPC: get_project_members
--    Returns all active members of a project with their email, full name, and role.
--    Restricted to site owners (admins).
-- =========================

create or replace function public.get_project_members(p_project_id uuid)
returns table(
  user_id   uuid,
  email     varchar,
  full_name varchar,
  role_name varchar,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select p.site_id into v_site_id
  from public.projects p
  where p.id = p_project_id;

  if v_site_id is null then
    raise exception 'Project not found';
  end if;

  if not public.user_is_site_owner(v_site_id) then
    raise exception 'Permission denied: only site owners can view project members';
  end if;

  return query
    select
      pur.user_id,
      u.email,
      u.full_name,
      r.name::varchar as role_name,
      pur.is_active
    from public.project_user_roles pur
    join public.users u on u.id = pur.user_id
    join public.roles r on r.id = pur.role_id
    where pur.project_id = p_project_id
      and pur.is_active = true
    order by r.name, u.email;
end;
$$;

revoke all on function public.get_project_members(uuid) from anon;
grant execute on function public.get_project_members(uuid) to authenticated;
