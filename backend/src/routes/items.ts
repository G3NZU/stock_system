import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/items - list all items (optionally filter by project_id)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('items').select('id, name, sku, unit_type, is_active, project_id, created_at')
    if (req.query.project_id) {
      query = query.eq('project_id', req.query.project_id as string)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch items' })
  }
})

// GET /api/items/:id - get an item by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, sku, unit_type, is_active, project_id, created_at')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch item' })
  }
})

export default router
