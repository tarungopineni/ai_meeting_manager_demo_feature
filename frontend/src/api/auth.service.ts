import api from './axios'
import type { LoginResponse, Role } from '@/types'

// Auth uses OAuth2 form, not JSON
export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)

    const res = await api.post<LoginResponse>(
      '/auth/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    return res.data
  },

  startDemo: async (initialRole: Role = 'manager'): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>(
      `/auth/demo?initial_role=${initialRole}`
    )
    return res.data
  },

  switchDemoRole: async (role: Role): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>(
      '/auth/demo/switch-role',
      { role }
    )
    return res.data
  },
}