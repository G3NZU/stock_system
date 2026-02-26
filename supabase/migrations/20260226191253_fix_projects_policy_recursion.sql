-- Fix infinite recursion: project policies must not rely on functions that read projects.

drop policy if exists "Projects: project-member read" on public.projects;

-- Read rule:
-- - site owner can read all their projects
-- - OR any user with an active project_user_roles row for that project can read it
create policy "Projects: member read (no recursion)"
on public.projects
for select
using (
  public.user_is_site_owner(site_id)
  or exists (
    select 1
    from public.project_user_roles pur
    where pur.project_id = projects.id
      and pur.user_id = auth.uid()
      and pur.is_active = true
  )
);