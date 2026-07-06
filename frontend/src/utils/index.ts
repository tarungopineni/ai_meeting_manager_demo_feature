import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isValid, parseISO } from 'date-fns'
import type { Priority } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, 'MMM d, yyyy') : '—'
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, 'MMM d, yyyy HH:mm') : '—'
  } catch {
    return '—'
  }
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—'
  } catch {
    return '—'
  }
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? isPast(d) : false
  } catch {
    return false
  }
}

export const priorityConfig: Record<Priority, { label: string; className: string }> = {
  HIGH:   { label: 'High',   className: 'bg-danger/20 text-danger border border-danger/30' },
  MEDIUM: { label: 'Medium', className: 'bg-warning/20 text-warning border border-warning/30' },
  LOW:    { label: 'Low',    className: 'bg-success/20 text-success border border-success/30' },
}

export const roleConfig: Record<string, { label: string; className: string }> = {
  coordinator: { label: 'Coordinator', className: 'bg-accent/20 text-accent border border-accent/30' },
  manager:     { label: 'Manager',     className: 'bg-info/20 text-info border border-info/30' },
  employee:    { label: 'Employee',    className: 'bg-surface-muted/40 text-text-secondary border border-surface-border' },
  dev:         { label: 'Dev',         className: 'bg-warning/20 text-warning border border-warning/30' },
}

export function getRoleDashboard(role: string): string {
  switch (role) {
    case 'coordinator': return '/coordinator/dashboard'
    case 'manager':     return '/manager/dashboard'
    case 'employee':
    case 'dev':         return '/employee/dashboard'
    default:            return '/login'
  }
}
