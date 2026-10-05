import { useState } from 'react'

import { useSettings } from '@/app/context'
import { strengthTable } from '@/domain/strength/calculator'
import { E1RM_FORMULA_LABELS } from '@/domain/strength/one-rep-max'
import { rackFor } from '@/domain/units/plates'
import { formatLoad } from '@/domain/units/weight'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardHeading } from '@/components/shared/primitives'
import { PlateLoader } from '@/features/train/PlateLoader'
import { Stepper } from '@/features/train/Stepper'
import { cn } from '@/lib/cn'

/**
 * A set in, every reading of it out (`strengthTable`): the max it
 * implies, what the same strength should do for 1 to 12 reps — drawn as a
 * curve, because the shape is the thing a list hides — and the usual
 * percentages, each a row that loads its bar on the plate picture.
 *
 * Same formula as everywhere (Settings), same rounding, every load rounded
 * **down** to one the plates can make. Reached from the records wall and
 * the palette.
 */
export function CalculatorPage() {
  const { settings } = useSettings()
  const [load, setLoad] = useState('225')
  const [reps, setReps] = useState('5')
  const [shown, setShown] = useState<number | undefined>(undefined)

  const table = strengthTable(
    Number(load),
    Number(reps),
    settings.e1rmFormula,
    settings.roundingIncrement,
  )
  const units = settings.units
  const barLoad = shown ?? table?.percents.find((row) => row.percent === 100)?.load ?? undefined

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8 lg:max-w-5xl">
      <PageHeader
        title="Calculator"
        subtitle={`${E1RM_FORMULA_LABELS[settings.e1rmFormula]} · rounded down to ${String(settings.roundingIncrement)} ${units}`}
      />

      <section className="hero-panel p-5 sm:p-6" aria-label="The set">
        <div className="grid grid-cols-2 gap-2">
          <Stepper
            label={units}
            id="calc-load"
            value={load}
            onChange={setLoad}
            step={settings.roundingIncrement}
          />
          <Stepper label="Reps" id="calc-reps" value={reps} onChange={setReps} step={1} min={1} />
        </div>
        {table === undefined ? (
          <p className="text-ink-500 mt-4 text-sm">A load and a whole number of reps.</p>
        ) : (
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-ink-500 text-xs tracking-wide uppercase">Estimated max</p>
              <p className="numeric text-ink-50 text-5xl leading-none font-semibold">
                {Math.round(table.estimate.value)}
                <span className="text-ink-500 ml-1.5 text-xl">{units}</span>
              </p>
            </div>
            {!table.estimate.isReliable && (
              <p className="text-warn-500 max-w-[11rem] text-right text-xs">
                Past ten reps the formula guesses; read this loosely.
              </p>
            )}
          </div>
        )}
      </section>

      {/* From `lg` the two tables stand side by side under the set. */}
      {table !== undefined && (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
          <Card>
            <CardHeading title="For other rep counts" />
            <RepCurve rows={table.reps} given={Number(reps)} />
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {table.reps.map((row) => (
                <li key={row.reps}>
                  <button
                    type="button"
                    onClick={() => {
                      setShown(row.load)
                    }}
                    className={cn(
                      'bg-ink-850 tap-target w-full rounded-lg px-2 py-1.5 text-left',
                      row.reps === Number(reps) && 'ring-accent-500/60 ring-1',
                    )}
                  >
                    <span className="text-ink-500 block text-[0.65rem]">× {row.reps}</span>
                    <span className="numeric text-ink-50 block text-sm font-semibold">
                      {formatLoad(row.load, units)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeading title="Percentages" />
            <ul className="divide-ink-800/60 divide-y">
              {table.percents.map((row) => (
                <li key={row.percent}>
                  <button
                    type="button"
                    aria-pressed={barLoad === row.load}
                    onClick={() => {
                      setShown(row.load)
                    }}
                    className="hover:bg-ink-850 tap-target flex w-full items-center gap-3 rounded-md px-1.5"
                  >
                    <span className="numeric text-ink-500 w-10 text-left text-sm">
                      {row.percent}%
                    </span>
                    <span className="bg-ink-800 relative h-1.5 flex-1 overflow-hidden rounded-full">
                      <span
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full',
                          barLoad === row.load ? 'bg-accent-400' : 'bg-ink-500',
                        )}
                        style={{ width: `${String(row.percent)}%` }}
                      />
                    </span>
                    <span className="numeric text-ink-50 w-20 text-right text-sm font-semibold">
                      {formatLoad(row.load, units)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {barLoad !== undefined && barLoad > 0 && (
              <div className="mt-3">
                <PlateLoader
                  load={barLoad}
                  unit={units}
                  available={rackFor(settings.plates, units, settings.platePairs)}
                />
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

/** Load against reps, a falling curve with the set itself ringed. */
function RepCurve({
  rows,
  given,
}: {
  readonly rows: readonly { readonly reps: number; readonly load: number }[]
  readonly given: number
}) {
  const width = 320
  const height = 120
  const maxReps = rows.at(-1)?.reps ?? 12
  const high = rows[0]?.load ?? 1
  const low = Math.min(...rows.map((row) => row.load))
  const span = Math.max(1, high - low)
  const x = (reps: number) => 14 + ((reps - 1) / (maxReps - 1)) * (width - 28)
  const y = (load: number) => 14 + (1 - (load - low) / span) * (height - 40)
  const path = rows
    .map((row, at) => `${at === 0 ? 'M' : 'L'} ${String(x(row.reps))} ${String(y(row.load))}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${String(width)} ${String(height)}`} className="w-full" role="img">
      <title>{rows.map((row) => `${String(row.reps)} reps: ${String(row.load)}`).join('; ')}</title>
      <defs>
        <linearGradient id="rep-curve-under" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-accent-500)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-accent-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${String(x(maxReps))} ${String(height - 20)} L ${String(x(1))} ${String(height - 20)} Z`}
        className="area-fade"
        fill="url(#rep-curve-under)"
      />
      <path
        d={path}
        className="stroke-accent-400 line-draw fill-none"
        pathLength={1}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {rows.map((row) => (
        <g key={row.reps}>
          <circle
            cx={x(row.reps)}
            cy={y(row.load)}
            r={row.reps === given ? 5 : 2.5}
            className={row.reps === given ? 'fill-ink-50' : 'fill-accent-400'}
          />
          <text
            x={x(row.reps)}
            y={height - 6}
            textAnchor="middle"
            className="fill-ink-500 text-[8px]"
          >
            {row.reps}
          </text>
        </g>
      ))}
    </svg>
  )
}
