import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/projects - list all projects
router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('projects').select('id, name, description, site_id, created_at')
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// GET /api/projects/:id - get a project by ID
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, site_id, created_at')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: error.message })
  return res.json(data)
})

export default router
