'use client'

import { useRef, useState, useCallback } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const CLIPS = [
  `${BASE}/videos/clip_2.mp4`,
  `${BASE}/videos/clip_1.mp4`,
  `${BASE}/videos/clip_3.mp4`,
  `${BASE}/videos/clip_4.mp4`,
  `${BASE}/videos/clip_5.mp4`,
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
  // Text: white on dark video, transitions to charcoal as cream background arrives
  const textColor = useTransform(progress, [0, 0.20], ['#ffffff', '#1d1c15'])

  const wordmarkStyle = {
    fontSize: 'clamp(3rem, 14vw, 18rem)',
    fontWeight: 400,
    letterSpacing: '-0.04em',
    lineHeight: 1,
  } as const

  return (
    <div className="relative w-full px-4 md:px-8 text-center">
      <motion.h1
        className="font-headline lowercase whitespace-nowrap"
        style={{ ...wordmarkStyle, color: textColor }}
      >
        innovate local
      </motion.h1>
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
