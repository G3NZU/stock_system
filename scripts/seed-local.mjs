import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env. Need SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureUser(email, password) {
  // NOTE: This will error if the user already exists.
  // Recommended workflow: run `supabase db reset` before `npm run seed:local`.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  return data.user
}

async function signIn(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { client, user: data.user }
}

async function assertRpcExists(name) {
  // Calls the function with nulls just to get a "function does not exist" early if missing.
  // We only do this for functions where we control signature.
  // (create_site has different params so we don't probe it here.)
  const { error } = await admin.rpc(name, {})
  // If it exists, we'll typically get a "missing required argument" error, which is fine.
  // If it doesn't exist, error message usually contains "function ... does not exist".
  if (error && /does not exist/i.test(error.message)) {
    throw new Error(`RPC ${name} does not exist. Did you apply the migration that creates it?`)
  }
}

async function main() {
  console.log('Seeding local data...')

  // Ensure our custom RPCs exist (so we fail fast with a clear message)
  // (These RPCs should have been added in your "fix_rls_recursion_roles_management" migration.)
  try {
    // We can't reliably probe without args, so we just skip probing and rely on runtime errors.
    // Left here as a placeholder if you want to implement a catalog check later.
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  // 1) Create users
  const users = {
    boss: { email: 'boss@example.com', password: 'Passw0rd!boss' },
    warehouse: { email: 'warehouse@example.com', password: 'Passw0rd!warehouse' },
    manager: { email: 'manager@example.com', password: 'Passw0rd!manager' },
    buyer: { email: 'buyer@example.com', password: 'Passw0rd!buyer' },
    outsider: { email: 'outsider@example.com', password: 'Passw0rd!outsider' },
  }

  console.log('Creating auth users...')
  const boss = await ensureUser(users.boss.email, users.boss.password)
  const warehouse = await ensureUser(users.warehouse.email, users.warehouse.password)
  const manager = await ensureUser(users.manager.email, users.manager.password)
  const buyer = await ensureUser(users.buyer.email, users.buyer.password)
  const outsider = await ensureUser(users.outsider.email, users.outsider.password)

  // 2) Boss signs in (to call authenticated RPCs like create_site)
  console.log('Signing in boss...')
  const bossSession = await signIn(users.boss.email, users.boss.password)

  // 3) Ensure roles exist (admin insert via service_role so it's deterministic)
  console.log('Ensuring roles exist...')
  const roleNames = ['admin', 'warehouse', 'manager', 'buyer']
  const { error: roleUpsertErr } = await admin
    .from('roles')
    .upsert(roleNames.map((name) => ({ name })), { onConflict: 'name' })
  if (roleUpsertErr) throw roleUpsertErr

  // 4) Create a site via RPC (uses auth.uid())
  console.log('Creating site...')
  const { data: siteId, error: siteErr } = await bossSession.client.rpc('create_site', {
    site_name: 'Demo Site',
    site_location: 'Local',
  })
  if (siteErr) throw siteErr
  if (!siteId) throw new Error('create_site returned null siteId')

  // 5) Add other users as site members (via RPC)
  console.log('Adding site members...')
  for (const u of [warehouse, manager, buyer]) {
    const { error } = await bossSession.client.rpc('add_site_member', {
      p_site_id: siteId,
      p_user_id: u.id,
    })
    if (error) throw error
  }

  // 6) Create a project under the site (site owner only)
  console.log('Creating project...')
  const { data: projectRow, error: projErr } = await bossSession.client
    .from('projects')
    .insert([{ site_id: siteId, name: 'Project A', description: 'Test project' }])
    .select('id')
    .single()
  if (projErr) throw projErr
  if (!projectRow?.id) throw new Error('Failed to create project')
  const projectId = projectRow.id

  // 7) Assign project roles (via RPC)
  console.log('Assigning project roles...')
  const assignments = [
    { user: boss, role: 'admin' },
    { user: warehouse, role: 'warehouse' },
    { user: manager, role: 'manager' },
    { user: buyer, role: 'buyer' },
  ]

  for (const a of assignments) {
    const { error } = await bossSession.client.rpc('assign_project_role', {
      p_project_id: projectId,
      p_user_id: a.user.id,
      p_role_name: a.role,
    })
    if (error) throw error
  }

  // 8) Create a location
  console.log('Creating location...')
  const { data: loc, error: locErr } = await bossSession.client
    .from('locations')
    .insert([{ project_id: projectId, name: 'Main Store' }])
    .select('id')
    .single()
  if (locErr) throw locErr
  if (!loc?.id) throw new Error('Failed to create location')

  // 9) Create item as warehouse + add stock
  console.log('Signing in warehouse...')
  const whSession = await signIn(users.warehouse.email, users.warehouse.password)

  console.log('Creating item...')
  const { data: item, error: itemErr } = await whSession.client
    .from('items')
    .insert([{ project_id: projectId, name: 'Cement Bag', sku: 'CEM-001', unit_type: 'bag', is_active: true }])
    .select('id')
    .single()
  if (itemErr) throw itemErr
  if (!item?.id) throw new Error('Failed to create item')

  console.log('Adding stock...')
  const { error: addStockErr } = await whSession.client.rpc('add_stock', {
    p_project_id: projectId,
    p_item_id: item.id,
    p_location_id: loc.id,
    p_quantity: 50,
  })
  if (addStockErr) throw addStockErr

  console.log('Seed complete.')
  console.log(
    JSON.stringify(
      {
        siteId,
        projectId,
        users: {
          boss: boss.id,
          warehouse: warehouse.id,
          manager: manager.id,
          buyer: buyer.id,
          outsider: outsider.id,
        },
        locationId: loc.id,
        itemId: item.id,
      },
      null,
      2
    )
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})