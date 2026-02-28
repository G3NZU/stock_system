import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/projects - list all projects (optionally filter by site_id)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('projects').select('id, name, description, site_id, created_at')
    
    if (req.query.site_id) {
      query = query.eq('site_id', req.query.site_id as string)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// GET /api/projects/:id - get a project by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, site_id, created_at')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch project' })
  }
})

export default router
