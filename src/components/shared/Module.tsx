import type { ReactNode } from 'react'

/**
 * A division of Today: a line, a quiet name, and a headline figure on the
 * ground itself rather than in a card.
 *
 * **Not a panel.** Sixteen panels with one recipe read as one repeated thing,
 * so the page lost any sense of what mattered. A module earns its place with
 * the size of its figure and the shape of its one picture, and those shapes
 * stay different on purpose: a line and a cone, a calendar, a body.
 */
export function Module({
  title,
  figure,
  unit,
  action,
  children,
}: {
  readonly title: string
  /** The headline number, when this module has one. */
  readonly figure?: string | undefined
  readonly unit?: string | undefined
  readonly action?: ReactNode
  readonly children: ReactNode
}) {
  return (
    <section className="border-ink-800 border-t pt-4 pb-4">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-ink-500 font-sans text-sm font-medium tracking-normal">{title}</h2>
        {action !== undefined && (
          <div className="flex shrink-0 items-center gap-4 text-sm">{action}</div>
        )}
      </div>
      {figure !== undefined && (
        <p className="font-display mt-0.5 flex flex-wrap items-baseline gap-x-2 leading-none">
          <span className="text-[3.5rem] leading-[1.05] font-bold tracking-[-0.03em]">
            {figure}
          </span>
          {unit !== undefined && <span className="text-ink-500 text-lg">{unit}</span>}
        </p>
      )}
      {children}
    </section>
  )
}
