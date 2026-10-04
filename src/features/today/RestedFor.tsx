import type { Exercise } from '@/domain/exercises/exercise'
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '@/domain/exercises/taxonomy'
import { dayMuscles } from '@/domain/programs/day-muscles'
import type { ProgramDay } from '@/domain/programs/program'
import type { Freshness, MuscleRecency } from '@/domain/volume/recency'
import { cn } from '@/lib/cn'

const CELLS: Readonly<Record<Freshness, number>> = { worked: 1, recovering: 2, fresh: 3 }
const TONE: Readonly<Record<Freshness, string>> = {
  worked: 'bg-ink-500',
  recovering: 'bg-warn-500',
  fresh: 'bg-good-500',
}

/**
 * On a rest day, how ready each muscle the next session trains is — a
 * three-cell bar per muscle, filled by the body map's own bands (`fresh`
 * three or more days, `recovering` two to three, `worked` today or
 * yesterday). **Days since, nothing more**: the app measures no readiness,
 * so this claims none — a bar of three says it has been three days, not
 * that the muscle is recovered.
 *
 * On a training day the session itself is the news, so the hero draws
 * this only on a rest day, where it had nothing to say but "Rest day".
 */
export function RestedFor({
  day,
  library,
  recency,
  when,
}: {
  readonly day: Pick<ProgramDay, 'slots'>
  readonly library: readonly Exercise[]
  readonly recency: Readonly<Record<MuscleGroup, MuscleRecency>>
  readonly when: string
}) {
  const muscles = dayMuscles(day, library)
  if (muscles.length === 0) return null
  return (
    <div className="mt-4" aria-label={`How rested ${when}’s muscles are`} role="group">
      <p className="text-ink-500 mb-2 text-[0.7rem] font-medium tracking-wide uppercase">
        Rested for {when}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {muscles.map((muscle) => {
          const reading = recency[muscle]
          const days = reading.daysAgo
          return (
            <li
              key={muscle}
              className="well flex items-center gap-2 px-2.5 py-1.5 text-xs"
              title={days === undefined ? 'Not trained lately' : `${String(days)} days since`}
            >
              <span className="text-ink-100">{MUSCLE_GROUP_LABELS[muscle]}</span>
              <span className="flex gap-0.5" aria-hidden>
                {[1, 2, 3].map((cell) => (
                  <span
                    key={cell}
                    className={cn(
                      'h-2.5 w-1.5 rounded-sm',
                      cell <= CELLS[reading.freshness] ? TONE[reading.freshness] : 'bg-ink-800',
                    )}
                  />
                ))}
              </span>
              <span className="sr-only">
                {days === undefined
                  ? 'not trained lately'
                  : days === 0
                    ? 'trained today'
                    : `${String(days)} ${days === 1 ? 'day' : 'days'} since`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
