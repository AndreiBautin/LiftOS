import type { MuscleGroup } from '@/domain/exercises/taxonomy'
import type { ExerciseId } from '@/domain/ids/ids'
import { shiftDay } from '@/domain/time/day'

import type { WorkoutLog } from './workout-log'

/**
 * A niggle: a set note tagged with the joint that was talking.
 *
 * **Joints, not muscles**, because that is how a lifter says it — "left
 * knee", "my elbow" — and because what aches is rarely the muscle a lift
 * is for. Each joint names the muscles whose work loads it
 * (`NIGGLE_MUSCLES`), which is how a niggle reaches a muscle's page.
 *
 * **It records and reports; it diagnoses nothing.** The app cannot tell a
 * tweak from an injury and does not try: it says where and how often, and
 * offers a swap on a lift that is both stalled and niggling — the two
 * together being the usual sign the movement, not the effort, is the
 * problem. Side is not recorded: a mark on both knees is less wrong than
 * a form that asks which one between sets.
 */
export const NIGGLE_REGIONS = [
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'lower-back',
  'hip',
  'knee',
  'ankle',
] as const

export type NiggleRegion = (typeof NIGGLE_REGIONS)[number]

export const NIGGLE_LABELS: Readonly<Record<NiggleRegion, string>> = {
  neck: 'Neck',
  shoulder: 'Shoulder',
  elbow: 'Elbow',
  wrist: 'Wrist',
  'lower-back': 'Lower back',
  hip: 'Hip',
  knee: 'Knee',
  ankle: 'Ankle',
}

/** The muscles whose work loads each joint. */
export const NIGGLE_MUSCLES: Readonly<Record<NiggleRegion, readonly MuscleGroup[]>> = {
  neck: ['traps'],
  shoulder: ['chest', 'front-delts', 'side-delts', 'rear-delts'],
  elbow: ['biceps', 'triceps', 'forearms'],
  wrist: ['forearms'],
  'lower-back': ['hamstrings', 'glutes', 'core'],
  hip: ['glutes', 'quads', 'hamstrings'],
  knee: ['quads', 'hamstrings', 'calves'],
  ankle: ['calves'],
}

/** How far back a niggle is still worth showing. */
export const NIGGLE_DAYS = 21

export function isNiggleRegion(value: unknown): value is NiggleRegion {
  return typeof value === 'string' && (NIGGLE_REGIONS as readonly string[]).includes(value)
}

export interface NiggleSummary {
  readonly region: NiggleRegion
  /** Sets tagged with it in the window. */
  readonly count: number
  readonly lastDay: string
  /** The exercises it was noted on, most recent first. */
  readonly exercises: readonly ExerciseId[]
  /** The newest note text, when there was one. */
  readonly note?: string
}

/**
 * Niggles in the last `days` days, the most recent first. Any session
 * counts — one walked away from because a knee complained is the session
 * this exists for.
 */
export function recentNiggles(
  logs: readonly WorkoutLog[],
  today: string,
  days = NIGGLE_DAYS,
): readonly NiggleSummary[] {
  const from = shiftDay(today, -days)
  const tagged = logs
    .filter((log) => log.date >= from && log.date <= today)
    .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((log) =>
      log.entries.flatMap((entry) =>
        entry.sets.flatMap((set) =>
          set.niggle === undefined
            ? []
            : [
                {
                  region: set.niggle,
                  day: log.date,
                  exerciseId: entry.exerciseId,
                  note: set.notes,
                },
              ],
        ),
      ),
    )
  return NIGGLE_REGIONS.flatMap((region): NiggleSummary[] => {
    const here = tagged.filter((one) => one.region === region)
    const first = here[0]
    if (first === undefined) return []
    const note = here.find((one) => one.note !== undefined && one.note !== '')?.note
    return [
      {
        region,
        count: here.length,
        lastDay: first.day,
        exercises: [...new Set(here.map((one) => one.exerciseId))],
        ...(note === undefined ? {} : { note }),
      },
    ]
  }).toSorted((a, b) => b.lastDay.localeCompare(a.lastDay))
}

/** The niggles a muscle's work loads: those whose joint names it. */
export function nigglesForMuscle(
  niggles: readonly NiggleSummary[],
  muscle: MuscleGroup,
): readonly NiggleSummary[] {
  return niggles.filter((one) => NIGGLE_MUSCLES[one.region].includes(muscle))
}

/** The niggles noted on one exercise. */
export function nigglesOnExercise(
  niggles: readonly NiggleSummary[],
  exerciseId: ExerciseId,
): readonly NiggleSummary[] {
  return niggles.filter((one) => one.exercises.includes(exerciseId))
}
