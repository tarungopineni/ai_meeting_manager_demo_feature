import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, FileText, User, Calendar, Settings, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'
import { usersService } from '@/api/users.service'
import { tasksService } from '@/api/tasks.service'
import { meetingsService } from '@/api/meetings.service'


interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  category: 'Pages' | 'Tasks' | 'Users' | 'Meetings'
  icon: React.ReactNode
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const navigate = useNavigate()
  const { user } = useAuthStore()
  const openTaskDrawer = useTaskDrawerStore((s) => s.open)

  // Listen for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setActiveIndex(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch contextual search data
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll,
    enabled: open && user?.role === 'coordinator',
  })

  const { data: team = [] } = useQuery({
    queryKey: ['team'],
    queryFn: usersService.getTeam,
    enabled: open && user?.role === 'manager',
  })

  const { data: staffTasks = [] } = useQuery({
    queryKey: ['staffTasks'],
    queryFn: tasksService.getStaffTasks,
    enabled: open && (user?.role === 'manager' || user?.role === 'coordinator'),
  })

  const { data: verifiedTasks = [] } = useQuery({
    queryKey: ['verifiedTasks'],
    queryFn: tasksService.getVerified,
    enabled: open && (user?.role === 'employee' || user?.role === 'dev'),
  })

  const { data: unverifiedTasks = [] } = useQuery({
    queryKey: ['unverifiedTasks'],
    queryFn: tasksService.getNotVerified,
    enabled: open && (user?.role === 'employee' || user?.role === 'dev'),
  })

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: meetingsService.getAll,
    enabled: open && user?.role === 'coordinator',
  })

  const allTasks = useMemo(() => {
    if (user?.role === 'employee' || user?.role === 'dev') {
      return [...verifiedTasks, ...unverifiedTasks]
    }
    return staffTasks
  }, [user, staffTasks, verifiedTasks, unverifiedTasks])

  // Build searchable items list
  const items = useMemo(() => {
    const result: PaletteItem[] = []
    if (!user) return result

    // 1. Pages
    const pages: { label: string; to: string }[] = []
    if (user.role === 'coordinator') {
      pages.push(
        { label: 'Dashboard', to: '/coordinator/dashboard' },
        { label: 'Users Directory', to: '/coordinator/users' },
        { label: 'Meetings Management', to: '/coordinator/meetings' },
        { label: 'Tasks Control', to: '/coordinator/tasks' },
        { label: 'My Profile', to: '/coordinator/profile' }
      )
    } else if (user.role === 'manager') {
      pages.push(
        { label: 'Dashboard', to: '/manager/dashboard' },
        { label: 'My Team Members', to: '/manager/team' },
        { label: 'Team Tasks Feed', to: '/manager/tasks' },
        { label: 'Employee Performance Metrics', to: '/manager/performance' },
        { label: 'Verification Queue', to: '/manager/verification' },
        { label: 'My Profile', to: '/manager/profile' }
      )
    } else {
      pages.push(
        { label: 'Dashboard', to: '/employee/dashboard' },
        { label: 'My Assigned Tasks', to: '/employee/tasks' },
        { label: 'My Profile', to: '/employee/profile' }
      )
    }

    pages.forEach((p) => {
      result.push({
        id: `page-${p.to}`,
        title: p.label,
        subtitle: `Go to ${p.label}`,
        category: 'Pages',
        icon: <Settings size={14} className="text-accent" />,
        action: () => { navigate(p.to); setOpen(false) },
      })
    })

    // 2. Tasks
    allTasks.forEach((t) => {
      result.push({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: `Task #${t.id} • ${t.priority} priority`,
        category: 'Tasks',
        icon: <FileText size={14} className="text-text-secondary" />,
        action: () => { openTaskDrawer(t); setOpen(false) },
      })
    })

    // 3. Users (coordinator / manager team)
    const activeUsers = user.role === 'coordinator' ? users : team
    activeUsers.forEach((u) => {
      result.push({
        id: `user-${u.id}`,
        title: u.name,
        subtitle: `@${u.username} • ${u.role}`,
        category: 'Users',
        icon: <User size={14} className="text-info" />,
        action: () => {
          if (user.role === 'coordinator') navigate('/coordinator/users')
          else navigate('/manager/team')
          setOpen(false)
        },
      })
    })

    // 4. Meetings (coordinator only)
    if (user.role === 'coordinator') {
      meetings.forEach((m) => {
        result.push({
          id: `meeting-${m.id}`,
          title: m.title,
          subtitle: `Meeting #${m.id} • ${m.summary?.substring(0, 40) ?? ''}...`,
          category: 'Meetings',
          icon: <Calendar size={14} className="text-success" />,
          action: () => { navigate('/coordinator/meetings'); setOpen(false) },
        })
      })
    }

    return result
  }, [user, allTasks, users, team, meetings, navigate, openTaskDrawer])

  // Filter items
  const filtered = useMemo(() => {
    if (!query) return items.slice(0, 15) // Limit initial items
    const q = query.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    )
  }, [items, query])

  // Keyboard navigation inside list
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIndex]) {
          filtered[activeIndex].action()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, activeIndex])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />

      {/* Palette Box */}
      <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh] animate-slide-in-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
          <Search size={18} className="text-text-muted flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
            placeholder="Type page name, task, or team member..."
            className="w-full bg-transparent border-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
          />
          <span className="text-[10px] bg-surface-raised border border-surface-border px-1.5 py-0.5 rounded text-text-muted font-mono select-none">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border/20 p-2">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-text-muted">No results found for "{query}"</p>
          ) : (
            filtered.map((item, idx) => {
              const isActive = idx === activeIndex
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    isActive ? 'bg-surface-raised border border-surface-border' : 'border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${isActive ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-text-muted'}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{item.title}</p>
                      {item.subtitle && <p className="text-[10px] text-text-muted truncate mt-0.5">{item.subtitle}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-medium text-text-muted bg-surface-raised border border-surface-border/50 px-1 py-0.5 rounded uppercase">
                      {item.category}
                    </span>
                    {isActive && <ArrowRight size={10} className="text-accent" />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-raised border-t border-surface-border px-4 py-2 flex items-center justify-between text-[10px] text-text-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Ctrl + K to toggle</span>
        </div>
      </div>
    </div>
  )
}
