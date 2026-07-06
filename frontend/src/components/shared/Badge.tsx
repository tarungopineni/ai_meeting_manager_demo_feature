import { cn, priorityConfig, roleConfig } from '@/utils'
import type { Priority } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
}

const variantMap = {
  default: 'bg-accent/15 text-accent border border-accent/25',
  success: 'bg-success/15 text-success border border-success/25',
  warning: 'bg-warning/15 text-warning border border-warning/25',
  danger:  'bg-danger/15 text-danger border border-danger/25',
  info:    'bg-info/15 text-info border border-info/25',
  muted:   'bg-surface-muted/30 text-text-secondary border border-surface-border',
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn('badge', variantMap[variant], className)}>
      {children}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority | string | null | undefined }) {
  const p = (priority || 'MEDIUM').toUpperCase() as Priority
  const cfg = priorityConfig[p] || priorityConfig.MEDIUM
  return (
    <span className={cn('badge', cfg.className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full',
        p === 'HIGH' ? 'bg-danger' : p === 'MEDIUM' ? 'bg-warning' : 'bg-success'
      )} />
      {cfg.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string | null | undefined }) {
  const r = role || 'employee'
  const cfg = roleConfig[r] || roleConfig.employee
  return <span className={cn('badge', cfg.className)}>{cfg.label}</span>
}

export function StatusBadge({ completed, verified, approved }: { completed: boolean; verified: boolean; approved: boolean }) {
  if (approved && verified && completed)  return <Badge variant="success">Verified</Badge>
  if (approved && completed && !verified) return <Badge variant="warning">Pending Review</Badge>
  if (!approved) return <Badge variant="info">Awaiting Approval</Badge>
  return <Badge variant="muted">In Progress</Badge>
}
