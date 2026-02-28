import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/sites - list all sites
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, location, created_at')
      .order('created_at', { ascending: false })
    
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    
    return res.json(data || [])
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sites' })
  }
})

// GET /api/sites/:id - get a site by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, location, created_at')
      .eq('id', req.params.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Site not found' })
      }
      return res.status(500).json({ error: error.message })
    }
    
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch site' })
  }
})

export default router
