import type { WeightUnit } from './weight'

/**
 * What goes on each side of the bar for a load.
 *
 * The plate loader in the session player draws this, so a lifter reads
 * "two 45s and a 10" off the screen instead of doing the arithmetic with
 * chalk on their hands between sets. It is pure and greedy — the largest
 * plate that still fits, repeatedly — because that is how a person loads
 * a bar, and a loading that is arithmetically equal but uses more small
 * plates would be correct and annoying.
 *
 * **The plate sets are a standard gym's**, not anybody's garage: lb from
 * 45 down to 2.5, kg from 25 down to 1.25. A load that cannot be made
 * exactly reports what is left over rather than rounding it away — a
 * screen that silently showed 227.5 as 225 would be loading a different
 * bar from the one logged.
 */

export type BarKind = 'barbell' | 'ez-bar'

export const BAR_WEIGHT: Readonly<Record<BarKind, Readonly<Record<WeightUnit, number>>>> = {
  barbell: { lb: 45, kg: 20 },
  // EZ bars vary more than straight bars; 25 lb / 10 kg is the common one.
  'ez-bar': { lb: 25, kg: 10 },
}

export const PLATES: Readonly<Record<WeightUnit, readonly number[]>> = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
}

export interface Loading {
  /** The bar alone. */
  readonly bar: number
  /** Plates for one side, heaviest first — the order they go on. */
  readonly perSide: readonly number[]
  /** Load the plates could not make, per side. Nought for an exact loading. */
  readonly leftover: number
}

/**
 * Plates per side for `load` on `bar`, or undefined when the load is not
 * more than the bar — an empty bar, or a number that cannot be a barbell
 * load at all.
 */
export function platesFor(
  load: number,
  unit: WeightUnit,
  kind: BarKind = 'barbell',
  /**
   * The plates actually to hand — a home gym with no 35s, say. Defaults to
   * the standard set; whatever is passed is read heaviest first.
   */
  available: readonly number[] = PLATES[unit],
): Loading | undefined {
  const bar = BAR_WEIGHT[kind][unit]
  if (!Number.isFinite(load) || load < bar) return undefined

  // Worked in hundredths so 2.5 and 1.25 subtract exactly.
  let side = Math.round(((load - bar) / 2) * 100)
  const perSide: number[] = []

  for (const plate of [...available].sort((a, b) => b - a)) {
    const step = Math.round(plate * 100)
    while (side >= step) {
      perSide.push(plate)
      side -= step
    }
  }

  /*
   * **Greedy first, then exact.** Heaviest-first is right for a standard
   * set and wrong for some gyms: with no 5s, 95 a side greedily reads as
   * 45 + 45 and 5 left over, when 45 + 25 + 25 makes it. So a leftover
   * asks for the fewest plates that make the side exactly, and only a
   * load nothing can make keeps its leftover.
   */
  if (side > 0) {
    const exact = exactSide(Math.round(((load - bar) / 2) * 100), available)
    if (exact !== undefined) return { bar, perSide: exact, leftover: 0 }
  }

  return { bar, perSide, leftover: side / 100 }
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * The fewest plates making one side exactly, heaviest first; undefined
 * when none do. Counted in the plates' common divisor, so 95 lb a side
 * from 45 / 35 / 25 / 10 is nineteen steps of five rather than nine
 * thousand hundredths.
 */
function exactSide(hundredths: number, available: readonly number[]): number[] | undefined {
  const plates = available.map((plate) => Math.round(plate * 100)).filter((plate) => plate > 0)
  const unit = plates.reduce(gcd, 0)
  if (unit === 0 || hundredths % unit !== 0) return undefined
  const target = hundredths / unit
  const steps = plates.map((plate) => plate / unit)
  // fewest[n]: the fewest plates making n steps, and the last plate used.
  const fewest: { count: number; plate: number }[] = [{ count: 0, plate: 0 }]
  for (let n = 1; n <= target; n += 1) {
    let best: { count: number; plate: number } | undefined
    for (const [at, step] of steps.entries()) {
      const before = n >= step ? fewest[n - step] : undefined
      if (before === undefined || before.count === Infinity) continue
      if (best === undefined || before.count + 1 < best.count)
        best = { count: before.count + 1, plate: at }
    }
    fewest.push(best ?? { count: Infinity, plate: 0 })
  }
  if ((fewest[target]?.count ?? Infinity) === Infinity) return undefined
  const used: number[] = []
  for (let n = target; n > 0;) {
    const at = fewest[n]?.plate ?? 0
    used.push((plates[at] ?? 0) / 100)
    n -= steps[at] ?? n
  }
  return used.toSorted((a, b) => b - a)
}

/**
 * The plates a stored list says are to hand, read back for a unit.
 *
 * A list saved under the other unit names plates that do not exist here,
 * and an empty list cannot load a bar at all — both read as the standard
 * set rather than as a gym with nothing in it.
 */
export function platesToHand(
  stored: readonly number[] | undefined,
  unit: WeightUnit,
): readonly number[] {
  const known = (stored ?? []).filter((plate) => PLATES[unit].includes(plate))
  return known.length === 0 ? PLATES[unit] : PLATES[unit].filter((plate) => known.includes(plate))
}

/**
 * The nearest loads the plates make, either side of one they cannot.
 *
 * **Loadable means what the picture draws**: `platesFor` with nothing
 * left over, so a load offered here is one the plate loader will show
 * clean rather than with a "+2" beside it. Searched in half-unit steps,
 * which no plate set divides more finely than; bounded, so a set of
 * plates that can make nothing nearby offers nothing rather than
 * searching forever. Below the bar there is nothing below, and the bar
 * is the nearest above. Undefined when the load already loads clean.
 */
export function nearestLoadable(
  load: number,
  unit: WeightUnit,
  kind: BarKind = 'barbell',
  available: readonly number[] = PLATES[unit],
): { readonly below?: number; readonly above?: number } | undefined {
  if (!Number.isFinite(load) || load <= 0) return undefined
  const bar = BAR_WEIGHT[kind][unit]
  const clean = (total: number) => platesFor(total, unit, kind, available)?.leftover === 0
  if (load < bar) return { above: bar }
  if (clean(load)) return undefined
  const STEP = 0.5
  const REACH = 400
  const start = Math.round(load / STEP) * STEP
  let below: number | undefined
  let above: number | undefined
  for (let at = 0; at <= REACH && (below === undefined || above === undefined); at += 1) {
    const down = start - at * STEP
    const up = start + at * STEP
    if (below === undefined && down < load && down >= bar && clean(down)) below = down
    if (above === undefined && up > load && clean(up)) above = up
  }
  return {
    ...(below === undefined ? {} : { below }),
    ...(above === undefined ? {} : { above }),
  }
}
