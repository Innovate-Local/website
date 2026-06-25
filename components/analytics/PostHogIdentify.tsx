'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'

// Ties PostHog identity to the Supabase session so every signed-in user (and
// their session replays) is attributed to a real person. Mounted globally in the
// root layout. Identifies on sign-in / initial session, resets on sign-out.
export function PostHogIdentify() {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function identify(userId: string, email: string | null | undefined) {
      const props: Record<string, unknown> = {}
      if (email) props.email = email
      // Best-effort enrichment with role + name (own profile row is RLS-readable).
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', userId)
          .single()
        if (data?.role) props.role = data.role
        if (data?.full_name) props.name = data.full_name
      } catch {
        /* enrichment is optional */
      }
      if (!cancelled) posthog.identify(userId, props)
    }

    // onAuthStateChange emits INITIAL_SESSION on mount, then SIGNED_IN /
    // SIGNED_OUT / TOKEN_REFRESHED. Defer Supabase calls out of the callback
    // (calling back into the client synchronously there can deadlock).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        posthog.reset()
        return
      }
      const user = session?.user
      if (user) setTimeout(() => identify(user.id, user.email), 0)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return null
}
