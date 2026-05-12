'use client'

import { motion, type Transition } from 'motion/react'
import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  delay?: number
  y?: number
  duration?: number
  className?: string
}

/**
 * Scroll-triggered fade-up. Animates once when the element enters the viewport.
 * Kept intentionally small — the Modern Bureau aesthetic calls for restraint, not flashy motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  className,
}: RevealProps) {
  const transition: Transition = {
    duration,
    delay,
    ease: [0.22, 1, 0.36, 1],
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}
