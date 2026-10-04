import { useQueryClient } from '@tanstack/react-query'
import { Ruler } from 'lucide-react'

import { useSettings } from '@/app/context'
import type { Exercise } from '@/domain/exercises/exercise'
import { BIG_JUMP, defaultStepFor, smallerStep, stepJump } from '@/domain/programs/load-steps'
import { stepFor } from '@/domain/programs/progression'
import { formatLoad } from '@/domain/units/weight'
import { Button, Card, CardHeading } from '@/components/shared/primitives'

/**
 * When the next step is too big a share of the bar (`stepJump` past
 * `BIG_JUMP`): a short ruler from today's load to the next one, the usual
 * step and the smaller one both marked, and an offer to take the smaller.
 * **Offered, never applied** — only the lifter knows whether the gym has
 * the plates or the dumbbells for it. Accepting writes `settings.loadSteps`,
 * which reaches every plan through the exercise library; the card stays
 * while the smaller step is in use, so it can be put back.
 */
export function StepCard({
  exercise,
  load,
}: {
  readonly exercise: Exercise
  readonly load: number | undefined
}) {
  const { settings, update } = useSettings()
  const client = useQueryClient()
  const usual = defaultStepFor(exercise)
  const current = stepFor(exercise)
  const chosen = settings.loadSteps?.[exercise.id] !== undefined
  const jump = stepJump(load, usual)
  if (exercise.loadBasis === 'bodyweight' || load === undefined || jump === undefined) return null
  if (!chosen && jump < BIG_JUMP) return null

  const finer = smallerStep(usual)
  const units = settings.units
  const set = (step: number | undefined) => {
    const { [exercise.id]: _old, ...rest } = settings.loadSteps ?? {}
    const next = step === undefined ? rest : { ...rest, [exercise.id]: step }
    update({ loadSteps: Object.keys(next).length === 0 ? undefined : next })
    // The library and every plan read from it carry the step.
    void client.invalidateQueries({ queryKey: ['exercises'] })
    void client.invalidateQueries({ queryKey: ['workouts'] })
  }

  return (
    <Card>
      <CardHeading icon={<Ruler size={16} aria-hidden />} title="The next step" />
      <p className="text-ink-300 text-sm">
        {chosen ? (
          <>
            Stepping by{' '}
            <span className="text-ink-50 font-medium">{formatLoad(current, units)}</span> — half the
            usual {formatLoad(usual, units)}.
          </>
        ) : (
          <>
            The next step adds{' '}
            <span className="text-ink-50 font-medium">{Math.round(jump * 100)}%</span> to the bar. A
            smaller one keeps the reps from falling off the bottom of the range.
          </>
        )}
      </p>
      <StepRuler load={load} usual={usual} finer={finer} chosen={chosen} units={units} />
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => {
          set(chosen ? undefined : finer)
        }}
      >
        {chosen
          ? `Back to ${formatLoad(usual, units)} steps`
          : `Step by ${formatLoad(finer, units)}`}
      </Button>
      {!chosen && (
        <p className="text-ink-500 mt-2 text-xs">
          Only if you have the{' '}
          {formatLoad(finer / (exercise.equipment === 'barbell' ? 2 : 1), units)}{' '}
          {exercise.equipment === 'barbell' ? 'plates' : 'increments'} for it.
        </p>
      )}
    </Card>
  )
}

/**
 * Today's load on the left and the usual next load on the right, with the
 * smaller step's load marked between — the gap the smaller step closes,
 * drawn rather than stated.
 */
function StepRuler({
  load,
  usual,
  finer,
  chosen,
  units,
}: {
  readonly load: number
  readonly usual: number
  readonly finer: number
  readonly chosen: boolean
  readonly units: string
}) {
  const at = (value: number) => 16 + ((value - load) / usual) * 268
  const ticks = [
    { value: load, label: 'Now', lit: true },
    { value: load + finer, label: `+${String(finer)}`, lit: chosen },
    { value: load + usual, label: `+${String(usual)}`, lit: !chosen },
  ]
  return (
    <svg
      viewBox="0 0 300 54"
      className="mt-3 w-full"
      role="img"
      aria-label={`From ${String(load)} ${units}: next ${String(load + usual)} usually, ${String(load + finer)} with the smaller step`}
    >
      <line x1={16} x2={284} y1={22} y2={22} stroke="var(--color-ink-700)" strokeWidth={2} />
      <line
        x1={at(load)}
        x2={at(load + (chosen ? finer : usual))}
        y1={22}
        y2={22}
        stroke="var(--color-accent-500)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {ticks.map((tick) => (
        <g key={tick.label}>
          <circle
            cx={at(tick.value)}
            cy={22}
            r={tick.lit ? 5 : 4}
            fill={tick.lit ? 'var(--color-accent-400)' : 'var(--color-ink-800)'}
            stroke={tick.lit ? 'none' : 'var(--color-ink-500)'}
          />
          <text
            x={at(tick.value)}
            y={10}
            textAnchor="middle"
            className={tick.lit ? 'fill-ink-100 text-[10px]' : 'fill-ink-500 text-[10px]'}
          >
            {tick.value}
          </text>
          <text x={at(tick.value)} y={46} textAnchor="middle" className="fill-ink-500 text-[9px]">
            {tick.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
