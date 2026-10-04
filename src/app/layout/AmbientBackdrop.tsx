import { useEffect, useState } from 'react'

import { useServices } from '@/app/context'
import { seasonOf, type Season } from '@/domain/time/season'
import { hourOf, skyAt, skyPhase } from '@/domain/time/sky'

/**
 * The slow light behind every screen, tinted by the season you are in.
 *
 * **Always on screen and never asking for attention.** Three soft washes
 * drift over a minute or more, and a dozen faint particles fall or rise in
 * the season's shape. Nothing blinks: the one earlier attempt at motion
 * near the portrait pulsed, and the report was that "the blinking does
 * not look good" — so everything here moves in one direction, slowly, and
 * never changes brightness on a beat.
 *
 * **Colour comes from the palette, not from new hues.** The season picks
 * which of the app's own tokens lead: amber for autumn, violet for winter,
 * green for spring, and warm-and-cyan for summer.
 *
 * **It costs the compositor and nothing else.** Every animation is a
 * `transform` or an `opacity` on its own layer, there is no `filter` and
 * no `backdrop-filter`, and the washes are radial gradients — already
 * soft, so they need no blur. Reduced motion stops the drift and removes
 * the particles outright.
 */

const WASHES: Record<Season, readonly [string, string, string]> = {
  autumn: ['var(--color-warn-500)', 'var(--color-accent-500)', 'var(--color-bad-500)'],
  winter: ['var(--color-cool-500)', 'var(--color-accent-500)', 'var(--color-ink-100)'],
  spring: ['var(--color-good-500)', 'var(--color-accent-500)', 'var(--color-cool-500)'],
  summer: ['var(--color-warn-500)', 'var(--color-accent-500)', 'var(--color-good-500)'],
}

const PARTICLE_COUNT = 14

/** How often the sky re-reads the clock; it eases between readings. */
const SKY_EVERY_MS = 5 * 60_000

/**
 * Where each particle starts and how it moves — deterministic, so the
 * field is the same on every render and does not reshuffle when a query
 * lands. Spread by the golden ratio, which scatters evenly without
 * looking like a grid.
 */
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const spread = (index * 0.618_033_988_75) % 1
  return {
    left: `${(spread * 100).toFixed(1)}%`,
    duration: `${String(22 + ((index * 7) % 17))}s`,
    delay: `-${String((index * 5.3) % 30)}s`,
    size: 5 + ((index * 3) % 6),
    sway: `${String(12 + ((index * 11) % 30))}px`,
  }
})

export function AmbientBackdrop() {
  const { clock } = useServices()
  const season = seasonOf(clock.now())
  const [first, second, third] = WASHES[season]
  /*
   * **The light follows the time of day** (`skyAt`): low on the left at
   * dawn, high through the day, low and amber at dusk, a violet glow at
   * night. Read every five minutes and eased over a minute, so it moves
   * one way, slowly, and never on a beat.
   */
  const [hour, setHour] = useState(() => hourOf(clock.now()))
  useEffect(() => {
    const read = () => {
      setHour(hourOf(clock.now()))
    }
    // A backgrounded tab's timers stall, so coming back reads it at once.
    const onVisible = () => {
      if (document.visibilityState === 'visible') read()
    }
    const handle = window.setInterval(read, SKY_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(handle)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [clock])
  const sky = skyAt(hour)

  return (
    <div aria-hidden className="ambient" data-season={season} data-sky={skyPhase(hour)}>
      <div
        className="ambient-sky"
        style={
          {
            '--sky-x': `${sky.x.toFixed(1)}%`,
            '--sky-y': `${sky.y.toFixed(1)}%`,
            '--sky-hue': sky.hue.toFixed(0),
            '--sky-strength': sky.strength.toFixed(3),
          } as React.CSSProperties
        }
      />
      <div
        className="ambient-wash ambient-wash-a"
        style={{ '--wash': first } as React.CSSProperties}
      />
      <div
        className="ambient-wash ambient-wash-b"
        style={{ '--wash': second } as React.CSSProperties}
      />
      <div
        className="ambient-wash ambient-wash-c"
        style={{ '--wash': third } as React.CSSProperties}
      />
      {PARTICLES.map((particle, index) => (
        <span
          key={index}
          className="ambient-particle"
          style={
            {
              left: particle.left,
              width: particle.size,
              height: particle.size,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
              '--sway': particle.sway,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
