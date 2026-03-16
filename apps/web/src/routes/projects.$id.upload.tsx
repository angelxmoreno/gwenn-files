import { createRoute, useParams, useNavigate, Link, redirect } from '@tanstack/react-router'
import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Upload, FileAudio, File, X } from 'lucide-react'
import { RootRoute } from './__root'
import { projects, tracks } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { useUpload } from '../hooks/useUpload'
import { isAudioMimeType, isAudioFileName } from '@gwenn/shared'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ProjectUploadPage() {
  const { id } = useParams({ from: '/projects/$id/upload' })
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trackName, setTrackName] = useState('')
  const [parentId, setParentId] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { upload, progress, isUploading, error } = useUpload()

  const projectQuery = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projects.get(id),
  })

  const tracksQuery = useQuery({
    queryKey: ['tracks', id],
    queryFn: () => tracks.list(id),
  })

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!trackName) {
      setTrackName(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [trackName],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    await upload(selectedFile, {
      projectId: id,
      name: trackName || selectedFile.name,
      parentId: parentId || undefined,
    })

    void navigate({ to: '/projects/$id', params: { id } })
  }

  const isAudio =
    selectedFile &&
    (isAudioMimeType(selectedFile.type) || isAudioFileName(selectedFile.name))

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/projects/$id"
          params={{ id }}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload file</h1>
          {projectQuery.data && (
            <p className="text-base-content/60 text-sm">
              to {projectQuery.data.title}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-box p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-base-300 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              {isAudio ? (
                <FileAudio className="w-12 h-12 text-primary" />
              ) : (
                <File className="w-12 h-12 text-primary" />
              )}
              <div className="text-center">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-base-content/50">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  setTrackName('')
                }}
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 bg-base-300 rounded-full">
                <Upload className="w-8 h-8 text-base-content/50" />
              </div>
              <div className="text-center">
                <p className="font-medium">Drop a file here</p>
                <p className="text-sm text-base-content/50">
                  or click to browse
                </p>
              </div>
              <p className="text-xs text-base-content/40">
                Audio: MP3, WAV, FLAC, AIFF, OGG · Any file type accepted
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />

        {/* Track name */}
        <label className="form-control">
          <div className="label">
            <span className="label-text">Track name</span>
          </div>
          <input
            type="text"
            placeholder="Name this track..."
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            required
            className="input input-bordered"
          />
        </label>

        {/* Parent track (versioning) */}
        {tracksQuery.data && tracksQuery.data.length > 0 && (
          <label className="form-control">
            <div className="label">
              <span className="label-text">Version of (optional)</span>
              <span className="label-text-alt text-base-content/50">
                Link to an existing track
              </span>
            </div>
            <select
              className="select select-bordered"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">— New track (no parent) —</option>
              {tracksQuery.data
                .filter((t) => !t.parent_id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
        )}

        {/* Progress */}
        {isUploading && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={progress}
              max={100}
            />
          </div>
        )}

        {error && (
          <div className="alert alert-error text-sm">
            <span>{error.message}</span>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Link
            to="/projects/$id"
            params={{ id }}
            className="btn btn-ghost"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary gap-2"
            disabled={!selectedFile || isUploading || !trackName.trim()}
          >
            {isUploading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </button>
        </div>
      </form>
    </div>
  )
}

export const ProjectUploadRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/projects/$id/upload',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
  },
  component: ProjectUploadPage,
})
