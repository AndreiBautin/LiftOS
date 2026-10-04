import {
  ACCENT,
  FONT,
  GOLD,
  H,
  INK_300,
  INK_50,
  INK_500,
  INK_800,
  paintBackground,
  shareCanvas,
  toPng,
  W,
} from './session-card'

/**
 * The records wall as a picture: the tiles of the wall itself, up to
 * twelve, three across — each the exercise, its heaviest bar large, the
 * reps and the day under it, **gold-edged where the best is from this
 * week**, the rule the wall uses on screen. Drawn rather than shot, for
 * the reason the session card is: a screenshot of a scrolling grid is a
 * picture of a web page.
 */
export interface WallTile {
  readonly name: string
  /** Already formatted: "315 lb". */
  readonly load: string
  /** "× 5 · Sep 28". */
  readonly detail: string
  readonly fresh: boolean
}

const TILES = 12
const COLUMNS = 3

export function drawWallCard(args: {
  readonly tiles: readonly WallTile[]
  readonly subtitle: string
}): Promise<Blob> {
  const made = shareCanvas()
  if (made === undefined) return Promise.reject(new Error('No 2D canvas here.'))
  const { canvas, ctx } = made
  paintBackground(ctx)

  const left = 72
  ctx.fillStyle = ACCENT
  ctx.font = `600 30px ${FONT}`
  ctx.fillText('RECORDS', left, 130)
  ctx.fillStyle = INK_50
  ctx.font = `700 92px ${FONT}`
  ctx.fillText('The wall', left, 236)
  ctx.fillStyle = INK_300
  ctx.font = `400 36px ${FONT}`
  ctx.fillText(args.subtitle, left, 300)

  const gap = 20
  const top = 360
  const width = (W - left * 2 - gap * (COLUMNS - 1)) / COLUMNS
  const height = 200
  args.tiles.slice(0, TILES).forEach((tile, at) => {
    const x = left + (at % COLUMNS) * (width + gap)
    const y = top + Math.floor(at / COLUMNS) * (height + gap)
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 24)
    ctx.fillStyle = tile.fresh ? 'rgba(240, 195, 90, 0.08)' : 'rgba(255, 255, 255, 0.035)'
    ctx.fill()
    ctx.lineWidth = tile.fresh ? 3 : 1.5
    ctx.strokeStyle = tile.fresh ? GOLD : INK_800
    ctx.stroke()

    const pad = 26
    ctx.fillStyle = INK_300
    ctx.font = `500 26px ${FONT}`
    ctx.fillText(fit(ctx, tile.name, width - pad * 2), x + pad, y + 50)
    ctx.fillStyle = tile.fresh ? GOLD : INK_50
    ctx.font = `700 54px ${FONT}`
    ctx.fillText(tile.load, x + pad, y + 126, width - pad * 2)
    ctx.fillStyle = INK_500
    ctx.font = `400 24px ${FONT}`
    ctx.fillText(tile.detail, x + pad, y + 170, width - pad * 2)
  })

  const rest = args.tiles.length - TILES
  ctx.fillStyle = INK_500
  ctx.font = `600 28px ${FONT}`
  ctx.fillText('LiftOS', left, H - 80)
  if (rest > 0) {
    ctx.textAlign = 'right'
    ctx.font = `400 28px ${FONT}`
    ctx.fillText(`and ${String(rest)} more on the wall`, W - left, H - 80)
    ctx.textAlign = 'left'
  }
  return toPng(canvas)
}

/** A name cut with an ellipsis to fit a width. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}
