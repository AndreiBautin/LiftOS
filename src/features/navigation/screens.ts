import {
  CalendarDays,
  CalendarRange,
  Calculator,
  Dumbbell,
  GitCompareArrows,
  History,
  Home,
  Settings,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

type ScreenGroup = 'Train' | 'Progress' | 'App'

export const SCREEN_GROUPS: readonly ScreenGroup[] = ['Train', 'Progress', 'App']

interface Screen {
  readonly id: string
  readonly label: string
  /** One line on the tile: what the screen answers, not what it is called. */
  readonly blurb: string
  readonly group: ScreenGroup
  readonly icon: LucideIcon
  /** Extra words the palette matches without showing. */
  readonly keywords: string
  readonly to: string
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
    id: 'look-back',
    label: 'Look back',
    blurb: 'A month, a block, a year, and the story of each',
    group: 'Progress',
    icon: CalendarDays,
    keywords:
      'month recap block deload cycle year calendar streak muscle heat map wrapped story review',
    to: '/month',
  },
  {
    id: 'history',
    label: 'History',
    blurb: 'Every session, on one line',
    group: 'Progress',
    icon: History,
    keywords: 'sessions log search past',
    to: '/history',
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
