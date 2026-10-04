import type { Glyph } from './glyph-for'
import { GLYPH_DOTS, GLYPH_PATHS } from './glyph-paths'

/**
 * One movement glyph (`GLYPH_PATHS`), in the current text colour.
 * Decorative: the exercise's name is always beside it, so it is hidden
 * from screen readers rather than given a second name to drift from.
 */
export function MoveGlyph({
  glyph,
  size = 20,
  className,
}: {
  readonly glyph: Glyph
  readonly size?: number
  readonly className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={GLYPH_PATHS[glyph]} />
      {GLYPH_DOTS[glyph].map(([x, y, r]) => (
        <circle
          key={`${String(x)}-${String(y)}`}
          cx={x}
          cy={y}
          r={r}
          fill="currentColor"
          stroke="none"
        />
      ))}
    </svg>
  )
}
