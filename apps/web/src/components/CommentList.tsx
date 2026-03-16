import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Clock } from 'lucide-react'
import { comments } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import type { CommentWithUser } from '@gwenn/shared'

interface CommentListProps {
  trackId: string
  commentList: CommentWithUser[]
  onSeek?: (seconds: number) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export function CommentList({ trackId, commentList, onSeek }: CommentListProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => comments.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', trackId] })
    },
  })

  if (commentList.length === 0) {
    return (
      <p className="text-xs text-base-content/40 text-center py-3">
        No comments yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {commentList.map((comment) => (
        <div key={comment.id} className="flex gap-2.5 group">
          {comment.user.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user.display_name ?? ''}
              className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {(comment.user.display_name ?? '?').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {comment.user.display_name ?? 'Unknown'}
              </span>
              {comment.timestamp_seconds != null && (
                <button
                  className="flex items-center gap-0.5 text-xs text-primary hover:text-primary-focus transition-colors"
                  onClick={() => onSeek?.(comment.timestamp_seconds!)}
                  title="Jump to this timestamp"
                >
                  <Clock className="w-3 h-3" />
                  {formatTime(comment.timestamp_seconds)}
                </button>
              )}
              <span className="text-xs text-base-content/40 ml-auto">
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="text-sm text-base-content/80 mt-0.5 break-words">
              {comment.body}
            </p>
          </div>

          {comment.user_id === user?.id && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-xs text-error flex-shrink-0"
              onClick={() => deleteMutation.mutate(comment.id)}
              disabled={deleteMutation.isPending}
              title="Delete comment"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
