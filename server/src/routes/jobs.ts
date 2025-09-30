import { Hono } from 'hono'
import { createPrismaClient } from '../lib/db'
import { BackendClient } from '../lib/backend'

type Bindings = {
  DATABASE_URL: string
  CONTAINER_API_URL: string  
  BACKEND_SECRET: string
}

export const jobRoutes = new Hono<{ Bindings: Bindings }>()

// create new job - /api/v1/jobs
jobRoutes.post('/', async (c) => {
  try {
    const prisma = createPrismaClient(c.env.DATABASE_URL)
    const backend = new BackendClient(c.env.CONTAINER_API_URL, c.env.BACKEND_SECRET)
    
    // parse multipart form data
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const preset = formData.get('preset') as string || 'default'
    const sync = formData.get('sync') === 'true'
    
    if (!file) {
      return c.json({ error: 'File is required' }, 400)
    }

    //validate file size (10MB limit for now)
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      return c.json({ 
        error: 'File too large. Maximum size is 10MB' 
      }, 413)
    }

    //validate file type
    const allowedTypes = ['text/csv', 'application/json']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        error: 'Invalid file type. Only CSV and JSON are supported' 
      }, 400)
    }

    // Create job record in database
    const job = await prisma.job.create({
      data: {
        status: 'queued',
        originalName: file.name,
        preset,
        fileType: file.type,
        inputSize: file.size,
      }
    })

    // Forward to backend
    const backendResponse = await backend.createJob({
      file,
      preset,
      fileType: file.type,
      originalName: file.name,
      sync
    })

    // Update job with backend response
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: backendResponse.status,
        downloadUrl: backendResponse.downloadUrl,
        outputSize: backendResponse.outputSize,
        durationMs: backendResponse.durationMs,
        errorMessage: backendResponse.errorMessage,
        startedAt: backendResponse.status === 'queued' ? new Date() : undefined,
        finishedAt: ['completed', 'failed'].includes(backendResponse.status) ? new Date() : undefined
      }
    })

    if (sync && backendResponse.status === 'completed') {
      // For sync requests, stream the result directly
      const outputResponse = await backend.getJobOutput(job.id)
      return new Response(outputResponse.body, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="processed_${file.name}"`
        }
      })
    }

    // Return job info for async processing
    return c.json({
      jobId: job.id,
      status: job.status,
      pollUrl: `/api/v1/jobs/${job.id}`
    }, backendResponse.status === 'queued' ? 202 : 201)

  } catch (error) {
    console.error('Job creation error:', error)
    return c.json({ 
      error: 'Failed to create job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// get job status - /api/v1/jobs/:jobId
jobRoutes.get('/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId')
    const prisma = createPrismaClient(c.env.DATABASE_URL)
    
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })
    
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    return c.json({
      jobId: job.id,
      status: job.status,
      originalName: job.originalName,
      preset: job.preset,
      fileType: job.fileType,
      inputSize: job.inputSize,
      outputSize: job.outputSize,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      durationMs: job.durationMs,
      errorMessage: job.errorMessage,
      downloadUrl: job.downloadUrl ? `/api/v1/jobs/${job.id}/download` : undefined
    })
    
  } catch (error) {
    console.error('Job fetch error:', error)
    return c.json({ error: 'Failed to fetch job' }, 500)
  }
})

// download processed file - /api/v1/jobs/:jobId/download
jobRoutes.get('/:jobId/download', async (c) => {
  try {
    const jobId = c.req.param('jobId')
    const prisma = createPrismaClient(c.env.DATABASE_URL)
    const backend = new BackendClient(c.env.CONTAINER_API_URL, c.env.BACKEND_SECRET)
    
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })
    
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    
    if (job.status !== 'completed') {
      return c.json({
        error: 'Job not completed',
        status: job.status 
      }, 400)
    }

    // stream file from container server
    const response = await backend.getJobOutput(jobId)
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="processed_${job.originalName}"`
      }
    })
    
  } catch (error) {
    console.error('Download error:', error)
    return c.json({ error: 'Failed to download file' }, 500)
  }
})

// delete job (admin) ()
jobRoutes.delete('/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId')
    const prisma = createPrismaClient(c.env.DATABASE_URL)
    const backend = new BackendClient(c.env.CONTAINER_API_URL, c.env.BACKEND_SECRET)
    
    // Delete from backend first
    await backend.deleteJob(jobId)
    
    // Delete from database
    await prisma.job.delete({
      where: { id: jobId }
    })
    
    return c.json({ message: 'Job deleted completedly' })
    
  } catch (error) {
    console.error('Job deletion error:', error)
    return c.json({ error: 'Failed to delete job' }, 500)
  }
})
