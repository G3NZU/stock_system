import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

function client() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const c = client()
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
  return c
}

let boss: SupabaseClient
let warehouse: SupabaseClient
let manager: SupabaseClient
let buyer: SupabaseClient
let outsider: SupabaseClient

let ctx: {
  siteId: string
  projectId: string
  locationId: string
  itemId: string
}

beforeAll(async () => {
  // Assumes you've run: npm run seed:local
  boss = await signIn('boss@example.com', 'Passw0rd!boss')
  warehouse = await signIn('warehouse@example.com', 'Passw0rd!warehouse')
  manager = await signIn('manager@example.com', 'Passw0rd!manager')
  buyer = await signIn('buyer@example.com', 'Passw0rd!buyer')
  outsider = await signIn('outsider@example.com', 'Passw0rd!outsider')

  // Find the seeded project/location/item by selecting what each role can see.
  const { data: project, error: projErr } = await boss.from('projects').select('id').eq('name', 'Project A').single()
  if (projErr) throw projErr

  const { data: loc, error: locErr } = await boss.from('locations').select('id').eq('project_id', project.id).single()
  if (locErr) throw locErr

  const { data: item, error: itemErr } = await boss.from('items').select('id').eq('project_id', project.id).single()
  if (itemErr) throw itemErr

  ctx = { siteId: '', projectId: project.id, locationId: loc.id, itemId: item.id }
})

describe('RLS: outsider', () => {
  it('cannot read projects', async () => {
    const { data, error } = await outsider.from('projects').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBe(0)
  })

  it('cannot read inventory', async () => {
    const { data, error } = await outsider.from('inventory').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBe(0)
  })
})

describe('RLS: manager', () => {
  it('can read inventory', async () => {
    const { data, error } = await manager.from('inventory').select('id, quantity')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('cannot add stock', async () => {
    const { error } = await manager.rpc('add_stock', {
      p_project_id: ctx.projectId,
      p_item_id: ctx.itemId,
      p_location_id: ctx.locationId,
      p_quantity: 1,
    })
    expect(error).not.toBeNull()
  })
})

describe('RLS: warehouse', () => {
  it('can add stock', async () => {
    const { error } = await warehouse.rpc('add_stock', {
      p_project_id: ctx.projectId,
      p_item_id: ctx.itemId,
      p_location_id: ctx.locationId,
      p_quantity: 1,
    })
    expect(error).toBeNull()
  })

  it('can transfer stock (to a new location created by boss)', async () => {
    // create another location as boss
    const { data: loc2, error: loc2Err } = await boss
      .from('locations')
      .insert([{ project_id: ctx.projectId, name: 'Secondary Store' }])
      .select('id')
      .single()
    expect(loc2Err).toBeNull()

    const { error } = await warehouse.rpc('transfer_stock', {
      p_project_id: ctx.projectId,
      p_item_id: ctx.itemId,
      p_from_location: ctx.locationId,
      p_to_location: loc2!.id,
      p_quantity: 1,
    })
    expect(error).toBeNull()
  })
})

describe('RLS: buyer', () => {
  it('can create an order', async () => {
    const { data: orderId, error } = await buyer.rpc('create_order', {
      p_project_id: ctx.projectId,
      p_supplier_name: 'ACME Supplies',
    })
    expect(error).toBeNull()
    expect(orderId).toBeTruthy()
  })

  it('can add an order item', async () => {
    const { data: orderId, error: orderErr } = await buyer.rpc('create_order', {
      p_project_id: ctx.projectId,
      p_supplier_name: 'ACME Supplies',
    })
    expect(orderErr).toBeNull()
    expect(orderId).toBeTruthy()

    const { error } = await buyer.rpc('add_order_item', {
      p_order_id: orderId,
      p_item_id: ctx.itemId,
      p_quantity: 2,
      p_unit_cost: 10.5,
    })
    expect(error).toBeNull()
  })
})