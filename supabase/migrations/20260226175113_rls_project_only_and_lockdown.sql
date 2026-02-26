-- =========================
-- 0) Helpers (SECURITY DEFINER) for RLS checks
--    Explicitly deny when not authenticated (auth.uid() is null).
-- =========================

create or replace function public.user_is_site_owner(p_site_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.sites s
      where s.id = p_site_id
        and s.owner_id = auth.uid()
    );
$$;

create or replace function public.user_is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.project_user_roles pur
        where pur.project_id = p_project_id
          and pur.user_id = auth.uid()
          and pur.is_active = true
      )
      or exists (
        select 1
        from public.projects p
        where p.id = p_project_id
          and public.user_is_site_owner(p.site_id)
      )
    );
$$;

create or replace function public.user_is_project_admin(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.user_has_project_role(p_project_id, array['admin'])
      or public.user_is_site_owner(
        (select p.site_id from public.projects p where p.id = p_project_id)
      )
    );
$$;

create or replace function public.user_has_project_role(
  p_project_id uuid,
  p_allowed_roles text[]
) returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.project_user_roles pur
      join public.roles r on r.id = pur.role_id
      where pur.project_id = p_project_id
        and pur.user_id = auth.uid()
        and pur.is_active = true
        and r.name = any(p_allowed_roles)
    );
$$;

-- =========================
-- 1) Replace RLS policies: project-only visibility
--    Strategy:
--      - Read access: project members (or site owner)
--      - Write access: depends on table + roles
-- =========================

-- ---- projects
drop policy if exists "Project isolation" on public.projects;
create policy "Projects: project-member read"
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

-- Only site owner can create projects (boss/admin)
create policy "Projects: site-owner insert"
on public.projects
for insert
with check (public.user_is_site_owner(site_id));

-- Only site owner can update/delete projects
create policy "Projects: site-owner update"
on public.projects
for update
using (public.user_is_site_owner(site_id))
with check (public.user_is_site_owner(site_id));

create policy "Projects: site-owner delete"
on public.projects
for delete
using (public.user_is_site_owner(site_id));

-- ---- items (buyer/admin create, all project members read)
drop policy if exists "Items isolation" on public.items;
create policy "Items: member read"
on public.items
for select
using (public.user_is_project_member(project_id));

create policy "Items: buyer/admin insert"
on public.items
for insert
with check (public.user_has_project_role(project_id, array['admin','buyer'])
            or public.user_is_project_admin(project_id));

create policy "Items: buyer/admin update"
on public.items
for update
using (public.user_has_project_role(project_id, array['admin','buyer'])
       or public.user_is_project_admin(project_id))
with check (public.user_has_project_role(project_id, array['admin','buyer'])
            or public.user_is_project_admin(project_id));

create policy "Items: buyer/admin delete"
on public.items
for delete
using (public.user_has_project_role(project_id, array['admin','buyer'])
       or public.user_is_project_admin(project_id));

-- ---- locations (admin/warehouse manage, members read)
drop policy if exists "Locations isolation" on public.locations;
create policy "Locations: member read"
on public.locations
for select
using (public.user_is_project_member(project_id));

create policy "Locations: admin/warehouse insert"
on public.locations
for insert
with check (public.user_has_project_role(project_id, array['admin','warehouse'])
            or public.user_is_project_admin(project_id));

create policy "Locations: admin/warehouse update"
on public.locations
for update
using (public.user_has_project_role(project_id, array['admin','warehouse'])
       or public.user_is_project_admin(project_id))
with check (public.user_has_project_role(project_id, array['admin','warehouse'])
            or public.user_is_project_admin(project_id));

create policy "Locations: admin/warehouse delete"
on public.locations
for delete
using (public.user_has_project_role(project_id, array['admin','warehouse'])
       or public.user_is_project_admin(project_id));

-- ---- inventory (members read, warehouse/admin write)
drop policy if exists "Inventory isolation" on public.inventory;
create policy "Inventory: member read"
on public.inventory
for select
using (
  exists (
    select 1
    from public.locations l
    where l.id = inventory.location_id
      and public.user_is_project_member(l.project_id)
  )
);

create policy "Inventory: warehouse/admin write"
on public.inventory
for all
using (
  exists (
    select 1
    from public.locations l
    where l.id = inventory.location_id
      and (
        public.user_has_project_role(l.project_id, array['admin','warehouse'])
        or public.user_is_project_admin(l.project_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.locations l
    where l.id = inventory.location_id
      and (
        public.user_has_project_role(l.project_id, array['admin','warehouse'])
        or public.user_is_project_admin(l.project_id)
      )
  )
);

-- ---- orders (members read? you said buyer manages orders; I suggest: members read, buyer/admin write)
drop policy if exists "Orders isolation" on public.orders;
create policy "Orders: member read"
on public.orders
for select
using (public.user_is_project_member(project_id));

create policy "Orders: buyer/admin write"
on public.orders
for insert
with check (public.user_has_project_role(project_id, array['admin','buyer'])
            or public.user_is_project_admin(project_id));

create policy "Orders: buyer/admin update"
on public.orders
for update
using (public.user_has_project_role(project_id, array['admin','buyer'])
       or public.user_is_project_admin(project_id))
with check (public.user_has_project_role(project_id, array['admin','buyer'])
            or public.user_is_project_admin(project_id));

create policy "Orders: buyer/admin delete"
on public.orders
for delete
using (public.user_has_project_role(project_id, array['admin','buyer'])
       or public.user_is_project_admin(project_id));

-- ---- order_items (derive project from order)
drop policy if exists "Order items isolation" on public.order_items;
create policy "Order items: member read"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and public.user_is_project_member(o.project_id)
  )
);

create policy "Order items: buyer/admin write"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        public.user_has_project_role(o.project_id, array['admin','buyer'])
        or public.user_is_project_admin(o.project_id)
      )
  )
);

create policy "Order items: buyer/admin update"
on public.order_items
for update
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        public.user_has_project_role(o.project_id, array['admin','buyer'])
        or public.user_is_project_admin(o.project_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        public.user_has_project_role(o.project_id, array['admin','buyer'])
        or public.user_is_project_admin(o.project_id)
      )
  )
);

create policy "Order items: buyer/admin delete"
on public.order_items
for delete
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        public.user_has_project_role(o.project_id, array['admin','buyer'])
        or public.user_is_project_admin(o.project_id)
      )
  )
);

-- ---- enquiries (derive project_id column directly exists on enquiries)
drop policy if exists "Enquiries isolation" on public.enquiries;
create policy "Enquiries: member read"
on public.enquiries
for select
using (public.user_is_project_member(project_id));

create policy "Enquiries: member create"
on public.enquiries
for insert
with check (public.user_is_project_member(project_id));

-- Allow assigned-role users (buyer/warehouse) + admin to update status/notes
create policy "Enquiries: assignee/admin update"
on public.enquiries
for update
using (
  public.user_is_project_admin(project_id)
  or public.user_has_project_role(project_id, array['admin'])
  or public.user_has_project_role(project_id, array[assigned_role])
)
with check (
  public.user_is_project_admin(project_id)
  or public.user_has_project_role(project_id, array['admin'])
  or public.user_has_project_role(project_id, array[assigned_role])
);

-- ---- stock_movements (members read, warehouse/admin insert)
drop policy if exists "Stock movements isolation" on public.stock_movements;
create policy "Stock movements: member read"
on public.stock_movements
for select
using (public.user_is_project_member(project_id));

create policy "Stock movements: warehouse/admin insert"
on public.stock_movements
for insert
with check (
  public.user_has_project_role(project_id, array['admin','warehouse'])
  or public.user_is_project_admin(project_id)
);

-- ---- deliveries (derive project from order)
drop policy if exists "Deliveries isolation" on public.deliveries;
create policy "Deliveries: member read"
on public.deliveries
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = deliveries.order_id
      and public.user_is_project_member(o.project_id)
  )
);

create policy "Deliveries: warehouse/admin insert"
on public.deliveries
for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = deliveries.order_id
      and (
        public.user_has_project_role(o.project_id, array['admin','warehouse'])
        or public.user_is_project_admin(o.project_id)
      )
  )
);

-- ---- site_members & project_user_roles should be admin-managed
drop policy if exists "Site members isolation" on public.site_members;
create policy "Site members: site-owner manage"
on public.site_members
for all
using (public.user_is_site_owner(site_id))
with check (public.user_is_site_owner(site_id));

drop policy if exists "Project user roles isolation" on public.project_user_roles;
create policy "Project roles: site-owner manage"
on public.project_user_roles
for all
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_user_roles.project_id
      and public.user_is_site_owner(p.site_id)
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_user_roles.project_id
      and public.user_is_site_owner(p.site_id)
  )
);

-- ---- sites: only owner can see/manage their sites
drop policy if exists "Sites isolation" on public.sites;
create policy "Sites: owner read"
on public.sites
for select
using (owner_id = auth.uid());

create policy "Sites: owner update"
on public.sites
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Sites: owner delete"
on public.sites
for delete
using (owner_id = auth.uid());

-- (Insert for sites is handled via create_site RPC; you can allow direct insert too if you want)

-- ---- roles: readable by authenticated (fine)
-- keep your existing "Roles are readable..." policy

-- ---- users: keep self profile policies (fine)
-- You currently allow users to select/update only their own row: good.


-- =========================
-- 2) Lock down privileges (NO anon access)
-- =========================

-- Remove the dangerous defaults from the baseline dump:
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- Also lock down existing objects:
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- For authenticated, you can choose either:
-- A) keep broad table grants and rely on RLS (common in Supabase),
-- or B) grant only what you need (stricter).
--
-- For MVP speed, choose A but no anon:
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;