import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import projectsRouter from './routes/projects'
import itemsRouter from './routes/items'
import inventoryRouter from './routes/inventory'
import ordersRouter from './routes/orders'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/projects', projectsRouter)
app.use('/api/items', itemsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/orders', ordersRouter)

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`)
})

export default app
