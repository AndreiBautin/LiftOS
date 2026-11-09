import { cva } from 'class-variance-authority'

/**
 * Style recipes, kept apart from the components that use them.
 *
 * Not an aesthetic decision: a file exporting both a component and a
 * constant breaks React Fast Refresh, so the split is what keeps editing
 * a button from reloading the whole app. It also lets a `Link` wear a
 * button's appearance without pretending to be one, which matters for
 * screen readers — a link that navigates should be a link.
 */
export const buttonStyles = cva(
  'tap-target inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[color,filter] hover:brightness-125 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100',
  {
    variants: {
      variant: {
        /*
         * The one panel on a screen with a colour; see `.control-surface`
         * in `index.css`. The accent's scale is 200, 400, 500, 600: an
         * undefined Tailwind colour compiles to nothing and the words
         * inherit near-white, so read a shade back off the element.
         */
        primary:
          'control-surface control-surface-lit [--control-tint:var(--color-accent-500)] text-accent-200',
        secondary: 'control-surface [--control-tint:var(--color-ink-500)] text-ink-50',
        /*
         * Flat on purpose, and the only variant that is. A ghost is meant
         * to recede; giving it a surface would make every icon button on
         * a row read as something to press.
         */
        ghost: 'text-ink-300 hover:bg-ink-850 hover:text-ink-50',
        danger:
          'control-surface control-surface-lit [--control-tint:var(--color-bad-500)] text-bad-500',
        outline: 'control-surface [--control-tint:var(--color-ink-500)] text-ink-100',
      },
      size: {
        md: 'h-11',
        lg: 'h-14 text-base',
        sm: 'h-9 px-3 text-xs',
      },
      full: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', full: false },
  },
)

export const badgeStyles = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        // A ring on every badge, so a tone reads as a chip with an edge
        // rather than as tinted text. The neutral one gains the most: it
        // was a grey fill on a grey card.
        neutral: 'bg-ink-800 text-ink-300 ring-1 ring-ink-700',
        accent: 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30',
        good: 'bg-good-500/15 text-good-500 ring-1 ring-good-500/30',
        warn: 'bg-warn-500/15 text-warn-500 ring-1 ring-warn-500/30',
        bad: 'bg-bad-500/15 text-bad-500 ring-1 ring-bad-500/30',
        cool: 'bg-cool-500/15 text-cool-500 ring-1 ring-cool-500/30',
        /*
         * A sub-category, not a category. Outlined rather than filled so
         * it reads as subordinate to the badge beside it whatever the
         * colours are doing — the hierarchy should survive being
         * photographed in greyscale.
         */
        sub: 'border border-ink-700 text-ink-500',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)
