import Link from 'next/link'

export function TheClose() {
  return (
    <section className="bg-surface py-32 px-6 relative">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="font-headline text-5xl md:text-7xl tracking-tighter text-on-surface mb-8 leading-tight">
          The talent is ready.
          <br />
          The technology is ready.
          <br />
          The businesses are waiting.
        </h2>

        <p className="font-body text-2xl text-primary mb-16 italic">
          This is about building. Not waiting.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-6">
          <Link
            href="/join"
            className="bg-secondary text-on-secondary border border-secondary px-8 py-5 font-label text-sm uppercase tracking-widest hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
          >
            Join a hub
          </Link>
          <Link
            href="/start"
            className="bg-secondary text-on-secondary border border-secondary px-8 py-5 font-label text-sm uppercase tracking-widest hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
          >
            Start a hub
          </Link>
          <Link
            href="/partner"
            className="bg-secondary text-on-secondary border border-secondary px-8 py-5 font-label text-sm uppercase tracking-widest hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
          >
            Partner with us
          </Link>
        </div>
      </div>
    </section>
  )
}
