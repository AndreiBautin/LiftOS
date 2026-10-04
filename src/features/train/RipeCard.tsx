import { Star, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useSettings } from '@/app/context'
import { bestsByExercise } from '@/domain/logging/bests'
import { ripeLifts } from '@/domain/logging/ripe'
import { formatLoad } from '@/domain/units/weight'
import { Card, CardHeading } from '@/components/shared/primitives'
import { glyphFor } from '@/features/glyphs/glyph-for'
import { MoveGlyph } from '@/features/glyphs/MoveGlyph'

import { useExercises, useRecentWorkouts, useSessionPreview } from './hooks'
import { useNextSession } from './useNextSession'

const GOLD = 'oklch(0.86 0.13 85)'

/**
 * What the next session is ready to push (`ripeLifts`): each lift whose bar
 * goes up from last time — the step double progression earned — drawn as
 * the old bar climbing to the new, and a gold tag where that bar is the
 * heaviest the lift has carried. Read off the session preview, so it
 * names only what Start will actually ask for. Silent when nothing moves.
 */
export function RipeCard() {
  const { settings } = useSettings()
  const preview = useSessionPreview()
  const history = useRecentWorkouts(500)
  const exercises = useExercises()
  const { when, day } = useNextSession()

  if (preview.data == null || history.data === undefined || day === undefined) return null
  const ripe = ripeLifts(preview.data, history.data, bestsByExercise(history.data))
  if (ripe.length === 0) return null
  const lookup = (id: string) => exercises.data?.find((one) => one.id === id)

  return (
    <Card>
      <CardHeading
        icon={<TrendingUp size={16} aria-hidden />}
        title={`Ripe ${when === 'today' ? 'today' : when === 'tomorrow' ? 'tomorrow' : 'next session'}`}
      />
      <ul className="space-y-2.5">
        {ripe.map((lift) => {
          const exercise = lookup(lift.exerciseId)
          return (
            <li
              key={`${lift.exerciseId}-${lift.variant ?? ''}`}
              className="flex items-center gap-3"
            >
              {exercise !== undefined && (
                <MoveGlyph glyph={glyphFor(exercise)} size={20} className="text-ink-500 shrink-0" />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <Link
                  viewTransition
                  to={`/exercise/${lift.exerciseId}`}
                  className="text-ink-100 hover:text-accent-400 truncate text-sm"
                >
                  {exercise?.name ?? lift.exerciseId}
                </Link>
                <span className="numeric flex items-baseline gap-1.5 text-sm">
                  {lift.from !== undefined && (
                    <>
                      <span className="text-ink-500">{formatLoad(lift.from, settings.units)}</span>
                      <span className="text-ink-500" aria-label="to">
                        →
                      </span>
                    </>
                  )}
                  <span className="text-accent-400 font-semibold">
                    {formatLoad(lift.load, settings.units)}
                  </span>
                  {lift.reps !== undefined && (
                    <span className="text-ink-500 text-xs">× {lift.reps}</span>
                  )}
                </span>
              </span>
              {lift.heaviest === true && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold"
                  style={{
                    color: GOLD,
                    borderColor: 'color-mix(in oklab, currentColor 40%, transparent)',
                  }}
                  title="Heaviest bar yet"
                >
                  <Star size={10} aria-hidden fill="currentColor" />
                  Heaviest
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
