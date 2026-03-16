import { createRoute, useNavigate, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Loader, FolderOpen } from 'lucide-react'
import { RootRoute } from './__root'
import { projects } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { ProjectCard } from '../components/ProjectCard'

function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projects.list,
  })

  const canCreateProject = user?.role === 'admin' || user?.role === 'manager'

  if (projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-base-content/60 text-sm mt-1">
            {projectsQuery.data?.length ?? 0} project
            {(projectsQuery.data?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreateProject && (
          <Link to="/projects/new" className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
          </Link>
        )}
      </div>

      {projectsQuery.error && (
        <div className="alert alert-error">
          <span>Failed to load projects: {projectsQuery.error.message}</span>
        </div>
      )}

      {projectsQuery.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-base-content/40">
          <FolderOpen className="w-16 h-16" />
          <div className="text-center">
            <p className="text-lg font-medium">No projects yet</p>
            {canCreateProject ? (
              <p className="text-sm mt-1">
                Create your first project to start collaborating.
              </p>
            ) : (
              <p className="text-sm mt-1">
                You&apos;ll see projects here when you&apos;re invited to one.
              </p>
            )}
          </div>
          {canCreateProject && (
            <Link to="/projects/new" className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" />
              Create project
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsQuery.data?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

export const DashboardRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
  },
  component: DashboardPage,
})
