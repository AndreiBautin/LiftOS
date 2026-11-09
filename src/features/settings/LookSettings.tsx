import { useSettings } from '@/app/context'
import { ACCENT_HUES, DEFAULT_ACCENT_HUE } from '@/domain/settings/settings'
import { cn } from '@/lib/cn'

/** The accent's hue and the page behind everything. */
export function LookSettings() {
  const { settings, update } = useSettings()
  return (
    <div className="pt-2">
      <p className="text-ink-300 mb-3 text-sm">Accent</p>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Accent colour">
        {ACCENT_HUES.map(({ hue, name }) => {
          const chosen = (settings.accentHue ?? DEFAULT_ACCENT_HUE) === hue
          return (
            <button
              key={hue}
              type="button"
              role="radio"
              aria-checked={chosen}
              aria-label={name}
              onClick={() => {
                update({ accentHue: hue })
              }}
              className="tap-target flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'size-9 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition-shadow',
                  chosen ? 'ring-ink-100' : 'ring-transparent',
                )}
                style={{ background: `oklch(0.72 0.12 ${String(hue)})` }}
                aria-hidden
              />
              <span className={cn('text-xs', chosen ? 'text-ink-50' : 'text-ink-500')}>{name}</span>
            </button>
          )
        })}
      </div>
      <p className="text-ink-300 mt-5 mb-3 text-sm">Background</p>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Background">
        {BACKGROUNDS.map(({ black, name, page, card }) => {
          const chosen = (settings.trueBlack === true) === black
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => {
                update({ trueBlack: black })
              }}
              className={cn(
                'tap-target overflow-hidden rounded-xl border-2 text-left transition-colors',
                chosen ? 'border-accent-500' : 'border-ink-800 hover:border-ink-700',
              )}
            >
              {/* A page with a card on it, drawn in that background. */}
              <span className="block p-2.5" style={{ background: page }} aria-hidden>
                <span
                  className="border-ink-800 block rounded-md border p-2"
                  style={{ background: card }}
                >
                  <span className="bg-accent-500 block h-1.5 w-1/2 rounded-full" />
                  <span className="bg-ink-700 mt-1.5 block h-1 w-3/4 rounded-full" />
                </span>
              </span>
              <span
                className={cn(
                  'block px-2.5 py-1.5 text-xs',
                  chosen ? 'text-ink-50' : 'text-ink-500',
                )}
              >
                {name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The two pages on offer, each drawn in its own colours for the picker. */
const BACKGROUNDS = [
  {
    black: false,
    name: 'Dark',
    page: 'oklch(0.155 0.004 220)',
    card: 'oklch(0.205 0.005 220)',
  },
  { black: true, name: 'Pure black · OLED', page: '#000', card: 'oklch(0.14 0.004 220)' },
] as const
