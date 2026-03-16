import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { uploads, tracks } from '../lib/api'

interface UploadOptions {
  projectId: string
  name: string
  parentId?: string
}

interface UseUploadResult {
  upload: (file: File, options: UploadOptions) => Promise<void>
  progress: number
  isUploading: boolean
  error: Error | null
  reset: () => void
}

export function useUpload(): UseUploadResult {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setProgress(0)
    setIsUploading(false)
    setError(null)
  }, [])

  const upload = useCallback(
    async (file: File, options: UploadOptions): Promise<void> => {
      setIsUploading(true)
      setError(null)
      setProgress(0)

      try {
        // Step 1: Get presigned URL
        setProgress(5)
        const { upload_url, file_key } = await uploads.presign({
          project_id: options.projectId,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
        })

        setProgress(10)

        // Step 2: Upload to R2 via presigned URL with XHR for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 80) + 10 // 10–90%
              setProgress(pct)
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
          })

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'))
          })

          xhr.open('PUT', upload_url)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.send(file)
        })

        setProgress(90)

        // Step 3: Register track in the database
        await tracks.create({
          project_id: options.projectId,
          name: options.name,
          file_key,
          file_size: file.size,
          mime_type: file.type || undefined,
          parent_id: options.parentId,
        })

        setProgress(100)

        // Invalidate relevant queries
        await queryClient.invalidateQueries({
          queryKey: ['tracks', options.projectId],
        })
        await queryClient.invalidateQueries({
          queryKey: ['projects', options.projectId],
        })
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Upload failed'))
        throw err
      } finally {
        setIsUploading(false)
      }
    },
    [queryClient],
  )

  return { upload, progress, isUploading, error, reset }
}
