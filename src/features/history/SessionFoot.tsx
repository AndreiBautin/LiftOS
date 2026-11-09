import { RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BottomSheet } from '@/components/shared/BottomSheet'
import { Button } from '@/components/shared/primitives'
import { remainingSets, totalWorkingSets, type WorkoutLog } from '@/domain/logging/workout-log'
import { useRecentWorkouts } from '@/features/train/hooks'

import { useDeleteWorkout, useReopenWorkout } from './hooks'

/**
 * The ways to take a session back, at the foot of its own page. They were two
 * icons on every row of the history, a thumb's width from the link that opens
 * it, for acts done a few times a year. Here what is about to go is on screen.
 *
 * **Reopen is offered only where it can work**: the newest session, with sets
 * left. `reopenWorkout` refuses the rest too; this stops the button promising.
 *
 * The undo after a delete belongs to the page: this goes with the session.
 */
export function SessionFoot({
  workout,
  onDeleted,
}: {
  readonly workout: WorkoutLog
  readonly onDeleted: (workout: WorkoutLog) => void
}) {
  const navigate = useNavigate()
  const deleteWorkout = useDeleteWorkout()
  const reopenWorkout = useReopenWorkout()
  const recent = useRecentWorkouts(5)
  const [asking, setAsking] = useState(false)
  const close = useCallback(() => {
    setAsking(false)
  }, [])

  const newest = recent.data?.find((log) => log.status !== 'in-progress')
  const unfinished = remainingSets(workout)
  const sets = totalWorkingSets(workout)

  return (
    <div className="border-ink-800 flex flex-wrap gap-x-6 border-t pt-2 text-sm font-medium">
      {newest?.id === workout.id && unfinished > 0 && (
        <button
          type="button"
          disabled={reopenWorkout.isPending}
          onClick={() => {
            reopenWorkout.mutate(workout.id, {
              onSuccess: (result) => {
                if (result.kind === 'reopened') void navigate('/today')
              },
            })
          }}
          className="tap-target text-ink-300 flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCcw size={16} aria-hidden />
          Reopen, {unfinished} sets left
        </button>
      )}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setAsking(true)
        }}
        className="tap-target text-ink-500 flex items-center gap-2"
      >
        <Trash2 size={16} aria-hidden />
        Delete this session
      </button>
      {asking && (
        <BottomSheet label="Delete this session" title="Delete this session?" onClose={close}>
          <p className="text-ink-300 mt-1 text-sm">
            {sets === 0
              ? 'Nothing was logged in it.'
              : `${String(sets)} logged set${sets === 1 ? '' : 's'} will go with it.`}{' '}
            It does not move your program, and you get a few seconds to take it back.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              disabled={deleteWorkout.isPending}
              onClick={() => {
                deleteWorkout.mutate(workout.id, {
                  onSuccess: (result) => {
                    setAsking(false)
                    if (result.kind === 'deleted') onDeleted(result.workout)
                  },
                })
              }}
            >
              {deleteWorkout.isPending ? 'Deleting…' : 'Delete'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={close}>
              Keep
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
