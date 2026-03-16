import { createRoute, redirect } from '@tanstack/react-router'
import { RootRoute } from './__root'
import { useAuthStore } from '../stores/auth.store'

export const IndexRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (user) {
      throw redirect({ to: '/dashboard' })
    } else {
      throw redirect({ to: '/login' })
    }
  },
  component: () => null,
})
