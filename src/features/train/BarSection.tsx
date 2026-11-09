import { Check } from 'lucide-react'
import { BeltLoad, DumbbellPair } from './Dumbbells'

import { useSettings } from '@/app/context'
import { Button } from '@/components/shared/primitives'
import type { Exercise } from '@/domain/exercises/exercise'
import { rackFor, type BarKind } from '@/domain/units/plates'
import type { RampStep } from '@/domain/units/ramp'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'
import { cn } from '@/lib/cn'

import { PlateLoader } from './PlateLoader'

/**
 * The bar drawn large, and the warm-up ramp under it as a list to walk.
 *
 * **Pressing a step loads it on the picture.** The ramp is a list of loads,
 * and a list of loads is the arithmetic the plate loader exists to take away.
 * "Done, next step" ticks the one in view and puts the next on the bar; after
 * the last, the working load comes up. The main lift and every other barbell
 * compound get a ramp; isolation work at a light working load is its own
 * warm-up.
 */
export function BarSection({
  equipment,
  load,
  units,
  steps,
  step,
  done,
  onStep,
  onDone,
}: {
  readonly equipment: Exercise['equipment'] | undefined
  readonly load: number
  readonly units: WeightUnit
  readonly steps: readonly RampStep[]
  /** The ramp step on the picture; undefined is the working load. */
  readonly step: number | undefined
  readonly done: ReadonlySet<number>
  readonly onStep: (step: number | undefined) => void
  readonly onDone: (done: ReadonlySet<number>) => void
}) {
  const { settings } = useSettings()
  const kind: BarKind | undefined =
    equipment === 'barbell' ? 'barbell' : equipment === 'ez-bar' ? 'ez-bar' : undefined
  if (kind === undefined) {
    if (equipment === 'dumbbell') return <DumbbellPair load={load} unit={units} />
    if (equipment === 'bodyweight') return <BeltLoad load={load} unit={units} />
    return null
  }

  const plates = rackFor(settings.plates, units, settings.platePairs)
  const shown = step === undefined ? load : (steps[step]?.load ?? load)

  const finish = (index: number) => {
    const next = new Set(done).add(index)
    onDone(next)
    const after = steps.findIndex((_, at) => !next.has(at))
    onStep(after === -1 ? undefined : after)
  }

  return (
    <>
      <PlateLoader load={shown} unit={units} kind={kind} available={plates} />
      {steps.length > 0 && (
        <>
          <ol className="border-ink-800 mt-3 border-t" aria-label="Warm-up ramp">
            {steps.map((one, index) => (
              <Row
                key={one.load}
                label={index === 0 ? 'Empty bar' : `Step ${String(index + 1)}`}
                figure={`${formatLoad(one.load, units)} × ${String(one.reps)}`}
                active={step === index}
                ticked={done.has(index)}
                onPress={() => {
                  onStep(step === index ? undefined : index)
                }}
              />
            ))}
            <Row
              label="Work"
              figure={formatLoad(load, units)}
              active={step === undefined}
              ticked={false}
              onPress={() => {
                onStep(undefined)
              }}
            />
          </ol>
          {step !== undefined && !done.has(step) && (
            <Button
              variant="primary"
              full
              className="font-display mt-4 h-16 rounded-2xl text-lg"
              onClick={() => {
                finish(step)
              }}
            >
              {step + 1 < steps.length ? 'Done, next step' : 'Done, on to the work'}
            </Button>
          )}
        </>
      )}
    </>
  )
}

function Row({
  label,
  figure,
  active,
  ticked,
  onPress,
}: {
  readonly label: string
  readonly figure: string
  readonly active: boolean
  readonly ticked: boolean
  readonly onPress: () => void
}) {
  return (
    <li className="border-ink-800 border-b">
      <button
        type="button"
        aria-pressed={active}
        onClick={onPress}
        className={cn(
          'flex min-h-[3.25rem] w-full items-center gap-3 text-left',
          !active && ticked && 'text-ink-500',
        )}
      >
        {ticked ? (
          <Check size={20} className="text-accent-400 shrink-0" aria-label="Done" />
        ) : (
          <span
            aria-hidden
            className={cn(
              'size-5 shrink-0 rounded-full border-2',
              active ? 'border-accent-400' : 'border-ink-700',
            )}
          />
        )}
        <span className={cn('flex-1', active && 'font-semibold')}>{label}</span>
        <span
          className={cn(
            'font-display',
            active ? 'text-2xl leading-none font-bold' : 'text-base font-medium',
          )}
        >
          {figure}
        </span>
      </button>
    </li>
  )
}
