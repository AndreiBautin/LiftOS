/**
 * Every storage key the app uses, in one place.
 *
 * A key spelled inline in two components is a key that will eventually be
 * spelled differently in two components. More pressingly, the demo build
 * and the personal build must never share a namespace — a reviewer
 * clicking the deployed link must not be able to see, or overwrite,
 * anything real. Deriving both from one prefix makes that structural
 * rather than a matter of remembering.
 *
 * An ESLint rule forbids touching `localStorage` outside
 * `infrastructure/storage/`, so this is the only route to a key.
 */

const PREFIX = import.meta.env.VITE_DEMO_MODE === 'true' ? 'lifeos.demo' : 'lifeos'

/*
 * Keys only for what this build reads. Four were removed with the
 * features that wrote them (Firebase sync state, a device id, built-in
 * program delivery, a storage notice); a device that ran those builds
 * still holds the values, inert, since nothing reads them.
 */
export const STORAGE_KEYS = {
  settings: `${PREFIX}.settings`,
  /** Set once the install prompt has been dismissed, so it is not nagged. */
  installPromptDismissed: `${PREFIX}.install-dismissed`,
  /**
   * The private repository this device syncs through, and the token for
   * it. Device-local and **never in the backup**: settings travel in the
   * backup file, and the backup file is what gets written to the
   * repository — a token stored there would be uploaded to the place it
   * unlocks, and into every exported file besides.
   */
  githubSync: `${PREFIX}.github-sync`,
} as const

/** The IndexedDB database name, kept in the same namespace as the keys. */
export const DATABASE_NAME = PREFIX

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'
