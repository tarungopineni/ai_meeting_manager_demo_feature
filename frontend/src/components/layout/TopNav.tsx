import { useState, useRef, useEffect } from 'react'
import { Bell, Search, AlertTriangle, ShieldAlert, CheckCircle, Calendar, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'
import { tasksService } from '@/api/tasks.service'
import { meetingsService } from '@/api/meetings.service'


interface TopNavProps {
  title: string
  subtitle?: string
}

interface AlertItem {
  id: string
  title: string
  description: string
  time?: string
  icon: React.ReactNode
  action: () => void
}

export function TopNav({ title, subtitle }: TopNavProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const openTaskDrawer = useTaskDrawerStore((s) => s.open)

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed_alerts')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => {
      const next = [...prev, id]
      localStorage.setItem('dismissed_alerts', JSON.stringify(next))
      return next
    })
  }

  const clearAllAlerts = () => {
    const allIds = activeAlertItems.map((item) => item.id)
    setDismissedAlerts((prev) => {
      const next = [...prev, ...allIds]
      localStorage.setItem('dismissed_alerts', JSON.stringify(next))
      return next
    })
  }

  // 1. Employee Alerts
  const { data: myWarnings = [] } = useQuery({
    queryKey: ['myWarnings'],
    queryFn: tasksService.getMyWarnings,
    enabled: !!user && (user.role === 'employee' || user.role === 'dev'),
  })

  // 2. Manager Alerts
  const { data: teamWarnings = [] } = useQuery({
    queryKey: ['teamWarnings'],
    queryFn: tasksService.getTeamWarnings,
    enabled: !!user && user.role === 'manager',
  })

  const { data: yetToVerify = [] } = useQuery({
    queryKey: ['yetToVerify'],
    queryFn: tasksService.getYetToVerify,
    enabled: !!user && user.role === 'manager',
  })

  // 3. Coordinator Alerts
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetingsAlerts'],
    queryFn: meetingsService.getAll,
    enabled: !!user && user.role === 'coordinator',
  })

  const { data: coordinatorTasks = [] } = useQuery({
    queryKey: ['coordinatorTasks'],
    queryFn: tasksService.getStaffTasks,
    enabled: !!user && user.role === 'coordinator',
  })

  // Build Alert items list based on user role
  const alertItems: AlertItem[] = []

  if (user?.role === 'employee' || user?.role === 'dev') {
    myWarnings.forEach((w) => {
      alertItems.push({
        id: `warning-${w.task_id}`,
        title: 'Approaching Deadline',
        description: `${w.title} (${Math.round(w.remaining_hours)}h left)`,
        icon: <Clock size={14} className="text-danger" />,
        action: () => {
          // Fetch full task details and open drawer
          tasksService.getNotVerified().then((list) => {
            const t = list.find((x) => x.id === w.task_id)
            if (t) openTaskDrawer(t)
          })
        },
      })
    })
  } else if (user?.role === 'manager') {
    teamWarnings.forEach((w) => {
      alertItems.push({
        id: `team-warning-${w.task_id}`,
        title: 'Team Warning',
        description: `${w.title} is close to deadline`,
        icon: <AlertTriangle size={14} className="text-warning" />,
        action: () => {
          tasksService.getStaffTasks().then((list) => {
            const t = list.find((x) => x.id === w.task_id)
            if (t) openTaskDrawer(t)
          })
        },
      })
    })

    yetToVerify.forEach((t) => {
      alertItems.push({
        id: `verify-req-${t.id}`,
        title: 'Verification Request',
        description: `${t.title} requires review`,
        icon: <ShieldAlert size={14} className="text-info" />,
        action: () => {
          navigate('/manager/verification')
        },
      })
    })
  } else if (user?.role === 'coordinator') {
    meetings.slice(0, 3).forEach((m) => {
      alertItems.push({
        id: `meeting-${m.id}`,
        title: 'New Meeting Uploaded',
        description: m.title,
        icon: <Calendar size={14} className="text-success" />,
        action: () => { navigate('/coordinator/meetings') },
      })
    })

    const overdueCount = coordinatorTasks.filter((t) => t.deadline && new Date(t.deadline).getTime() < Date.now() && !t.completed).length
    if (overdueCount > 0) {
      alertItems.push({
        id: 'coord-overdue',
        title: 'Overdue System Tasks',
        description: `${overdueCount} tasks require followup`,
        icon: <AlertTriangle size={14} className="text-danger" />,
        action: () => { navigate('/coordinator/tasks') },
      })
    }
  }

  const activeAlertItems = alertItems.filter((item) => !dismissedAlerts.includes(item.id))

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function triggerSearch() {
    // Dispatch Ctrl+K key event
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    )
  }

  return (
    <header className="fixed top-0 left-60 right-0 h-14 flex items-center justify-between
                       px-6 bg-surface-base/80 backdrop-blur-md border-b border-surface-border z-20">
      <div>
        <h1 className="font-semibold text-text-primary text-base leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          onClick={triggerSearch}
          className="w-8 h-8 rounded-lg hover:bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Search (Ctrl + K)"
        >
          <Search size={15} />
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg hover:bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors relative cursor-pointer"
          >
            <Bell size={15} />
            {activeAlertItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-surface-base">
                {activeAlertItems.length}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-in-up">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Notifications</span>
                <div className="flex items-center gap-2">
                  {activeAlertItems.length > 0 && (
                    <button
                      onClick={clearAllAlerts}
                      className="text-[10px] text-text-muted hover:text-accent font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  {activeAlertItems.length > 0 && (
                    <span className="badge bg-danger/10 text-danger border border-danger/20 text-[9px]">
                      {activeAlertItems.length} active
                    </span>
                  )}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-surface-border/30">
                {activeAlertItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-muted">
                    <CheckCircle size={20} className="text-success mx-auto mb-2 opacity-50" />
                    All caught up!
                  </div>
                ) : (
                  activeAlertItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => { item.action(); dismissAlert(item.id); setShowNotifications(false) }}
                      className="px-4 py-3 hover:bg-surface-raised/60 transition-colors cursor-pointer flex gap-3 items-start"
                    >
                      <div className="w-6 h-6 rounded bg-surface-raised flex items-center justify-center mt-0.5 flex-shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">{item.title}</p>
                        <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-surface-border" />
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm uppercase">
          {user?.username?.[0] ?? '?'}
        </div>
      </div>
    </header>
  )
}
