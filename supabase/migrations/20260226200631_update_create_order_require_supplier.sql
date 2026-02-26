-- Update create_order to require supplier_name at creation time

drop function if exists public.create_order(uuid);

create or replace function public.create_order(
  p_project_id uuid,
  p_supplier_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  -- 🔐 ROLE CHECK
  if not public.user_has_project_role(
    p_project_id,
    array['admin','buyer']
  ) then
    raise exception 'Permission denied';
  end if;

  if p_supplier_name is null or btrim(p_supplier_name) = '' then
    raise exception 'supplier_name is required';
  end if;

  insert into public.orders (
    project_id,
    supplier_name,
    status,
    created_by
  )
  values (
    p_project_id,
    p_supplier_name,
    'PENDING',
    auth.uid()
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_order(uuid, text) from anon;
grant execute on function public.create_order(uuid, text) to authenticated;