// Prints every built JS chunk with its raw and gzipped size, largest first.
// Run after `pnpm build`: `node scripts/chunk-sizes.mjs`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dir = 'dist/assets'
const rows = readdirSync(dir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => {
    const bytes = readFileSync(join(dir, name))
    return { name, raw: bytes.length, gzip: gzipSync(bytes).length }
  })
  .sort((a, b) => b.raw - a.raw)
const kb = (n) => `${(n / 1024).toFixed(1)} kB`
for (const row of rows)
  console.log(`${kb(row.raw).padStart(9)} ${kb(row.gzip).padStart(9)}  ${row.name}`)
