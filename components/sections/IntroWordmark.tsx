'use client'

import { useRef, useState, useCallback } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  type MotionValue,
} from 'motion/react'

const CLIPS = [
  '/videos/clip_2.mp4',
  '/videos/clip_1.mp4',
  '/videos/clip_3.mp4',
  '/videos/clip_4.mp4',
  '/videos/clip_5.mp4',
]

export function IntroWordmark() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  return (
    <section
      ref={ref}
      aria-label="Innovate Local masthead"
      className="relative w-full bg-surface"
      style={{ height: '250vh' }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="relative h-full w-full flex flex-col items-center justify-center">
          <VideoBackground progress={scrollYProgress} />
          <WordmarkWithRipple progress={scrollYProgress} />
          <Subtitle progress={scrollYProgress} />
        </div>
      </div>
    </section>
  )
}

// Two video elements crossfade between clips so there's no blank frame
// at the boundary. While one plays, the other silently preloads the next
// clip. The transition fires PRE_ROLL_MS before the active clip ends so
// both clips are in motion during the crossfade — never a frozen last
// frame against a frame-zero start.
const CROSSFADE_MS = 500
const PRE_ROLL_MS = 500

function VideoBackground({ progress }: { progress: MotionValue<number> }) {
  const [active, setActive] = useState<0 | 1>(0)
  const [clipIdx, setClipIdx] = useState<[number, number]>([0, 1])
  const opacity = useTransform(progress, [0, 0.25], [1, 0])
  const refA = useRef<HTMLVideoElement>(null)
  const refB = useRef<HTMLVideoElement>(null)
  const cycleRef = useRef(1)
  const transitioningRef = useRef(false)

  const startTransition = useCallback((fromSlot: 0 | 1) => {
    if (transitioningRef.current) return
    transitioningRef.current = true

    const next = (fromSlot === 0 ? 1 : 0) as 0 | 1
    setActive(next)
    const nextRef = next === 0 ? refA : refB
    nextRef.current?.play().catch(() => {})

    setTimeout(() => {
      cycleRef.current = (cycleRef.current + 1) % CLIPS.length
      const newIdx = cycleRef.current
      setClipIdx(prev =>
        fromSlot === 0 ? [newIdx, prev[1]] : [prev[0], newIdx]
      )
      transitioningRef.current = false
    }, CROSSFADE_MS)
  }, [])

  const handleTimeUpdate = useCallback(
    (slot: 0 | 1, el: HTMLVideoElement) => {
      if (active !== slot) return
      const { duration, currentTime } = el
      if (!duration || isNaN(duration)) return
      const remainingMs = (duration - currentTime) * 1000
      if (remainingMs <= PRE_ROLL_MS) startTransition(slot)
    },
    [active, startTransition],
  )

  return (
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
      <video
        ref={refA}
        key={`a-${clipIdx[0]}`}
        src={CLIPS[clipIdx[0]]}
        autoPlay={active === 0}
        muted
        playsInline
        preload="auto"
        onTimeUpdate={e => handleTimeUpdate(0, e.currentTarget)}
        onEnded={() => startTransition(0)}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: active === 0 ? 1 : 0 }}
      />
      <video
        ref={refB}
        key={`b-${clipIdx[1]}`}
        src={CLIPS[clipIdx[1]]}
        autoPlay={active === 1}
        muted
        playsInline
        preload="auto"
        onTimeUpdate={e => handleTimeUpdate(1, e.currentTarget)}
        onEnded={() => startTransition(1)}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: active === 1 ? 1 : 0 }}
      />
      <div className="absolute inset-0 bg-black/40" />
    </motion.div>
  )
}

function WordmarkWithRipple({ progress }: { progress: MotionValue<number> }) {
  const wipeLeft = useTransform(progress, [0, 0.85], [0, 100])
  // Ghosts invisible during video phase, rise as cream background fades in, then resolve with the wave
  const ghostOpacity = useTransform(progress, [0, 0.20, 0.85], [0, 0.85, 0])
  // Text: white on dark video, transitions to charcoal as cream background arrives
  const textColor = useTransform(progress, [0, 0.20], ['#ffffff', '#1d1c15'])

  const topClipPath = useMotionTemplate`polygon(${wipeLeft}% 0, 100% 0, 100% 48%, ${wipeLeft}% 48%)`
  const bottomClipPath = useMotionTemplate`polygon(${wipeLeft}% 52%, 100% 52%, 100% 100%, ${wipeLeft}% 100%)`

  const wordmarkStyle = {
    fontSize: 'clamp(3rem, 14vw, 18rem)',
    fontWeight: 400,
    letterSpacing: '-0.04em',
    lineHeight: 1,
  } as const

  return (
    <div className="relative w-full px-4 md:px-8 text-center">
      <div className="relative inline-block">
        {/* Top ghost — ochre, offset +4px, top half only */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 font-body text-primary lowercase whitespace-nowrap pointer-events-none"
          style={{
            ...wordmarkStyle,
            opacity: ghostOpacity,
            clipPath: topClipPath,
            transform: 'translateX(4px)',
          }}
        >
          innovate local
        </motion.span>

        {/* Bottom ghost — rust, offset −4px, bottom half only */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 font-body text-secondary lowercase whitespace-nowrap pointer-events-none"
          style={{
            ...wordmarkStyle,
            opacity: ghostOpacity,
            clipPath: bottomClipPath,
            transform: 'translateX(-4px)',
          }}
        >
          innovate local
        </motion.span>

        {/* Main wordmark — white on video, transitions to charcoal on cream */}
        <motion.h1
          className="relative font-headline lowercase whitespace-nowrap"
          style={{ ...wordmarkStyle, color: textColor }}
        >
          innovate local
        </motion.h1>
      </div>
    </div>
  )
}

function Subtitle({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.7, 0.95], [0, 1])
  const y = useTransform(progress, [0.7, 0.95], [12, 0])

  return (
    <motion.p
      style={{ opacity, y }}
      className="mt-10 md:mt-12 font-headline italic text-base md:text-xl lg:text-2xl text-on-surface-variant tracking-wide px-6 text-center"
    >
      A modern Civilian Conservation Corps for AI.
    </motion.p>
  )
}
