import { createRoute, Outlet, Link, redirect, useLocation } from '@tanstack/react-router'
import { Shield, Users } from 'lucide-react'
import { RootRoute } from './__root'
import { useAuthStore } from '../stores/auth.store'

function AdminLayout() {
  const location = useLocation()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      <div className="flex gap-2 border-b border-base-300 pb-0">
        <Link
          to="/admin/users"
          className={`tab tab-bordered gap-2 ${
            location.pathname === '/admin/users' ? 'tab-active' : ''
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </Link>
      </div>

      <Outlet />
    </div>
  )
}

export const AdminRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/admin',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/login' })
    if (user.role !== 'admin' && user.role !== 'manager') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AdminLayout,
})
