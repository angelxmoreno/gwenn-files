import { create } from 'zustand'
import type { User } from '@gwenn/shared'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem('gwenn_token', token)
    localStorage.setItem('gwenn_user', JSON.stringify(user))
    set({ user, token, isLoading: false })
  },

  clearAuth: () => {
    localStorage.removeItem('gwenn_token')
    localStorage.removeItem('gwenn_user')
    set({ user: null, token: null, isLoading: false })
  },

  initialize: () => {
    const token = localStorage.getItem('gwenn_token')
    const userRaw = localStorage.getItem('gwenn_user')
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User
        set({ user, token, isLoading: false })
      } catch {
        localStorage.removeItem('gwenn_token')
        localStorage.removeItem('gwenn_user')
        set({ user: null, token: null, isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },
}))
