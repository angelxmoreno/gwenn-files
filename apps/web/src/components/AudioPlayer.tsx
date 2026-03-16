import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause, Loader } from 'lucide-react'
import type { CommentWithUser } from '@gwenn/shared'

interface AudioPlayerProps {
  trackId: string
  fileUrl: string
  comments: CommentWithUser[]
  onTimeUpdate?: (currentTime: number) => void
  onSeek?: (seconds: number) => void
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AudioPlayer({
  trackId,
  fileUrl,
  comments,
  onTimeUpdate,
  onSeek,
}: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'oklch(var(--p) / 0.4)',
      progressColor: 'oklch(var(--p))',
      cursorColor: 'oklch(var(--p))',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 64,
      normalize: true,
    })

    wsRef.current = ws

    ws.load(fileUrl).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load audio')
      setIsLoading(false)
    })

    ws.on('ready', (dur) => {
      setDuration(dur)
      setIsLoading(false)
    })

    ws.on('timeupdate', (t) => {
      setCurrentTime(t)
      onTimeUpdate?.(t)
    })

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => setIsPlaying(false))

    ws.on('error', (err) => {
      setError(err instanceof Error ? err.message : 'Playback error')
      setIsLoading(false)
    })

    return () => {
      ws.destroy()
    }
  }, [fileUrl])

  const handleSeek = useCallback(
    (seconds: number) => {
      const ws = wsRef.current
      if (!ws || duration <= 0) return
      ws.seekTo(seconds / duration)
      onSeek?.(seconds)
    },
    [duration, onSeek],
  )

  const handlePlayPause = () => {
    wsRef.current?.playPause()
  }

  // Compute marker positions (as % of width)
  const markers = comments.filter((c) => c.timestamp_seconds != null && duration > 0)

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-3">
        <button
          className="btn btn-primary btn-sm btn-circle flex-shrink-0"
          onClick={handlePlayPause}
          disabled={isLoading || !!error}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {error ? (
            <p className="text-xs text-error">{error}</p>
          ) : (
            <div className="relative">
              {/* Waveform */}
              <div ref={containerRef} className="w-full" />

              {/* Comment markers */}
              {!isLoading &&
                markers.map((comment) => {
                  const pct = ((comment.timestamp_seconds ?? 0) / duration) * 100
                  return (
                    <button
                      key={comment.id}
                      className="absolute top-0 w-1.5 h-full group"
                      style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                      onClick={() => handleSeek(comment.timestamp_seconds!)}
                      title={`${comment.user.display_name ?? 'Unknown'}: ${comment.body}`}
                    >
                      <div className="w-1 h-full bg-accent/70 group-hover:bg-accent transition-colors rounded-full mx-auto" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-base-300 text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 max-w-[160px] truncate">
                        {comment.user.display_name ?? 'Unknown'}: {comment.body}
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        <span className="text-xs text-base-content/50 tabular-nums flex-shrink-0 w-[80px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
