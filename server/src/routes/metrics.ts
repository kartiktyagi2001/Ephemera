import { Hono } from 'hono'
import { createPrismaClient } from '../lib/db'

type Bindings = {
  DATABASE_URL: string
}

export const metricsRoutes = new Hono<{ Bindings: Bindings }>()

metricsRoutes.get('/', async (c) => {
  try {
    const prisma = createPrismaClient(c.env.DATABASE_URL)
    
    // Get job statistics
    const [totalJobs, successfulJobs, failedJobs, avgDuration] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: 'done' } }),
      prisma.job.count({ where: { status: 'failed' } }),
      prisma.job.aggregate({
        where: { 
          status: 'done',
          durationMs: { not: null }
        },
        _avg: { durationMs: true }
      })
    ])
    
    const processingJobs = await prisma.job.count({ 
      where: { status: 'processing' } 
    })
    
    const queuedJobs = await prisma.job.count({ 
      where: { status: 'queued' } 
    })

    return c.json({
      totalJobs,
      successfulJobs,
      failedJobs,
      processingJobs,
      queuedJobs,
      avgProcessingTimeMs: avgDuration._avg.durationMs || 0,
      successRate: totalJobs > 0 ? (successfulJobs / totalJobs * 100).toFixed(2) : 0,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Metrics error:', error)
    return c.json({ error: 'Failed to fetch metrics' }, 500)
  }
})
