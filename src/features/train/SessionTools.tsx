import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType } from 'react'

export interface SessionTool {
  readonly id: string
  readonly label: string
  readonly icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
  readonly run: () => void
}

/**
 * The player's occasional tools — focus, swap, pair, add, reorder, the
 * exercise's recent past — behind one button on the card. **What a set
 * needs stays on the card**: the rows, the plates, Next. These are things
 * done once a session if at all, and as three icons in the card's header
 * and two dashed buttons under Next they made the screen read as a
 * toolbox around a set rather than a set.
 *
 * A tool is offered only where it applies (Swap with sets left to swap,
 * Pair with a partner to pair), so the tray never holds a dead button.
 * Escape or a press outside closes it; choosing a tool closes it too.
 */
export function SessionTools({ tools }: { readonly tools: readonly SessionTool[] }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPress = (event: PointerEvent) => {
      if (event.target instanceof Node && box.current?.contains(event.target) !== true)
        setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPress)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPress)
    }
  }, [open])

  return (
    <span ref={box} className="relative">
      <button
        type="button"
        aria-label="Session tools"
        aria-expanded={open}
        aria-controls="session-tools"
        onClick={() => {
          setOpen((now) => !now)
        }}
        className="text-ink-300 hover:text-ink-50 tap-target flex items-center justify-center rounded-lg px-2"
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open && (
        <div
          id="session-tools"
          className="peek-sheet border-ink-700 bg-ink-900 absolute top-full right-0 z-30 mt-1 grid w-64 grid-cols-2 gap-1 rounded-2xl border p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
        >
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  tool.run()
                }}
                className="text-ink-100 hover:bg-ink-800 active:bg-ink-700 tap-target flex flex-col items-start gap-1.5 rounded-xl p-2.5 text-left text-sm"
              >
                <Icon size={16} aria-hidden />
                {tool.label}
              </button>
            )
          })}
        </div>
      )}
    </span>
  )
}
