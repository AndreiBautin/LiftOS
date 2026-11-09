// Fails the gate when what a cold start downloads grows past its budget.
//
// That is the entry chunk and every chunk `index.html` preloads with it, which
// Lighthouse's first paint on a phone moves with. **It used to read the entry
// chunk alone, which measured where the bundler drew a line rather than what
// a phone fetches.** The overhaul reached that when the entry read 176 kB
// against a budget of 120 while the cold start had in fact fallen, from 194 kB
// across nine files to 182 kB across three: nothing had grown, the shared
// chunks had just folded into the entry. The budget sits a little above so an
// ordinary feature fits and a new eager import of a whole screen fails here
// with a number, rather than on somebody's phone with none.
//
// Raise it deliberately, in the same commit as the reason, and record the
// new size in docs/PERFORMANCE.md.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_GZIP_KB = 200

const html = readFileSync(join('dist', 'index.html'), 'utf8')
const scripts = [
  ...html.matchAll(/<script[^>]*\ssrc="[^"]*?(assets\/[^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="[^"]*?(assets\/[^"]+\.js)"/g),
].map((match) => match[1])
if (scripts.length === 0) {
  console.error('check-size: no scripts in dist/index.html — run the build first.')
  process.exit(1)
}

const gzipKb =
  scripts.reduce((sum, file) => sum + gzipSync(readFileSync(join('dist', file))).length, 0) / 1024
const line = `cold start ${gzipKb.toFixed(1)} kB gzip across ${String(scripts.length)} files (budget ${String(BUDGET_GZIP_KB)} kB)`
if (gzipKb > BUDGET_GZIP_KB) {
  console.error(`check-size: ${line} — over budget. See docs/PERFORMANCE.md.`)
  process.exit(1)
}
console.log(`check-size: ${line}`)
