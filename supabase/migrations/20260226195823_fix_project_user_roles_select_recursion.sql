-- Break recursion loop: projects policies read project_user_roles,
-- so project_user_roles policies must NOT read projects.

-- Drop the old SELECT policy (if it exists).
drop policy if exists "Project roles: owner or self read" on public.project_user_roles;

-- Add a new SELECT policy: users can only read their own role rows.
create policy "Project roles: self read"
on public.project_user_roles
for select
using (
  auth.uid() is not null
  and project_user_roles.user_id = auth.uid()
);

-- (Do not add insert/update/delete policies here)
-- Writes should be done via your RPC assign_project_role().