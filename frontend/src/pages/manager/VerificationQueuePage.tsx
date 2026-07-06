import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/shared/DataTable'
import { PriorityBadge, StatusBadge } from '@/components/shared/Badge'
import { Button } from '@/components/ui/Button'
import { tasksService } from '@/api/tasks.service'
import { usersService } from '@/api/users.service'
import { formatDate, isOverdue } from '@/utils'
import type { Task } from '@/types'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'

export default function VerificationQueuePage() {
  const qc = useQueryClient()
  const openTaskDrawer = useTaskDrawerStore((s) => s.open)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['yetToVerify'],
    queryFn: tasksService.getYetToVerify,
  })

  const { data: team = [] } = useQuery({
    queryKey: ['team'],
    queryFn: usersService.getTeam,
  })

  const userMap = Object.fromEntries(team.map((u) => [u.id, u.name]))

  const verifyMutation = useMutation({
    mutationFn: (id: number) => tasksService.verifyTask(id),
    onSuccess: () => {
      toast.success('Task verified successfully!')
      qc.invalidateQueries({ queryKey: ['yetToVerify'] })
      qc.invalidateQueries({ queryKey: ['staffTasks'] })
      qc.invalidateQueries({ queryKey: ['teamPerf'] })
    },
    onError: () => toast.error('Verification failed'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => tasksService.rejectTask(id),
    onSuccess: () => {
      toast.success('Task rejected and sent back to assignee!')
      qc.invalidateQueries({ queryKey: ['yetToVerify'] })
      qc.invalidateQueries({ queryKey: ['staffTasks'] })
      qc.invalidateQueries({ queryKey: ['teamPerf'] })
    },
    onError: () => toast.error('Rejection failed'),
  })

  const columns = [
    {
      key: 'title',
      label: 'Task Title',
      sortable: true,
      render: (t: Task) => (
        <button
          onClick={() => openTaskDrawer(t)}
          className="text-left text-sm font-semibold text-text-primary hover:text-accent transition-colors cursor-pointer"
        >
          {t.title}
        </button>
      ),
    },
    {
      key: 'assignee_id',
      label: 'Assignee',
      render: (t: Task) => <span className="text-sm text-text-secondary">{userMap[t.assignee_id] ?? `User #${t.assignee_id}`}</span>,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (t: Task) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (t: Task) => <StatusBadge completed={t.completed} verified={t.verified_by_manager} approved={t.approved_by_manager} />,
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (t: Task) => (
        <span className={`text-sm flex items-center gap-1.5 ${t.deadline && isOverdue(t.deadline) ? 'text-danger font-medium' : 'text-text-secondary'}`}>
          <Clock size={12} />
          {t.deadline_text ?? formatDate(t.deadline)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '220px',
      render: (t: Task) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={<ShieldCheck size={12} />}
            loading={verifyMutation.isPending && verifyMutation.variables === t.id}
            onClick={() => verifyMutation.mutate(t.id)}
          >
            Verify
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<XCircle size={12} />}
            loading={rejectMutation.isPending && rejectMutation.variables === t.id}
            onClick={() => rejectMutation.mutate(t.id)}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ]

  return (
    <AppShell title="Verification Queue" subtitle="Review and verify completed staff tasks">
      <DataTable
        data={tasks}
        columns={columns}
        loading={isLoading}
        searchable
        searchKeys={['title', 'description']}
        emptyMessage="No tasks currently awaiting verification."
      />
    </AppShell>
  )
}
