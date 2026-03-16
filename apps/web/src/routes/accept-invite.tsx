import { createRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, Loader } from 'lucide-react'
import { RootRoute } from './__root'
import { invites } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

interface AcceptInviteSearch {
  token: string
}

const acceptInviteSearchSchema = (search: Record<string, unknown>): AcceptInviteSearch => ({
  token: typeof search['token'] === 'string' ? search['token'] : '',
})

function AcceptInvitePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { token } = useSearch({ from: '/accept-invite' })

  const inviteQuery = useQuery({
    queryKey: ['invite', token],
    queryFn: () => invites.get(token),
    enabled: !!token,
  })

  const acceptMutation = useMutation({
    mutationFn: () => invites.accept(token),
    onSuccess: (data) => {
      void navigate({ to: '/projects/$id', params: { id: data.project_id } })
    },
  })

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/signup', search: { token } })
    }
  }, [user, token, navigate])

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="alert alert-error max-w-md">
          <span>Invalid invite link — no token provided.</span>
        </div>
      </div>
    )
  }

  if (inviteQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (inviteQuery.error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="alert alert-error max-w-md">
          <span>This invite is invalid or has expired.</span>
        </div>
      </div>
    )
  }

  const details = inviteQuery.data

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card bg-base-200 w-full max-w-md shadow-xl border border-base-300">
        <div className="card-body gap-6 items-center text-center">
          <div className="p-4 bg-success/10 rounded-full">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">You&apos;ve been invited!</h1>
            {details && (
              <p className="text-base-content/70">
                <strong>{details.inviter.display_name ?? 'Someone'}</strong> has
                invited you to collaborate on{' '}
                <strong>{details.project.title}</strong>
              </p>
            )}
          </div>

          {acceptMutation.error && (
            <div className="alert alert-error w-full text-sm">
              <span>{acceptMutation.error.message}</span>
            </div>
          )}

          <button
            className="btn btn-primary w-full"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Accept invite and join project'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export const AcceptInviteRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/accept-invite',
  validateSearch: acceptInviteSearchSchema,
  component: AcceptInvitePage,
})
