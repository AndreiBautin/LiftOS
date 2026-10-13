import type { ReactElement } from 'react'

import type { MuscleGroup } from '@/domain/exercises/taxonomy'

/**
 * The body map's two figures as data — each muscle and the shapes that
 * draw it — so the "Lately" card and a muscle's own page draw the same
 * body. A region is drawn by whoever reads this: the card makes each one
 * a button tinted by recency, the muscle page lights one and dims the
 * rest.
 */
export type Region = readonly [MuscleGroup, readonly ReactElement[]]

export const FRONT_REGIONS: readonly Region[] = [
  ['front-delts', [ellipse(32, 40, 7, 6), ellipse(68, 40, 7, 6)]],
  ['side-delts', [ellipse(24, 44, 3.5, 7), ellipse(76, 44, 3.5, 7)]],
  ['chest', [block(37, 35, 12.5, 15, 4), block(50.5, 35, 12.5, 15, 4)]],
  ['biceps', [block(21, 49, 8, 19, 4), block(71, 49, 8, 19, 4)]],
  ['forearms', [block(19, 71, 7, 21, 3.5), block(74, 71, 7, 21, 3.5)]],
  ['core', [block(39, 53, 22, 29, 5)]],
  ['quads', [block(37, 92, 12, 34, 6), block(51, 92, 12, 34, 6)]],
  ['calves', [block(38.5, 130, 9, 34, 4.5), block(52.5, 130, 9, 34, 4.5)]],
]

export const BACK_REGIONS: readonly Region[] = [
  ['traps', [<polygon key="t" points="42,27 58,27 67,36 50,46 33,36" />]],
  ['rear-delts', [ellipse(32, 40, 7, 6), ellipse(68, 40, 7, 6)]],
  ['side-delts', [ellipse(24, 44, 3.5, 7), ellipse(76, 44, 3.5, 7)]],
  ['upper-back', [block(41, 45, 18, 11, 3)]],
  [
    'lats',
    [
      <polygon key="l" points="35,45 40,47 45,74 38,69" />,
      <polygon key="r" points="65,45 60,47 55,74 62,69" />,
    ],
  ],
  ['triceps', [block(21, 49, 8, 19, 4), block(71, 49, 8, 19, 4)]],
  ['forearms', [block(19, 71, 7, 21, 3.5), block(74, 71, 7, 21, 3.5)]],
  ['glutes', [block(37, 84, 12.5, 15, 6), block(50.5, 84, 12.5, 15, 6)]],
  ['hamstrings', [block(37.5, 101, 11.5, 27, 5.5), block(51, 101, 11.5, 27, 5.5)]],
  ['calves', [block(38.5, 130, 9, 34, 4.5), block(52.5, 130, 9, 34, 4.5)]],
]

function block(x: number, y: number, width: number, height: number, radius: number) {
  return (
    <rect key={`${String(x)}-${String(y)}`} x={x} y={y} width={width} height={height} rx={radius} />
  )
}

function ellipse(cx: number, cy: number, rx: number, ry: number) {
  return <ellipse key={`${String(cx)}-${String(cy)}`} cx={cx} cy={cy} rx={rx} ry={ry} />
}
