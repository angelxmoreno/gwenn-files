import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Clock } from 'lucide-react'
import { comments } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

interface CommentFormProps {
  trackId: string
  currentTime?: number | null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function CommentForm({ trackId, currentTime }: CommentFormProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [capturedTime, setCapturedTime] = useState<number | null>(null)

  const createMutation = useMutation({
    mutationFn: () =>
      comments.create(trackId, {
        body,
        timestamp_seconds: capturedTime ?? undefined,
      }),
    onSuccess: async () => {
      setBody('')
      setCapturedTime(null)
      await queryClient.invalidateQueries({ queryKey: ['comments', trackId] })
    },
  })

  if (!user) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    createMutation.mutate()
  }

  const handleCaptureTime = () => {
    if (currentTime != null) {
      setCapturedTime(currentTime)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {capturedTime != null && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Clock className="w-3 h-3" />
          <span>At {formatTime(capturedTime)}</span>
          <button
            type="button"
            className="ml-1 text-base-content/40 hover:text-base-content"
            onClick={() => setCapturedTime(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input input-bordered input-sm flex-1 text-sm"
          disabled={createMutation.isPending}
        />

        {currentTime != null && capturedTime == null && (
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1 text-xs"
            onClick={handleCaptureTime}
            title="Attach current timestamp"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">@ {formatTime(currentTime)}</span>
          </button>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!body.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {createMutation.error && (
        <p className="text-xs text-error">{createMutation.error.message}</p>
      )}
    </form>
  )
}
