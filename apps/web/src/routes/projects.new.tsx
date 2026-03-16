import { createRoute, useNavigate, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FolderPlus } from 'lucide-react'
import { RootRoute } from './__root'
import { projects } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

function NewProjectPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const createMutation = useMutation({
    mutationFn: () => projects.create({ title, description: description || undefined }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      void navigate({ to: '/projects/$id', params: { id: project.id } })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">New Project</h1>
      </div>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-4">
          {createMutation.error && (
            <div className="alert alert-error text-sm">
              <span>{createMutation.error.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="form-control">
              <div className="label">
                <span className="label-text">Project title</span>
              </div>
              <input
                type="text"
                placeholder="My Album Project"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                className="input input-bordered"
              />
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Description (optional)</span>
              </div>
              <textarea
                placeholder="A short description of this project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="textarea textarea-bordered resize-none"
              />
            </label>

            <div className="flex gap-2 justify-end mt-2">
              <Link to="/dashboard" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary gap-2"
                disabled={createMutation.isPending || !title.trim()}
              >
                {createMutation.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <FolderPlus className="w-4 h-4" />
                )}
                Create project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export const ProjectsNewRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/projects/new',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
    if (user.role === 'contributor') throw redirect({ to: '/dashboard' })
  },
  component: NewProjectPage,
})
