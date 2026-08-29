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

const sizeMap = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' }

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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
          <div className={cn(
            'absolute right-0 top-0 h-full w-full bg-surface-card border-l border-surface-border shadow-2xl z-10',
            'flex flex-col animate-slide-in-right',
            sizeMap[size]
          )}>
            <div className="flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-surface-border flex-shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-sm sm:text-base font-semibold text-text-primary truncate">{title}</h2>
                {subtitle && <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-md hover:bg-surface-raised transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
