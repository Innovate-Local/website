// Presentational match report: the recommended team, then the full ranked pool.
// Server component. Approve control is composed by the page.
import type { RankedMatch, RecommendedTeam } from '@/lib/matchcore/types'

function nameFor(ranked: RankedMatch[], userId: string): string {
  return ranked.find((r) => r.userId === userId)?.name ?? 'Unknown'
}

export function MatchReport({
  ranked,
  team,
  teamSize,
}: {
  ranked: RankedMatch[]
  team: RecommendedTeam
  teamSize: number
}) {
  const eligible = ranked.filter((r) => r.eligible)
  const ineligible = ranked.filter((r) => !r.eligible)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 bg-surface-container p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
            Recommended team ({teamSize})
          </p>
          <span className="font-label text-xs text-on-surface-variant">
            Complementarity {team.complementarityScore.toFixed(2)}
          </span>
        </div>

        {team.leadUserId ? (
          <div className="flex flex-col gap-2">
            <TeamRow role="Lead" name={nameFor(ranked, team.leadUserId)} match={ranked.find((r) => r.userId === team.leadUserId)} />
            {team.memberUserIds.map((uid) => (
              <TeamRow key={uid} role="Member" name={nameFor(ranked, uid)} match={ranked.find((r) => r.userId === uid)} />
            ))}
          </div>
        ) : (
          <p className="font-body text-sm text-on-surface-variant">No eligible team could be assembled from the pool.</p>
        )}

        {team.coverageGaps.length > 0 && (
          <p className="font-body text-xs text-error">Coverage gaps: {team.coverageGaps.join(', ')}</p>
        )}
        {team.notes.map((n, i) => (
          <p key={i} className="font-body text-xs text-on-surface-variant">
            ⚠ {n}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
          Ranked pool · {eligible.length} eligible, {ineligible.length} filtered out
        </p>
        <div className="flex flex-col divide-y divide-outline-variant bg-surface-container">
          {ranked.map((r) => (
            <div key={r.userId} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
              <div className="flex flex-col">
                <span className="font-body text-sm text-on-surface">{r.name ?? 'Unknown'}</span>
                <span className="font-body text-xs text-on-surface-variant">{r.rationale}</span>
              </div>
              <span className={'font-label text-xs ' + (r.eligible ? 'text-primary' : 'text-outline-variant')}>
                {r.eligible ? `SAS ${r.sas}` : 'ineligible'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TeamRow({ role, name, match }: { role: string; name: string; match?: RankedMatch }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-body text-sm text-on-surface">
        <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{role} · </span>
        {name}
      </span>
      {match && (
        <span className="font-label text-xs text-on-surface-variant">
          SAS {match.sas} · {match.strengthProfile}
        </span>
      )}
    </div>
  )
}
