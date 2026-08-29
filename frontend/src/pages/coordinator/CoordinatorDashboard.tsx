import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Users, Briefcase, CheckSquare, Clock, Calendar, AlertTriangle, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/shared/StatCard'
import { PriorityBadge, StatusBadge } from '@/components/shared/Badge'
import { Button } from '@/components/ui/Button'
import { ParticleCard } from '@/components/ui/MagicBento'
import { usersService } from '@/api/users.service'
import { tasksService } from '@/api/tasks.service'
import { meetingsService } from '@/api/meetings.service'
import { formatDate, timeAgo } from '@/utils'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'

const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b']

export default function CoordinatorDashboard() {
  const qc = useQueryClient()
  const openTaskDrawer = useTaskDrawerStore((s) => s.open)

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersService.getAll })
  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: meetingsService.getAll })
  const { data: tasks = [] } = useQuery({ queryKey: ['staffTasks'], queryFn: tasksService.getStaffTasks })

  const totalManagers = users.filter((u) => u.role === 'manager').length
  const totalEmployees = users.filter((u) => u.role === 'employee').length
  const pendingTasks = tasks.filter((t) => !t.completed).length

  const recentMeetings = meetings.slice(0, 5)
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  // Warnings count
  const warningsList = tasks.filter((t) => {
    if (t.completed || !t.deadline) return false
    const diff = new Date(t.deadline).getTime() - Date.now()
    return diff > 0 && diff < 24 * 3600 * 1000 // within 24h
  })

  // Email trigger mutation
  const emailMutation = useMutation({
    mutationFn: tasksService.sendWarningEmails,
    onSuccess: () => {
      toast.success('Warning emails dispatched successfully!')
      qc.invalidateQueries({ queryKey: ['staffTasks'] })
    },
    onError: () => toast.error('Failed to send warning emails. Check SMTP configs.'),
  })

  // User role distribution
  const userChartData = useMemo(() => {
    const roles = ['coordinator', 'manager', 'employee', 'dev']
    return roles.map((role) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: users.filter((u) => u.role === role).length,
    })).filter((x) => x.value > 0)
  }, [users])

  // Task priority distribution
  const taskChartData = useMemo(() => {
    const prios = ['HIGH', 'MEDIUM', 'LOW']
    return prios.map((p) => ({
      name: p.charAt(0) + p.slice(1).toLowerCase(),
      value: tasks.filter((t) => t.priority === p).length,
    }))
  }, [tasks])


  return (
    <AppShell title="Dashboard" subtitle="Overview of your organisation">
      <div className="w-full max-w-full overflow-x-hidden">
        {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total Users"     value={users.length}     icon={Users}       iconColor="text-accent" />
        <StatCard label="Managers"        value={totalManagers}    icon={Briefcase}   iconColor="text-info" />
        <StatCard label="Employees"       value={totalEmployees}   icon={Users}       iconColor="text-success" />
        <StatCard label="Total Tasks"     value={tasks.length}     icon={CheckSquare} iconColor="text-warning" />
        <StatCard label="Pending Tasks"   value={pendingTasks}     icon={AlertTriangle} iconColor="text-danger" />
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* User distribution */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">User Distribution</h3>
          <div className="h-48 sm:h-44 font-mono text-[10px]">
            {userChartData.length === 0 ? (
              <p className="text-center py-16 text-text-muted">No users registered</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {userChartData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid #2a2a35', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Task Priorities bar chart */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Tasks by Priority</h3>
          <div className="h-48 sm:h-44 font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e1e28" vertical={false} />
                <XAxis dataKey="name" stroke="#60607a" tick={{ fontSize: 10 }} />
                <YAxis stroke="#60607a" allowDecimals={false} tick={{ fontSize: 10 }} width={25} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid #2a2a35', fontSize: '11px' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actionable Warning zone widget */}
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
                <AlertTriangle size={14} className="text-warning animate-pulse-subtle" />
                Deadline Warnings
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                There are <span className="font-bold text-warning font-mono">{warningsList.length}</span> active tasks currently approaching their deadlines.
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full mt-4"
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Meetings */}
        <div className="card">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-accent" />
              <h2 className="font-semibold text-text-primary text-sm">Recent Meetings</h2>
            </div>
            <span className="text-xs text-text-muted">{meetings.length} total</span>
          </div>
          <div className="divide-y divide-surface-border/50">
            {recentMeetings.length === 0 ? (
              <p className="text-center py-8 text-text-muted text-sm">No meetings yet</p>
            ) : recentMeetings.map((m) => (
              <div key={m.id} className="px-4 sm:px-5 py-3 hover:bg-surface-raised/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm font-medium text-text-primary truncate max-w-[65%]">{m.title}</p>
                  <span className="text-[11px] sm:text-xs text-text-muted flex-shrink-0">{timeAgo(m.created_at)}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-muted mt-0.5">{formatDate(m.created_at)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-accent" />
              <h2 className="font-semibold text-text-primary text-sm">Recent Tasks</h2>
            </div>
            <span className="text-xs text-text-muted">{tasks.length} total</span>
          </div>
          <div className="divide-y divide-surface-border/50">
            {recentTasks.length === 0 ? (
              <p className="text-center py-8 text-text-muted text-sm">No tasks yet</p>
            ) : recentTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => openTaskDrawer(t)}
                className="px-4 sm:px-5 py-3.5 hover:bg-surface-raised/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{t.title}</p>
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <StatusBadge completed={t.completed} verified={t.verified_by_manager} approved={t.approved_by_manager} />
                  <span className="text-[11px] sm:text-xs text-text-muted">
                    → {userMap[t.assignee_id]?.name ?? `User #${t.assignee_id}`}
                  </span>
                  {t.deadline && (
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs text-text-muted">
                      <Clock size={11} />
                      {formatDate(t.deadline)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </AppShell>
  )
}
