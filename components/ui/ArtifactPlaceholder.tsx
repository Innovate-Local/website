/**
 * Placeholder shape for the signature diagonal-artifact scroll moment.
 *
 * The final shape is TBD (per build-plan.md open decisions) — a pickaxe, shovel, trowel,
 * bridge beam, sapling, or other CCC-era object. This component renders a deliberately
 * abstract tool-like form so the composition reads correctly while the real asset is
 * decided. Replace this component when the shape is locked.
 */
export function ArtifactPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 140"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Grip end */}
      <circle cx="40" cy="70" r="22" />

      {/* Handle */}
      <rect x="40" y="58" width="620" height="24" />

      {/* Shaft ferrule */}
      <rect x="650" y="52" width="16" height="36" />

      {/* Tool head (abstract blade / spade) */}
      <polygon points="666,30 780,70 666,110 680,90 680,50" />

      {/* Placeholder annotation — remove when the real artifact is in */}
      <text
        x="40"
        y="130"
        className="font-label"
        fontSize="10"
        letterSpacing="0.2em"
        fontFamily="var(--font-inter), sans-serif"
        opacity="0.5"
      >
        PLACEHOLDER_ARTIFACT // PENDING_SELECTION
      </text>
    </svg>
  )
}
