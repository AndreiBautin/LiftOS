import { CloudAlert, CloudCheck, CloudUpload } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { useServices } from '@/app/context'
import { agoLabel } from '@/domain/time/ago'
import { cn } from '@/lib/cn'

import { syncStore, type SyncSnapshot } from './sync-store'

/** How often the "2m" label is re-read; it only changes once a minute. */
const TICK_MS = 30_000

/**
 * Whether this device has synced, and when — in the hero's corner, only
 * when a repository is connected. A press asks for a round now. **A
 * failure says so in words** ("Sync failed"), because the alternative was
 * finding out from data missing on the other device; the reason is in its
 * title and its accessible name.
 */
export function SyncBadge() {
  const snapshot = useSyncExternalStore(syncStore.subscribe, syncStore.get)
  const { clock } = useServices()
  const [now, setNow] = useState(() => clock.now())
  useEffect(() => {
    const handle = window.setInterval(() => {
      setNow(clock.now())
    }, TICK_MS)
    return () => {
      window.clearInterval(handle)
    }
  }, [clock])
  return (
    <SyncBadgeView
      snapshot={snapshot}
      now={now}
      onSync={() => {
        syncStore.request(true)
      }}
    />
  )
}

/** The badge for a snapshot, apart from the store, so each state can be drawn and tested. */
export function SyncBadgeView({
  snapshot,
  now,
  onSync,
}: {
  readonly snapshot: SyncSnapshot
  readonly now: Date
  readonly onSync: () => void
}) {
  if (snapshot.phase === 'off' || snapshot.config === undefined) return null
  const last = snapshot.config.lastSyncedAt
  const ago = last === undefined ? undefined : agoLabel(new Date(last), now)

  const state =
    snapshot.phase === 'error'
      ? {
          icon: <CloudAlert size={16} aria-hidden />,
          text: 'Sync failed',
          name: `Sync failed: ${snapshot.message ?? 'unknown reason'}. Press to try again.`,
          tone: 'text-warn-500',
        }
      : snapshot.phase === 'syncing'
        ? {
            icon: <CloudUpload size={16} aria-hidden />,
            text: 'Syncing',
            name: 'Syncing now',
            tone: 'text-accent-400',
          }
        : {
            icon: <CloudCheck size={16} aria-hidden />,
            text: ago ?? 'Not yet',
            name:
              ago === undefined
                ? 'Not synced yet. Press to sync now.'
                : `Synced ${ago === 'now' ? 'just now' : `${ago} ago`}. Press to sync now.`,
            tone: 'text-good-500',
          }

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={snapshot.phase === 'syncing'}
      aria-label={state.name}
      title={snapshot.phase === 'error' ? snapshot.message : undefined}
      className={cn(
        'tap-target flex items-center gap-1 rounded-lg px-2 text-xs font-medium disabled:opacity-80',
        state.tone,
      )}
    >
      {state.icon}
      <span className="numeric">{state.text}</span>
    </button>
  )
}
