/**
 * What a set of an exercise costs, and what it buys.
 *
 * Renaissance Periodization's central practical claim is that not all
 * sets are equal: a set of cable lateral raises and a set of deadlifts
 * both count as "one set" in a spreadsheet, and they are nothing alike in
 * what they take out of you. Modelling that difference is what lets the
 * app say "you are at 18 sets for quads but you are also three heavy
 * deadlift sessions deep, so the number is lying to you".
 */

/**
 * Stimulus-to-fatigue ratio, 1–5, where 5 is the best deal.
 *
 * High-SFR work gives a lot of muscular stimulus for very little systemic
 * or joint cost — a stable position, a good stretch, no spinal loading,
 * and failure that is merely unpleasant rather than dangerous. Low-SFR
 * work is still worth doing, but it should be *spent* deliberately rather
 * than accumulated by accident.
 *
 * This is what makes prioritisation meaningful. Pushing a muscle toward
 * MRV is only affordable if the sets getting it there are cheap ones.
 */
export type Sfr = 1 | 2 | 3 | 4 | 5

/**
 * Whole-body fatigue cost per working set, in arbitrary units where a
 * heavy compound squat set is 1.0 and a seated isolation set is near 0.
 *
 * Deliberately *not* per-muscle. Local fatigue is already captured by
 * volume against a muscle's landmarks; this is the thing landmarks cannot
 * see — the reason six sets of squats and six sets of leg extensions
 * leave you in completely different states despite identical quad volume.
 */
export type SystemicCost = number

/**
 * How a lifter should treat the exercise, which is not the same as what
 * rep range it lives in.
 *
 * The distinction the redesign turns on: the powerlifting total is three
 * lifts, and everything else — including a heavy overhead press at three
 * to six reps — is hypertrophy work that happens to be heavy. Strength
 * work is autoregulated by RTS fatigue percents against an estimated max;
 * hypertrophy work is prescribed at a constant proximity to failure and
 * governed by volume landmarks.
 */
export const TRAINING_INTENTS = ['strength', 'hypertrophy', 'conditioning'] as const
export type TrainingIntent = (typeof TRAINING_INTENTS)[number]
