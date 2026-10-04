import { scrollMotion } from '@/lib/motion'
import { Children, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * The page's notices — the sample-data note, what's new, the install
 * offer — on one strip that swipes, instead of a stack the hero sat under.
 *
 * **Each notice still decides for itself whether to show**, exactly as it
 * did; a slide whose notice renders nothing collapses (`empty:hidden`),
 * so the strip is as long as what is actually there and a dot is drawn
 * only for those. Native horizontal scrolling with snap, so a swipe is
 * the platform's own and a mouse wheel or trackpad works too; the dots
 * are buttons that turn to a notice. With one notice the strip is just
 * that notice, no dots.
 */
export function NoticeStrip({ children }: { readonly children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const [at, setAt] = useState(0)
  /** The showing notice's height: the strip fits it, not the tallest of them. */
  const [height, setHeight] = useState<number | undefined>(undefined)

  /*
   * Which slides are showing is the DOM's answer, not React's: each notice
   * reads its own data and may render nothing. Watched rather than
   * measured once, because one is dismissed while the strip is on screen.
   */
  useEffect(() => {
    const strip = track.current
    if (strip === null) return
    const read = () => {
      const slides = visible(strip)
      setCount(slides.length)
      setAt((current) => Math.min(current, Math.max(0, slides.length - 1)))
    }
    read()
    const watcher = new MutationObserver(read)
    watcher.observe(strip, { childList: true, subtree: true })
    return () => {
      watcher.disconnect()
    }
  }, [])

  /* Measured after each turn and each change of what the notices hold. */
  useEffect(() => {
    const strip = track.current
    if (strip === null) return
    const measure = () => {
      setHeight(visible(strip)[at]?.offsetHeight)
    }
    measure()
    const watcher = new MutationObserver(measure)
    watcher.observe(strip, { childList: true, subtree: true, characterData: true })
    window.addEventListener('resize', measure)
    return () => {
      watcher.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [at, count])

  const turnTo = (index: number) => {
    const strip = track.current
    const slide = strip === null ? undefined : visible(strip)[index]
    if (strip === null || slide === undefined) return
    strip.scrollTo({ left: slide.offsetLeft - strip.offsetLeft, behavior: scrollMotion() })
  }

  return (
    <div className={cn(count === 0 && 'hidden')}>
      <div
        ref={track}
        className="-mx-1 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overflow-y-hidden px-1 transition-[height] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={height === undefined ? undefined : { height }}
        aria-roledescription="carousel"
        aria-label="Notices"
        onScroll={(event) => {
          const strip = event.currentTarget
          const slides = visible(strip)
          const nearest = slides.reduce(
            (best, slide, index) =>
              Math.abs(slide.offsetLeft - strip.offsetLeft - strip.scrollLeft) <
              Math.abs((slides[best]?.offsetLeft ?? 0) - strip.offsetLeft - strip.scrollLeft)
                ? index
                : best,
            0,
          )
          setAt(nearest)
        }}
      >
        {Children.map(children, (child) => (
          <div className="w-full shrink-0 snap-center empty:hidden" aria-roledescription="slide">
            {child}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" role="group" aria-label="Choose a notice">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Notice ${String(index + 1)} of ${String(count)}`}
              aria-current={index === at}
              onClick={() => {
                turnTo(index)
              }}
              className="flex h-6 items-center px-0.5"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-all duration-300',
                  index === at ? 'bg-accent-400 w-5' : 'bg-ink-700 w-1.5',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function visible(strip: HTMLElement): HTMLElement[] {
  return [...strip.children].filter(
    (slide): slide is HTMLElement => slide instanceof HTMLElement && slide.childElementCount > 0,
  )
}
