import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  Calculator,
  Dumbbell,
  GitCompareArrows,
  Gift,
  Grid3x3,
  Home,
  Layers,
  Settings,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export type ScreenGroup = 'Train' | 'Progress' | 'Look back' | 'App'

export const SCREEN_GROUPS: readonly ScreenGroup[] = ['Train', 'Progress', 'Look back', 'App']

export interface Screen {
  readonly id: string
  readonly label: string
  /** One line on the tile: what the screen answers, not what it is called. */
  readonly blurb: string
  readonly group: ScreenGroup
  readonly icon: LucideIcon
  /** Extra words the palette matches without showing. */
  readonly keywords: string
  /** A path, or one read off today for a screen addressed by a date. */
  readonly to: string | ((today: string) => string)
}

/**
 * Every screen a person can open without a record in hand — **the one
 * list**, read by the command palette and the Everything sheet alike, so
 * a screen added to one cannot be missing from the other. A screen that
 * needs a record (a session, an exercise, a muscle) is reached from that
 * record and is not here.
 */
export const SCREENS: readonly Screen[] = [
  {
    id: 'today',
    label: 'Today',
    blurb: 'The next session and the week',
    group: 'Train',
    icon: Home,
    keywords: 'home dashboard',
    to: '/today',
  },
  {
    id: 'program',
    label: 'Program',
    blurb: 'The week, the block and the deload',
    group: 'Train',
    icon: CalendarRange,
    keywords: 'week plan deload',
    to: '/program',
  },
  {
    id: 'exercises',
    label: 'Exercises',
    blurb: 'Every movement and its history',
    group: 'Train',
    icon: Dumbbell,
    keywords: 'library catalogue swap',
    to: '/exercises',
  },
  {
    id: 'calculator',
    label: 'Calculator',
    blurb: 'A max from any set, and back',
    group: 'Train',
    icon: Calculator,
    keywords: 'one rep max e1rm percent',
    to: '/calculator',
  },
  {
    id: 'records',
    label: 'Records',
    blurb: 'Your best set of everything',
    group: 'Progress',
    icon: Trophy,
    keywords: 'bests prs',
    to: '/records',
  },
  {
    id: 'compare',
    label: 'Compare exercises',
    blurb: 'Two lifts against where each began',
    group: 'Progress',
    icon: GitCompareArrows,
    keywords: 'versus two lifts progress',
    to: '/compare',
  },
  {
    id: 'block',
    label: 'Block report',
    blurb: 'What this block moved',
    group: 'Progress',
    icon: Layers,
    keywords: 'block deload cycle',
    to: '/block',
  },
  {
    id: 'month',
    label: 'This month',
    blurb: 'The month against the last',
    group: 'Look back',
    icon: CalendarDays,
    keywords: 'recap month',
    to: '/month',
  },
  {
    id: 'year',
    label: 'The year',
    blurb: 'Twelve calendars and the streaks',
    group: 'Look back',
    icon: BarChart3,
    keywords: 'year calendar streak',
    to: '/year',
  },
  {
    id: 'muscles',
    label: 'Muscles by week',
    blurb: 'Every muscle across the year',
    group: 'Look back',
    icon: Grid3x3,
    keywords: 'muscle heat map year volume landscape',
    to: '/muscles',
  },
  {
    id: 'wrapped',
    label: 'Year wrapped',
    blurb: 'The year, played back',
    group: 'Look back',
    icon: Gift,
    keywords: 'wrapped story year review',
    to: (today) => `/wrapped/${today.slice(0, 4)}`,
  },
  {
    id: 'settings',
    label: 'Settings',
    blurb: 'Units, plates, backup and the look',
    group: 'App',
    icon: Settings,
    keywords: 'units plates accent backup',
    to: '/settings',
  },
]

export function screenPath(screen: Screen, today: string): string {
  return typeof screen.to === 'string' ? screen.to : screen.to(today)
}
