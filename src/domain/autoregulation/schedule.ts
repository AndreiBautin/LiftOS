/**
 * Sessions running past this are a sign there are too few of them.
 *
 * Nothing acts on it. It is the line the assembler is held to in test:
 * a day past two hours is one nobody finishes as written, whatever the
 * volume arithmetic says.
 */
export const SESSION_TOO_LONG_MINUTES = 120

/**
 * Sessions this short mean the week could be consolidated.
 *
 * Forty, not sixty. Sixty was calibrated when four days was the default
 * and does not survive the move to five: the same weekly volume spread
 * over five sittings averages the middle fifties.
 *
 * Also nothing acts on it, and deliberately — a squat day with the legs
 * on maintenance finishing in forty minutes is the plan rather than a
 * gap, and the three mechanisms that once padded such a day up to the
 * floor are gone. It survives as the line the *week's average* is held
 * to in test.
 */
export const SESSION_TOO_SHORT_MINUTES = 40

export const DEFAULT_WEEKS_BEFORE_DELOAD = 6
