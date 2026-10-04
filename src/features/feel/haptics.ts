import { useCallback } from 'react'

import { useSettings } from '@/app/context'

/**
 * Every vibration the app makes, by what it means. **One vocabulary**, so
 * a logged set feels the same from the row's check, its swipe and the
 * keyboard, and a record never feels like a skip.
 *
 * Short and few on purpose: a buzz on every press is noise you stop
 * feeling. These mark the moments that change the session — a set filed,
 * a set skipped, the rest over, a record — plus the dial's detent, which
 * is what a dial feels like. Android buzzes; iOS has no web vibration and
 * stays silent, which is why nothing here carries meaning alone.
 */
export const HAPTICS = {
  detent: 4,
  press: 8,
  logged: 14,
  skipped: [6, 50, 6],
  finished: [20, 60, 20, 60, 40],
  record: [30, 40, 70],
  restOver: [90, 70, 90],
} as const satisfies Record<string, number | readonly number[]>

export type Haptic = keyof typeof HAPTICS

export function buzz(kind: Haptic, enabled: boolean): void {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  const pattern = HAPTICS[kind]
  navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern])
}

/** `buzz`, honouring Settings → Feel. */
export function useHaptics(): (kind: Haptic) => void {
  const { settings } = useSettings()
  const enabled = settings.haptics
  return useCallback(
    (kind: Haptic) => {
      buzz(kind, enabled)
    },
    [enabled],
  )
}
