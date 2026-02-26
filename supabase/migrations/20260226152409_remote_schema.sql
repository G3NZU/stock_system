


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_order_item"("p_order_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  insert into public.order_items (
    order_id,
    item_id,
    quantity
  )
  values (
    p_order_id,
    p_item_id,
    p_quantity
  );

end;
$$;


ALTER FUNCTION "public"."add_order_item"("p_order_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_inventory_id uuid;
begin

  -- 🔐 ROLE CHECK
  if not public.user_has_project_role(
    p_project_id,
    array['admin','warehouse']
  ) then
    raise exception 'Permission denied';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  -- Lock inventory row
  select id into v_inventory_id
  from public.inventory
  where item_id = p_item_id
    and location_id = p_location_id
  for update;

  if v_inventory_id is null then
    insert into public.inventory (item_id, location_id, quantity)
    values (p_item_id, p_location_id, p_quantity);
  else
    update public.inventory
    set quantity = quantity + p_quantity
    where id = v_inventory_id;
  end if;

  insert into public.stock_movements (
    project_id,
    item_id,
    to_location_id,
    movement_type,
    quantity,
    created_by
  )
  values (
    p_project_id,
    p_item_id,
    p_location_id,
    'IN',
    p_quantity,
    auth.uid()
  );

end;
$$;


ALTER FUNCTION "public"."add_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_type" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_enquiry_id uuid;
begin

  insert into public.enquiries (
    project_id,
    type,
    status,
    created_by
  )
  values (
    p_project_id,
    p_type,
    'PENDING',
    auth.uid()
  )
  returning id into v_enquiry_id;

  return v_enquiry_id;

end;
$$;


ALTER FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_delivery_location_id" "uuid", "p_assigned_role" "text", "p_notes" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_enquiry_id uuid;
begin

  -- 🔐 Must be project member
  if not public.user_has_project_role(
    p_project_id,
    array['admin','warehouse','manager','buyer']
  ) then
    raise exception 'Permission denied';
  end if;

  if p_assigned_role not in ('warehouse','buyer') then
    raise exception 'Invalid assigned role';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  insert into public.enquiries (
    project_id,
    requested_by,
    item_id,
    quantity,
    delivery_location_id,
    assigned_role,
    status,
    notes
  )
  values (
    p_project_id,
    auth.uid(),
    p_item_id,
    p_quantity,
    p_delivery_location_id,
    p_assigned_role,
    'OPEN',
    p_notes
  )
  returning id into v_enquiry_id;

  return v_enquiry_id;

end;
$$;


ALTER FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_delivery_location_id" "uuid", "p_assigned_role" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order"("p_project_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order_id uuid;
begin

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
$$;


ALTER FUNCTION "public"."create_order"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_site"("site_name" "text", "site_location" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  new_site_id uuid;
begin
  -- Create site
  insert into public.sites (name, location, owner_id)
  values (site_name, site_location, auth.uid())
  returning id into new_site_id;

  -- Add owner as site member
  insert into public.site_members (site_id, user_id)
  values (new_site_id, auth.uid());

  return new_site_id;
end;
$$;


ALTER FUNCTION "public"."create_site"("site_name" "text", "site_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_project_role"("project" "uuid", "role_name" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.project_user_roles pur
    join public.roles r on r.id = pur.role_id
    join public.projects p on p.id = pur.project_id
    where pur.user_id = auth.uid()
      and pur.project_id = project
      and pur.is_active = true
      and r.name = role_name
  );
$$;


ALTER FUNCTION "public"."has_project_role"("project" "uuid", "role_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_current_quantity integer;
begin

  -- 🔐 ROLE CHECK
  if not public.user_has_project_role(
    p_project_id,
    array['admin','warehouse']
  ) then
    raise exception 'Permission denied';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select quantity into v_current_quantity
  from public.inventory
  where item_id = p_item_id
    and location_id = p_location_id
  for update;

  if v_current_quantity is null then
    raise exception 'Inventory record not found';
  end if;

  if v_current_quantity < p_quantity then
    raise exception 'Insufficient stock';
  end if;

  update public.inventory
  set quantity = quantity - p_quantity
  where item_id = p_item_id
    and location_id = p_location_id;

  insert into public.stock_movements (
    project_id,
    item_id,
    from_location_id,
    movement_type,
    quantity,
    created_by
  )
  values (
    p_project_id,
    p_item_id,
    p_location_id,
    'OUT',
    p_quantity,
    auth.uid()
  );

end;
$$;


ALTER FUNCTION "public"."remove_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_from_location" "uuid", "p_to_location" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin

  -- 🔐 ROLE CHECK
  if not public.user_has_project_role(
    p_project_id,
    array['admin','warehouse']
  ) then
    raise exception 'Permission denied';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  perform public.remove_stock(
    p_project_id,
    p_item_id,
    p_from_location,
    p_quantity
  );

  perform public.add_stock(
    p_project_id,
    p_item_id,
    p_to_location,
    p_quantity
  );

  insert into public.stock_movements (
    project_id,
    item_id,
    from_location_id,
    to_location_id,
    movement_type,
    quantity,
    created_by
  )
  values (
    p_project_id,
    p_item_id,
    p_from_location,
    p_to_location,
    'TRANSFER',
    p_quantity,
    auth.uid()
  );

end;
$$;


ALTER FUNCTION "public"."transfer_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_from_location" "uuid", "p_to_location" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_enquiry_status"("p_enquiry_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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

  -- 🔐 Permission check
  if not (
    public.user_has_project_role(v_project_id, array['admin'])
    or
    public.user_has_project_role(v_project_id, array[v_assigned_role])
  ) then
    raise exception 'Permission denied';
  end if;

  -- 🚦 Prevent reopening closed enquiries
  if v_current_status in ('RESOLVED','REJECTED') then
    raise exception 'Closed enquiries cannot be modified';
  end if;

  -- 🚦 Enforce valid transitions
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

  -- Update enquiry
  update public.enquiries
  set status = p_status
  where id = p_enquiry_id;

end;
$$;


ALTER FUNCTION "public"."update_enquiry_status"("p_enquiry_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin

  update public.orders
  set status = p_status
  where id = p_order_id;

end;
$$;


ALTER FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_project_role"("p_project_id" "uuid", "p_allowed_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.project_user_roles pur
    join public.roles r on r.id = pur.role_id
    where pur.project_id = p_project_id
      and pur.user_id = auth.uid()
      and r.name = any(p_allowed_roles)
  );
$$;


ALTER FUNCTION "public"."user_has_project_role"("p_project_id" "uuid", "p_allowed_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_site_access"("site" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.site_members sm
    where sm.site_id = site
      and sm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.sites s
    where s.id = site
      and s.owner_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."user_has_site_access"("site" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "received_by" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "delivery_location_id" "uuid",
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_role" "text" NOT NULL,
    CONSTRAINT "enquiries_assigned_role_check" CHECK (("assigned_role" = ANY (ARRAY['warehouse'::"text", 'buyer'::"text"]))),
    CONSTRAINT "enquiries_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "enquiries_status_check" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'IN_PROGRESS'::"text", 'RESOLVED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."enquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enquiry_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enquiry_id" "uuid" NOT NULL,
    "old_status" "text" NOT NULL,
    "new_status" "text" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enquiry_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_quantity_check" CHECK (("quantity" >= 0))
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "sku" character varying,
    "description" "text",
    "unit_type" character varying,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "item_name" character varying NOT NULL,
    "quantity" integer NOT NULL,
    "unit_cost" numeric(10,2) NOT NULL,
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "supplier_name" character varying NOT NULL,
    "delivery_location_id" "uuid",
    "status" character varying NOT NULL,
    "expected_delivery_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "elevated_permissions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "location" character varying,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "from_location_id" "uuid",
    "to_location_id" "uuid",
    "quantity" integer NOT NULL,
    "movement_type" character varying NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    CONSTRAINT "stock_movements_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" character varying,
    "email" character varying,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enquiry_status_history"
    ADD CONSTRAINT "enquiry_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_item_id_location_id_key" UNIQUE ("item_id", "location_id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_project_id_sku_key" UNIQUE ("project_id", "sku");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_project_id_name_key" UNIQUE ("project_id", "name");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_user_roles"
    ADD CONSTRAINT "project_user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_user_roles"
    ADD CONSTRAINT "project_user_roles_user_id_project_id_role_id_key" UNIQUE ("user_id", "project_id", "role_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_members"
    ADD CONSTRAINT "site_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_members"
    ADD CONSTRAINT "site_members_site_id_user_id_key" UNIQUE ("site_id", "user_id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_inventory_item" ON "public"."inventory" USING "btree" ("item_id");



CREATE INDEX "idx_inventory_location" ON "public"."inventory" USING "btree" ("location_id");



CREATE INDEX "idx_items_project" ON "public"."items" USING "btree" ("project_id");



CREATE INDEX "idx_locations_project" ON "public"."locations" USING "btree" ("project_id");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_project" ON "public"."orders" USING "btree" ("project_id");



CREATE INDEX "idx_projects_site_id" ON "public"."projects" USING "btree" ("site_id");



CREATE INDEX "idx_pur_project" ON "public"."project_user_roles" USING "btree" ("project_id");



CREATE INDEX "idx_pur_user" ON "public"."project_user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_site_members_site" ON "public"."site_members" USING "btree" ("site_id");



CREATE INDEX "idx_site_members_user" ON "public"."site_members" USING "btree" ("user_id");



CREATE INDEX "idx_sites_owner_id" ON "public"."sites" USING "btree" ("owner_id");



CREATE INDEX "idx_stock_item" ON "public"."stock_movements" USING "btree" ("item_id");



CREATE INDEX "idx_stock_project" ON "public"."stock_movements" USING "btree" ("project_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_delivery_location_id_fkey" FOREIGN KEY ("delivery_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enquiries"
    ADD CONSTRAINT "enquiries_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."enquiry_status_history"
    ADD CONSTRAINT "enquiry_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."enquiry_status_history"
    ADD CONSTRAINT "enquiry_status_history_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_delivery_location_id_fkey" FOREIGN KEY ("delivery_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_user_roles"
    ADD CONSTRAINT "project_user_roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_user_roles"
    ADD CONSTRAINT "project_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."project_user_roles"
    ADD CONSTRAINT "project_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_members"
    ADD CONSTRAINT "site_members_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_members"
    ADD CONSTRAINT "site_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Deliveries isolation" ON "public"."deliveries" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."projects" "p" ON (("p"."id" = "o"."project_id")))
  WHERE (("o"."id" = "deliveries"."order_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."projects" "p" ON (("p"."id" = "o"."project_id")))
  WHERE (("o"."id" = "deliveries"."order_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Enquiries isolation" ON "public"."enquiries" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "enquiries"."project_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "enquiries"."project_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Inventory isolation" ON "public"."inventory" USING ((EXISTS ( SELECT 1
   FROM ("public"."locations" "l"
     JOIN "public"."projects" "p" ON (("p"."id" = "l"."project_id")))
  WHERE (("l"."id" = "inventory"."location_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."locations" "l"
     JOIN "public"."projects" "p" ON (("p"."id" = "l"."project_id")))
  WHERE (("l"."id" = "inventory"."location_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Items isolation" ON "public"."items" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "items"."project_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "items"."project_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Locations isolation" ON "public"."locations" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "locations"."project_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "locations"."project_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Order items isolation" ON "public"."order_items" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."projects" "p" ON (("p"."id" = "o"."project_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."projects" "p" ON (("p"."id" = "o"."project_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Orders isolation" ON "public"."orders" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "orders"."project_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "orders"."project_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Project isolation" ON "public"."projects" USING ("public"."user_has_site_access"("site_id")) WITH CHECK ("public"."user_has_site_access"("site_id"));



CREATE POLICY "Project user roles isolation" ON "public"."project_user_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_user_roles"."project_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_user_roles"."project_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Roles are readable by authenticated users" ON "public"."roles" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Site members isolation" ON "public"."site_members" USING ("public"."user_has_site_access"("site_id")) WITH CHECK ("public"."user_has_site_access"("site_id"));



CREATE POLICY "Sites isolation" ON "public"."sites" FOR SELECT USING ("public"."user_has_site_access"("id"));



CREATE POLICY "Stock movements isolation" ON "public"."stock_movements" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "stock_movements"."project_id") AND "public"."user_has_site_access"("p"."site_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "stock_movements"."project_id") AND "public"."user_has_site_access"("p"."site_id")))));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "public"."users" FOR SELECT USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enquiry_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_order_item"("p_order_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_order_item"("p_order_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_order_item"("p_order_id" "uuid", "p_item_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_delivery_location_id" "uuid", "p_assigned_role" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_delivery_location_id" "uuid", "p_assigned_role" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_enquiry"("p_project_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_delivery_location_id" "uuid", "p_assigned_role" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_site"("site_name" "text", "site_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_site"("site_name" "text", "site_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_site"("site_name" "text", "site_location" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_project_role"("project" "uuid", "role_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_project_role"("project" "uuid", "role_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_project_role"("project" "uuid", "role_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_location_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_from_location" "uuid", "p_to_location" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_from_location" "uuid", "p_to_location" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_stock"("p_project_id" "uuid", "p_item_id" "uuid", "p_from_location" "uuid", "p_to_location" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_enquiry_status"("p_enquiry_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_enquiry_status"("p_enquiry_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_enquiry_status"("p_enquiry_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_project_role"("p_project_id" "uuid", "p_allowed_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_project_role"("p_project_id" "uuid", "p_allowed_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_project_role"("p_project_id" "uuid", "p_allowed_roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_site_access"("site" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_site_access"("site" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_site_access"("site" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."deliveries" TO "anon";
GRANT ALL ON TABLE "public"."deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."enquiries" TO "anon";
GRANT ALL ON TABLE "public"."enquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."enquiries" TO "service_role";



GRANT ALL ON TABLE "public"."enquiry_status_history" TO "anon";
GRANT ALL ON TABLE "public"."enquiry_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."enquiry_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."project_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."project_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."project_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."site_members" TO "anon";
GRANT ALL ON TABLE "public"."site_members" TO "authenticated";
GRANT ALL ON TABLE "public"."site_members" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


