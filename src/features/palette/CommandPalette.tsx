import { Suspense, useEffect, useState } from 'react'

import { isTypingIn } from '@/features/train/keyboard'
import { lazyNamed } from '@/lib/lazy-named'

// Every screen mounts the listener; only somebody pressing the key needs the
// palette, so its body and its exercise index load on that first press.
const Palette = lazyNamed(() => import('./Palette'), 'Palette')

/**
 * Anywhere in the app, ⌘K (Ctrl+K) or / opens a box that goes to any page,
 * exercise or recent session by typing a few letters (`rankItems`).
 *
 * The app is one page with links off it, which is right on a phone and
 * slow at a desk, where getting to the deadlift's history meant scrolling
 * the dashboard to find a link to it. ↑ ↓ choose, Enter goes, Esc closes.
 * **The slash is ignored while typing**, so a search box elsewhere keeps its
 * slash; ⌘K is not, because nothing types it.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      const slash = event.key === '/' && !isTypingIn(document.activeElement)
      if (!combo && !slash) return
      event.preventDefault()
      setOpen((now) => !now)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!open) return null
  return (
    <Suspense fallback={null}>
      <Palette
        onClose={() => {
          setOpen(false)
        }}
      />
    </Suspense>
  )
}
