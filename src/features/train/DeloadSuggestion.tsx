import { ChevronRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

import { useServices } from '@/app/context'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/shared/primitives'
import { FATIGUE_STALLS, stalledExercises } from '@/domain/programs/stall'
import { toDayKey } from '@/domain/time/day'

import { useExercises, useJumpToWeek, useRecentWorkouts } from './hooks'
import { useNextSession } from './useNextSession'

/**
 * **Several lifts stalled at once is fatigue, and the programme already
 * has the answer: its deload week.** When three or more exercises trained
 * lately have each gone three sessions without beating their best
 * (`stalledExercises`), this offers to take the deload now rather than
 * when the calendar reaches it.
 *
 * One line under the plan, with the reasoning and the offer behind it: it
 * was a card above the session, so on those weeks the thing you came to do
 * sat under a paragraph about something else.
 *
 * Offered, never applied — the lifter may know better (a bad week, a
 * cut) — and silent when fewer than three are stuck, when this week is
 * already the deload, or when the block has none. Taking it is
 * `jumpToWeek`, the same write the week picker on the Program page makes.
 */
export function DeloadSuggestion() {
  const today = toDayKey(useServices().clock.now())
  const workouts = useRecentWorkouts(300)
  const exercises = useExercises()
  const { program, thisWeek } = useNextSession()
  const jump = useJumpToWeek()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => {
    setOpen(false)
  }, [])

  if (workouts.data === undefined || program === undefined || thisWeek?.isDeload !== false) {
    return null
  }
  const weeks = program.blocks[0]?.weeks ?? []
  const deload = weeks.findIndex((week) => week.isDeload)
  if (deload === -1) return null

  const stalled = stalledExercises(workouts.data, today)
  if (stalled.length < FATIGUE_STALLS) return null
  const nameOf = (id: string) => exercises.data?.find((one) => one.id === id)?.name ?? id

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true)
        }}
        className="text-warn-500 flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm"
      >
        {stalled.length} lifts stalled. Take the deload?
        <ChevronRight size={16} className="shrink-0" aria-hidden />
      </button>
      {open && (
        <BottomSheet
          label="Lifts that have stalled"
          title={`${String(stalled.length)} lifts have stalled`}
          onClose={close}
        >
          <ul className="border-ink-800 mt-3 border-t">
            {stalled.map((id) => (
              <li key={id} className="border-ink-800 border-b">
                <Link
                  viewTransition
                  to={`/exercise/${id}`}
                  className="flex min-h-11 items-center justify-between gap-3"
                >
                  {nameOf(id)}
                  <ChevronRight size={16} className="text-ink-500 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-ink-300 mt-3 text-sm">
            None has beaten its best in three sessions. When several stop at once it is usually
            fatigue rather than any one lift.
          </p>
          <Button
            variant="primary"
            full
            className="font-display mt-4 h-16 rounded-2xl text-lg"
            disabled={jump.isPending}
            onClick={() => {
              jump.mutate({ program, weekIndex: deload })
              setOpen(false)
            }}
          >
            Take the deload this week
          </Button>
        </BottomSheet>
      )}
    </>
  )
}
