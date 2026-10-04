import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

export interface SettingsSection {
  /** The `id` of the section's element on the page. */
  readonly id: string
  readonly label: string
}

/**
 * A row of chips that stays at the top while Settings scrolls, one per
 * section, the section in view lit. Settings is five sections and a long
 * page on a phone — the backup is a long scroll past the plate set — and
 * a heading you cannot see is a section you cannot find.
 *
 * **The lit chip is the last section whose top has passed a line a third
 * of the way down**, read on scroll rather than by observer: one rule, and
 * at the foot of the page the last section lights even when it is too
 * short to reach the line. A press scrolls there, smoothly unless motion is
 * reduced.
 */
export function SectionChips({ sections }: { readonly sections: readonly SettingsSection[] }) {
  const [current, setCurrent] = useState(sections[0]?.id)
  const strip = useRef<HTMLUListElement>(null)

  /* On a phone the chips overflow their row; the lit one is kept in it. */
  useEffect(() => {
    const row = strip.current
    const chip = row?.querySelector<HTMLElement>('[aria-current]')
    if (row === null || chip === null || chip === undefined) return
    const left = chip.offsetLeft - row.offsetLeft
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth)
      row.scrollLeft = left - (row.clientWidth - chip.offsetWidth) / 2
  }, [current])

  useEffect(() => {
    const read = () => {
      const line = window.innerHeight / 3
      const atFoot =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let lit = sections[0]?.id
      for (const section of sections) {
        const top = document.getElementById(section.id)?.getBoundingClientRect().top
        if (top !== undefined && top <= line) lit = section.id
      }
      setCurrent(atFoot ? sections.at(-1)?.id : lit)
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [sections])

  return (
    <nav
      aria-label="Settings sections"
      className="bg-ink-950 sticky top-0 z-20 -mx-4 mb-4 border-b border-white/5 px-4 py-2"
      style={{ paddingTop: 'calc(0.5rem + var(--safe-top))' }}
    >
      <ul
        ref={strip}
        className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              aria-current={current === section.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault()
                const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                document
                  .getElementById(section.id)
                  ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
                setCurrent(section.id)
              }}
              className={cn(
                'tap-target flex items-center rounded-full border px-3.5 text-sm transition-colors',
                current === section.id
                  ? 'border-accent-500/50 bg-accent-500/15 text-accent-400'
                  : 'text-ink-300 hover:text-ink-50 border-white/10',
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
