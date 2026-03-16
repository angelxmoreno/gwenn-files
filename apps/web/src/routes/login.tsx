import { createRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Music, Mail, Lock, LogIn } from 'lucide-react'
import { RootRoute } from './__root'
import { auth } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth.store'

function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const loginMutation = useMutation({
    mutationFn: () => auth.login({ email, password }),
    onSuccess: (data) => {
      setAuth(data.user, data.token)
      void navigate({ to: '/dashboard' })
    },
  })

  const magicLinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
    },
    onSuccess: () => setMagicLinkSent(true),
  })

  const googleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) throw error
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  const error = loginMutation.error ?? magicLinkMutation.error ?? googleMutation.error

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card bg-base-200 w-full max-w-md shadow-xl border border-base-300">
        <div className="card-body gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <h1 className="card-title text-2xl">Sign in to Gwenn Files</h1>
          </div>

          {error && (
            <div className="alert alert-error text-sm">
              <span>{error.message}</span>
            </div>
          )}

          {magicLinkSent && (
            <div className="alert alert-success text-sm">
              <span>Magic link sent! Check your email.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  className="grow"
                />
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary gap-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Sign in
            </button>
          </form>

          <div className="divider text-xs">OR</div>

          <div className="flex flex-col gap-2">
            <button
              className="btn btn-outline gap-2"
              onClick={() => magicLinkMutation.mutate()}
              disabled={!email || magicLinkMutation.isPending}
            >
              {magicLinkMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Send magic link
            </button>

            <button
              className="btn btn-outline gap-2"
              onClick={() => googleMutation.mutate()}
              disabled={googleMutation.isPending}
            >
              {googleMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </button>
          </div>

          <p className="text-center text-sm text-base-content/60">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="link link-primary">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export const LoginRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/login',
  component: LoginPage,
})
