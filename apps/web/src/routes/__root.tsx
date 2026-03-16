import { createRootRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Music, LogOut, User, Shield, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import { auth, notifications } from '../lib/api'
import { NotificationBell } from '../components/NotificationBell'
import { useState, useEffect } from 'react'

function RootLayout() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleLogout = async () => {
    try {
      await auth.logout()
    } catch {
      // ignore logout errors
    }
    clearAuth()
    queryClient.clear()
    void navigate({ to: '/login' })
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-base-100">
      {user && (
        <nav className="navbar bg-base-200 border-b border-base-300 sticky top-0 z-50">
          <div className="navbar-start">
            <Link to="/dashboard" className="btn btn-ghost gap-2 text-lg font-bold">
              <Music className="w-5 h-5 text-primary" />
              <span className="hidden sm:inline">Gwenn Files</span>
            </Link>
          </div>

          <div className="navbar-end gap-1">
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBell />

            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                {user.avatar_url ? (
                  <div className="w-8 rounded-full">
                    <img src={user.avatar_url} alt={user.display_name ?? user.email} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm font-bold">
                    {(user.display_name ?? user.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <ul tabIndex={0} className="mt-3 z-[100] p-2 shadow menu menu-sm dropdown-content bg-base-200 rounded-box w-52 border border-base-300">
                <li className="menu-title px-2 py-1">
                  <span className="text-xs text-base-content/60 truncate">{user.email}</span>
                </li>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <li>
                    <Link to="/admin/users" className="gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  </li>
                )}
                <li>
                  <button onClick={handleLogout} className="gap-2 text-error">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      )}

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Outlet />
      </main>
    </div>
  )
}

export const RootRoute = createRootRoute({
  component: RootLayout,
})
