import type { Exercise } from '@/domain/exercises/exercise'
import type { Crest } from '@/domain/logging/crest'
import { glyphFor } from '@/features/glyphs/glyph-for'
import { GLYPH_DOTS, GLYPH_PATHS } from '@/features/glyphs/glyph-paths'
import { TIMELINE_COLOURS } from '@/features/train/timeline-colours'

const GOLD = 'oklch(0.86 0.13 85)'
const GAP = 3

/**
 * A session's crest (`sessionCrest`): a ring cut into a segment per
 * exercise, as long as its share of the working sets and in the colour the
 * timeline gives it; a tick inside for every set; a gold stud where a
 * record was set; and the lead lift's movement glyph at the centre. The
 * ring is turned by the session's own angle, so the same five exercises on
 * two days still make two emblems. It draws itself in once.
 */
export function SessionCrest({
  crest,
  library,
  className,
  still = false,
}: {
  readonly crest: Crest
  readonly library: readonly Exercise[]
  readonly className?: string
  /** Drawn finished, for a wall of them: a hundred drawing in at once is noise. */
  readonly still?: boolean
}) {
  if (crest.segments.length === 0) return null
  const lead = crest.segments.reduce((best, one) => (one.sets > best.sets ? one : best))
  const leadExercise = library.find((one) => one.id === lead.exerciseId)
  const glyph = leadExercise === undefined ? 'lift' : glyphFor(leadExercise)
  const records = crest.segments.filter((one) => one.record).length

  const arcs = crest.segments.reduce<
    {
      readonly segment: (typeof crest.segments)[number]
      readonly at: number
      readonly from: number
      readonly to: number
      readonly colour: string
    }[]
  >((placed, segment, at) => {
    const from = placed.at(-1)?.to ?? 0
    return [...placed, { segment, at, from, to: from + segment.share * 360, colour: colourAt(at) }]
  }, [])

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`Session crest: ${String(crest.segments.length)} exercises, ${String(crest.totalSets)} sets${
        records > 0 ? `, ${String(records)} ${records === 1 ? 'record' : 'records'}` : ''
      }`}
    >
      <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-ink-800)" strokeWidth="1" />
      <g transform={`rotate(${String(crest.rotation)} 50 50)`}>
        {arcs.map(({ segment, at, from: start, to, colour }) => {
          const single = arcs.length === 1
          return (
            <path
              key={`${segment.exerciseId}-${String(at)}`}
              className={still ? undefined : 'crest-arc'}
              style={{ animationDelay: `${String(at * 120)}ms` }}
              d={single ? ringPath(42) : arcPath(42, start + GAP / 2, to - GAP / 2)}
              pathLength={1}
              fill="none"
              stroke={colour}
              strokeWidth="7"
              strokeLinecap="round"
            />
          )
        })}
        {arcs.flatMap(({ segment, from: start, to, colour }) =>
          Array.from({ length: segment.sets }, (_, tick) => {
            const angle = start + ((tick + 0.5) / segment.sets) * (to - start)
            const [x1, y1] = polar(30, angle)
            const [x2, y2] = polar(34.5, angle)
            return (
              <line
                key={`${segment.exerciseId}-tick-${String(tick)}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={colour}
                strokeOpacity="0.6"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            )
          }),
        )}
        {arcs
          .filter(({ segment }) => segment.record)
          .map(({ segment, from: start, to }) => {
            const [x, y] = polar(42, (start + to) / 2)
            return (
              <circle
                key={`${segment.exerciseId}-record`}
                className={still ? undefined : 'crest-stud'}
                cx={x}
                cy={y}
                r="3.6"
                fill={GOLD}
                stroke="var(--color-ink-950)"
                strokeWidth="1.2"
              />
            )
          })}
      </g>
      <circle
        cx="50"
        cy="50"
        r="22"
        fill="color-mix(in oklab, var(--color-accent-500) 14%, var(--color-ink-950))"
      />
      <g
        transform="translate(36 36) scale(1.1667)"
        fill="none"
        stroke="var(--color-accent-400)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={GLYPH_PATHS[glyph]} />
        {GLYPH_DOTS[glyph].map(([x, y, r]) => (
          <circle
            key={`${String(x)}-${String(y)}`}
            cx={x}
            cy={y}
            r={r}
            fill="var(--color-accent-400)"
            stroke="none"
          />
        ))}
      </g>
    </svg>
  )
}

function colourAt(at: number): string {
  return TIMELINE_COLOURS[at % TIMELINE_COLOURS.length] ?? 'var(--color-accent-400)'
}

/** A point on a circle about the centre, 0° at the top, clockwise. */
function polar(r: number, degrees: number): readonly [number, number] {
  const radians = ((degrees - 90) * Math.PI) / 180
  return [50 + r * Math.cos(radians), 50 + r * Math.sin(radians)]
}

function arcPath(r: number, from: number, to: number): string {
  const end = Math.max(to, from + 0.5)
  const [x1, y1] = polar(r, from)
  const [x2, y2] = polar(r, end)
  const large = end - from > 180 ? 1 : 0
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${String(r)} ${String(r)} 0 ${String(large)} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/** A whole ring, for a session of one exercise. */
function ringPath(r: number): string {
  return `M50 ${String(50 - r)} a${String(r)} ${String(r)} 0 1 1 0 ${String(r * 2)} a${String(r)} ${String(r)} 0 1 1 0 ${String(-r * 2)}`
}
