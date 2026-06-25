// PostHog client-side initialization. Next.js (15.3+) runs this file in the
// browser automatically — no provider wrapper needed. The `defaults` bundle
// turns on PostHog's recommended settings for new projects (autocapture,
// pageviews on history change, and session replay when it's enabled in the
// project's settings).
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-05-30',
})
