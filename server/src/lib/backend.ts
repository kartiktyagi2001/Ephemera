export interface BackendJobRequest {
  file?: File
  preset?: string
  fileType?: string
  sync?: boolean
  originalName?: string
}

export interface BackendJobResponse {
  jobId: string
  status: 'queued' | 'completed' | 'failed'
  downloadUrl?: string
  outputSize?: number
  durationMs?: number
  errorMessage?: string
}

export class BackendClient {
  constructor(
    private baseUrl: string,
    private secret: string
  ) {}

  async createJob(data: BackendJobRequest): Promise<BackendJobResponse> {
    const formData = new FormData()
    
    if (data.file) {
      formData.append('file', data.file)
    }
    if (data.preset) {
      formData.append('preset', data.preset)
    }
    if (data.fileType) {
      formData.append('fileType', data.fileType)
    }
    if (data.originalName) {
      formData.append('originalName', data.originalName)
    }
    if (data.sync) {
      formData.append('sync', 'true')
    }

    const response = await fetch(`${this.baseUrl}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secret}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    return response.json() as Promise<BackendJobResponse>
  }

  async getJob(jobId: string): Promise<BackendJobResponse> {
    const response = await fetch(`${this.baseUrl}/v1/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.secret}`
      }
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    return response.json() as Promise<BackendJobResponse>
  }

  async getJobOutput(jobId: string): Promise<Response> {
    return fetch(`${this.baseUrl}/v1/jobs/${jobId}/output`, {
      headers: {
        'Authorization': `Bearer ${this.secret}`
      }
    })
  }

  async deleteJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.secret}`
      }
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
  }
}
