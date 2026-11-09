import { ChevronUp, Dumbbell } from 'lucide-react'
import { useCallback, useState } from 'react'

import { BottomSheet } from '@/components/shared/BottomSheet'
import { useSettings } from '@/app/context'
import type { Exercise } from '@/domain/exercises/exercise'
import { PLATES, platesFor, rackFor, type BarKind } from '@/domain/units/plates'
import { warmupRamp } from '@/domain/units/ramp'
import { formatLoad, type WeightUnit } from '@/domain/units/weight'

import { BarSection } from './BarSection'
import { PLATE_COLOURS } from './plate-colours'
import { platesPerSide } from './player-steps'

/**
 * Everything about loading the bar, folded into one strip under the set.
 *
 * **The strip answers the usual question without opening**: what goes on each
 * side. The picture and the warm-up ramp are a press away, in a sheet, because
 * they are wanted once per exercise and the set is wanted every time. The
 * ramp's ticks live here rather than in the sheet, so closing it to do the
 * step does not lose them; keyed by the exercise, so paging on clears them.
 */
export function BarStrip({
  equipment,
  load,
  units,
  ramp,
}: {
  readonly equipment: Exercise['equipment'] | undefined
  readonly load: number | undefined
  readonly units: WeightUnit
  readonly ramp: boolean
}) {
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<number | undefined>(undefined)
  const [done, setDone] = useState<ReadonlySet<number>>(new Set())
  const close = useCallback(() => {
    setOpen(false)
  }, [])

  if (load === undefined || load <= 0) return null
  const kind: BarKind | undefined =
    equipment === 'barbell' ? 'barbell' : equipment === 'ez-bar' ? 'ez-bar' : undefined
  if (kind === undefined && equipment !== 'dumbbell' && equipment !== 'bodyweight') return null

  const rack = rackFor(settings.plates, units, settings.platePairs)
  const loading = kind === undefined ? undefined : platesFor(load, units, kind, rack)
  if (kind !== undefined && loading === undefined) return null
  const steps = kind !== undefined && ramp ? warmupRamp(load, units, kind, rack) : []

  const headline =
    loading !== undefined
      ? platesPerSide(loading.perSide)
      : equipment === 'dumbbell'
        ? `${formatLoad(load, units)} each hand`
        : `${formatLoad(load, units)} on the belt`

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true)
        }}
        className="bg-ink-900 border-ink-800 flex min-h-[4.25rem] w-full items-center gap-3.5 rounded-2xl border px-3.5 text-left"
      >
        {loading === undefined ? (
          <Dumbbell size={20} className="text-ink-500 shrink-0" aria-hidden />
        ) : (
          <MiniSleeve perSide={loading.perSide} unit={units} />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="numeric truncate text-[0.9375rem] font-medium">{headline}</span>
          {steps.length > 0 && (
            <span className="text-ink-500 numeric truncate text-[0.8125rem]">
              {done.size === 0
                ? `Warm-up ramp, ${String(steps.length)} steps`
                : `Warm-up ramp, ${String(done.size)} of ${String(steps.length)} done`}
            </span>
          )}
        </span>
        <ChevronUp size={16} className="text-ink-500 shrink-0" aria-hidden />
      </button>
      {open && (
        <BottomSheet label="Load the bar" title="Load the bar" onClose={close}>
          <BarSection
            equipment={equipment}
            load={load}
            units={units}
            steps={steps}
            step={step}
            done={done}
            onStep={setStep}
            onDone={setDone}
          />
        </BottomSheet>
      )}
    </>
  )
}

/** One side of the bar, small: enough to recognise the loading at a glance. */
function MiniSleeve({
  perSide,
  unit,
}: {
  readonly perSide: readonly number[]
  readonly unit: WeightUnit
}) {
  const HEIGHTS = [40, 34, 28, 22, 18, 14, 12]
  const WIDTHS = [8, 7, 6, 5, 4, 4, 3]
  const ranks = perSide.map((plate) => Math.max(0, PLATES[unit].indexOf(plate)))
  const plates = ranks.map((rank, at) => {
    const height = HEIGHTS[rank] ?? 12
    return {
      key: at,
      x: ranks.slice(0, at).reduce((sum, one) => sum + (WIDTHS[one] ?? 3) + 1, 8),
      y: 22 - height / 2,
      width: WIDTHS[rank] ?? 3,
      height,
      fill: PLATE_COLOURS[unit][rank] ?? 'var(--color-ink-500)',
    }
  })
  return (
    <svg viewBox="0 0 72 44" className="h-11 w-[4.5rem] shrink-0" aria-hidden>
      <rect x="0" y="20" width="72" height="4" rx="2" fill="var(--color-ink-600)" />
      {plates.map(({ key, ...plate }) => (
        <rect key={key} rx="1.5" {...plate} />
      ))}
    </svg>
  )
}
