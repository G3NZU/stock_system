-- Add soft-delete flag to items
alter table public.items
  add column if not exists is_active boolean not null default true;

create index if not exists idx_items_project_active
  on public.items(project_id, is_active);

-- Replace item write policies to include warehouse + buyer + admin

drop policy if exists "Items: buyer/admin insert" on public.items;
drop policy if exists "Items: buyer/admin update" on public.items;
drop policy if exists "Items: buyer/admin delete" on public.items;

create policy "Items: admin/buyer/warehouse insert"
on public.items
for insert
with check (
  public.user_has_project_role(project_id, array['admin','buyer','warehouse'])
  or public.user_is_project_admin(project_id)
);

create policy "Items: admin/buyer/warehouse update"
on public.items
for update
using (
  public.user_has_project_role(project_id, array['admin','buyer','warehouse'])
  or public.user_is_project_admin(project_id)
)
with check (
  public.user_has_project_role(project_id, array['admin','buyer','warehouse'])
  or public.user_is_project_admin(project_id)
);

-- IMPORTANT:
-- Do NOT create an item DELETE policy (so hard delete is blocked by RLS).
-- Users "remove" items by setting items.is_active = false.