import type { Look } from '@/domain/settings/settings'

/*
 * The status bar's colour for each page. The meta tag cannot read a CSS
 * token, so these repeat the grounds in `index.css` and `look-terminal.css`.
 */
const TERMINAL_GROUND = '#000804'
const CLASSIC_GROUND = '#0a0c0d'
const BLACK_GROUND = '#000000'

/**
 * Puts the look on the root as one attribute, and moves the theme colour
 * with it. **Every terminal rule is scoped to `:root[data-look='terminal']`**,
 * so classic is the absence of the attribute and draws exactly as before.
 * Pure black is a classic background, so it only applies there.
 */
export function applyLook(root: HTMLElement, look: Look, trueBlack: boolean): void {
  const black = look === 'classic' && trueBlack
  if (look === 'terminal') root.dataset.look = 'terminal'
  else delete root.dataset.look
  if (black) root.dataset.black = ''
  else delete root.dataset.black
  root.ownerDocument
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      look === 'terminal' ? TERMINAL_GROUND : black ? BLACK_GROUND : CLASSIC_GROUND,
    )
}
