import { useQuery } from '@tanstack/react-query'
import { Mail, User, Briefcase, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RoleBadge } from '@/components/shared/Badge'
import { Button } from '@/components/ui/Button'
import { usersService } from '@/api/users.service'

export default function MyTeamPage() {
  const navigate = useNavigate()
  const { data: team = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: usersService.getTeam,
  })

  return (
    <AppShell title="My Team" subtitle="Your direct reports">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface-raised" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-surface-raised rounded w-2/3" />
                  <div className="h-2 bg-surface-raised rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : team.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase size={40} className="text-text-muted mx-auto mb-3" />
          <h3 className="text-text-primary font-medium">No team members yet</h3>
          <p className="text-sm text-text-muted mt-1">Ask your coordinator to assign employees to you</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member) => (
            <div key={member.id} className="card p-5 hover:border-surface-muted transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center text-accent font-bold text-lg uppercase flex-shrink-0">
                    {member.name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{member.name}</h3>
                    <RoleBadge role={member.role} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Mail size={12} />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <User size={12} />
                    <span>@{member.username}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-border/50 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={12} />}
                  onClick={() => navigate(`/manager/tasks?assignTo=${member.id}`)}
                >
                  Assign Task
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
