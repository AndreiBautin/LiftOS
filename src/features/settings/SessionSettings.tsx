import { useSettings } from '@/app/context'

/** What the player does on its own between sets. */
export function SessionSettings() {
  const { settings, update } = useSettings()
  return (
    <div className="inset-list">
      <Toggle
        label="Rest timer"
        checked={settings.restTimerEnabled}
        onChange={(restTimerEnabled) => {
          update({ restTimerEnabled })
        }}
      />
      <Toggle
        label="Rest sounds — ticks before the end, a chime at it"
        checked={settings.restSounds}
        onChange={(restSounds) => {
          update({ restSounds })
        }}
      />
      <Toggle
        label="Vibrate — a set logged, a skip, a record, the rest's end"
        checked={settings.haptics}
        onChange={(haptics) => {
          update({ haptics })
        }}
      />
      <Toggle
        label="Keep the screen awake"
        checked={settings.keepScreenAwake}
        onChange={(keepScreenAwake) => {
          update({ keepScreenAwake })
        }}
      />
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (value: boolean) => void
}) {
  /* "Title — what it does": the clause after the dash is a detail line. */
  const [title, detail] = label.split(' — ') as [string, string | undefined]
  return (
    <label className="inset-row tap-target flex cursor-pointer items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="text-ink-100 block text-sm font-medium">{title}</span>
        {detail === undefined ? null : (
          <span className="text-ink-500 mt-0.5 block text-xs first-letter:uppercase">{detail}</span>
        )}
      </span>
      {/*
        A switch, not the platform's checkbox: the native box rendered as
        a bright system-blue square, the one control on the screen that
        looked borrowed from another app. The input stays a real checkbox
        underneath, so keyboard and screen reader behaviour is unchanged.
      */}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked)
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="border-ink-700 bg-ink-850 peer-checked:border-accent-500/70 peer-checked:bg-accent-500/25 peer-focus-visible:outline-accent-500 relative h-7 w-12 shrink-0 rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-checked:[&>span]:translate-x-5 peer-checked:[&>span]:bg-accent-400"
      >
        <span className="bg-ink-500 absolute top-1 left-1 size-[1.125rem] rounded-full shadow transition-transform" />
      </span>
    </label>
  )
}
