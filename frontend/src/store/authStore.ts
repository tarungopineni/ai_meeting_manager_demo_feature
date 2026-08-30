import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, Role } from '@/types'
import { jwtDecode } from 'jwt-decode'

interface JwtPayload {
  sub: string
  id: number
  role: Role
  is_demo?: boolean
  demo_session_id?: string | null
  exp: number
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setToken: (token: string, remember?: boolean) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setToken: (token: string) => {
        try {
          const decoded = jwtDecode<JwtPayload>(token)
          set({
            token,
            user: {
              id: decoded.id,
              username: decoded.sub,
              role: decoded.role,
              is_demo: decoded.is_demo ?? false,
              demo_session_id: decoded.demo_session_id ?? null,
            },
          })
        } catch {
          set({ token: null, user: null })
        }
      },

      logout: () => {
        set({ token: null, user: null })
        localStorage.removeItem('auth-storage')
      },

      isAuthenticated: () => {
        const { token } = get()
        if (!token) return false
        try {
          const decoded = jwtDecode<JwtPayload>(token)
          return decoded.exp * 1000 > Date.now()
        } catch {
          return false
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
