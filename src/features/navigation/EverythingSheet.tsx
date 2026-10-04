import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

import { useServices } from '@/app/context'
import { toDayKey } from '@/domain/time/day'

import { SCREEN_GROUPS, SCREENS, screenPath } from './screens'

/** Each group's tile tint, as a hue shift off the accent, so a group reads as one. */
const GROUP_SHIFT: Readonly<Record<(typeof SCREEN_GROUPS)[number], number>> = {
  Train: 0,
  Progress: 55,
  'Look back': -40,
  App: 180,
}

/**
 * Every screen as a grid, from a button on the hero (`SCREENS`, the list
 * the palette reads). **The page has no navigation bar**, so the screens
 * reached only from a link inside a card — the year, the calculator, the
 * comparison — were reachable by somebody who already knew where they
 * were, or who knew ⌘K. This is the map for everybody else.
 *
 * A bottom sheet rather than a page, because it is a way somewhere and
 * not somewhere: it opens over Today and is gone once a tile is pressed.
 * Tiles rise once, staggered; nothing loops.
 */
export function EverythingSheet({ onClose }: { readonly onClose: () => void }) {
  const today = toDayKey(useServices().clock.now())
  const first = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const opener = document.activeElement
    first.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [onClose])

  let order = 0
  /* At the root: the hero is a stacking context, and the cards after it painted over the sheet. */
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="presentation">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="peek-backdrop absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="everything-title"
        className="peek-sheet border-ink-800 bg-ink-900 relative max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-x border-t px-5 pt-3"
        style={{ paddingBottom: 'calc(1.25rem + var(--safe-bottom))' }}
      >
        <span className="bg-ink-700 mx-auto block h-1 w-10 rounded-full" aria-hidden />
        <div className="mt-3 flex items-center justify-between">
          <h2 id="everything-title" className="text-ink-50 text-lg font-semibold">
            Everything
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-ink-300 tap-target flex items-center justify-center"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {SCREEN_GROUPS.map((group) => (
          <section key={group} className="mt-4" aria-label={group}>
            <h3 className="text-ink-500 mb-2 text-xs tracking-[0.14em] uppercase">{group}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SCREENS.filter((screen) => screen.group === group).map((screen) => {
                const at = order++
                const Icon = screen.icon
                return (
                  <li
                    key={screen.id}
                    className="peek-sheet"
                    style={{ animationDelay: `${String(Math.min(at, 10) * 30)}ms` }}
                  >
                    <Link
                      ref={at === 0 ? first : undefined}
                      viewTransition
                      to={screenPath(screen, today)}
                      onClick={onClose}
                      className="border-ink-800 bg-ink-950/60 hover:border-ink-600 active:bg-ink-800 flex h-full flex-col gap-2 rounded-2xl border p-3 transition-colors"
                    >
                      <span
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{
                          background: `oklch(0.45 0.09 calc(var(--accent-hue) + ${String(GROUP_SHIFT[group])}) / 0.35)`,
                          color: `oklch(0.85 0.1 calc(var(--accent-hue) + ${String(GROUP_SHIFT[group])}))`,
                        }}
                        aria-hidden
                      >
                        <Icon size={16} />
                      </span>
                      <span className="text-ink-50 text-sm font-medium">{screen.label}</span>
                      <span className="text-ink-500 -mt-1.5 text-xs leading-snug">
                        {screen.blurb}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <p className="text-ink-500 mt-4 hidden text-xs sm:block">
          Ctrl K or / opens a search over all of these, every exercise and recent sessions.
        </p>
      </div>
    </div>,
    document.body,
  )
}
