import { Link } from 'react-router-dom'

import { BottomSheet } from '@/components/shared/BottomSheet'

import { SCREEN_GROUPS, SCREENS } from './screens'

/**
 * Every screen as a grid, from a button on the hero (`SCREENS`, the list
 * the palette reads). **The page has no navigation bar**, so the screens
 * reached only from a link inside a card — the calculator, the comparison —
 * were reachable by somebody who already knew where they
 * were, or who knew ⌘K. This is the map for everybody else.
 *
 * A bottom sheet rather than a page, because it is a way somewhere and
 * not somewhere: it opens over Today and is gone once a tile is pressed.
 * Tiles rise once, staggered; nothing loops.
 */
export function EverythingSheet({ onClose }: { readonly onClose: () => void }) {
  let order = 0
  return (
    <BottomSheet label="Everything" title="Everything" onClose={onClose} width="max-w-2xl">
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
                    data-autofocus={at === 0 ? '' : undefined}
                    viewTransition
                    to={screen.to}
                    onClick={onClose}
                    className="well hover:border-ink-600 flex h-full flex-col gap-2 p-3 transition-colors"
                  >
                    <Icon size={18} className="text-ink-500" aria-hidden />
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
    </BottomSheet>
  )
}
