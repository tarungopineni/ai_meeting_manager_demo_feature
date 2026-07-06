import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Award, Users, CheckSquare, ShieldCheck, HelpCircle, AlertCircle, Clock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { usersService } from '@/api/users.service'
import { tasksService } from '@/api/tasks.service'
import { isOverdue } from '@/utils'

interface EmployeeStats {
  id: number
  name: string
  username: string
  email: string
  total: number
  completed: number
  verified: number
  awaiting: number
  overdue: number
  percentage: number
}

export default function EmployeePerformancePage() {
  const [selectedUser, setSelectedUser] = useState<EmployeeStats | null>(null)

  const { data: team = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['team'],
    queryFn: usersService.getTeam,
  })

  const { data: staffTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['staffTasks'],
    queryFn: tasksService.getStaffTasks,
  })

  // Compute stats locally per employee
  const employeeStats: EmployeeStats[] = useMemo(() => {
    return team.map((u) => {
      const uTasks = staffTasks.filter((t) => t.assignee_id === u.id)
      const total = uTasks.length
      const completed = uTasks.filter((t) => t.completed).length
      const verified = uTasks.filter((t) => t.completed && t.verified_by_manager).length
      const awaiting = uTasks.filter((t) => t.completed && !t.verified_by_manager).length
      const overdue = uTasks.filter((t) => !t.completed && t.deadline && isOverdue(t.deadline)).length
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        total,
        completed,
        verified,
        awaiting,
        overdue,
        percentage,
      }
    })
  }, [team, staffTasks])

  // Select first user by default once loaded
  useMemo(() => {
    if (employeeStats.length > 0 && !selectedUser) {
      setSelectedUser(employeeStats[0])
    }
  }, [employeeStats, selectedUser])

  // Leaderboard ranking by percentage
  const leaderboard = useMemo(() => {
    return [...employeeStats]
      .sort((a, b) => b.percentage - a.percentage || b.completed - a.completed)
      .slice(0, 5)
  }, [employeeStats])

  const chartData = useMemo(() => {
    return employeeStats.map((e) => ({
      name: e.name,
      'Completion %': e.percentage,
      Completed: e.completed,
      Total: e.total,
    }))
  }, [employeeStats])

  if (loadingTeam || loadingTasks) {
    return (
      <AppShell title="Employee Performance" subtitle="Team analytics">
        <div className="h-60 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Employee Performance" subtitle="Compare and monitor staff accomplishments">
      {/* Visual Leaderboard / Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Comparison Chart */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Users size={14} className="text-accent" />
            Completion Percentage comparison
          </h3>
          <div className="h-60 w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e28" vertical={false} />
                <XAxis dataKey="name" stroke="#60607a" />
                <YAxis stroke="#60607a" unit="%" />
                <Tooltip
                  contentStyle={{ background: '#111118', border: '1px solid #2a2a35', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f1f5', fontWeight: 'bold' }}
                />
                <Legend />
                <Bar dataKey="Completion %" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry['Completion %'] > 75 ? '#22c55e' : entry['Completion %'] > 40 ? '#6366f1' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaderboard Card */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Award size={14} className="text-warning animate-pulse-subtle" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {leaderboard.map((e, index) => (
              <div
                key={e.id}
                onClick={() => setSelectedUser(e)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedUser?.id === e.id ? 'bg-accent/10 border-accent/30' : 'bg-surface-raised/40 border-surface-border hover:border-surface-muted'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold font-mono">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">{e.name}</p>
                  <p className="text-[10px] text-text-muted">@{e.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-accent">{e.percentage}%</p>
                  <p className="text-[9px] text-text-muted">{e.completed} of {e.total} completed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Employee list + Selected employee stats card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee directory list */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-text-primary">Employee Rankings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Completion Rate</th>
                  <th>Completed</th>
                  <th>Verified</th>
                  <th>Pending Review</th>
                  <th>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedUser(e)}
                    className={`cursor-pointer transition-colors ${
                      selectedUser?.id === e.id ? 'bg-surface-raised/90' : 'hover:bg-surface-raised/55'
                    }`}
                  >
                    <td>
                      <p className="text-xs font-semibold text-text-primary">{e.name}</p>
                      <p className="text-[10px] text-text-muted">@{e.username}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-surface-base h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${e.percentage}%` }} />
                        </div>
                        <span className="font-mono text-xs font-semibold text-text-primary">{e.percentage}%</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-text-secondary">{e.completed} / {e.total}</td>
                    <td className="font-mono text-xs text-success">{e.verified}</td>
                    <td className="font-mono text-xs text-warning">{e.awaiting}</td>
                    <td className="font-mono text-xs text-danger">{e.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Employee detailed stats */}
        <div>
          {selectedUser ? (
            <div className="card p-5 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent text-base font-bold uppercase">
                  {selectedUser.name?.[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{selectedUser.name}</h3>
                  <p className="text-[11px] text-text-muted">@{selectedUser.username} • {selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Tasks', value: selectedUser.total, icon: CheckSquare, color: 'text-accent' },
                  { label: 'Completed', value: selectedUser.completed, icon: CheckSquare, color: 'text-success' },
                  { label: 'Verified', value: selectedUser.verified, icon: ShieldCheck, color: 'text-success' },
                  { label: 'Awaiting', value: selectedUser.awaiting, icon: HelpCircle, color: 'text-warning' },
                  { label: 'Overdue', value: selectedUser.overdue, icon: AlertCircle, color: 'text-danger' },
                  { label: 'Comp Rate', value: `${selectedUser.percentage}%`, icon: Clock, color: 'text-info' },
                ].map((s) => (
                  <div key={s.label} className="bg-surface-raised border border-surface-border/50 rounded-lg p-3">
                    <p className="text-[10px] text-text-muted font-medium mb-0.5">{s.label}</p>
                    <p className="text-base font-mono font-bold text-text-primary">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-surface-raised/40 border border-surface-border rounded-xl p-4">
                <h4 className="text-xs font-semibold text-text-primary mb-2">Performance Summary</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {selectedUser.percentage >= 80
                    ? `${selectedUser.name} is showing excellent performance with a completion rate of ${selectedUser.percentage}%.`
                    : selectedUser.percentage >= 50
                      ? `${selectedUser.name} has a moderate completion rate of ${selectedUser.percentage}%. Keep tracking progress.`
                      : `${selectedUser.name} is currently below threshold (${selectedUser.percentage}%). High number of overdue tasks.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-xs text-text-muted">
              Select an employee to see details
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
