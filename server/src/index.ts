import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { jobRoutes } from './routes/jobs'
import { metricsRoutes } from './routes/metrics'

type Bindings = {
  DATABASE_URL: string
  BACKEND_API_URL: string
  BACKEND_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  allowMethods: ['GET', 'POST', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Health check
app.get('/', (c) => c.json({ 
  message: 'DataVault Edge API', 
  version: '1.0.0',
  timestamp: new Date().toISOString()
}))

// Routes
app.route('/api/v1/jobs', jobRoutes)
app.route('/api/v1/metrics', metricsRoutes)

export default app
export type AppType = typeof app
