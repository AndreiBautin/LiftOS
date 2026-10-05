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
   * The plates actually to hand — a home gym with no 35s, say — and, as a
   * rack, how many pairs of each. Defaults to the standard set with no
   * limit; whatever is passed is read heaviest first.
   */
  available: Rack = PLATES[unit],
): Loading | undefined {
  const bar = BAR_WEIGHT[kind][unit]
  if (!Number.isFinite(load) || load < bar) return undefined
  const { plates, pairs } = rackOf(available)

  // Worked in hundredths so 2.5 and 1.25 subtract exactly.
  const whole = Math.round(((load - bar) / 2) * 100)
  let side = whole
  const perSide: number[] = []

  for (const plate of [...plates].sort((a, b) => b - a)) {
    const step = Math.round(plate * 100)
    // A side takes one plate of each pair, so a pair count is a per-side limit.
    let left = pairs(plate)
    while (side >= step && left > 0) {
      perSide.push(plate)
      side -= step
      left -= 1
    }
  }

  /*
   * **Greedy first, then exact.** Heaviest-first is right for a standard
   * set and wrong for some gyms: with no 5s, 95 a side greedily reads as
   * 45 + 45 and 5 left over, when 45 + 25 + 25 makes it — and with only
   * one pair of 45s, 135 a side is 45 + 35 + 35 + 10 + 10, not three 45s.
   * So a leftover asks for the fewest plates that make the side exactly
   * within the pairs owned, and only a load nothing can make keeps its
   * leftover.
   */
  if (side > 0) {
    const exact = exactSide(whole, plates, pairs)
    if (exact !== undefined) return { bar, perSide: exact, leftover: 0 }
  }

  return { bar, perSide, leftover: side / 100 }
}

/**
 * The plates to hand, either as a list (any number of each) or with a
 * count of pairs per plate. A plate with no count is unlimited, so a rack
 * that names only the 45s limits only the 45s.
 */
export type Rack =
  | readonly number[]
  | {
      readonly plates: readonly number[]
      readonly pairs: Readonly<Record<string, number>>
    }

/** The plate sizes a rack holds, whatever its shape. */
export function rackPlates(rack: Rack): readonly number[] {
  return rackOf(rack).plates
}

function rackOf(rack: Rack): {
  readonly plates: readonly number[]
  readonly pairs: (plate: number) => number
} {
  if (Array.isArray(rack)) return { plates: rack, pairs: () => Number.POSITIVE_INFINITY }
  const { plates, pairs } = rack as Exclude<Rack, readonly number[]>
  return {
    plates,
    pairs: (plate) => pairs[String(plate)] ?? Number.POSITIVE_INFINITY,
  }
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * The fewest plates making one side exactly, heaviest first, using no
 * more of a plate than there are pairs of it; undefined when none do.
 * Counted in the plates' common divisor, so 95 lb a side from 45 / 35 /
 * 25 / 10 is nineteen steps of five rather than nine thousand hundredths,
 * and each plate is offered as many times as it could be used — a bounded
 * search over a few dozen items.
 */
function exactSide(
  hundredths: number,
  plates: readonly number[],
  pairs: (plate: number) => number,
): number[] | undefined {
  const sizes = plates.map((plate) => Math.round(plate * 100)).filter((plate) => plate > 0)
  const unit = sizes.reduce(gcd, 0)
  if (unit === 0 || hundredths % unit !== 0) return undefined
  const target = hundredths / unit
  const items = sizes.flatMap((size) => {
    const step = size / unit
    const copies = Math.min(pairs(size / 100), Math.floor(target / step))
    return Array.from({ length: Math.max(0, copies) }, () => step)
  })
  // fewest[n] after each item: the fewest items making n steps.
  let fewest = Array<number>(target + 1).fill(Number.POSITIVE_INFINITY)
  fewest[0] = 0
  for (const step of items) {
    const next = [...fewest]
    for (let n = step; n <= target; n += 1) {
      const via = (fewest[n - step] ?? Number.POSITIVE_INFINITY) + 1
      if (via < (next[n] ?? Number.POSITIVE_INFINITY)) next[n] = via
    }
    fewest = next
  }
  const best = fewest[target] ?? Number.POSITIVE_INFINITY
  if (best === Number.POSITIVE_INFINITY) return undefined
  /*
   * The count is settled; which plates make it is not — 45 + 25 + 25 and
   * 35 + 35 + 25 are both three. Heaviest first, the way a bar is loaded:
   * a depth-first walk down the sizes takes the first combination of that
   * many plates, which is the one with the heaviest plates earliest.
   */
  const order = [...new Set(sizes)].sort((a, b) => b - a).map((size) => size / unit)
  const limit = (step: number) => Math.min(pairs((step * unit) / 100), Math.floor(target / step))
  const walk = (left: number, from: number, room: number): number[] | undefined => {
    if (left === 0) return []
    if (room === 0) return undefined
    for (let at = from; at < order.length; at += 1) {
      const step = order[at] ?? 0
      for (let take = Math.min(limit(step), Math.floor(left / step), room); take > 0; take -= 1) {
        const rest = walk(left - take * step, at + 1, room - take)
        if (rest !== undefined) return [...Array<number>(take).fill((step * unit) / 100), ...rest]
      }
    }
    return undefined
  }
  return walk(target, 0, best)
}

/**
 * The plates to hand with the pairs owned of each, for the loader, the
 * ramp and the nearest-load offer. Counts for plates not to hand, or not
 * whole positive numbers, are ignored.
 */
export function rackFor(
  stored: readonly number[] | undefined,
  unit: WeightUnit,
  pairs: Readonly<Record<string, number>> | undefined,
): Rack {
  const plates = platesToHand(stored, unit)
  const kept = Object.entries(pairs ?? {}).filter(
    ([plate, count]) => plates.includes(Number(plate)) && Number.isInteger(count) && count > 0,
  )
  return kept.length === 0 ? plates : { plates, pairs: Object.fromEntries(kept) }
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
  available: Rack = PLATES[unit],
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
