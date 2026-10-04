import { ArrowLeftRight, Undo2 } from 'lucide-react'

import { useSettings } from '@/app/context'
import type { ProgramTemplate } from '@/domain/programs/program'
import { liveMoves, mondayOf, moveSession, sessionOn } from '@/domain/programs/schedule'
import { parseDay, shiftDay } from '@/domain/time/day'
import { useSchedule } from '@/features/train/hooks'
import { cn } from '@/lib/cn'

/**
 * Moves the session in view to another day of its week (`moveSession`):
 * a chip for each day from today to Sunday, marked where that day already
 * holds a session — choosing it swaps the two. **This week only**: a move
 * names dates and lapses with them, and the routine is untouched. Put the
 * week back clears every move this week has.
 */
export function MoveSession({
  program,
  on,
  today,
  onDone,
}: {
  readonly program: ProgramTemplate
  readonly on: string
  readonly today: string
  readonly onDone: () => void
}) {
  const { settings, update } = useSettings()
  const schedule = useSchedule()
  const blockStartedOn = schedule.data?.blockStartedOn
  if (blockStartedOn === undefined) return null

  const moves = liveMoves(settings.dayMoves, today)
  const monday = mondayOf(on)
  const first = today > monday ? today : monday
  const days = Array.from({ length: 7 }, (_, at) => shiftDay(monday, at)).filter(
    (day) => day >= first && day !== on,
  )
  const movedThisWeek = Object.keys(moves ?? {}).some((day) => mondayOf(day) === monday)

  return (
    <div className="mt-3">
      <p className="text-ink-300 mb-2 text-xs">Move it to another day this week</p>
      <ul className="flex flex-wrap gap-1.5">
        {days.map((day) => {
          const holds = sessionOn(program, blockStartedOn, day, moves)
          return (
            <li key={day}>
              <button
                type="button"
                onClick={() => {
                  update({ dayMoves: moveSession(program, blockStartedOn, moves, on, day) })
                  onDone()
                }}
                className={cn(
                  'tap-target flex flex-col items-center justify-center rounded-xl border px-3 text-xs font-medium',
                  holds === undefined
                    ? 'border-ink-700 text-ink-100'
                    : 'border-accent-500/40 text-accent-400',
                )}
              >
                {weekdayOf(day)}
                {holds !== undefined && (
                  <span className="flex items-center gap-0.5 text-[0.6rem] font-normal">
                    <ArrowLeftRight size={9} aria-hidden /> swap
                  </span>
                )}
              </button>
            </li>
          )
        })}
        {days.length === 0 && (
          <li className="text-ink-500 text-xs">No days left in this week to move it to.</li>
        )}
      </ul>
      {movedThisWeek && (
        <button
          type="button"
          onClick={() => {
            const kept = Object.entries(moves ?? {}).filter(([day]) => mondayOf(day) !== monday)
            update({ dayMoves: kept.length === 0 ? undefined : Object.fromEntries(kept) })
            onDone()
          }}
          className="text-ink-300 hover:text-accent-400 tap-target mt-1 flex items-center gap-1 text-xs"
        >
          <Undo2 size={12} aria-hidden /> Put the week back
        </button>
      )}
    </div>
  )
}

function weekdayOf(day: string): string {
  return parseDay(day).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })
}
