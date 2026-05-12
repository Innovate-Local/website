'use client'

import { useRef, type ReactNode } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'motion/react'

type TiltCardProps = {
  children: ReactNode
  className?: string
  /** Max rotation in degrees (default 8). Keep small for a restrained, premium feel. */
  maxTilt?: number
}

/**
 * Interactive 3D card. Tilts in response to cursor position and shows
 * a soft glare sweep under the cursor. Spring physics for smooth return.
 * Parent must set `perspective` for the 3D effect to register.
 */
export function TiltCard({ children, className = '', maxTilt = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Cursor position within the card, 0..1. Start at center so nothing moves at rest.
  const xPct = useMotionValue(0.5)
  const yPct = useMotionValue(0.5)

  const spring = { damping: 25, stiffness: 200, mass: 0.5 }
  const xSpring = useSpring(xPct, spring)
  const ySpring = useSpring(yPct, spring)

  // Cursor left → right tilts the card Y axis; cursor top → bottom tilts X axis (inverted).
  const rotateY = useTransform(xSpring, [0, 1], [-maxTilt, maxTilt])
  const rotateX = useTransform(ySpring, [0, 1], [maxTilt, -maxTilt])

  const glareX = useTransform(xSpring, [0, 1], ['0%', '100%'])
  const glareY = useTransform(ySpring, [0, 1], ['0%', '100%'])
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.18), transparent 55%)`

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    xPct.set((e.clientX - rect.left) / rect.width)
    yPct.set((e.clientY - rect.top) / rect.height)
  }

  const handleMouseLeave = () => {
    xPct.set(0.5)
    yPct.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={`relative ${className}`}
    >
      {children}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: glareBg }}
      />
    </motion.div>
  )
}
