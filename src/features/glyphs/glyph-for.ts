import { WARM_UP_SLUGS } from '@/domain/exercises/catalogue'
import type { MovementPattern, MuscleGroup } from '@/domain/exercises/taxonomy'

const WARM_UPS: ReadonlySet<string> = new Set([...WARM_UP_SLUGS.upper, ...WARM_UP_SLUGS.lower])

export const GLYPHS = [
  'squat',
  'hinge',
  'bench',
  'press',
  'row',
  'pullup',
  'lunge',
  'carry',
  'curl',
  'extension',
  'raise',
  'calf',
  'fly',
  'shrug',
  'core',
  'run',
  'warmup',
  'lift',
] as const

export type Glyph = (typeof GLYPHS)[number]

const BY_PATTERN: Partial<Record<MovementPattern, Glyph>> = {
  squat: 'squat',
  hinge: 'hinge',
  lunge: 'lunge',
  carry: 'carry',
  core: 'core',
  conditioning: 'run',
  'horizontal-push': 'bench',
  'vertical-push': 'press',
  'horizontal-pull': 'row',
  'vertical-pull': 'pullup',
  'wrist-flexion': 'curl',
  'wrist-extension': 'curl',
}

/**
 * Isolation is one pattern and half the catalogue, so it is told apart by
 * the muscle: a curl, a press-down, a raise and a calf raise are four
 * different pictures of four different things.
 */
const ISOLATION_BY_MUSCLE: Partial<Record<MuscleGroup, Glyph>> = {
  biceps: 'curl',
  forearms: 'curl',
  hamstrings: 'curl',
  triceps: 'extension',
  quads: 'extension',
  'side-delts': 'raise',
  'rear-delts': 'raise',
  'front-delts': 'raise',
  calves: 'calf',
  chest: 'fly',
  traps: 'shrug',
  core: 'core',
}

/**
 * The picture for an exercise: its movement pattern, refined by muscle for
 * isolation work, and a warm-up drawn as a warm-up whatever it moves.
 * `lift` — a plain dumbbell — is the fallback for anything not named.
 */
export function glyphFor(exercise: {
  readonly id?: string
  readonly pattern: MovementPattern
  readonly primaryMuscle: MuscleGroup
  readonly warmup?: boolean
}): Glyph {
  if (exercise.warmup === true || (exercise.id !== undefined && WARM_UPS.has(exercise.id)))
    return 'warmup'
  if (exercise.pattern === 'isolation') return ISOLATION_BY_MUSCLE[exercise.primaryMuscle] ?? 'lift'
  return BY_PATTERN[exercise.pattern] ?? 'lift'
}
