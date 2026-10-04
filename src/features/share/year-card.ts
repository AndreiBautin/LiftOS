import {
  ACCENT,
  FONT,
  H,
  INK_300,
  INK_50,
  INK_500,
  paintBackground,
  shareCanvas,
  toPng,
  W,
} from './session-card'

/**
 * A year as a picture: twelve small calendars, four across and three
 * down, a square a day lit by its working sets in the training grid's
 * bands — the Year page laid out to be looked at on its own — with the
 * weeks trained and the best and current streaks above. Days to come are
 * left out rather than drawn faint: a shared year is the year so far.
 */
export interface YearCard {
  readonly year: string
  /** Working sets per day key. */
  readonly days: Readonly<Record<string, number>>
  readonly today: string
  readonly sessions: number
  readonly weeksTrained: number
  readonly bestStreak: number
  readonly currentStreak: number
}

/** The training grid's bands. */
const BANDS = [1, 10, 20, 30] as const
/** Unlit, then the four bands: the accent mixed into the card's ink. */
const SHADES = ['#22262e', '#1f4a52', '#287078', '#3297a3', '#5ccad9'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function drawYearCard(card: YearCard): Promise<Blob> {
  const made = shareCanvas()
  if (made === undefined) return Promise.reject(new Error('No 2D canvas here.'))
  const { canvas, ctx } = made
  paintBackground(ctx)

  const left = 72
  ctx.fillStyle = ACCENT
  ctx.font = `600 30px ${FONT}`
  ctx.fillText('THE YEAR', left, 130)
  ctx.fillStyle = INK_50
  ctx.font = `700 112px ${FONT}`
  ctx.fillText(card.year, left, 246)

  const figures: readonly (readonly [string, string])[] = [
    ['SESSIONS', String(card.sessions)],
    ['WEEKS TRAINED', String(card.weeksTrained)],
    ['BEST STREAK', `${String(card.bestStreak)} wk`],
  ]
  const column = (W - left * 2) / figures.length
  figures.forEach(([label, value], at) => {
    const x = left + column * at
    ctx.fillStyle = INK_500
    ctx.font = `600 24px ${FONT}`
    ctx.fillText(label, x, 320)
    ctx.fillStyle = INK_50
    ctx.font = `700 54px ${FONT}`
    ctx.fillText(value, x, 384)
  })

  const across = 4
  const gapX = 30
  const gapY = 40
  const top = 450
  const monthWidth = (W - left * 2 - gapX * (across - 1)) / across
  const cell = monthWidth / 7
  const square = cell - 5
  const monthHeight = 36 + cell * 6
  for (let month = 0; month < 12; month += 1) {
    const x = left + (month % across) * (monthWidth + gapX)
    const y = top + Math.floor(month / across) * (monthHeight + gapY)
    ctx.fillStyle = INK_300
    ctx.font = `600 24px ${FONT}`
    ctx.fillText(MONTHS[month] ?? '', x, y + 22)

    const first = new Date(Date.UTC(Number(card.year), month, 1))
    // Monday first, the app's week.
    const offset = (first.getUTCDay() + 6) % 7
    const length = new Date(Date.UTC(Number(card.year), month + 1, 0)).getUTCDate()
    for (let date = 1; date <= length; date += 1) {
      const key = `${card.year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      if (key > card.today) break
      const slot = offset + date - 1
      const sets = card.days[key] ?? 0
      const band = BANDS.filter((floor) => sets >= floor).length
      ctx.beginPath()
      ctx.roundRect(
        x + (slot % 7) * cell,
        y + 36 + Math.floor(slot / 7) * cell,
        square,
        square,
        Math.min(8, square / 3),
      )
      ctx.fillStyle = SHADES[band] ?? SHADES[0]
      ctx.fill()
    }
  }

  ctx.fillStyle = INK_500
  ctx.font = `600 28px ${FONT}`
  ctx.fillText('LiftOS', left, H - 80)
  ctx.textAlign = 'right'
  ctx.font = `400 28px ${FONT}`
  ctx.fillText(
    card.currentStreak > 0 ? `${String(card.currentStreak)} weeks running` : '',
    W - left,
    H - 80,
  )
  ctx.textAlign = 'left'
  return toPng(canvas)
}
