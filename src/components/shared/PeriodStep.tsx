import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * A chevron that steps to the period before or after — a month, a year,
 * a block. With no `to`, it is drawn dim and does nothing: the future is
 * not a page yet, and a missing button would move the one beside it.
 *
 * Four pages drew this themselves, in three slightly different shades of
 * the same control; this is the one copy.
 */
export function PeriodStep({
  to,
  label,
  back = false,
}: {
  readonly to: string | undefined
  readonly label: string
  readonly back?: boolean
}) {
  const Icon = back ? ChevronLeft : ChevronRight
  return to === undefined ? (
    <span className="text-ink-700 tap-target flex items-center px-2" aria-hidden>
      <Icon size={18} />
    </span>
  ) : (
    <Link
      viewTransition
      to={to}
      aria-label={label}
      className="text-ink-300 hover:text-accent-400 tap-target flex items-center px-2"
    >
      <Icon size={18} aria-hidden />
    </Link>
  )
}
