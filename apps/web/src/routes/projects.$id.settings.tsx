import { createRoute, useParams, useNavigate, Link, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, Save, Loader, AlertTriangle } from 'lucide-react'
import { RootRoute } from './__root'
import { projects } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

function ProjectSettingsPage() {
  const { id } = useParams({ from: '/projects/$id/settings' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const projectQuery = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projects.get(id),
  })

  useEffect(() => {
    if (projectQuery.data) {
      setTitle(projectQuery.data.title)
      setDescription(projectQuery.data.description ?? '')
    }
  }, [projectQuery.data])

  const updateMutation = useMutation({
    mutationFn: () =>
      projects.update(id, {
        title: title || undefined,
        description: description || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['projects', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => projects.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      void navigate({ to: '/dashboard' })
    },
  })

  const canManage =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    projectQuery.data?.owner_id === user?.id

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="alert alert-error max-w-md">
          <span>You don&apos;t have permission to edit this project.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/projects/$id"
          params={{ id }}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-4">
          <h2 className="card-title text-lg">General</h2>

          {updateMutation.isSuccess && (
            <div className="alert alert-success text-sm">
              <span>Settings saved.</span>
            </div>
          )}

          {updateMutation.error && (
            <div className="alert alert-error text-sm">
              <span>{updateMutation.error.message}</span>
            </div>
          )}

          <label className="form-control">
            <div className="label">
              <span className="label-text">Project title</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              className="input input-bordered"
            />
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text">Description</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="textarea textarea-bordered resize-none"
            />
          </label>

          <div className="flex justify-end">
            <button
              className="btn btn-primary gap-2"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !title.trim()}
            >
              {updateMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save changes
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 border border-error/30">
        <div className="card-body gap-4">
          <h2 className="card-title text-lg text-error">Danger Zone</h2>
          <p className="text-sm text-base-content/60">
            Deleting a project is permanent and cannot be undone. All tracks,
            comments, and files will be removed.
          </p>

          {!showDeleteConfirm ? (
            <button
              className="btn btn-outline btn-error gap-2 w-fit"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete project
            </button>
          ) : (
            <div className="flex flex-col gap-3 p-4 bg-error/10 rounded-box border border-error/30">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Are you absolutely sure?</span>
              </div>
              <p className="text-sm">
                This will permanently delete <strong>{projectQuery.data?.title}</strong> and all its contents.
              </p>
              <div className="flex gap-2">
                <button
                  className="btn btn-error gap-2"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Yes, delete it
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const ProjectSettingsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/projects/$id/settings',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
  },
  component: ProjectSettingsPage,
})
