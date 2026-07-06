import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

export function Drawer({ open, onClose, title, subtitle, children, size = 'md' }: DrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className={cn(
            'absolute right-0 top-0 h-full w-full bg-surface-card border-l border-surface-border shadow-2xl',
            'flex flex-col animate-slide-in-right',
            sizeMap[size]
          )}>
            <div className="flex items-start justify-between px-6 py-5 border-b border-surface-border">
              <div>
                <h2 className="text-base font-semibold text-text-primary">{title}</h2>
                {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface-raised transition-colors mt-0.5">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
