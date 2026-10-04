import { Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

import { recogniserConstructor, type Recogniser } from './dictation'

/**
 * A microphone beside a note, for a sentence said between sets with
 * chalk on the hands: press, speak, and what was heard is handed to
 * `onHeard` once the speaker stops.
 *
 * **Absent where the browser has no speech recogniser** (Firefox, most
 * desktop browsers without it) rather than a button that does nothing.
 * The recognition itself is the browser's — on most it sends audio to the
 * platform's speech service, which is the browser's arrangement, not this
 * app's; nothing is recorded or kept here.
 */
export function DictateButton({
  onHeard,
  label = 'Dictate a note',
}: {
  readonly onHeard: (text: string) => void
  readonly label?: string
}) {
  const [listening, setListening] = useState(false)
  const recogniser = useRef<Recogniser | undefined>(undefined)
  const Recognition = recogniserConstructor()

  useEffect(
    () => () => {
      recogniser.current?.stop()
    },
    [],
  )

  if (Recognition === undefined) return null

  return (
    <button
      type="button"
      aria-label={listening ? 'Stop dictating' : label}
      aria-pressed={listening}
      onClick={() => {
        if (listening) {
          recogniser.current?.stop()
          return
        }
        const heard = new Recognition()
        heard.lang = navigator.language
        heard.interimResults = false
        heard.continuous = false
        heard.onresult = (event) => {
          const text = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? '')
            .join(' ')
          onHeard(text)
        }
        heard.onend = () => {
          setListening(false)
        }
        heard.onerror = () => {
          setListening(false)
        }
        recogniser.current = heard
        setListening(true)
        heard.start()
      }}
      className={cn(
        'tap-target flex shrink-0 items-center justify-center rounded-lg border px-3 transition-colors',
        listening
          ? 'border-bad-500/50 bg-bad-500/15 text-bad-500'
          : 'border-ink-800 text-ink-300 hover:text-accent-400',
      )}
    >
      <Mic size={16} aria-hidden />
    </button>
  )
}
