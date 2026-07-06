import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, User, CheckSquare, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { PriorityBadge, StatusBadge } from './Badge'
import { tasksService } from '@/api/tasks.service'
import { usersService } from '@/api/users.service'
import { formatDate, formatDateTime, isOverdue } from '@/utils'
import type { Task } from '@/types'
import { useAuthStore } from '@/store/authStore'

interface TaskDetailDrawerProps {
  task: Task | null
  onClose: () => void
}

export function TaskDetailDrawer({ task, onClose }: TaskDetailDrawerProps) {
  const qc = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll,
    enabled: !!task,
  })

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  const completeMutation = useMutation({
    mutationFn: (id: number) => tasksService.markCompleted(id),
    onSuccess: () => {
      toast.success('Task marked as completed!')
      qc.invalidateQueries({ queryKey: ['verifiedTasks'] })
      qc.invalidateQueries({ queryKey: ['unverifiedTasks'] })
      qc.invalidateQueries({ queryKey: ['staffTasks'] })
      qc.invalidateQueries({ queryKey: ['myPerformance'] })
      onClose()
    },
    onError: (e: any) => {
      const msg = e.response?.data?.detail ?? 'Failed to complete task'
      toast.error(msg)
    },
  })

  if (!task) return null

  const isTaskOverdue = task.deadline && isOverdue(task.deadline) && !task.completed
  const assigneeName = userMap[task.assignee_id] ?? `User #${task.assignee_id}`
  const managerName = userMap[task.manager_id] ?? `User #${task.manager_id}`
  const showCompleteBtn = !task.completed && task.assignee_id === currentUserId && task.approved_by_manager

  return (
    <Drawer open={!!task} onClose={onClose} title={task.title} subtitle={`Task ID: #${task.id}`}>
      <div className="space-y-5">
        {/* Status Section */}
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={task.priority} />
          <StatusBadge completed={task.completed} verified={task.verified_by_manager} approved={task.approved_by_manager} />
          {isTaskOverdue && (
            <span className="badge bg-danger/10 text-danger border border-danger/25 text-[10px] py-0 px-2 flex items-center gap-1">
              <AlertCircle size={10} /> Overdue
            </span>
          )}
        </div>

        {/* Description */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-4">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Description</h4>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {task.description || 'No description provided.'}
          </p>
        </div>

        {/* Metadata Details */}
        <div className="space-y-3">
          {[
            { label: 'Assignee', value: assigneeName, icon: <User size={14} className="text-accent" /> },
            { label: 'Manager', value: managerName, icon: <User size={14} className="text-info" /> },
            { 
              label: 'Deadline', 
              value: task.deadline_text ?? formatDate(task.deadline), 
              icon: <Clock size={14} className={isTaskOverdue ? 'text-danger' : 'text-text-muted'} />,
              warn: isTaskOverdue 
            },
            { label: 'Created At', value: formatDateTime(task.created_at), icon: <Calendar size={14} className="text-text-muted" /> },
            { label: 'Last Updated', value: formatDateTime(task.updated_at), icon: <Calendar size={14} className="text-text-muted" /> },
          ].map(({ label, value, icon, warn }) => (
            <div key={label} className="bg-surface-raised border border-surface-border/50 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-xs text-text-muted">{label}</span>
              </div>
              <span className={`text-sm font-medium ${warn ? 'text-danger font-semibold' : 'text-text-primary'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Employee Actions */}
        {showCompleteBtn && (
          <Button
            className="w-full mt-4"
            icon={<CheckSquare size={16} />}
            loading={completeMutation.isPending}
            onClick={() => completeMutation.mutate(task.id)}
          >
            Mark as Completed
          </Button>
        )}
      </div>
    </Drawer>
  )
}
