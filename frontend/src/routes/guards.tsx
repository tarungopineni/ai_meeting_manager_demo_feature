import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types'

import { getRoleDashboard } from '@/utils'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export function RoleRoute({ roles }: { roles: Role[] }) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated() || !user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={getRoleDashboard(user.role)} replace />
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
