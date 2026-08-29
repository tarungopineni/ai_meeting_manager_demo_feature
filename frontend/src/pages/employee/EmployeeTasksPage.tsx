import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Filter, CheckSquare, Clock, ShieldCheck, Hourglass } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { PriorityBadge, StatusBadge } from '@/components/shared/Badge'
import { Button } from '@/components/ui/Button'
import { ParticleCard, GlobalSpotlight } from '@/components/ui/MagicBento'
import { tasksService } from '@/api/tasks.service'
import { formatDate, isOverdue } from '@/utils'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'

type TabType = 'all' | 'verified' | 'awaiting'

export default function EmployeeTasksPage() {
  const qc = useQueryClient()
  const openTaskDrawer = useTaskDrawerStore((s) => s.open)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [priorityFilter, setPriorityFilter] = useState('')

  // 1. Fetch Verified Tasks
  const { data: verified = [], isLoading: loadingV } = useQuery({
    queryKey: ['verifiedTasks'],
    queryFn: tasksService.getVerified,
  })

  // 2. Fetch Not Verified Tasks
  const { data: unverified = [], isLoading: loadingU } = useQuery({
    queryKey: ['unverifiedTasks'],
    queryFn: tasksService.getNotVerified,
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => tasksService.markCompleted(id),
    onSuccess: () => {
      toast.success('Task marked as completed!')
      qc.invalidateQueries({ queryKey: ['verifiedTasks'] })
      qc.invalidateQueries({ queryKey: ['unverifiedTasks'] })
      qc.invalidateQueries({ queryKey: ['myPerformance'] })
    },
    onError: (e: any) => {
      const msg = e.response?.data?.detail ?? 'Failed to update task'
      toast.error(msg)
    },
  })

  // Combine lists
  const allTasks = verified

  // Filter tasks based on active Tab and Priority
  const filteredTasks = useMemo(() => {
    let list = [...allTasks]
    if (activeTab === 'verified') {
      list = verified
    } else if (activeTab === 'awaiting') {
      list = unverified
    }

    if (priorityFilter) {
      list = list.filter((t) => t.priority?.toUpperCase() === priorityFilter)
    }
    return list
  }, [allTasks, verified, unverified, activeTab, priorityFilter])

  // Count items for tab badges
  const badgeCounts = useMemo(() => ({
    all: verified.length,
    verified: verified.length,
    awaiting: unverified.length,
  }), [verified, unverified])

  const isLoading = loadingV || loadingU

  const tasksGridRef = useRef<HTMLDivElement>(null)

  return (
    <AppShell title="My Tasks" subtitle="Tasks assigned directly to you">
      {/* Dynamic Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-border mb-6">
        <div className="flex overflow-x-auto gap-1 pb-1 md:pb-0 scrollbar-none max-w-full touch-pan-x">
          {[
            { key: 'all', label: 'All Tasks', count: badgeCounts.all, icon: <CheckSquare size={14} /> },
            { key: 'verified', label: 'Verified', count: badgeCounts.verified, icon: <ShieldCheck size={14} /> },
            { key: 'awaiting', label: 'Awaiting Verification', count: badgeCounts.awaiting, icon: <Hourglass size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === tab.key ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-text-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 pb-2 md:pb-0 w-full sm:w-auto">
          <Filter size={13} className="text-text-muted flex-shrink-0" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-base text-xs w-full sm:w-36"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      <div ref={tasksGridRef} className="bento-section">
        <GlobalSpotlight gridRef={tasksGridRef} glowColor="99, 102, 241" />

        {/* Grid: Task Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 sm:p-5 animate-pulse space-y-3">
                <div className="h-4 bg-surface-raised rounded w-2/3" />
                <div className="h-3 bg-surface-raised rounded w-full" />
                <div className="h-6 bg-surface-raised rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <CheckSquare size={36} className="text-text-muted mx-auto mb-3" />
            <h3 className="text-text-primary font-medium text-xs sm:text-sm">No tasks found</h3>
            <p className="text-[11px] sm:text-xs text-text-muted mt-1">Adjust filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTasks.map((t) => {
              const isTaskOverdue = t.deadline && isOverdue(t.deadline) && !t.completed
              return (
                <ParticleCard
                  key={t.id}
                  onClick={() => openTaskDrawer(t)}
                  className="card group p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
                  style={{
                    '--glow-color': '99, 102, 241',
                  } as React.CSSProperties}
                  particleCount={6}
                  glowColor="99, 102, 241"
                  enableTilt={true}
                  enableMagnetism={true}
                  clickEffect={true}
                >
                  <div className="relative z-10 w-full flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-text-primary line-clamp-1">{t.title}</h3>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                        {t.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-surface-border/50 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                          <Clock size={12} />
                          <span className={isTaskOverdue ? 'text-danger font-medium' : ''}>
                            {t.deadline_text ?? formatDate(t.deadline)}
                          </span>
                        </div>
                        {isTaskOverdue && (
                          <span className="badge bg-danger/10 text-danger border border-danger/20 text-[10px] py-0 px-1.5">
                            Overdue
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                         <StatusBadge completed={t.completed} verified={t.verified_by_manager} approved={t.approved_by_manager} />
                        {!t.completed && t.approved_by_manager && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              completeMutation.mutate(t.id)
                            }}
                            loading={completeMutation.isPending && completeMutation.variables === t.id}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </ParticleCard>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
