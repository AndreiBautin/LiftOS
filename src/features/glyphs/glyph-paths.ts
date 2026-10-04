import type { Glyph } from './glyph-for'

/**
 * The movement glyphs, drawn here on a 24-unit grid as round-capped
 * strokes, with heads and weights as filled dots. A figure doing the
 * movement rather than the muscle it trains: a pull-up and a row both
 * train the back and are two different trips to the rack.
 *
 * Hand-drawn for this app rather than taken from an icon set — no set
 * draws a hinge apart from a row — and kept to one weight and one
 * vocabulary (a barbell is a bar with two plate ticks, a dumbbell a short
 * bar with two dots) so the eighteen read as a family.
 */
export const GLYPH_PATHS: Record<Glyph, string> = {
  // Bar across the back, hips at knee height.
  squat: 'M5 6.5h14M5 5v3M19 5v3M12 6.5 10 12.5M10 12.5h5.5M15.5 12.5 14.5 19.5',
  // Hips back, bar hanging at the shins.
  hinge: 'M8 11.5l7.5-4M15 8v7M9 15h12M9 13.5v3M21 13.5v3M8 11.5 9.5 19.5',
  // Lying on a bench, bar pressed above the chest.
  bench: 'M3 17h16M6.5 14.5H16M10 14.5V8.5M5 8.5h10M5 7v3M15 7v3M5 17v3M17 17v3',
  // Standing, bar locked out overhead.
  press: 'M5 3.5h14M5 2v3M19 2v3M12 11V17M12 17l-2 4.5M12 17l2 4.5M12 11 8.5 3.5M12 11l3.5-7.5',
  // Bent over, bar pulled up to the body.
  row: 'M5 12l9-3M5 12l1 7.5M13 9.3V14M9 14h8M9 12.5v3M17 12.5v3M20.5 17.5v-6M19 13l1.5-1.5 1.5 1.5',
  // Hanging from a bar.
  pullup: 'M3 3h18M12 9.5 8 3M12 9.5 16 3M12 9.5v6.5M12 16l-1.5 5M12 16l1.5 5',
  // Long stride, back knee low.
  lunge: 'M11 6.5V12M11 12l4.5 1.5 .5 6M11 12l-3.5 3.5L4 19',
  // Upright, a weight in each hand.
  carry: 'M12 7v7.5M12 14.5l-2 5.5M12 14.5l2 5.5M12 8 8 13M12 8l4 5',
  // Upper arm still, forearm curled up to the weight.
  curl: 'M7 4v11M7 15l7.5-7.5M12 7.5h5M12 5.5v4M17 5.5v4',
  // Elbow pinned, forearm driven down.
  extension: 'M9.5 3v9M9.5 12v7M7 19h5M15 9v7M13 14l2 2 2-2',
  // Arms out to the side at shoulder height.
  raise: 'M12 7.5V15M12 15l-2 5.5M12 15l2 5.5M12 8.5H4.5M12 8.5h7.5M4.5 7v3M19.5 7v3',
  // Up on the toes off a step.
  calf: 'M10 3v10.5M10 13.5l5 4.5h4M4 20.5h16M5.5 17v-6M4 12.5l1.5-1.5 1.5 1.5',
  // Arms sweeping in around a tree trunk.
  fly: 'M12 8.5V17M12 17l-2 4M12 17l2 4M12 9.5c-3-2-6-1.5-8 1.5M12 9.5c3-2 6-1.5 8 1.5',
  // Shoulders lifted, arms hanging straight.
  shrug: 'M7 11h10M12 9v9M7 11v7.5M17 11v7.5M5.5 8 7 6.5 8.5 8M15.5 8 17 6.5 18.5 8',
  // A plank on the forearms.
  core: 'M6.5 12.5 20 16M8 13v4.5h3.5M3 20h18',
  // Mid-stride, arms driving.
  run: 'M13 6.5 11 12.5M12.3 8.5l3.7 2.5M12.3 8.5 9 10M11 12.5l4 3-1 5M11 12.5l-3 3-3.5-1',
  // A roller under a stretched body.
  warmup: 'M4 11.5h14.5M4 15.5h14.5M4 11.5a2 2 0 0 0 0 4M18.5 11.5a2 2 0 0 1 0 4M7 7.5h12',
  // A plain dumbbell.
  lift: 'M6 12h12M6 8.5v7M18 8.5v7M3.5 10v4M20.5 10v4',
}

/** Heads and weights: [x, y, r] filled dots, drawn over the strokes. */
export const GLYPH_DOTS: Record<Glyph, readonly (readonly [number, number, number])[]> = {
  squat: [[12, 4, 1.6]],
  hinge: [[17.2, 6.4, 1.6]],
  bench: [[4.6, 14.5, 1.6]],
  press: [[12, 8.4, 1.6]],
  row: [[16.4, 7.9, 1.6]],
  pullup: [[12, 7, 1.6]],
  lunge: [[11, 4.2, 1.6]],
  carry: [
    [12, 4.6, 1.6],
    [8, 14.6, 1.3],
    [16, 14.6, 1.3],
  ],
  curl: [[7, 15, 1.4]],
  extension: [],
  raise: [[12, 5.2, 1.6]],
  calf: [],
  fly: [[12, 6.2, 1.6]],
  shrug: [[12, 6.8, 1.6]],
  core: [[4.6, 11.4, 1.6]],
  run: [[13.8, 4.3, 1.6]],
  warmup: [[5.5, 7.5, 1.4]],
  lift: [],
}
