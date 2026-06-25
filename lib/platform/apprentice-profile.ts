// Apprentice profile service — the matching/portfolio detail (skills,
// availability, bio, links). Server-only (Drizzle). Pure presentation constants
// live in ./apprentice-fields so client forms can import them safely.
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { apprenticeProfiles, type ApprenticeProfile } from '@/lib/db/schema'
import type { Availability } from './apprentice-fields'

export { AVAILABILITY_OPTIONS, AVAILABILITY_LABEL, LINK_FIELDS, parseTags } from './apprentice-fields'
export type { Availability, LinkKey } from './apprentice-fields'

export async function getApprenticeProfile(userId: string): Promise<ApprenticeProfile | null> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(apprenticeProfiles)
    .where(eq(apprenticeProfiles.userId, userId))
    .limit(1)
  return row ?? null
}

export type ApprenticeProfileInput = {
  headline: string | null
  bio: string | null
  skills: string[]
  availability: Availability
  hoursPerWeek: number | null
  location: string | null
  links: Record<string, string>
}

// Create or update an apprentice's profile (keyed 1:1 on their account).
export async function upsertApprenticeProfile(
  userId: string,
  data: ApprenticeProfileInput,
): Promise<void> {
  await getDb()
    .insert(apprenticeProfiles)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: apprenticeProfiles.userId,
      set: {
        headline: data.headline,
        bio: data.bio,
        skills: data.skills,
        availability: data.availability,
        hoursPerWeek: data.hoursPerWeek,
        location: data.location,
        links: data.links,
      },
    })
}
