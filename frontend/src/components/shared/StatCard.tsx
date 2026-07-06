import { cn } from '@/utils'
import type { LucideIcon } from 'lucide-react'
import { ParticleCard } from '../ui/MagicBento'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  iconColor?: string
  delta?: string
  deltaUp?: boolean
}

export function StatCard({ label, value, icon: Icon, iconColor = 'text-accent', delta, deltaUp }: StatCardProps) {
  return (
    <ParticleCard
      className="stat-card group w-full"
      style={{
        '--glow-color': '99, 102, 241',
      } as React.CSSProperties}
      particleCount={6}
      glowColor="99, 102, 241"
      enableTilt={true}
      enableMagnetism={true}
      clickEffect={true}
    >
      <div className="flex items-start justify-between relative z-10 w-full">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-surface-overlay', iconColor.replace('text-', 'bg-') + '/10')}>
          <Icon size={18} className={iconColor} />
        </div>
        {delta && (
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', deltaUp ? 'text-success bg-success/10' : 'text-danger bg-danger/10')}>
            {delta}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <div className="text-2xl font-bold text-text-primary font-mono">{value}</div>
        <div className="text-xs text-text-muted">{label}</div>
      </div>
    </ParticleCard>
  )
}
