import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export function RoleRoute({ roles }: { roles: Role[] }) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

export function AuthRedirect() {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  switch (user?.role) {
    case 'coordinator': return <Navigate to="/coordinator/dashboard" replace />
    case 'manager':     return <Navigate to="/manager/dashboard" replace />
    case 'employee':
    case 'dev':         return <Navigate to="/employee/dashboard" replace />
    default:            return <Navigate to="/login" replace />
  }
}
