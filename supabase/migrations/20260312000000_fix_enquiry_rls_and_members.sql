-- =========================
-- 1) Enquiries SELECT policy: replace broad "member read" with role-scoped access.
--    Each role can only see enquiries that are relevant to them:
--      - Creator (requested_by) can always see enquiries they raised (to track status).
--      - The assigned role sees enquiries sent to them.
--      - Project admins and site owners see all enquiries.
-- =========================

drop policy if exists "Enquiries: member read" on public.enquiries;

create policy "Enquiries: scoped read"
on public.enquiries
for select
using (
  -- The user who raised the enquiry can always see it
  requested_by = auth.uid()
  -- The role assigned to handle this enquiry can see it
  or public.user_has_project_role(project_id, array[assigned_role])
  -- Project admins can see all enquiries for their projects
  or public.user_has_project_role(project_id, array['admin'])
  -- Site owners can see all enquiries across their projects
  or exists (
    select 1
    from public.projects p
    where p.id = enquiries.project_id
      and public.user_is_site_owner(p.site_id)
  )
);

-- =========================
-- 2) get_project_members: extend permission check to also accept users who hold
--    the 'admin' project role, not just the site owner.
--    (A user assigned the admin role in project_user_roles should have the same
--    visibility as the site owner for member-listing purposes.)
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

  -- Allow site owners OR users with the 'admin' project role
  if not (
    public.user_is_site_owner(v_site_id)
    or public.user_has_project_role(p_project_id, array['admin'])
  ) then
    raise exception 'Permission denied: only site owners or project admins can view project members';
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
