import type { ReactNode } from 'react'

import { usePageSwipe } from './usePageSwipe'

/** The exercise card, turned by a sideways swipe; see `usePageSwipe`. */
export function SwipePager({
  onNext,
  onPrevious,
  children,
}: {
  readonly onNext: () => void
  readonly onPrevious: () => void
  readonly children: ReactNode
}) {
  const swipe = usePageSwipe(onNext, onPrevious)
  return (
    <section
      className="flex flex-1 touch-pan-y flex-col pt-4"
      aria-labelledby="exercise-name"
      {...swipe}
    >
      {children}
    </section>
  )
}
