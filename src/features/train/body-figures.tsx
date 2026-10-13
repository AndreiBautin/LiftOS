import type { ReactNode } from 'react'

import type { MuscleGroup } from '@/domain/exercises/taxonomy'

import { BACK_REGIONS, FRONT_REGIONS, type Region } from './body-regions'

export function Figure({
  x,
  label,
  children,
}: {
  readonly x: number
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <g transform={`translate(${String(x + 5)} 0)`}>
      {/* The parts no count lights: head, neck, hips, shins. */}
      <g className="fill-ink-700/45">
        <circle cx="50" cy="15" r="10" />
        <rect x="45" y="24" width="10" height="7" rx="2" />
        <rect x="38" y="82" width="24" height="9" rx="3" />
      </g>
      {children}
      <text x="50" y="180" textAnchor="middle" className="fill-ink-500 text-[9px]">
        {label}
      </text>
    </g>
  )
}

/**
 * Both figures with one muscle lit in the accent and glowing, the rest
 * dim — a muscle's page saying which one it is about without a word.
 */
export function BodyHighlight({
  muscle,
  className,
}: {
  readonly muscle: MuscleGroup
  readonly className?: string
}) {
  const draw = (regions: readonly Region[], side: string) =>
    regions.map(([one, shapes], at) => (
      <g key={`${side}${String(at)}`} className={one === muscle ? 'body-lit' : 'fill-ink-800'}>
        {shapes}
      </g>
    ))
  return (
    <svg viewBox="0 0 220 186" className={className} aria-hidden>
      <Figure x={0} label="Front">
        {draw(FRONT_REGIONS, 'f')}
      </Figure>
      <Figure x={115} label="Back">
        {draw(BACK_REGIONS, 'b')}
      </Figure>
    </svg>
  )
}
