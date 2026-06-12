'use client'

// Shared state for the partner page: the tier "Select" buttons sit three
// sections above the intake form, so the chosen tier travels through context.
// `seq` increments on every click so that re-selecting a tier re-applies the
// highlight even if the visitor changed the form chip by hand in between.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type TierValue = 'catalyst' | 'anchor' | 'keystone'

export type TierSelection = { value: TierValue; seq: number } | null

type TierSelectionContextValue = {
  selection: TierSelection
  selectTier: (value: TierValue) => void
}

const TierSelectionContext = createContext<TierSelectionContextValue | null>(null)

export function TierSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<TierSelection>(null)
  const value = useMemo(
    () => ({
      selection,
      selectTier: (tier: TierValue) =>
        setSelection((prev) => ({ value: tier, seq: (prev?.seq ?? 0) + 1 })),
    }),
    [selection],
  )
  return <TierSelectionContext.Provider value={value}>{children}</TierSelectionContext.Provider>
}

export function useTierSelection() {
  const ctx = useContext(TierSelectionContext)
  if (!ctx) {
    throw new Error('useTierSelection must be used inside a TierSelectionProvider')
  }
  return ctx
}
