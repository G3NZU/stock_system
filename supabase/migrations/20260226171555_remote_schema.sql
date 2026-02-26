drop function if exists "public"."add_order_item"(p_order_id uuid, p_item_id uuid, p_quantity integer);

drop function if exists "public"."create_enquiry"(p_project_id uuid, p_type text);

alter table "public"."order_items" drop column "item_name";

alter table "public"."order_items" add column "item_id" uuid not null;

alter table "public"."order_items" add constraint "order_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_item_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_order_item(p_order_id uuid, p_item_id uuid, p_quantity integer, p_unit_cost numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_project_id uuid;
begin

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  -- Get project from order
  select project_id into v_project_id
  from public.orders
  where id = p_order_id;

  if v_project_id is null then
    raise exception 'Order not found';
  end if;

  -- 🔐 ROLE CHECK
  if not public.user_has_project_role(
    v_project_id,
    array['admin','buyer']
  ) then
    raise exception 'Permission denied';
  end if;

  insert into public.order_items (
    order_id,
    item_id,
    quantity,
    unit_cost
  )
  values (
    p_order_id,
    p_item_id,
    p_quantity,
    p_unit_cost);

end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_order(p_project_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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

  insert into public.orders (
    project_id,
    status,
    created_by
  )
  values (
    p_project_id,
    'PENDING',
    auth.uid()
  )
  returning id into v_order_id;

  return v_order_id;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_project_id uuid;
begin

  select project_id into v_project_id
  from public.orders
  where id = p_order_id;

  if v_project_id is null then
    raise exception 'Order not found';
  end if;

  -- 🔐 ROLE CHECK
  if not public.user_has_project_role(
    v_project_id,
    array['admin','buyer']
  ) then
    raise exception 'Permission denied';
  end if;

  update public.orders
  set status = p_status
  where id = p_order_id;

end;
$function$
;


