/**
 * The colour each competition lift wears, wherever a lift is drawn — the
 * strength chart, its standards rows, a month's estimates. One map, so a
 * squat is the same cyan on every screen and two cards about one lift read
 * as one subject. It was four copies.
 */
export const LIFT_COLOURS = {
  squat: 'var(--color-accent-400)',
  bench: 'var(--color-cool-500)',
  deadlift: 'var(--color-warn-500)',
} as const

export type ChartLift = keyof typeof LIFT_COLOURS
