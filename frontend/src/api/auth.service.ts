import axios from 'axios'
import type { LoginResponse } from '@/types'

const API_URL = import.meta.env.VITE_API_URL

// Auth uses OAuth2 form, not JSON
export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)

    const res = await axios.post<LoginResponse>(
      `${API_URL}/auth/token`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    return res.data
  },
}