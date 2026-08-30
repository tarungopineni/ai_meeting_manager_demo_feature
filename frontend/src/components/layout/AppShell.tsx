import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { CommandPalette } from '../shared/CommandPalette'
import { TaskDetailDrawer } from '../shared/TaskDetailDrawer'
import { Plasma } from '../ui/Plasma'
import { useTaskDrawerStore } from '@/store/taskDrawerStore'
import { useAuthStore } from '@/store/authStore'

interface AppShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { task, close } = useTaskDrawerStore()
  const user = useAuthStore((s) => s.user)
  const isDemo = user?.is_demo

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.card')
      const spotlightRadius = 300
      const proximity = spotlightRadius * 0.5
      const fadeDistance = spotlightRadius * 0.75

      cards.forEach((card) => {
        const cardElement = card as HTMLElement
        const cardRect = cardElement.getBoundingClientRect()
        const centerX = cardRect.left + cardRect.width / 2
        const centerY = cardRect.top + cardRect.height / 2
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2
        const effectiveDistance = Math.max(0, distance)

        let glowIntensity = 0
        if (effectiveDistance <= proximity) {
          glowIntensity = 1
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity)
        }

        const relativeX = ((e.clientX - cardRect.left) / cardRect.width) * 100
        const relativeY = ((e.clientY - cardRect.top) / cardRect.height) * 100

        cardElement.style.setProperty('--glow-x', `${relativeX}%`)
        cardElement.style.setProperty('--glow-y', `${relativeY}%`)
        cardElement.style.setProperty('--glow-intensity', glowIntensity.toString())
        cardElement.style.setProperty('--glow-radius', `${spotlightRadius}px`)
      })
    }

    const handleMouseLeave = () => {
      document.querySelectorAll('.card').forEach((card) => {
        ;(card as HTMLElement).style.setProperty('--glow-intensity', '0')
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div className="dark min-h-screen bg-surface-base relative max-w-full overflow-x-hidden">
      {/* Background Plasma effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Plasma 
          color="#6366f1"
          speed={0.15}
          direction="pingpong"
          scale={1.2}
          opacity={0.3}
          mouseInteractive={true}
        />
      </div>

      <div className="relative z-10 min-h-screen max-w-full overflow-x-hidden">
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="ml-0 lg:ml-60 min-h-screen max-w-full overflow-x-hidden transition-all duration-300">
          <TopNav
            title={title}
            subtitle={subtitle}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />
          <main className={`${isDemo ? 'pt-[5.5rem]' : 'pt-14'} min-h-screen max-w-full overflow-x-hidden transition-all`}>
            <div className="p-3 sm:p-6 animate-fade-in max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Global components */}
      <CommandPalette />
      <TaskDetailDrawer task={task} onClose={close} />
    </div>
  )
}
