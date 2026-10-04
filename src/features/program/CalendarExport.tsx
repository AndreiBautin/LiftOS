import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'

import { useServices, useSettings } from '@/app/context'
import { calendarFile } from '@/domain/programs/calendar'
import type { ProgramTemplate } from '@/domain/programs/program'
import { weeksAhead } from '@/domain/programs/schedule'
import { Button } from '@/components/shared/primitives'
import { cn } from '@/lib/cn'

const LENGTHS = [45, 60, 75, 90] as const

/**
 * The next four weeks' sessions, into the phone's calendar: a time and a
 * length, then a `.ics` file (`calendarFile`) the calendar app opens.
 *
 * The days are `weeksAhead`'s — the runway's own, so the calendar holds
 * exactly the sessions this card draws, deload and all. Importing it
 * again a week later updates the same events rather than adding a second
 * set, because each day keeps its UID.
 */
export function CalendarExport({
  program,
  blockStartedOn,
  today,
}: {
  readonly program: ProgramTemplate
  readonly blockStartedOn: string
  readonly today: string
}) {
  const clock = useServices().clock
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('18:00')
  const [minutes, setMinutes] = useState<number>(60)

  const { settings } = useSettings()
  const sessions = weeksAhead(program, blockStartedOn, today, 4, settings.dayMoves)
    .flatMap((week) => week.days)
    .flatMap((day) =>
      day.session === undefined || day.on < today
        ? []
        : [
            {
              on: day.on,
              title: day.session.label,
              ...(day.session.focus === undefined ? {} : { description: day.session.focus }),
            },
          ],
    )

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label="Add these sessions to a calendar"
        onClick={() => {
          setOpen(true)
        }}
      >
        <CalendarPlus size={15} aria-hidden />
        <span className="hidden sm:inline">Calendar</span>
      </Button>
    )
  }

  return (
    <div className="border-ink-800 bg-ink-900 absolute top-12 right-3 left-3 z-10 rounded-xl border p-3 shadow-[0_18px_40px_-12px_rgb(0_0_0/80%)] sm:left-auto sm:w-72">
      <p className="text-ink-100 text-sm font-medium">
        {sessions.length} sessions into your calendar
      </p>
      <label className="text-ink-500 mt-3 flex items-center justify-between gap-3 text-sm">
        Starts at
        <input
          type="time"
          value={start}
          onChange={(event) => {
            setStart(event.target.value)
          }}
          className="bg-ink-850 border-ink-800 text-ink-100 tap-target rounded-lg border px-2"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Length">
        {LENGTHS.map((length) => (
          <button
            key={length}
            type="button"
            aria-pressed={minutes === length}
            onClick={() => {
              setMinutes(length)
            }}
            className={cn(
              'numeric tap-target rounded-full border px-3 text-xs',
              minutes === length
                ? 'border-accent-500/60 bg-accent-500/15 text-accent-400'
                : 'border-ink-800 text-ink-300',
            )}
          >
            {length} min
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={sessions.length === 0 || start === ''}
          onClick={() => {
            const stamp = clock.now().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
            const file = calendarFile(sessions, { start, minutes }, stamp)
            const url = URL.createObjectURL(new Blob([file], { type: 'text/calendar' }))
            const link = document.createElement('a')
            link.href = url
            link.download = `liftos-sessions-${today}.ics`
            link.click()
            URL.revokeObjectURL(url)
            setOpen(false)
          }}
        >
          Download .ics
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(false)
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
