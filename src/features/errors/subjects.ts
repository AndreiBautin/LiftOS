/**
 * What a failed read was about, in words a person would use.
 *
 * Every query here is keyed by its subject first — `workouts`, `program`,
 * `exercises` — so the head of the key is enough to say what did not
 * load. Several failures about one subject are one sentence, not five, and
 * a key nothing here knows reads as "some of your data" rather than as its
 * internal name.
 */
const SUBJECTS: Readonly<Record<string, string>> = {
  workouts: 'your sessions',
  workout: 'the open session',
  'previous-set': 'last time’s sets',
  exercises: 'the exercise library',
  program: 'the programme',
  programs: 'the programme',
  position: 'where you are in the block',
  'storage-status': 'storage status',
  'storage-empty': 'storage status',
}

const UNKNOWN = 'some of your data'

export function failureSubjects(keys: readonly (readonly unknown[])[]): readonly string[] {
  return [
    ...new Set(
      keys.map((key) => {
        const head = key[0]
        return typeof head === 'string' ? (SUBJECTS[head] ?? UNKNOWN) : UNKNOWN
      }),
    ),
  ]
}

/** "A", "A and B", "A, B and C". */
export function joinSubjects(subjects: readonly string[]): string {
  if (subjects.length <= 1) return subjects[0] ?? ''
  return `${subjects.slice(0, -1).join(', ')} and ${subjects.at(-1) ?? ''}`
}
