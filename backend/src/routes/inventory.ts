import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/inventory - list inventory rows (optionally filter by project_id)
router.get('/', async (req, res) => {
  let query = supabase.from('inventory').select('id, quantity, item_id, location_id, project_id, updated_at')
  if (req.query.project_id) {
    query = query.eq('project_id', req.query.project_id as string)
  }
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

export default router
