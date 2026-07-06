import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Filter, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/shared/DataTable'
import { PriorityBadge, StatusBadge } from '@/components/shared/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input, Select } from '@/components/ui/Input'
import { tasksService } from '@/api/tasks.service'
import { usersService } from '@/api/users.service'
import { formatDate, isOverdue } from '@/utils'
import type { Task, TaskRequest, User } from '@/types'

const assignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW'], { errorMap: () => ({ message: 'Priority is required' }) }),
  assignee_id: z.coerce.number().min(1, 'Assignee is required'),
  deadline: z.string().optional().nullable(),
})
type AssignForm = z.infer<typeof assignSchema>

function TaskDetailDrawer({ task, userMap, onClose, onVerify, verifying, onDelete, deleting }: {
  task: Task
  userMap: Record<number, string>
  onClose: () => void
  onVerify: () => void
  verifying: boolean
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <Drawer open title={task.title} subtitle={`Task #${task.id}`} onClose={onClose}>
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
          { label: 'Assignee', value: userMap[task.assignee_id] ?? `#${task.assignee_id}` },
          { label: 'Deadline', value: task.deadline_text ?? formatDate(task.deadline), warn: task.deadline ? isOverdue(task.deadline) : false },
          { label: 'Created',  value: formatDate(task.created_at) },
        ].map(({ label, value, warn }) => (
          <div key={label} className="bg-surface-raised rounded-lg px-4 py-3">
            <p className="text-xs text-text-muted mb-0.5">{label}</p>
            <p className={`text-sm font-medium ${warn ? 'text-danger' : 'text-text-primary'}`}>{value}</p>
          </div>
        ))}

        {task.completed && !task.verified_by_manager && (
          <Button
            className="w-full mt-4"
            icon={<ShieldCheck size={15} />}
            loading={verifying}
            onClick={onVerify}
          >
            Verify Task Completion
          </Button>
        )}

        <Button
          className="w-full mt-2 text-danger border-danger/25 hover:bg-danger/10"
          variant="outline"
          icon={<Trash2 size={15} />}
          loading={deleting}
          onClick={() => {
            if (confirm('Are you sure you want to delete this task?')) {
              onDelete()
            }
          }}
        >
          Delete Task
        </Button>
      </div>
    </Drawer>
  )
}

function AssignTaskDrawer({ team, onClose, onAssign, assigning }: {
  team: User[]
  onClose: () => void
  onAssign: (data: AssignForm) => void
  assigning: boolean
}) {
  const [searchParams] = useSearchParams()
  const assignTo = searchParams.get('assignTo')
  
  const { register, handleSubmit, formState: { errors } } = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      assignee_id: assignTo ? Number(assignTo) : undefined,
      deadline: '',
    },
  })

  return (
    <Drawer open title="Assign New Task" subtitle="Assign a task to a team member" onClose={onClose}>
      <form onSubmit={handleSubmit(onAssign)} className="space-y-4">
        <Input label="Task Title" {...register('title')} error={errors.title?.message} />
        
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="input-base w-full bg-surface-raised border-surface-border text-sm text-text-primary px-3 py-2 rounded-lg"
            placeholder="Describe the task details..."
          />
        </div>

        <Select
          label="Priority"
          {...register('priority')}
          options={[
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ]}
          error={errors.priority?.message}
        />

        <Select
          label="Assignee"
          {...register('assignee_id')}
          options={team.map((u) => ({ value: u.id, label: u.name }))}
          error={errors.assignee_id?.message}
          placeholder="Select assignee"
        />

        <Input
          label="Deadline"
          type="datetime-local"
          {...register('deadline')}
          error={errors.deadline?.message}
        />

        <Button type="submit" loading={assigning} className="w-full mt-4">Assign Task</Button>
      </form>
    </Drawer>
  )
}

export default function ManagerTasksPage() {
  const qc = useQueryClient()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const assignTo = searchParams.get('assignTo')
  const [showAssign, setShowAssign] = useState(false)

  const { data: tasks = [], isLoading }  = useQuery({ queryKey: ['staffTasks'], queryFn: tasksService.getStaffTasks })
  const { data: team = [] }              = useQuery({ queryKey: ['team'],       queryFn: usersService.getTeam })
  const userMap = Object.fromEntries(team.map((u) => [u.id, u.name]))

  useEffect(() => {
    if (assignTo) {
      setShowAssign(true)
    }
  }, [assignTo])

  const handleCloseAssign = () => {
    setShowAssign(false)
    if (searchParams.has('assignTo')) {
      const copy = new URLSearchParams(searchParams)
      copy.delete('assignTo')
      setSearchParams(copy)
    }
  }

  const verifyMutation = useMutation({
    mutationFn: (id: number) => tasksService.verifyTask(id),
    onSuccess: () => {
      toast.success('Task verified!')
      qc.invalidateQueries({ queryKey: ['staffTasks'] })
      setSelectedTask(null)
    },
    onError: () => toast.error('Verification failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksService.deleteTask(id),
    onSuccess: () => {
      toast.success('Task deleted successfully!')
      qc.invalidateQueries({ queryKey: ['staffTasks'] })
      setSelectedTask(null)
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ assigneeId, payload }: { assigneeId: number; payload: TaskRequest }) =>
      tasksService.assignTask(assigneeId, payload),
    onSuccess: () => {
      toast.success('Task assigned successfully!')
      qc.invalidateQueries({ queryKey: ['staffTasks'] })
      handleCloseAssign()
    },
    onError: (e: any) => {
      const msg = e.response?.data?.detail ?? 'Failed to assign task'
      toast.error(msg)
    },
  })

  const onAssignSubmit = (data: AssignForm) => {
    const payload: TaskRequest = {
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      completed: false,
      manager_id: 0,
      assignee_id: data.assignee_id,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      deadline_text: data.deadline ? undefined : null,
      verified_by_manager: false,
      approved_by_manager: true,
    }
    assignMutation.mutate({ assigneeId: data.assignee_id, payload })
  }

  const filtered = tasks.filter((t) => {
    if (priorityFilter && t.priority?.toUpperCase() !== priorityFilter) return false
    if (statusFilter === 'in_progress' && t.completed) return false
    if (statusFilter === 'pending_review' && (!t.completed || t.verified_by_manager)) return false
    if (statusFilter === 'verified' && (!t.completed || !t.verified_by_manager)) return false
    return true
  })

  const columns = [
    { key: 'title', label: 'Title', sortable: true, render: (t: Task) => (
      <button className="text-left text-sm font-medium text-text-primary hover:text-accent font-sans cursor-pointer" onClick={() => setSelectedTask(t)}>
        {t.title}
      </button>
    )},
    { key: 'assignee_id', label: 'Assignee', render: (t: Task) => <span className="text-sm text-text-secondary">{userMap[t.assignee_id] ?? `#${t.assignee_id}`}</span> },
    { key: 'priority',    label: 'Priority', render: (t: Task) => <PriorityBadge priority={t.priority} /> },
    { key: 'deadline',    label: 'Deadline', render: (t: Task) => (
      <span className={`text-sm ${t.deadline && isOverdue(t.deadline) && !t.completed ? 'text-danger' : 'text-text-secondary'}`}>
        {t.deadline_text ?? formatDate(t.deadline)}
      </span>
    )},
    { key: 'status', label: 'Status', render: (t: Task) => <StatusBadge completed={t.completed} verified={t.verified_by_manager} approved={t.approved_by_manager} /> },
    { key: 'actions', label: '', width: '180px', render: (t: Task) => (
      <div className="flex items-center gap-2">
        {t.completed && !t.verified_by_manager && (
          <Button size="sm" variant="secondary" icon={<ShieldCheck size={12} />} onClick={() => verifyMutation.mutate(t.id)} loading={verifyMutation.isPending && verifyMutation.variables === t.id}>
            Verify
          </Button>
        )}
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-danger hover:text-danger hover:bg-danger/10" 
          icon={<Trash2 size={12} />} 
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Are you sure you want to delete this task?')) {
              deleteMutation.mutate(t.id)
            }
          }}
          loading={deleteMutation.isPending && deleteMutation.variables === t.id}
        >
          Delete
        </Button>
      </div>
    )},
  ]

  return (
    <AppShell title="Team Tasks" subtitle="Monitor and verify your team's work">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input-base text-xs w-32">
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base text-xs w-36">
            <option value="">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_review">Pending Review</option>
            <option value="verified">Verified</option>
          </select>
        </div>
        <Button onClick={() => setShowAssign(true)} icon={<Plus size={14} />}>Assign Task</Button>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchable
        searchKeys={['title']}
        emptyMessage="No tasks found"
      />

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          userMap={userMap}
          onClose={() => setSelectedTask(null)}
          onVerify={() => verifyMutation.mutate(selectedTask.id)}
          verifying={verifyMutation.isPending}
          onDelete={() => deleteMutation.mutate(selectedTask.id)}
          deleting={deleteMutation.isPending}
        />
      )}

      {showAssign && (
        <AssignTaskDrawer
          team={team}
          onClose={handleCloseAssign}
          onAssign={onAssignSubmit}
          assigning={assignMutation.isPending}
        />
      )}
    </AppShell>
  )
}
