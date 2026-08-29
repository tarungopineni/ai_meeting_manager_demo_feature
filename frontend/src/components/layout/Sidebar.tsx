import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, CheckSquare, User,
  LogOut, ChevronRight, Briefcase, Shield, TrendingUp, ShieldCheck, X
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils'
import type { Role } from '@/types'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
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

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = user?.role ?? 'employee'
  const items = navByRole[role] ?? []

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleLogout() {
    onClose?.()
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-60 flex flex-col bg-surface-card/95 backdrop-blur-md border-r border-surface-border z-40',
          'transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Logo and Mobile Close button */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-xs">EM</span>
            </div>
            <div>
              <span className="font-semibold text-text-primary text-sm">EMS</span>
              <p className="text-[10px] text-text-muted leading-none">Employee Management</p>
            </div>
          </div>
          {/* Close button on mobile view */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-raised transition-colors"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose?.()}
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
    </>
  )
}
