import type { ReactNode } from 'react'

/**
 * The top of a page about one thing: its figure, the two or three facts that
 * qualify it, and its one chart, on the ground. Exercise and muscle share it,
 * so a page about a lift and a page about a muscle open the same way.
 *
 * **The chart is the first thing, because it is what the page is for.** The
 * exercise page used to open on a form field for your cue, with the staircase
 * a screen below. What you type and what you scroll for go in `Module`s under
 * this.
 */
export function DetailHero({
  label,
  figure,
  unit,
  facts,
  aside,
  children,
}: {
  /** The page's subject, for a screen reader; the title above already says it. */
  readonly label: string
  readonly figure: string
  readonly unit: string
  readonly facts: readonly { readonly term: string; readonly value: string }[]
  /** A small picture beside the figure. */
  readonly aside?: ReactNode
  /** The chart. */
  readonly children: ReactNode
}) {
  return (
    <section aria-label={label}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display flex flex-wrap items-baseline gap-x-2 leading-none">
            <span className="text-[4rem] leading-[1.05] font-bold tracking-[-0.03em]">
              {figure}
            </span>
            <span className="text-ink-500 text-lg">{unit}</span>
          </p>
          <dl className="numeric mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {facts.map(({ term, value }) => (
              <div key={term} className="flex gap-1.5">
                <dt className="text-ink-500">{term}</dt>
                <dd className="text-ink-100">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
