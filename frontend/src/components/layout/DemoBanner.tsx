import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Shield, Briefcase, User, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/api/auth.service'
import { getRoleDashboard } from '@/utils'
import type { Role } from '@/types'

const roles: { role: Role; label: string; icon: React.ReactNode }[] = [
  { role: 'coordinator', label: 'Coordinator', icon: <Shield size={13} /> },
  { role: 'manager', label: 'Manager', icon: <Briefcase size={13} /> },
  { role: 'employee', label: 'Employee', icon: <User size={13} /> },
]

export function DemoBanner() {
  const { user, setToken } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [switchingRole, setSwitchingRole] = useState<Role | null>(null)

  if (!user?.is_demo) {
    return null
  }

  async function handleSwitchRole(targetRole: Role) {
    if (user?.role === targetRole || switchingRole) return
    setSwitchingRole(targetRole)
    try {
      const { access_token } = await authService.switchDemoRole(targetRole)
      queryClient.clear()
      setToken(access_token)
      navigate(getRoleDashboard(targetRole), { replace: true })
      toast.success(`Switched role to ${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to switch demo role'
      toast.error(msg)
    } finally {
      setSwitchingRole(null)
    }
  }

  return (
    <div className="bg-gradient-to-r from-accent/20 via-surface-card to-accent/10 border-b border-accent/30 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs z-30 relative shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold text-[11px] border border-accent/40 flex-shrink-0 glow-accent">
          <Sparkles size={12} className="animate-pulse" />
          DEMO MODE
        </span>
        <span className="text-text-muted hidden sm:inline truncate text-[11px]">
          Session: <code className="bg-surface-raised px-1 py-0.5 rounded text-accent font-mono text-[10px]">{user.demo_session_id ?? 'active'}</code>
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <span className="text-text-secondary font-medium hidden md:inline text-[11px]">Switch Role:</span>
        <div className="flex items-center gap-1 bg-surface-base/60 p-1 rounded-lg border border-surface-border">
          {roles.map(({ role, label, icon }) => {
            const isActive = user.role === role
            const isPending = switchingRole === role
            return (
              <button
                key={role}
                onClick={() => handleSwitchRole(role)}
                disabled={isActive || !!switchingRole}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white shadow-sm glow-accent'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-raised/80'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isPending ? <RefreshCw size={12} className="animate-spin" /> : icon}
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
