import { createRoute, useNavigate, Link, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Music, Mail, Lock, User } from 'lucide-react'
import { RootRoute } from './__root'
import { auth, invites } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

interface SignupSearch {
  token?: string
}

const signupSearchSchema = (search: Record<string, unknown>): SignupSearch => ({
  token: typeof search['token'] === 'string' ? search['token'] : undefined,
})

function SignupPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { token } = useSearch({ from: '/signup' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  const inviteQuery = useQuery({
    queryKey: ['invite', token],
    queryFn: () => invites.get(token!),
    enabled: !!token,
  })

  useEffect(() => {
    if (inviteQuery.data?.invite.invited_email) {
      setEmail(inviteQuery.data.invite.invited_email)
    }
  }, [inviteQuery.data])

  const signupMutation = useMutation({
    mutationFn: () =>
      auth.signup({
        email,
        password,
        display_name: displayName || undefined,
        invite_token: token,
      }),
    onSuccess: (data) => {
      setAuth(data.user, data.token)
      void navigate({ to: '/dashboard' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    signupMutation.mutate()
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card bg-base-200 w-full max-w-md shadow-xl border border-base-300">
        <div className="card-body gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <h1 className="card-title text-2xl">Create your account</h1>
            {inviteQuery.data && (
              <p className="text-sm text-base-content/70 text-center">
                You&apos;ve been invited to join{' '}
                <strong>{inviteQuery.data.project.title}</strong> by{' '}
                {inviteQuery.data.inviter.display_name ?? 'someone'}
              </p>
            )}
          </div>

          {signupMutation.error && (
            <div className="alert alert-error text-sm">
              <span>{signupMutation.error.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="form-control">
              <div className="label">
                <span className="label-text">Display name (optional)</span>
              </div>
              <div className="input input-bordered flex items-center gap-2">
                <User className="w-4 h-4 opacity-50" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="grow"
                />
              </div>
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Email</span>
              </div>
              <div className="input input-bordered flex items-center gap-2">
                <Mail className="w-4 h-4 opacity-50" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={!!inviteQuery.data}
                  className="grow"
                />
              </div>
            </label>

            <label className="form-control">
              <div className="label">
                <span className="label-text">Password</span>
              </div>
              <div className="input input-bordered flex items-center gap-2">
                <Lock className="w-4 h-4 opacity-50" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="grow"
                />
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-base-content/60">
            Already have an account?{' '}
            <Link to="/login" className="link link-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export const SignupRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/signup',
  validateSearch: signupSearchSchema,
  component: SignupPage,
})
