-- Fix: update_enquiry_status was not SECURITY DEFINER, so the INSERT into
-- enquiry_status_history was executed as the calling user and blocked by RLS
-- (no INSERT policy exists on that table). The function already enforces its
-- own permission checks, so SECURITY DEFINER is safe here.

create or replace function public.update_enquiry_status(p_enquiry_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_assigned_role text;
  v_current_status text;
begin

  -- Validate new status
  if p_status not in ('OPEN','IN_PROGRESS','RESOLVED','REJECTED') then
    raise exception 'Invalid status';
  end if;

  -- Get enquiry data
  select project_id, assigned_role, status
  into v_project_id, v_assigned_role, v_current_status
  from public.enquiries
  where id = p_enquiry_id
  for update;

  if v_project_id is null then
    raise exception 'Enquiry not found';
  end if;

  -- Permission check: only admin or the role the enquiry is assigned to may update it
  if not (
    public.user_has_project_role(v_project_id, array['admin'])
    or
    public.user_has_project_role(v_project_id, array[v_assigned_role])
  ) then
    raise exception 'Permission denied';
  end if;

  -- Prevent reopening closed enquiries
  if v_current_status in ('RESOLVED','REJECTED') then
    raise exception 'Closed enquiries cannot be modified';
  end if;

  -- Enforce valid transitions
  if v_current_status = 'OPEN' and p_status not in ('IN_PROGRESS','REJECTED') then
    raise exception 'Invalid status transition from OPEN';
  end if;

  if v_current_status = 'IN_PROGRESS' and p_status not in ('RESOLVED','REJECTED') then
    raise exception 'Invalid status transition from IN_PROGRESS';
  end if;

  -- Log status change
  insert into public.enquiry_status_history (
    enquiry_id,
    old_status,
    new_status,
    changed_by
  )
  values (
    p_enquiry_id,
    v_current_status,
    p_status,
    auth.uid()
  );

  -- Update enquiry status
  update public.enquiries
  set status = p_status
  where id = p_enquiry_id;

end;
$$;
