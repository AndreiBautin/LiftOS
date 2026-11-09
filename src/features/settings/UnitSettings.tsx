import { useSettings } from '@/app/context'
import { Button } from '@/components/shared/primitives'
import { PLATES, platesToHand } from '@/domain/units/plates'
import { DEFAULT_INCREMENT } from '@/domain/units/weight'
import { cn } from '@/lib/cn'

/** Pounds or kilos, what loads round to, the plates to hand and your bodyweight. */
export function UnitSettings() {
  const { settings, update } = useSettings()
  return (
    <div className="inset-list">
      <div className="inset-row flex gap-2">
        {(['lb', 'kg'] as const).map((unit) => (
          <Button
            key={unit}
            variant={settings.units === unit ? 'primary' : 'outline'}
            className="flex-1"
            onClick={() => {
              update({ units: unit, roundingIncrement: DEFAULT_INCREMENT[unit] })
            }}
          >
            {unit}
          </Button>
        ))}
      </div>

      <NumberSetting
        label="Round loads to the nearest"
        suffix={settings.units}
        value={settings.roundingIncrement}
        onChange={(roundingIncrement) => {
          update({ roundingIncrement })
        }}
      />

      <PlateSetting />

      <NumberSetting
        label="Bodyweight"
        suffix={settings.units}
        value={settings.bodyweight ?? 0}
        onChange={(bodyweight) => {
          update({ bodyweight })
        }}
      />
    </div>
  )
}

function NumberSetting({
  label,
  suffix,
  value,
  onChange,
}: {
  readonly label: string
  readonly suffix?: string
  readonly value: number
  readonly onChange: (value: number) => void
}) {
  const id = `setting-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`

  return (
    <div className="inset-row flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-ink-100 text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value === 0 ? '' : value}
          placeholder="—"
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }}
          className="inline-value numeric tap-target w-24"
        />
        {suffix !== undefined && <span className="text-ink-500 text-xs">{suffix}</span>}
      </div>
    </div>
  )
}

/**
 * Which plates the gym has, so the plate loader and the warm-up ramp only
 * ever ask for a bar that can be built. Every plate starts on; turning
 * one off is the home gym with no 35s. The last one cannot be turned off
 * — a gym with no plates loads nothing, and `platesToHand` would read it
 * as the standard set anyway.
 */
function PlateSetting() {
  const { settings, update } = useSettings()
  const toHand = platesToHand(settings.plates, settings.units)

  return (
    <div className="inset-row">
      <p className="text-ink-100 text-sm font-medium">Plates you have</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Plates you have">
        {PLATES[settings.units].map((plate) => {
          const has = toHand.includes(plate)
          const last = has && toHand.length === 1
          return (
            <button
              key={plate}
              type="button"
              aria-pressed={has}
              disabled={last}
              className={cn(
                'numeric tap-target min-w-12 rounded-[0.75rem] border px-2 text-sm font-semibold',
                has ? 'border-ink-700 bg-ink-800 text-ink-50' : 'border-ink-800 text-ink-600',
              )}
              onClick={() => {
                update({
                  plates: has ? toHand.filter((one) => one !== plate) : [...toHand, plate],
                })
              }}
            >
              {plate}
            </button>
          )
        })}
      </div>
      <p className="text-ink-500 mt-1.5 text-xs">
        The plate loader and the warm-up ramp only use these.
      </p>
      <PlatePairs plates={toHand} />
    </div>
  )
}

/**
 * How many pairs of each plate the rack holds (`settings.platePairs`),
 * folded because most gyms never run out. Unset is any number; a count
 * caps how many of that plate one side can take, so 315 with one pair of
 * 45s is loaded with 35s and 10s rather than three 45s that are not there.
 */
function PlatePairs({ plates }: { readonly plates: readonly number[] }) {
  const { settings, update } = useSettings()
  const pairs = settings.platePairs ?? {}
  const set = (plate: number, count: number | undefined) => {
    const { [String(plate)]: _old, ...rest } = pairs
    const next = count === undefined ? rest : { ...rest, [String(plate)]: count }
    update({ platePairs: Object.keys(next).length === 0 ? undefined : next })
  }

  return (
    <details className="mt-3">
      <summary className="text-ink-300 hover:text-accent-400 tap-target flex cursor-pointer items-center text-sm">
        How many of each?{' '}
        {Object.keys(pairs).length > 0 ? `(${String(Object.keys(pairs).length)} counted)` : ''}
      </summary>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {plates.map((plate) => {
          const count = pairs[String(plate)]
          return (
            <li key={plate} className="well flex items-center justify-between gap-2 px-3 py-1">
              <span className="numeric text-ink-100 text-sm">
                {plate} {settings.units}
              </span>
              <span className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Fewer pairs of ${String(plate)}`}
                  disabled={count === undefined}
                  onClick={() => {
                    set(plate, count === undefined || count <= 1 ? undefined : count - 1)
                  }}
                >
                  −
                </Button>
                <span className="numeric text-ink-300 w-16 text-center text-xs">
                  {count === undefined
                    ? 'any'
                    : `${String(count)} ${count === 1 ? 'pair' : 'pairs'}`}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`More pairs of ${String(plate)}`}
                  onClick={() => {
                    set(plate, (count ?? 0) + 1)
                  }}
                >
                  +
                </Button>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="text-ink-500 mt-1.5 text-xs">
        Any means as many as a bar needs. Below one pair is any again.
      </p>
    </details>
  )
}
