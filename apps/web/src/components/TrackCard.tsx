import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Trash2, FileAudio, File, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { comments as commentsApi, tracks } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { AudioPlayer } from './AudioPlayer'
import { CommentList } from './CommentList'
import { CommentForm } from './CommentForm'
import { isAudioMimeType, isAudioFileName } from '@gwenn/shared'
import type { TrackWithUploader } from '@gwenn/shared'

interface TrackCardProps {
  track: TrackWithUploader
  projectId: string
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? ''

export function TrackCard({ track, projectId }: TrackCardProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [currentTime, setCurrentTime] = useState<number | null>(null)

  const isAudio =
    isAudioMimeType(track.mime_type) || isAudioFileName(track.name)

  const commentsQuery = useQuery({
    queryKey: ['comments', track.id],
    queryFn: () => commentsApi.list(track.id),
    enabled: showComments,
  })

  const deleteMutation = useMutation({
    mutationFn: () => tracks.delete(track.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tracks', projectId] })
    },
  })

  const fileUrl = `${API_URL}/api/tracks/${track.id}/file`
  const canDelete = user?.role === 'admin' || user?.role === 'manager' || track.uploaded_by === user?.id

  return (
    <div className="card bg-base-200 border border-base-300">
      <div className="card-body gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isAudio ? (
              <FileAudio className="w-5 h-5 text-primary flex-shrink-0" />
            ) : (
              <File className="w-5 h-5 text-base-content/50 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm truncate">{track.name}</h3>
                {track.version > 1 && (
                  <span className="badge badge-sm badge-accent">
                    v{track.version}
                  </span>
                )}
                {track.parent_id && track.version === 1 && (
                  <span className="badge badge-sm badge-ghost">version</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-base-content/50 mt-0.5 flex-wrap">
                <span>{track.uploader.display_name ?? 'Unknown'}</span>
                <span>·</span>
                <span>{timeAgo(track.created_at)}</span>
                {track.file_size && (
                  <>
                    <span>·</span>
                    <span>{formatBytes(track.file_size)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={fileUrl}
              download={track.name}
              className="btn btn-ghost btn-xs"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
            {canDelete && (
              <button
                className="btn btn-ghost btn-xs text-error"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                title="Delete track"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Audio player */}
        {isAudio && (
          <AudioPlayer
            trackId={track.id}
            fileUrl={fileUrl}
            comments={commentsQuery.data ?? []}
            onTimeUpdate={setCurrentTime}
            onSeek={(s) => setCurrentTime(s)}
          />
        )}

        {/* Comments toggle */}
        <button
          className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-base-content transition-colors w-fit"
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {showComments ? 'Hide comments' : 'Show comments'}
          {showComments ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {showComments && (
          <div className="flex flex-col gap-3 pt-2 border-t border-base-300">
            {commentsQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner loading-sm" />
              </div>
            ) : (
              <CommentList
                trackId={track.id}
                commentList={commentsQuery.data ?? []}
                onSeek={(s) => setCurrentTime(s)}
              />
            )}
            <CommentForm
              trackId={track.id}
              currentTime={isAudio ? currentTime : null}
            />
          </div>
        )}
      </div>
    </div>
  )
}
