-- =========================
-- Break RLS recursion by:
-- 1) removing RLS policies that make project_user_roles / site_members depend on sites/projects
-- 2) managing membership + role assignment via SECURITY DEFINER RPCs
-- =========================

-- ---------- site_members: remove RLS-managed writes
drop policy if exists "Site members: site-owner manage" on public.site_members;

-- Allow reading site_members only to site owner (optional; safe default)
create policy "Site members: owner read"
on public.site_members
for select
using (public.user_is_site_owner(site_id));

-- No insert/update/delete policies => direct writes from client are blocked by RLS.

-- ---------- project_user_roles: remove RLS-managed writes
drop policy if exists "Project roles: site-owner manage" on public.project_user_roles;

-- Allow reading project_user_roles to:
-- - site owner (for admin screens)
-- - the user themselves (so they can know their role)
create policy "Project roles: owner or self read"
on public.project_user_roles
for select
using (
  project_user_roles.user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = project_user_roles.project_id
      and public.user_is_site_owner(p.site_id)
  )
);

-- No insert/update/delete policies => direct writes blocked by RLS.

-- =========================
-- RPC: add_site_member
-- =========================
create or replace function public.add_site_member(
  p_site_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.user_is_site_owner(p_site_id) then
    raise exception 'Permission denied';
  end if;

  insert into public.site_members(site_id, user_id)
  values (p_site_id, p_user_id)
  on conflict (site_id, user_id) do nothing;
end;
$$;

-- =========================
-- RPC: assign_project_role
-- =========================
create or replace function public.assign_project_role(
  p_project_id uuid,
  p_user_id uuid,
  p_role_name text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select site_id into v_site_id
  from public.projects
  where id = p_project_id;

  if v_site_id is null then
    raise exception 'Project not found';
  end if;

  if not public.user_is_site_owner(v_site_id) then
    raise exception 'Permission denied';
  end if;

  select id into v_role_id
  from public.roles
  where name = p_role_name;

  if v_role_id is null then
    raise exception 'Invalid role';
  end if;

  insert into public.project_user_roles(user_id, project_id, role_id, is_active)
  values (p_user_id, p_project_id, v_role_id, true)
  on conflict (user_id, project_id, role_id)
  do update set is_active = true;
end;
$$;

-- Permissions: authenticated can execute these RPCs, anon cannot.
revoke all on function public.add_site_member(uuid, uuid) from anon;
revoke all on function public.assign_project_role(uuid, uuid, text) from anon;

grant execute on function public.add_site_member(uuid, uuid) to authenticated;
grant execute on function public.assign_project_role(uuid, uuid, text) to authenticated;