import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, CheckSquare, User,
  LogOut, ChevronRight, Briefcase, Shield, TrendingUp, ShieldCheck
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils'
import type { Role } from '@/types'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

const navByRole: Record<Role, NavItem[]> = {
  coordinator: [
    { label: 'Dashboard',  to: '/coordinator/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Users',      to: '/coordinator/users',     icon: <Users size={16} /> },
    { label: 'Meetings',   to: '/coordinator/meetings',  icon: <Calendar size={16} /> },
    { label: 'Tasks',      to: '/coordinator/tasks',     icon: <CheckSquare size={16} /> },
    { label: 'Profile',    to: '/coordinator/profile',   icon: <User size={16} /> },
  ],
  manager: [
    { label: 'Dashboard',   to: '/manager/dashboard',   icon: <LayoutDashboard size={16} /> },
    { label: 'My Team',     to: '/manager/team',        icon: <Briefcase size={16} /> },
    { label: 'Performance', to: '/manager/performance', icon: <TrendingUp size={16} /> },
    { label: 'Verification',to: '/manager/verification',icon: <ShieldCheck size={16} /> },
    { label: 'Tasks',       to: '/manager/tasks',       icon: <CheckSquare size={16} /> },
    { label: 'Profile',     to: '/manager/profile',     icon: <User size={16} /> },
  ],
  employee: [
    { label: 'Dashboard',  to: '/employee/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'My Tasks',   to: '/employee/tasks',     icon: <CheckSquare size={16} /> },
    { label: 'Profile',    to: '/employee/profile',   icon: <User size={16} /> },
  ],
  dev: [
    { label: 'Dashboard',  to: '/employee/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'My Tasks',   to: '/employee/tasks',     icon: <CheckSquare size={16} /> },
    { label: 'Profile',    to: '/employee/profile',   icon: <User size={16} /> },
  ],
}

const roleIcon: Record<Role, React.ReactNode> = {
  coordinator: <Shield size={12} className="text-accent" />,
  manager:     <Briefcase size={12} className="text-info" />,
  employee:    <User size={12} className="text-text-secondary" />,
  dev:         <ChevronRight size={12} className="text-warning" />,
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = user?.role ?? 'employee'
  const items = navByRole[role] ?? []

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-surface-card/85 backdrop-blur-md border-r border-surface-border z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-surface-border">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-white font-bold text-xs">EM</span>
        </div>
        <div>
          <span className="font-semibold text-text-primary text-sm">EMS</span>
          <p className="text-[10px] text-text-muted leading-none">Employee Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn('sidebar-item', isActive && 'active')
            }
          >
            <span className="opacity-70">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-surface-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-raised mb-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm uppercase">
            {user?.username?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">{user?.username}</p>
            <div className="flex items-center gap-1">
              {roleIcon[role as Role]}
              <p className="text-[10px] text-text-muted capitalize">{role}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full sidebar-item text-danger hover:text-danger hover:bg-danger/10"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
