import type { WeightUnit } from '@/domain/units/weight'
import { formatLoad } from '@/domain/units/weight'

/** Head size grows with the weight, but within a picture that stays one shape. */
function headFor(load: number, unit: WeightUnit): { readonly h: number; readonly w: number } {
  const pounds = unit === 'kg' ? load * 2.2 : load
  const t = Math.min(1, Math.max(0, (pounds - 5) / 95))
  return { h: 24 + t * 16, w: 13 + t * 13 }
}

/** A hexagonal head, flat sides up, centred on (cx, cy). */
function hex(cx: number, cy: number, w: number, h: number): string {
  const q = h / 4
  return [
    [cx - w / 2, cy - h / 2 + q],
    [cx, cy - h / 2],
    [cx + w / 2, cy - h / 2 + q],
    [cx + w / 2, cy + h / 2 - q],
    [cx, cy + h / 2],
    [cx - w / 2, cy + h / 2 - q],
  ]
    .map(([x, y]) => `${(x ?? 0).toFixed(1)},${(y ?? 0).toFixed(1)}`)
    .join(' ')
}

/**
 * A pair of dumbbells for the set about to be done — hex heads sized by the
 * weight, a knurled handle, the two set down side by side once — and the
 * weight **per hand**, which is how a dumbbell load is logged here. The
 * plate loader's counterpart: a barbell asks "what goes on", a dumbbell
 * asks "which pair from the rack", and the picture answers that at a
 * glance across the gym.
 */
export function DumbbellPair({ load, unit }: { readonly load: number; readonly unit: WeightUnit }) {
  const { h, w } = headFor(load, unit)
  // Side by side, as a pair sits on the rack; heads this size would overlap stacked.
  const y = 32
  const pair = [
    { mid: 60, delay: 0 },
    { mid: 160, delay: 90 },
  ]
  return (
    <figure
      className="well mt-4 px-3 pt-2 pb-3"
      aria-label={`A pair of ${formatLoad(load, unit)} dumbbells, one in each hand`}
    >
      <figcaption className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-ink-500 font-semibold tracking-[0.12em] uppercase">
          Take the pair
        </span>
        <span className="numeric text-ink-300">
          <span className="text-ink-50 font-semibold">{formatLoad(load, unit)}</span>
          <span className="text-ink-500"> each hand</span>
        </span>
      </figcaption>
      <svg viewBox="0 0 220 64" className="mx-auto mt-1 w-full max-w-xs" aria-hidden>
        <defs>
          <pattern id="db-knurl" width="3" height="3" patternUnits="userSpaceOnUse">
            <path d="M0 3 3 0M-1 1 1-1M2 4 4 2" stroke="oklch(0.3 0.01 250)" strokeWidth="0.6" />
          </pattern>
          <linearGradient id="db-iron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.42 0.01 250)" />
            <stop offset="0.5" stopColor="oklch(0.28 0.01 250)" />
            <stop offset="1" stopColor="oklch(0.18 0.01 250)" />
          </linearGradient>
        </defs>
        {pair.map(({ mid, delay }) => {
          const left = mid - 18 - w / 2
          const right = mid + 18 + w / 2
          return (
            <g key={mid} className="dumbbell-set" style={{ animationDelay: `${String(delay)}ms` }}>
              <rect
                x={left}
                y={y - 3}
                width={right - left}
                height="6"
                rx="3"
                fill="oklch(0.7 0.01 250)"
              />
              <rect x={mid - 12} y={y - 3} width="24" height="6" fill="url(#db-knurl)" />
              {[left, right].map((cx) => (
                <g key={cx}>
                  <polygon
                    points={hex(cx, y, w, h)}
                    fill="url(#db-iron)"
                    stroke="oklch(0.12 0.01 250)"
                    strokeWidth="0.8"
                  />
                  <polygon
                    points={hex(cx, y, w - 3, h - 3)}
                    fill="none"
                    stroke="white"
                    strokeOpacity="0.14"
                    strokeWidth="0.7"
                  />
                </g>
              ))}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/**
 * Weight added to a bodyweight movement, as the dip belt that carries it:
 * a chain, a plate, and "BW + 25 lb". Only when something is added — the
 * body alone needs no picture of itself.
 */
export function BeltLoad({ load, unit }: { readonly load: number; readonly unit: WeightUnit }) {
  return (
    <figure
      className="well mt-4 flex items-center gap-3 px-3 py-2.5"
      aria-label={`Bodyweight plus ${formatLoad(load, unit)} on a belt`}
    >
      <svg viewBox="0 0 40 48" className="h-12 w-10 shrink-0" aria-hidden>
        <path
          d="M6 6 Q20 16 34 6"
          fill="none"
          stroke="oklch(0.62 0.02 250)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M20 12v10"
          stroke="oklch(0.7 0.01 250)"
          strokeWidth="1.6"
          strokeDasharray="2 1.5"
        />
        <circle cx="20" cy="34" r="12" fill="oklch(0.58 0.17 255)" stroke="oklch(0.15 0.01 250)" />
        <circle cx="20" cy="34" r="3" fill="oklch(0.15 0.01 250)" />
      </svg>
      <span className="numeric text-sm">
        <span className="text-ink-500">BW + </span>
        <span className="text-ink-50 font-semibold">{formatLoad(load, unit)}</span>
        <span className="text-ink-500"> on the belt</span>
      </span>
    </figure>
  )
}
