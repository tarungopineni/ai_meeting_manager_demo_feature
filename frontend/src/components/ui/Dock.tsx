import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, MotionValue, SpringOptions } from 'framer-motion'
import React, { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react'
import './Dock.css'

export interface DockItemData {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  className?: string
}

interface DockItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  mousePos: MotionValue<number>
  spring: SpringOptions
  distance: number
  magnification: number
  baseItemSize: number
  label: string
  direction: 'horizontal' | 'vertical'
}

function DockItem({
  children,
  className = '',
  onClick,
  mousePos,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  direction,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useMotionValue(0)

  const mouseDistance = useTransform(mousePos, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
      width: baseItemSize,
      height: baseItemSize,
    }
    const elementPos = direction === 'horizontal' ? rect.x : rect.y
    return val - elementPos - baseItemSize / 2
  })

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  )
  const size = useSpring(targetSize, spring)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return cloneElement(child as React.ReactElement<any>, { isHovered })
        }
        return child
      })}
    </motion.div>
  )
}

interface DockLabelProps {
  children: React.ReactNode
  className?: string
  isHovered?: MotionValue<number>
  direction: 'horizontal' | 'vertical'
}

function DockLabel({ children, className = '', isHovered, direction }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isHovered) return
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1)
    })
    return () => unsubscribe()
  }, [isHovered])


  const initialProps = direction === 'horizontal' ? { opacity: 0, y: 0 } : { opacity: 0, x: 0 }
  const animateProps = direction === 'horizontal' ? { opacity: 1, y: -10 } : { opacity: 1, x: -10 }
  const exitProps = direction === 'horizontal' ? { opacity: 0, y: 0 } : { opacity: 0, x: 0 }
  const layoutStyle = direction === 'horizontal' ? { x: '-50%' } : { y: '-50%' }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={initialProps}
          animate={animateProps}
          exit={exitProps}
          transition={{ duration: 0.2 }}
          className={`dock-label ${direction === 'vertical' ? 'dock-label--vertical' : ''} ${className}`}
          role="tooltip"
          style={layoutStyle}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DockIcon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`dock-icon ${className}`}>{children}</div>
}

export interface DockProps {
  items: DockItemData[]
  className?: string
  direction?: 'horizontal' | 'vertical'
  spring?: SpringOptions
  magnification?: number
  distance?: number
  panelHeight?: number
  dockHeight?: number
  baseItemSize?: number
}

export default function Dock({
  items,
  className = '',
  direction = 'horizontal',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
}: DockProps) {
  const mousePos = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  )

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight])
  const height = useSpring(heightRow, spring)

  const containerStyle = direction === 'horizontal'
    ? { height, overflow: 'hidden', scrollbarWidth: 'none' as const }
    : { width: height, overflow: 'hidden', scrollbarWidth: 'none' as const }
  const panelStyle = direction === 'horizontal' ? { height: panelHeight } : { width: panelHeight }

  return (
    <motion.div
      style={containerStyle}
      className={`dock-outer ${direction === 'vertical' ? 'dock-outer--vertical' : ''}`}
    >
      <motion.div
        onMouseMove={(e) => {
          isHovered.set(1)
          mousePos.set(direction === 'horizontal' ? e.clientX : e.clientY)
        }}
        onMouseLeave={() => {
          isHovered.set(0)
          mousePos.set(Infinity)
        }}
        className={`dock-panel ${direction === 'vertical' ? 'dock-panel--vertical' : ''} ${className}`}
        style={panelStyle}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mousePos={mousePos}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
            direction={direction}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel direction={direction}>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  )
}
