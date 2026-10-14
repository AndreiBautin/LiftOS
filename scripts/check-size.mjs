// Fails the gate when the entry chunk grows past its budget.
//
// The entry chunk is everything a cold start downloads and parses before
// the first screen — Lighthouse's first paint on a phone moves with it.
// It was 522 kB and is 355 kB (111 kB gzip) after moving the cards, the
// player and the occasional tools out; the budget sits a little above so
// an ordinary feature fits and a new eager import of a whole screen fails
// here with a number, rather than on somebody's phone with none.
//
// Raise it deliberately, in the same commit as the reason, and record the
// new size in docs/PERFORMANCE.md.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_GZIP_KB = 120

const dir = 'dist/assets'
const entry = readdirSync(dir).find((name) => /^index-.*\.js$/.test(name))
if (entry === undefined) {
  console.error('check-size: no entry chunk in dist/assets — run the build first.')
  process.exit(1)
}
const gzipKb = gzipSync(readFileSync(join(dir, entry))).length / 1024
const line = `entry chunk ${gzipKb.toFixed(1)} kB gzip (budget ${String(BUDGET_GZIP_KB)} kB)`
if (gzipKb > BUDGET_GZIP_KB) {
  console.error(`check-size: ${line} — over budget. See docs/PERFORMANCE.md.`)
  process.exit(1)
}
console.log(`check-size: ${line}`)
