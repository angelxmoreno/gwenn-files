import type { User } from './user'

export interface Track {
  id: string
  project_id: string
  uploaded_by: string
  name: string
  file_key: string
  file_size: number | null
  mime_type: string | null
  duration_seconds: number | null
  version: number
  parent_id: string | null
  created_at: string
}

export interface TrackWithUploader extends Track {
  uploader: Pick<User, 'id' | 'display_name' | 'avatar_url'>
}

// ─── Audio helpers ────────────────────────────────────────────────────────────

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
  'audio/aiff',
  'audio/ogg',
  'audio/x-aiff',
  'audio/x-wav',
] as const

export function isAudioMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false
  return AUDIO_MIME_TYPES.includes(mimeType as (typeof AUDIO_MIME_TYPES)[number])
}

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aiff', '.aif', '.ogg']

export function isAudioFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}
