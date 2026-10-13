import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'

/** How far down, in pixels, a drag must travel before letting go closes the sheet. */
const DISMISS_DISTANCE = 120
/** Or how fast, in pixels per millisecond — a flick closes it from any distance. */
const DISMISS_VELOCITY = 0.6

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * The one bottom sheet. The Everything grid and the exercise peek each
 * drew their own — backdrop, grab bar, Escape, focus — and only one of
 * them handed focus back on close. Here once: portalled to `body` (a
 * hero is a stacking context and painted over a sheet rendered inside
 * it), focus moves in and is trapped, Escape and the backdrop close it,
 * and **the grab bar drags**: past a distance or a flick it goes, short
 * of it it springs back. Only the bar starts a drag, so a sheet that
 * scrolls still scrolls.
 */
export function BottomSheet({
  label,
  eyebrow,
  title,
  onClose,
  width = 'max-w-lg',
  children,
}: {
  /** Accessible name; the visible title is used when it is a string. */
  readonly label: string
  readonly eyebrow?: ReactNode
  readonly title: ReactNode
  readonly onClose: () => void
  readonly width?: string
  readonly children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; at: number } | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const [settling, setSettling] = useState(false)

  useEffect(() => {
    const opener = document.activeElement
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current
    first?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || panel.current === null) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const head = items[0]
      const tail = items[items.length - 1]
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault()
        tail?.focus()
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault()
        head?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [onClose])

  const start = (event: PointerEvent) => {
    drag.current = { y: event.clientY, at: event.timeStamp }
    setSettling(false)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent) => {
    if (drag.current === undefined) return
    setOffset(Math.max(0, event.clientY - drag.current.y))
  }
  const end = (event: PointerEvent) => {
    if (drag.current === undefined) return
    const travelled = event.clientY - drag.current.y
    const velocity = travelled / Math.max(1, event.timeStamp - drag.current.at)
    drag.current = undefined
    if (travelled > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      onClose()
      return
    }
    setSettling(true)
    setOffset(0)
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="presentation">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="peek-backdrop absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        style={{ opacity: Math.max(0.2, 1 - offset / 400) }}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`peek-sheet sheet-surface relative max-h-[88dvh] w-full ${width} overflow-y-auto rounded-t-3xl px-5 outline-none`}
        style={{
          paddingBottom: 'calc(1.25rem + var(--safe-bottom))',
          transform: offset > 0 ? `translateY(${String(offset)}px)` : undefined,
          transition: settling ? 'transform var(--dur-base) var(--ease-spring)' : undefined,
        }}
      >
        <div
          className="sticky top-0 z-10 -mx-5 flex cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-hidden
        >
          <span className="bg-ink-600 block h-1 w-10 rounded-full" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow === undefined ? null : (
              <p className="text-ink-500 text-xs tracking-[0.14em] uppercase">{eyebrow}</p>
            )}
            <h2 className="text-ink-50 truncate text-lg font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-ink-300 tap-target flex items-center justify-center"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
