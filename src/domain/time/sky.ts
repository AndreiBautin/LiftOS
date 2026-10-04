/**
 * The light behind the app at an hour of the day: where it sits on the
 * screen, what colour it is and how strong.
 *
 * A wash low on the left at dawn, high and pale through the day, low and
 * amber on the right at dusk, and a faint violet moon-glow at night —
 * **moving continuously** between stops rather than switching, so across
 * a session it drifts one way, slowly, the rule every motion here keeps.
 * The stops are the app's own taste, not a claim about the sun: nothing
 * reads them but the backdrop.
 */
export interface Sky {
  /** Horizontal centre of the glow, percent of the screen width. */
  readonly x: number
  /** Vertical centre, percent of the screen height (may sit off screen). */
  readonly y: number
  /** OKLCH hue. */
  readonly hue: number
  /** Opacity of the glow's centre, 0–1. */
  readonly strength: number
}

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk'

interface Stop extends Sky {
  readonly hour: number
}

const STOPS: readonly Stop[] = [
  { hour: 0, x: 78, y: -12, hue: 285, strength: 0.1 },
  { hour: 5, x: 15, y: 108, hue: 310, strength: 0.08 },
  { hour: 6.5, x: 18, y: 96, hue: 25, strength: 0.17 },
  { hour: 9, x: 35, y: 8, hue: 215, strength: 0.11 },
  { hour: 13, x: 50, y: -16, hue: 200, strength: 0.13 },
  { hour: 17, x: 74, y: 22, hue: 75, strength: 0.12 },
  { hour: 19.5, x: 86, y: 100, hue: 40, strength: 0.18 },
  { hour: 21, x: 72, y: -10, hue: 285, strength: 0.1 },
  { hour: 24, x: 78, y: -12, hue: 285, strength: 0.1 },
]

/** The sky at a fractional hour, 0–24. */
export function skyAt(hour: number): Sky {
  const h = ((hour % 24) + 24) % 24
  const after = STOPS.findIndex((stop) => stop.hour > h)
  const to = STOPS[after] ?? STOPS[STOPS.length - 1]
  const from = STOPS[after - 1] ?? STOPS[0]
  if (to === undefined || from === undefined) return { x: 50, y: -10, hue: 200, strength: 0.1 }
  const t = to.hour === from.hour ? 0 : (h - from.hour) / (to.hour - from.hour)
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    hue: lerpHue(from.hue, to.hue, t),
    strength: lerp(from.strength, to.strength, t),
  }
}

/** Which named part of the day an hour falls in. */
export function skyPhase(hour: number): SkyPhase {
  const h = ((hour % 24) + 24) % 24
  if (h >= 5 && h < 8.5) return 'dawn'
  if (h >= 8.5 && h < 17.5) return 'day'
  if (h >= 17.5 && h < 21) return 'dusk'
  return 'night'
}

/** The hour of a date as a fraction, read in local time. */
export function hourOf(date: Date): number {
  return date.getHours() + date.getMinutes() / 60
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Round the shorter way, so 285 → 25 passes through magenta, not green. */
function lerpHue(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180
  return (((a + delta * t) % 360) + 360) % 360
}
