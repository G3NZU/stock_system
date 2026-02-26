-- Break any remaining recursion by removing helper-function calls from projects policies

drop policy if exists "Projects: site-owner insert" on public.projects;
drop policy if exists "Projects: site-owner update" on public.projects;
drop policy if exists "Projects: site-owner delete" on public.projects;

-- Insert: only if the authenticated user owns the site
create policy "Projects: site-owner insert (inline)"
on public.projects
for insert
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.sites s
    where s.id = projects.site_id
      and s.owner_id = auth.uid()
  )
);

-- Update/Delete: only if the authenticated user owns the site
create policy "Projects: site-owner update (inline)"
on public.projects
for update
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.sites s
    where s.id = projects.site_id
      and s.owner_id = auth.uid()
  )
)
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.sites s
    where s.id = projects.site_id
      and s.owner_id = auth.uid()
  )
);

create policy "Projects: site-owner delete (inline)"
on public.projects
for delete
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.sites s
    where s.id = projects.site_id
      and s.owner_id = auth.uid()
  )
);