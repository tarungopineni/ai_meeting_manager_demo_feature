import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { CheckSquare, Clock, AlertTriangle, Calendar, TrendingUp, ShieldCheck, Hourglass } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/shared/StatCard'
import { PriorityBadge } from '@/components/shared/Badge'
import { tasksService } from '@/api/tasks.service'
import { formatDate, isOverdue } from '@/utils'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444']

export default function EmployeeDashboard() {
  const openTaskDrawer = useTaskDrawerStore((s) => s.open)

  const { data: verified = [], isLoading: loadingV } = useQuery({
    queryKey: ['verifiedTasks'],
    queryFn: tasksService.getVerified,
  })

  const { data: unverified = [], isLoading: loadingU } = useQuery({
    queryKey: ['unverifiedTasks'],
    queryFn: tasksService.getNotVerified,
  })

  const { data: warnings = [] } = useQuery({
    queryKey: ['myWarnings'],
    queryFn: tasksService.getMyWarnings,
  })

  const { data: perf } = useQuery({
    queryKey: ['myPerformance'],
    queryFn: tasksService.getPerformanceReport,
  })

  const allTasks = verified
  const completedTasks = allTasks.filter((t) => t.completed).length
  const pendingTasks = allTasks.filter((t) => !t.completed).length
  const verifiedCount = allTasks.filter((t) => t.completed && t.verified_by_manager).length
  const awaitingCount = unverified.length
  const overdueCount = allTasks.filter((t) => !t.completed && t.deadline && isOverdue(t.deadline)).length

  // Filter nearest deadline
  const nearestTask = useMemo(() => {
    const pend = allTasks.filter((t) => !t.completed && t.deadline)
    if (pend.length === 0) return null
    return pend.sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0]
  }, [allTasks])

  // Countdown timer calculation
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!nearestTask || !nearestTask.deadline) {
      setTimeLeft('')
      return
    }
    function updateTimer() {
      const diff = new Date(nearestTask!.deadline!).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Overdue')
        return
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${hrs}h ${mins}m`)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [nearestTask])

  // Recharts: Priority distribution
  const priorityChartData = useMemo(() => {
    const high = allTasks.filter((t) => t.priority === 'HIGH').length
    const med = allTasks.filter((t) => t.priority === 'MEDIUM').length
    const low = allTasks.filter((t) => t.priority === 'LOW').length
    return [
      { name: 'High', value: high },
      { name: 'Medium', value: med },
      { name: 'Low', value: low },
    ].filter((x) => x.value > 0)
  }, [allTasks])

  // Recharts: Status distribution
  const statusChartData = useMemo(() => {
    return [
      { name: 'Pending', value: pendingTasks },
      { name: 'Awaiting Review', value: awaitingCount },
      { name: 'Verified', value: verifiedCount },
    ]
  }, [pendingTasks, awaitingCount, verifiedCount])

  const upcomingTasks = useMemo(() => {
    return allTasks
      .filter((t) => !t.completed)
      .sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
      .slice(0, 5)
  }, [allTasks])

  if (loadingV || loadingU) {
    return (
      <AppShell title="Dashboard" subtitle="Overview">
        <div className="h-60 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      </AppShell>
    )
  }

  const pct = perf?.completion_percentage ?? '0%'

  return (
    <AppShell title="Dashboard" subtitle="Your tasks and productivity highlights">
      <div>
        
        {/* Dynamic Alert Banner */}
        {warnings.length > 0 && (
        <div className="card border-danger/30 bg-danger/10 p-4 mb-6 flex items-start gap-3 animate-pulse-subtle">
          <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-text-primary">Urgent Warnings</h4>
            <p className="text-xs text-text-secondary mt-0.5">
              You have {warnings.length} task(s) approaching deadlines. Please review them immediately.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total Tasks" value={allTasks.length} icon={CheckSquare} iconColor="text-accent" />
        <StatCard label="Pending" value={pendingTasks} icon={Clock} iconColor="text-warning" />
        <StatCard label="Completed" value={completedTasks} icon={TrendingUp} iconColor="text-success" />
        <StatCard label="Verified" value={verifiedCount} icon={ShieldCheck} iconColor="text-success" />
        <StatCard label="Awaiting Review" value={awaitingCount} icon={Hourglass} iconColor="text-info" />
        <StatCard label="Overdue" value={overdueCount} icon={AlertTriangle} iconColor="text-danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Performance Rings / Summary */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" />
            Productivity Rating
          </h3>
          <div className="text-center py-5 sm:py-6">
            <div className="text-3xl sm:text-4xl font-bold text-gradient font-mono mb-1">{pct}</div>
            <p className="text-xs text-text-muted">Task Completion Ratio</p>
          </div>
          <div className="h-2 bg-surface-raised rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700"
              style={{ width: pct }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-text-muted">
            <span>Verified: {verifiedCount}</span>
            <span>Awaiting Review: {awaitingCount}</span>
          </div>
        </div>

        {/* Priority breakdown chart */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <Calendar size={14} className="text-accent" />
            Tasks by Priority
          </h3>
          <div className="h-48 sm:h-44 font-mono text-[10px]">
            {priorityChartData.length === 0 ? (
              <p className="text-center py-16 text-text-muted">No task priorities recorded</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {priorityChartData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111118', border: '1px solid #2a2a35', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#f1f1f5' }}
                  />
                  <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Countdown / Nearest Deadline Widget */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Clock size={14} className="text-warning" />
              Nearest Deadline
            </h3>
            {nearestTask ? (
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-semibold text-text-primary truncate">{nearestTask.title}</h4>
                <div className="flex flex-wrap gap-2">
                  <PriorityBadge priority={nearestTask.priority} />
                  <span className="text-[11px] sm:text-xs text-text-muted">
                    Due: {nearestTask.deadline_text ?? formatDate(nearestTask.deadline)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted py-2">No pending task deadlines</p>
            )}
          </div>
          {nearestTask && timeLeft && (
            <div className="mt-4 pt-4 border-t border-surface-border/55">
              <p className="text-[10px] text-text-muted mb-1">Time Remaining</p>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-warning">{timeLeft}</div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Upcoming tasks + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Upcoming pending tasks */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-text-primary">Upcoming Tasks</h3>
          </div>
          <div className="divide-y divide-surface-border/50">
            {upcomingTasks.length === 0 ? (
              <p className="text-center py-10 text-text-muted text-sm">All pending tasks completed!</p>
            ) : (
              upcomingTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTaskDrawer(t)}
                  className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-raised/50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{t.title}</p>
                    <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 line-clamp-1">{t.description || 'No description provided.'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
                    <PriorityBadge priority={t.priority} />
                    <span className={`text-[11px] sm:text-xs ${t.deadline && isOverdue(t.deadline) ? 'text-danger font-semibold' : 'text-text-secondary'}`}>
                      {t.deadline_text ?? formatDate(t.deadline)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent timeline widgets */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Task Status Distribution</h3>
          <div className="h-48 sm:h-44 font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e1e28" vertical={false} />
                <XAxis dataKey="name" stroke="#60607a" tick={{ fontSize: 10 }} />
                <YAxis stroke="#60607a" allowDecimals={false} tick={{ fontSize: 10 }} width={25} />
                <Tooltip
                  contentStyle={{ background: '#111118', border: '1px solid #2a2a35', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
  )
}
