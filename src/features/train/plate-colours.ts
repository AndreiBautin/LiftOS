import type { WeightUnit } from '@/domain/units/weight'

/**
 * Plates in competition colours, heaviest first, in the order of
 * `PLATES[unit]`: 45 blue, 35 yellow, 25 green, 10 white in pounds; 25 red,
 * 20 blue, 15 yellow, 10 green, 5 white in kilos. They are the colours on the
 * floor of most gyms that colour plates at all, and a picture that disagreed
 * with the rack would be read wrongly.
 */
export const PLATE_COLOURS: Readonly<Record<WeightUnit, readonly string[]>> = {
  lb: [
    'oklch(0.58 0.17 255)', // 45 blue
    'oklch(0.80 0.15 90)', // 35 yellow
    'oklch(0.62 0.15 150)', // 25 green
    'oklch(0.90 0.01 250)', // 10 white
    'oklch(0.60 0.18 25)', // 5 red
    'oklch(0.84 0.03 80)', // 2.5 chrome
  ],
  kg: [
    'oklch(0.60 0.19 25)', // 25 red
    'oklch(0.58 0.17 255)', // 20 blue
    'oklch(0.80 0.15 90)', // 15 yellow
    'oklch(0.62 0.15 150)', // 10 green
    'oklch(0.90 0.01 250)', // 5 white
    'oklch(0.35 0.01 250)', // 2.5 black
    'oklch(0.84 0.03 80)', // 1.25 chrome
  ],
}
