import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/shared/DataTable'
import { PriorityBadge, StatusBadge } from '@/components/shared/Badge'
import { Drawer } from '@/components/ui/Drawer'
import { tasksService } from '@/api/tasks.service'
import { usersService } from '@/api/users.service'
import { formatDate, isOverdue } from '@/utils'
import type { Task } from '@/types'

function TaskDetailDrawer({ task, userMap, onClose }: { task: Task; userMap: Record<number, string>; onClose: () => void }) {
  return (
    <Drawer open title={task.title} subtitle={`Task #${task.id}`} onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={task.priority} />
          <StatusBadge completed={task.completed} verified={task.verified_by_manager} approved={task.approved_by_manager} />
        </div>

        <div className="bg-surface-raised rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">Description</p>
          <p className="text-sm text-text-primary leading-relaxed">{task.description || '—'}</p>
        </div>

        {[
          { label: 'Assignee',     value: userMap[task.assignee_id] ?? `#${task.assignee_id}` },
          { label: 'Manager',      value: userMap[task.manager_id] ?? `#${task.manager_id}` },
          { label: 'Deadline',     value: task.deadline_text ?? formatDate(task.deadline), warn: task.deadline ? isOverdue(task.deadline) : false },
          { label: 'Created',      value: formatDate(task.created_at) },
          { label: 'Last Updated', value: formatDate(task.updated_at) },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-surface-raised rounded-lg px-4 py-3">
            <p className="text-xs text-text-muted mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${warn ? 'text-danger' : 'text-text-primary'}`}>{value}</p>
          </div>
        ))}
      </div>
    </Drawer>
  )
}

export default function CoordinatorTasksPage() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [priorityFilter, setPriorityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['staffTasks'], queryFn: tasksService.getStaffTasks })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersService.getAll })
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  const filtered = tasks.filter((t) => {
    if (priorityFilter && t.priority?.toUpperCase() !== priorityFilter) return false
    if (statusFilter === 'in_progress' && t.completed) return false
    if (statusFilter === 'pending_review' && (!t.completed || t.verified_by_manager)) return false
    if (statusFilter === 'verified' && (!t.completed || !t.verified_by_manager)) return false
    return true
  })

  const columns = [
    { key: 'title',    label: 'Title', sortable: true, render: (t: Task) => (
      <button className="text-left text-sm font-medium text-text-primary hover:text-accent transition-colors cursor-pointer" onClick={() => setSelectedTask(t)}>
        {t.title}
      </button>
    )},
    { key: 'assignee_id', label: 'Assignee', render: (t: Task) => <span className="text-sm text-text-secondary">{userMap[t.assignee_id] ?? `#${t.assignee_id}`}</span> },
    { key: 'manager_id',  label: 'Manager',  render: (t: Task) => <span className="text-sm text-text-secondary">{userMap[t.manager_id] ?? `#${t.manager_id}`}</span> },
    { key: 'priority', label: 'Priority', render: (t: Task) => <PriorityBadge priority={t.priority} /> },
    { key: 'deadline', label: 'Deadline', render: (t: Task) => (
      <span className={`text-sm ${t.deadline && isOverdue(t.deadline) && !t.completed ? 'text-danger' : 'text-text-secondary'}`}>
        {t.deadline_text ?? formatDate(t.deadline)}
      </span>
    )},
    { key: 'status', label: 'Status', render: (t: Task) => <StatusBadge completed={t.completed} verified={t.verified_by_manager} approved={t.approved_by_manager} /> },
  ]

  return (
    <AppShell title="Tasks" subtitle="All organisation tasks">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={14} className="text-text-muted flex-shrink-0" />
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input-base text-xs flex-1 sm:flex-initial sm:w-32">
          <option value="">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base text-xs flex-1 sm:flex-initial sm:w-32">
          <option value="">All Status</option>
          <option value="in_progress">In Progress</option>
          <option value="pending_review">Pending Review</option>
          <option value="verified">Verified</option>
        </select>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchable
        searchKeys={['title', 'description']}
        emptyMessage="No tasks found"
      />

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          userMap={userMap}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </AppShell>
  )
}
