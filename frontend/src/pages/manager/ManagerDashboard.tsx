import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, CheckSquare, Clock, TrendingUp, AlertTriangle, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/shared/StatCard'
import { PriorityBadge, StatusBadge } from '@/components/shared/Badge'
import { Button } from '@/components/ui/Button'
import { ParticleCard } from '@/components/ui/MagicBento'
import { tasksService } from '@/api/tasks.service'
import { usersService } from '@/api/users.service'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'

export default function ManagerDashboard() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const openTaskDrawer = useTaskDrawerStore((s) => s.open)

  const { data: team = [] }        = useQuery({ queryKey: ['team'],         queryFn: usersService.getTeam })
  const { data: staffTasks = [] }  = useQuery({ queryKey: ['staffTasks'],   queryFn: tasksService.getStaffTasks })
  const { data: perf }             = useQuery({ queryKey: ['teamPerf'],      queryFn: tasksService.getTeamPerformance })
  const { data: warnings = [] }    = useQuery({ queryKey: ['teamWarnings'],  queryFn: tasksService.getTeamWarnings })

  const completedTasks = staffTasks.filter((t) => t.completed).length
  const pendingTasks   = staffTasks.filter((t) => !t.completed).length
  const userMap = Object.fromEntries(team.map((u) => [u.id, u.name]))

  // Verification requests
  const verificationQueue = useMemo(() => {
    return staffTasks.filter((t) => !t.approved_by_manager || (t.completed && !t.verified_by_manager))
  }, [staffTasks])

  // Top performers ranking
  const topPerformers = useMemo(() => {
    const counts = team.map((u) => {
      const uTasks = staffTasks.filter((t) => t.assignee_id === u.id)
      const comp = uTasks.filter((t) => t.completed).length
      return { name: u.name, completed: comp, total: uTasks.length }
    })
    return counts.sort((a, b) => b.completed - a.completed).slice(0, 3)
  }, [team, staffTasks])

  // Email trigger mutation
  const emailMutation = useMutation({
    mutationFn: tasksService.sendWarningEmails,
    onSuccess: () => {
      toast.success('Warning emails dispatched successfully!')
      qc.invalidateQueries({ queryKey: ['teamWarnings'] })
    },
    onError: () => toast.error('Failed to send warning emails. Check SMTP configs.'),
  })

  const pct = perf?.completion_percentage ?? '0%'

  return (
    <AppShell title="Manager Dashboard" subtitle="Your team's performance overview">
      <div>
        {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Team Members"    value={team.length}      icon={Users}        iconColor="text-accent" />
        <StatCard label="Total Tasks"     value={staffTasks.length} icon={CheckSquare}  iconColor="text-info" />
        <StatCard label="Completed"       value={completedTasks}   icon={TrendingUp}   iconColor="text-success" />
        <StatCard label="Pending"         value={pendingTasks}     icon={Clock}        iconColor="text-warning" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Performance summary card */}
        <ParticleCard
          className="card group p-4 sm:p-5 flex flex-col justify-between"
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
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-accent" />
                Team Performance
              </h3>
              <div className="text-center py-4">
                <div className="text-3xl sm:text-4xl font-bold text-gradient font-mono mb-1">{pct}</div>
                <p className="text-xs text-text-muted">Completion Rate</p>
              </div>
            </div>
            <div>
              <div className="h-2 bg-surface-raised rounded-full overflow-hidden mt-3 w-full">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: pct }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-text-muted">
                <span>{perf?.completed_tasks ?? 0} completed</span>
                <span>{perf?.pending_tasks ?? 0} pending</span>
              </div>
            </div>
          </div>
        </ParticleCard>

        {/* Warning zone card with email trigger button */}
        <ParticleCard
          className="card group p-4 sm:p-5 flex flex-col justify-between"
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
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-warning" />
                Deadline Warning Zone
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                There are currently <span className="font-bold text-warning font-mono">{warnings.length}</span> tasks approaching their deadlines.
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full mt-4 justify-center text-xs sm:text-sm font-medium"
              icon={<Mail size={14} />}
              loading={emailMutation.isPending}
              onClick={(e) => {
                e.stopPropagation()
                emailMutation.mutate()
              }}
            >
              Send Warning Emails
            </Button>
          </div>
        </ParticleCard>

        {/* Top performers ranking list */}
        <ParticleCard
          className="card group p-4 sm:p-5 flex flex-col justify-between"
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
              <h3 className="text-sm font-semibold text-text-primary mb-3">Top Performers</h3>
              <div className="space-y-2 w-full">
                {topPerformers.map((p, idx) => (
                  <div key={p.name} className="flex items-center justify-between p-2 bg-surface-raised/40 border border-surface-border rounded-lg">
                    <span className="text-xs font-semibold text-text-primary truncate max-w-[140px] sm:max-w-[180px]">#{idx + 1} {p.name}</span>
                    <span className="text-[10px] text-text-muted font-mono flex-shrink-0">{p.completed} / {p.total} completed</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ParticleCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Verification Queue preview */}
        <div className="card xl:col-span-2 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Awaiting Verification</h3>
            <Button size="sm" variant="ghost" onClick={() => navigate('/manager/verification')}>
              View Queue
            </Button>
          </div>
          <div className="divide-y divide-surface-border/50">
            {verificationQueue.length === 0 ? (
              <p className="text-center py-8 text-text-muted text-xs">No tasks currently awaiting verification.</p>
            ) : (
              verificationQueue.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTaskDrawer(t)}
                  className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-raised/55 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-semibold text-text-primary truncate">{t.title}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-text-muted">by {userMap[t.assignee_id]}</span>
                    <StatusBadge completed={t.completed} verified={t.verified_by_manager} approved={t.approved_by_manager} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actionable Warning zone feed */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-text-primary">Approaching Deadlines</h3>
          </div>
          <div className="divide-y divide-surface-border/50">
            {warnings.length === 0 ? (
              <p className="text-center py-8 text-text-muted text-xs">No critical deadlines</p>
            ) : (
              warnings.slice(0, 3).map((w) => (
                <div key={w.task_id} className="px-5 py-3">
                  <p className="text-xs font-semibold text-text-primary truncate">{w.title}</p>
                  <div className="flex justify-between mt-1 text-[10px] text-text-muted">
                    <span>{userMap[w.assignee_id ?? 0]}</span>
                    <span className="text-danger font-medium">{Math.round(w.remaining_hours)}h left</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  </AppShell>
  )
}
