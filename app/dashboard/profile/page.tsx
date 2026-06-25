import { requireProfile } from '@/lib/auth/session'
import { ROLE_LABEL } from '@/lib/platform/roles'
import { getApprenticeProfile } from '@/lib/platform/apprentice-profile'
import { ProfileForm } from '@/components/platform/ProfileForm'
import { ApprenticeProfileForm } from '@/components/platform/ApprenticeProfileForm'
import { PasswordForm } from '@/components/platform/PasswordForm'

export default async function ProfilePage() {
  const profile = await requireProfile()
  const apprenticeProfile = profile.role === 'apprentice' ? await getApprenticeProfile(profile.id) : null

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

      <section className="flex flex-col gap-6 border-t border-outline-variant/30 pt-10">
        <div className="flex flex-col gap-2">
          <h2 className="font-headline text-2xl text-on-surface">Password</h2>
          <p className="font-body text-on-surface-variant">
            Set a password to sign in without a magic-link email. If you’ve only used magic links,
            this creates your password for next time.
          </p>
        </div>
        <PasswordForm />
      </section>

      {profile.role === 'apprentice' && (
        <section className="flex flex-col gap-6 border-t border-outline-variant/30 pt-10">
          <div className="flex flex-col gap-2">
            <h2 className="font-headline text-2xl text-on-surface">Apprentice profile</h2>
            <p className="font-body text-on-surface-variant">
              Your skills and availability help the hub match you to projects, and show on your
              portfolio.
            </p>
          </div>
          <ApprenticeProfileForm profile={apprenticeProfile} />
        </section>
      )}
    </div>
  )
}
