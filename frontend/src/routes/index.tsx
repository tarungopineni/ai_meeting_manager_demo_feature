import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, RoleRoute, AuthRedirect } from './guards'

// Loading placeholder for lazy imports
function LazyLoading() {
  return (
    <div className="dark min-h-screen bg-surface-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        <p className="text-xs text-text-muted">Loading page...</p>
      </div>
    </div>
  )
}

// Lazy pages using relative paths for reliable dynamic imports
const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const ProfilePage = lazy(() => import('../pages/shared/ProfilePage'))

// Coordinator pages
const CoordinatorDashboard = lazy(() => import('../pages/coordinator/CoordinatorDashboard'))
const UsersPage = lazy(() => import('../pages/coordinator/UsersPage'))
const MeetingsPage = lazy(() => import('../pages/coordinator/MeetingsPage'))
const CoordinatorTasksPage = lazy(() => import('../pages/coordinator/CoordinatorTasksPage'))

// Manager pages
const ManagerDashboard = lazy(() => import('../pages/manager/ManagerDashboard'))
const MyTeamPage = lazy(() => import('../pages/manager/MyTeamPage'))
const ManagerTasksPage = lazy(() => import('../pages/manager/ManagerTasksPage'))
const EmployeePerformancePage = lazy(() => import('../pages/manager/EmployeePerformancePage'))
const VerificationQueuePage = lazy(() => import('../pages/manager/VerificationQueuePage'))

// Employee pages
const EmployeeDashboard = lazy(() => import('../pages/employee/EmployeeDashboard'))
const EmployeeTasksPage = lazy(() => import('../pages/employee/EmployeeTasksPage'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<LazyLoading />}>
      <Routes>
        {/* Public / Guest Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Area */}
        <Route element={<ProtectedRoute />}>
          {/* Dashboard-first role-based redirect */}
          <Route path="/" element={<AuthRedirect />} />

          {/* Coordinator Routes */}
          <Route element={<RoleRoute roles={['coordinator']} />}>
            <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
            <Route path="/coordinator/users" element={<UsersPage />} />
            <Route path="/coordinator/meetings" element={<MeetingsPage />} />
            <Route path="/coordinator/tasks" element={<CoordinatorTasksPage />} />
            <Route path="/coordinator/profile" element={<ProfilePage />} />
          </Route>

          {/* Manager Routes */}
          <Route element={<RoleRoute roles={['manager']} />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/manager/team" element={<MyTeamPage />} />
            <Route path="/manager/performance" element={<EmployeePerformancePage />} />
            <Route path="/manager/verification" element={<VerificationQueuePage />} />
            <Route path="/manager/tasks" element={<ManagerTasksPage />} />
            <Route path="/manager/profile" element={<ProfilePage />} />
          </Route>

          {/* Employee Routes */}
          <Route element={<RoleRoute roles={['employee', 'dev']} />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/tasks" element={<EmployeeTasksPage />} />
            <Route path="/employee/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
