import { CheckCircle2, Dumbbell, LayoutGrid, Play, Plus, Settings } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'
import { EverythingSheet } from '@/features/navigation/EverythingSheet'
import { Button } from '@/components/shared/primitives'
import { buttonStyles } from '@/components/shared/styles'
import { weekIndexToStartOn } from '@/domain/programs/schedule'
import { strengthStandings } from '@/domain/strength/standards'
import { glyphFor, type Glyph } from '@/features/glyphs/glyph-for'
import { GLYPH_DOTS, GLYPH_PATHS } from '@/features/glyphs/glyph-paths'
import {
  useExercises,
  useJumpToWeek,
  useStartWorkout,
  useWeekSummary,
} from '@/features/train/hooks'
import { splitDayLabel, useNextSession } from '@/features/train/useNextSession'

/**
 * The top of the page: what the app is, what is next, and the button that
 * starts it.
 *
 * **It replaced a bare wordmark.** _"I don't like the plain LiftOS header
 * in lieu of a proper hero banner"_ — the page opened on a word and a
 * gear, and the session you came to start sat a card's height below. The
 * hero leads with that session by name and puts Start beside it, so on a
 * phone the primary action is on the first screen without scrolling.
 *
 * **Three numbers and no more**, each a different question: am I on track
 * this week, how consistent have I been, and how strong am I. The weekly
 * sets live in the card that breaks them down by muscle rather than here,
 * so no figure is drawn twice.
 */
export function HeroBanner() {
  const { clock } = useServices()
  const { settings } = useSettings()
  const {
    day,
    week,
    program,
    when,
    doneToday,
    restDay,
    here,
    on,
    today: todayKey,
  } = useNextSession()
  const summary = useWeekSummary()
  const startWorkout = useStartWorkout()
  const exercises = useExercises()
  const jumpToWeek = useJumpToWeek()
  const [everything, setEverything] = useState(false)
  const closeEverything = useCallback(() => {
    setEverything(false)
  }, [])

  const { total } = strengthStandings({
    estimatedMaxes: settings.estimatedMaxes,
    ...(settings.bodyweight !== undefined ? { bodyweight: settings.bodyweight } : {}),
  })

  const planned = program?.blocks[0]?.weeks[0]?.days.length
  /* The day's lead lift: its competition lift, else its first real exercise. */
  const leadSlot =
    day?.slots.find((slot) => slot.role === 'strength') ??
    day?.slots.find((slot) => slot.role !== 'warmup' && slot.exercise.kind === 'specific')
  const leadId = leadSlot?.exercise.kind === 'specific' ? leadSlot.exercise.exerciseId : undefined
  const lead = exercises.data?.find((one) => one.id === leadId)
  const label = day === undefined ? undefined : splitDayLabel(day.label)
  const today = clock.now().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const start = (freestyle?: boolean) => {
    startWorkout.mutate(freestyle === true ? { freestyleTitle: 'Open session' } : undefined, {
      onSuccess: () => {
        window.scrollTo({ top: 0 })
      },
    })
  }

  return (
    <section className="hero-panel p-5 sm:p-6 lg:p-8" aria-labelledby="hero-title">
      <Plate />

      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="from-accent-400 to-accent-600 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-[#06141a] shadow-[0_8px_24px_-8px_var(--color-accent-500)]"
            aria-hidden
          >
            <Dumbbell size={20} strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-ink-50 text-lg leading-tight font-semibold tracking-tight">
              LiftOS
            </h1>
            <p className="text-ink-500 text-xs">{today}</p>
          </div>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Everything"
            aria-haspopup="dialog"
            onClick={() => {
              setEverything(true)
            }}
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            <LayoutGrid size={18} aria-hidden />
          </button>
          <Link
            viewTransition
            to="/settings"
            aria-label="Settings"
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            <Settings size={18} aria-hidden />
          </Link>
        </div>
      </header>
      {everything && <EverythingSheet onClose={closeEverything} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-accent-400 flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {/*
              **The day is the date's.** "Today" while today's session is
              there to do; once it is filed, or on a rest day, the hero
              says so and names when the next one falls, because the
              calendar — not a queue — is what decides it.
            */}
            {doneToday && (
              <span className="text-good-500 flex items-center gap-1 tracking-normal normal-case">
                <CheckCircle2 size={14} aria-hidden />
                Today’s done ·
              </span>
            )}
            {restDay && !doneToday && (
              <span className="text-ink-300 tracking-normal normal-case">Rest day ·</span>
            )}
            <span>
              {when === 'today'
                ? 'Today'
                : when === 'tomorrow'
                  ? 'Tomorrow'
                  : (label?.weekday ?? 'Up next')}
            </span>
            {week?.label !== undefined && (
              <span className="text-ink-500 tracking-normal normal-case">· {week.label}</span>
            )}
            {/*
              **The deload can be skipped from here**, the same write the
              Program page's week picker makes: the block starts again this
              week at week one. Asked for as "I'm not feeling the need for a
              deload — can you skip this one". Offered beside the week name that
              says it is one, because that is where the question is asked.
            */}
            {week?.isDeload === true &&
              program !== undefined &&
              on !== undefined &&
              todayKey !== undefined && (
                <button
                  type="button"
                  disabled={jumpToWeek.isPending}
                  onClick={() => {
                    // The week the session in view falls in becomes week one.
                    const weeksInBlock = program.blocks[here?.blockIndex ?? 0]?.weeks.length ?? 1
                    jumpToWeek.mutate({
                      program,
                      weekIndex: weekIndexToStartOn(on, todayKey, weeksInBlock),
                    })
                  }}
                  className="text-ink-300 hover:text-accent-400 tap-target -my-3 px-1 text-xs font-medium tracking-normal normal-case underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Skip the deload
                </button>
              )}
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <h2
              id="hero-title"
              className="text-ink-50 min-w-0 text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              {label?.name ?? 'Your next session'}
            </h2>
            {lead !== undefined && (
              <LeadMedallion key={lead.id} glyph={glyphFor(lead)} name={lead.name} />
            )}
          </div>
          {day?.focus !== undefined && (
            <p className="text-ink-300 mt-2 max-w-prose text-sm">{day.focus}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="lg"
              className="basis-full sm:basis-auto"
              disabled={day === undefined || startWorkout.isPending}
              onClick={() => {
                start()
              }}
            >
              <Play size={20} aria-hidden />
              {when === 'today' || when === undefined ? 'Start session' : 'Start it early'}
            </Button>
            <Button
              variant="ghost"
              className="flex-1 sm:flex-none"
              disabled={startWorkout.isPending}
              onClick={() => {
                start(true)
              }}
            >
              <Plus size={16} aria-hidden />
              Open session
            </Button>
          </div>
        </div>

        <dl className="border-ink-800/80 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-[color-mix(in_oklab,var(--color-ink-800)_70%,transparent)] lg:w-80">
          <Stat
            label="This week"
            value={summary.data?.sessions}
            suffix={planned === undefined ? undefined : `/${String(planned)}`}
            lead={
              planned === undefined || summary.data === undefined ? undefined : (
                <WeekRing done={summary.data.sessions} of={planned} />
              )
            }
          />
          <Stat label="Week streak" value={summary.data?.streakWeeks} />
          <Stat
            label="SBD total"
            value={total.max === undefined ? undefined : Math.round(total.max)}
            suffix=" lb"
          />
        </dl>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  suffix,
  lead,
}: {
  readonly label: string
  readonly value: number | undefined
  readonly suffix?: string | undefined
  /** A small picture before the figure. */
  readonly lead?: ReactNode
}): ReactNode {
  return (
    <div className="bg-ink-950/60 px-3 py-3">
      <dt className="text-ink-500 text-[0.7rem] font-medium tracking-wide uppercase">{label}</dt>
      <dd className="numeric text-ink-50 mt-1 flex items-center gap-1.5 text-xl font-semibold">
        {lead}
        <span>
          {value ?? '—'}
          {value !== undefined && suffix !== undefined && (
            <span className="text-ink-500 text-sm font-normal">{suffix}</span>
          )}
        </span>
      </dd>
    </div>
  )
}

/**
 * A bumper plate, cropped by the panel's edge: the one illustration on
 * the page, and it says what the app is about without a word. Drawn, not
 * fetched, and `aria-hidden` — it carries no information.
 */
function Plate() {
  const slots = Array.from({ length: 6 }, (_, index) => index * 60)
  return (
    <svg
      viewBox="0 0 200 200"
      className="hero-plate pointer-events-none absolute -top-16 -right-20 -z-10 size-72 opacity-[0.16] sm:size-96 lg:-top-24 lg:-right-16"
      aria-hidden
    >
      <g fill="none" stroke="var(--color-accent-400)">
        <circle cx="100" cy="100" r="96" strokeWidth="3" />
        <circle cx="100" cy="100" r="84" strokeWidth="1" />
        <circle cx="100" cy="100" r="44" strokeWidth="2" />
        <circle cx="100" cy="100" r="16" strokeWidth="6" />
        {slots.map((angle) => (
          <path
            key={angle}
            d="M100 26 a74 74 0 0 1 28 5.5"
            strokeWidth="9"
            strokeLinecap="round"
            transform={`rotate(${String(angle)} 100 100)`}
          />
        ))}
      </g>
    </svg>
  )
}

/**
 * The day's lead lift as a medallion: its movement glyph, ringed, tracing
 * itself in once when the hero mounts (keyed by the exercise, so a new day
 * draws again). The name is in the plan below, so this is a picture of it
 * rather than a second label — `role="img"` with the name for a reader.
 */
function LeadMedallion({ glyph, name }: { readonly glyph: Glyph; readonly name: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className="hero-medallion text-accent-400 size-16 shrink-0 sm:size-20"
      role="img"
      aria-label={`Leads with ${name}`}
    >
      <circle
        cx="24"
        cy="24"
        r="22.5"
        fill="color-mix(in oklab, var(--color-accent-500) 12%, transparent)"
        stroke="color-mix(in oklab, var(--color-accent-400) 45%, transparent)"
        strokeWidth="1"
      />
      <g
        transform="translate(10 10) scale(1.1667)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="medallion-trace" d={GLYPH_PATHS[glyph]} pathLength={1} />
        {GLYPH_DOTS[glyph].map(([x, y, r]) => (
          <circle
            key={`${String(x)}-${String(y)}`}
            className="medallion-dot"
            cx={x}
            cy={y}
            r={r}
            fill="currentColor"
            stroke="none"
          />
        ))}
      </g>
    </svg>
  )
}

/**
 * The week's sessions as a ring of segments, one per planned day, lit for
 * each finished — the "5/5" beside it is the number, this is the shape of
 * it. A week over its plan lights every segment and no more.
 */
function WeekRing({ done, of }: { readonly done: number; readonly of: number }) {
  if (of <= 0) return null
  const gap = 0.08
  const step = (Math.PI * 2) / of
  const arc = (at: number) => {
    const from = -Math.PI / 2 + at * step + gap
    const to = from + step - gap * 2
    const point = (angle: number) =>
      `${(10 + 8 * Math.cos(angle)).toFixed(2)} ${(10 + 8 * Math.sin(angle)).toFixed(2)}`
    return `M${point(from)} A8 8 0 0 1 ${point(to)}`
  }
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0" aria-hidden>
      {Array.from({ length: of }, (_, at) => (
        <path
          key={at}
          d={arc(at)}
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          stroke={at < done ? 'var(--color-accent-400)' : 'var(--color-ink-700)'}
        />
      ))}
    </svg>
  )
}
