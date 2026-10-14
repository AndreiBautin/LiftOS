// Fails the gate when the built page loses its Content Security Policy,
// or gains an inline script the policy would block.
//
// The policy is added by a build plugin (vite.config.ts), so nothing in
// the source shows it is missing: a renamed plugin or a reordered config
// would ship a page with no policy and every screen still working. That
// is the failure this exists for — the absence is silent.
import { readFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)
const fail = (why) => {
  console.error(`check-csp: ${why}`)
  process.exit(1)
}

if (meta === null) fail('dist/index.html has no Content-Security-Policy meta tag.')
const policy = meta[1].replaceAll('&#39;', "'")
for (const required of ["script-src 'self'", "object-src 'none'", "base-uri 'self'"]) {
  if (!policy.includes(required)) fail(`the policy is missing ${required}.`)
}
if (
  /'unsafe-(inline|eval)'/.test(
    policy.split(';').find((d) => d.trim().startsWith('script-src')) ?? '',
  )
)
  fail('script-src allows unsafe-inline or unsafe-eval.')
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) fail('dist/index.html has an inline script.')
console.log('check-csp: policy present, scripts are files only')
