import { requireProfile } from '@/lib/auth/session'
import { ROLE_LABEL } from '@/lib/platform/roles'
import { ProfileForm } from '@/components/platform/ProfileForm'

export default async function ProfilePage() {
  const profile = await requireProfile()

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <header className="flex flex-col gap-3">
        <span className="annotation">Your account</span>
        <h1 className="font-headline text-5xl md:text-6xl leading-[0.95] tracking-tight text-on-surface">
          Profile
        </h1>
      </header>

      {/* Read-only identity. Email comes from your sign-in; role is set by hub
          staff. */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-outline-variant/30 border border-outline-variant/30">
        <div className="bg-surface p-5 flex flex-col gap-1">
          <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            Email
          </dt>
          <dd className="font-body text-on-surface break-all">{profile.email ?? '—'}</dd>
        </div>
        <div className="bg-surface p-5 flex flex-col gap-1">
          <dt className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            Role
          </dt>
          <dd className="font-body text-on-surface">{ROLE_LABEL[profile.role]}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-6">
        <h2 className="font-headline text-2xl text-on-surface">Edit details</h2>
        <ProfileForm fullName={profile.fullName} />
      </section>
    </div>
  )
}
