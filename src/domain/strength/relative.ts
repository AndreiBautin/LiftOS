export interface RelativePoint {
  readonly date: string
  /** The reading itself, for a label. */
  readonly value: number
  /** As a share of the first reading, 100 being where it started. */
  readonly percent: number
}

/**
 * A series read against its own first reading, so two lifts of very
 * different weights can share one axis: a curl from 30 to 35 and a squat
 * from 275 to 305 are 117 and 111, which is the comparison worth making.
 *
 * Readings of nought or less are dropped, since nothing can be a share of
 * them; an empty or all-dropped series is empty, never a line at 100.
 */
export function relativeSeries(
  points: readonly { readonly date: string; readonly value: number }[],
): readonly RelativePoint[] {
  const usable = points.filter((point) => point.value > 0)
  const first = usable[0]?.value
  if (first === undefined) return []
  return usable.map((point) => ({
    date: point.date,
    value: point.value,
    percent: Math.round((point.value / first) * 1000) / 10,
  }))
}
