import { Link } from '@tanstack/react-router'
import { Users, Music, Clock } from 'lucide-react'
import type { ProjectWithOwner } from '@gwenn/shared'

interface ProjectCardProps {
  project: ProjectWithOwner
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

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="card bg-base-200 border border-base-300 hover:border-primary/50 transition-colors hover:shadow-md cursor-pointer"
    >
      <div className="card-body gap-3 p-5">
        <h3 className="card-title text-base line-clamp-1">{project.title}</h3>

        {project.description && (
          <p className="text-sm text-base-content/60 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-base-content/50 mt-auto pt-2 border-t border-base-300">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {project.member_count} member{project.member_count !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Music className="w-3.5 h-3.5" />
            {project.track_count} track{project.track_count !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo(project.updated_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}
