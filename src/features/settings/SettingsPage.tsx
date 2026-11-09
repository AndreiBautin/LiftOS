import { ChevronRight } from 'lucide-react'
import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useServices, useSettings } from '@/app/context'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { PageHeader } from '@/components/shared/PageHeader'
import { STRENGTH_LIFT_SLUGS } from '@/domain/exercises/catalogue'
import { asExerciseId } from '@/domain/ids/ids'
import { ACCENT_HUES, DEFAULT_ACCENT_HUE, backupAge } from '@/domain/settings/settings'
import { platesToHand } from '@/domain/units/plates'
import { BuildLine } from '@/features/pwa/BuildLine'
import { syncStore } from '@/features/sync/sync-store'
import { SyncSection } from '@/features/sync/SyncSection'
import { cn } from '@/lib/cn'

import { DataSettings } from './DataSettings'
import { LookSettings } from './LookSettings'
import { MaxesEditor } from './MaxesEditor'
import { SessionSettings } from './SessionSettings'
import { UnitSettings } from './UnitSettings'

const AREAS = ['look', 'units', 'session', 'maxes', 'sync', 'data'] as const
type Area = (typeof AREAS)[number]

const TITLES: Readonly<Record<Area, string>> = {
  look: 'Look',
  units: 'Units and plates',
  session: 'During a session',
  maxes: 'Current maxes',
  sync: 'Sync across devices',
  data: 'Your data',
}

/**
 * Settings as a short list, each row saying what it is set to.
 *
 * **The index is the answer most visits want.** It was 3,520 pixels and 58
 * controls with a row of chips to jump around them, so finding one switch
 * meant reading past the lot. Now six rows fit on a phone, each with its
 * current value, so "am I in pounds, did I export, is sync on" takes no presses
 * at all and changing one takes one.
 *
 * **The open sheet is in the address** (`?open=data`), so the phone's Back closes
 * it and a link can open it: the sample notice's Start fresh lands on the data.
 */
export function SettingsPage() {
  const { settings, update } = useSettings()
  const { clock } = useServices()
  const sync = useSyncExternalStore(syncStore.subscribe, syncStore.get)
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const asked = params.get('open')
  const open = AREAS.find((area) => area === asked)
  /* Opened from this list, Back undoes it; arriving on a link, there is no list behind. */
  const fromList = (location.state as { readonly fromList?: boolean } | null)?.fromList === true
  /* Stable: a sheet refocuses itself whenever its close handler changes. */
  const close = useCallback(() => {
    if (fromList) void navigate(-1)
    else void navigate('/settings', { replace: true })
  }, [fromList, navigate])

  const hue = settings.accentHue ?? DEFAULT_ACCENT_HUE
  const age = backupAge(settings, clock.now())
  const syncing = sync.config !== undefined
  const total = [STRENGTH_LIFT_SLUGS.squat, STRENGTH_LIFT_SLUGS.bench, STRENGTH_LIFT_SLUGS.deadlift]
    .map((slug) => settings.estimatedMaxes[asExerciseId(slug)] ?? 0)
    .reduce((sum, max) => sum + max, 0)
  const plates = platesToHand(settings.plates, settings.units)

  const values: Readonly<Record<Area, string>> = {
    look: `${ACCENT_HUES.find((one) => one.hue === hue)?.name ?? 'Cyan'} · ${settings.trueBlack === true ? 'Pure black' : 'Dark'}`,
    units: `${settings.units} · rounds to ${String(settings.roundingIncrement)} · ${String(plates.length)} plates`,
    session: `Rest timer ${settings.restTimerEnabled ? 'on' : 'off'} · sounds ${settings.restSounds ? 'on' : 'off'}`,
    maxes: total > 0 ? `${total.toLocaleString()} ${settings.units} total` : 'Not set',
    sync: !syncing ? 'Not connected' : sync.phase === 'error' ? 'Sync failed' : 'Connected',
    data:
      age.days === undefined
        ? 'Never exported'
        : age.days === 0
          ? 'Exported today'
          : `Exported ${String(age.days)} ${age.days === 1 ? 'day' : 'days'} ago`,
  }
  /* Only what is worth acting on is amber: an old backup that is the only copy. */
  const warn: Readonly<Partial<Record<Area, boolean>>> = {
    sync: syncing && sync.phase === 'error',
    data: age.stale && !syncing,
  }

  const sheets: Readonly<Record<Area, ReactNode>> = {
    look: <LookSettings />,
    units: <UnitSettings />,
    session: <SessionSettings />,
    maxes: (
      <MaxesEditor
        settings={settings}
        onChange={(estimatedMaxes) => {
          update({ estimatedMaxes })
        }}
      />
    ),
    sync: <SyncSection />,
    data: <DataSettings />,
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" />
      <ul className="border-ink-800 border-t">
        {AREAS.map((area) => (
          <li key={area} className="border-ink-800 border-b">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                void navigate(`/settings?open=${area}`, { state: { fromList: true } })
              }}
              className="flex min-h-[4.25rem] w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block font-medium">{TITLES[area]}</span>
                <span
                  className={cn(
                    'numeric block truncate text-sm',
                    warn[area] === true ? 'text-warn-500' : 'text-ink-500',
                  )}
                >
                  {values[area]}
                </span>
              </span>
              <ChevronRight size={18} className="text-ink-500 shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <BuildLine />
      </div>
      {open !== undefined && (
        <BottomSheet label={TITLES[open]} title={TITLES[open]} onClose={close}>
          {sheets[open]}
        </BottomSheet>
      )}
    </div>
  )
}
