/**
 * How a scripted scroll should move: smoothly, unless the reader asked for
 * less motion. The stylesheet's reduced-motion block sets
 * `scroll-behavior: auto`, but a script that passes `behavior: 'smooth'`
 * overrides it — five scrolls here did, so every one asks this instead.
 */
export function scrollMotion(): ScrollBehavior {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}
