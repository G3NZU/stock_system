import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/orders - list all orders (optionally filter by project_id)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('orders').select('id, project_id, supplier_name, status, created_at')
    if (req.query.project_id) {
      query = query.eq('project_id', req.query.project_id as string)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// GET /api/orders/:id - get an order by ID including items
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, project_id, supplier_name, status, created_at, order_items(id, item_id, quantity, unit_cost)')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch order' })
  }
})

export default router
