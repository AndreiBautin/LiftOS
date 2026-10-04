import { parseDay, shiftDay } from '@/domain/time/day'

import { fitTrend, WINDOW_DAYS } from './projection'
import type { TrendPoint } from './trend'

/**
 * Where a lift is heading over the next weeks, with how unsure that is.
 *
 * **The fit is `fitTrend`'s** — the line the Strength card already reads
 * a date off — so a forecast here and a "reaches 2× around March" there
 * are one line, not two. What this adds is the band: a prediction
 * interval about the line, roughly two standard errors, which **widens
 * with distance** because it is a forecast, and the farther out the
 * less it knows.
 *
 * **The band has a floor that grows a quarter of a percent a week.**
 * A steady lifter's sessions sit almost exactly on a line — the demo's
 * do perfectly — and an interval from the residuals alone would draw a
 * twelve-week forecast as a thread. Strength does not climb in a straight
 * line forever; the floor is the admission of that, not a number fitted
 * to anything, and it is stated rather than hidden.
 *
 * **A falling line forecasts falling.** It is not silenced: a lift
 * dropping for twelve weeks is the thing most worth seeing early. What
 * silences it is the same thin evidence `fitTrend` refuses.
 */
export interface ForecastPoint {
  readonly date: string
  readonly mid: number
  readonly low: number
  readonly high: number
}

export interface LiftForecast {
  /** The fitted line at the last session — where the forecast starts. */
  readonly from: ForecastPoint
  /** One point a week, the last `weeks` out from the last session. */
  readonly ahead: readonly ForecastPoint[]
  readonly slopePerWeek: number
}

/** Two standard errors: a band most readings should fall inside. */
const Z = 2
/** The band's floor, as a share of the line, per week out. */
const FLOOR_PER_WEEK = 0.0025

const daysBetween = (from: string, to: string) =>
  (parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000

export function forecastLift(
  points: readonly TrendPoint[],
  weeks: number,
): LiftForecast | undefined {
  const fit = fitTrend(points)
  if (fit === undefined) return undefined

  const window = points.filter((point) => point.date >= shiftDay(fit.lastDate, -WINDOW_DAYS))
  // x measured back from the last session, so x = 0 is where the line is read.
  const xs = window.map((point) => daysBetween(fit.lastDate, point.date))
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const sxx = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0)
  const residual = window.reduce(
    (sum, point, i) => sum + (point.value - (fit.fittedNow + fit.slopePerDay * (xs[i] ?? 0))) ** 2,
    0,
  )
  const s = n > 2 ? Math.sqrt(residual / (n - 2)) : 0

  const at = (days: number): ForecastPoint => {
    const mid = fit.fittedNow + fit.slopePerDay * days
    const spread = Z * s * Math.sqrt(1 + 1 / n + (sxx === 0 ? 0 : (days - meanX) ** 2 / sxx))
    const half = Math.max(spread, mid * FLOOR_PER_WEEK * (days / 7))
    return { date: shiftDay(fit.lastDate, days), mid, low: mid - half, high: mid + half }
  }

  const from = at(0)
  return {
    from: { ...from, low: from.mid, high: from.mid },
    ahead: Array.from({ length: weeks }, (_, week) => at((week + 1) * 7)),
    slopePerWeek: fit.slopePerDay * 7,
  }
}

/**
 * The three lifts' forecasts summed into a total, week by week. The
 * bands combine as independent errors (root of the sum of squares), which
 * is narrower than adding the three widths — a bad squat week and a bad
 * bench week do not have to land together. Absent unless all three have
 * a forecast: a total of two lifts is not a total.
 */
export function forecastTotal(
  lifts: readonly (LiftForecast | undefined)[],
): readonly ForecastPoint[] | undefined {
  if (lifts.length === 0 || lifts.some((lift) => lift === undefined)) return undefined
  const all = lifts as readonly LiftForecast[]
  const weeks = Math.min(...all.map((lift) => lift.ahead.length))
  return Array.from({ length: weeks }, (_, week) => {
    const at = all.flatMap((lift) => lift.ahead.slice(week, week + 1))
    const mid = at.reduce((sum, point) => sum + point.mid, 0)
    const half = Math.sqrt(at.reduce((sum, point) => sum + ((point.high - point.low) / 2) ** 2, 0))
    return { date: at[0]?.date ?? '', mid, low: mid - half, high: mid + half }
  })
}
