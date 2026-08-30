import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const getBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL

  if (import.meta.env.DEV) {
    // In local dev mode, prefer local uvicorn unless explicitly configured with non-render URL
    if (envUrl && envUrl.trim() && !envUrl.includes('onrender.com')) {
      return envUrl.trim().replace(/\/+$/, '')
    }
    return 'http://127.0.0.1:8000'
  }

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '')
  }

  // Fallback to production Render backend URL if VITE_BACKEND_URL is missing during build
  return 'https://ai-meeting-manager.onrender.com'
}

const api = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Handle 401 globally — logout and redirect
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api