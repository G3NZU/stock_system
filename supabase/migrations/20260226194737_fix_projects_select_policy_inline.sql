drop policy if exists "Projects: member read (no recursion)" on public.projects;

create policy "Projects: member read (inline)"
on public.projects
for select
using (
  auth.uid() is not null
  and (
    exists (
      select 1
      from public.sites s
      where s.id = projects.site_id
        and s.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_user_roles pur
      where pur.project_id = projects.id
        and pur.user_id = auth.uid()
        and pur.is_active = true
    )
  )
);