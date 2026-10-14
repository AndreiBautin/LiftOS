// Times the moments docs/PERFORMANCE.md reports, in headless Chrome at a
// 4x CPU slowdown — a mid-range phone, roughly.
//
//   pnpm exec vite build --mode demo && pnpm preview --port 5185
//   node scripts/perf/measure.mjs [http://localhost:5185] [shifts|start|finish|all]
//
// shifts  layout shift on a cold load of Today, with what moved
// start   Start session -> the player's first control (median of 5)
// finish  Finish -> the report (median of 5)
//
// Chrome is found at CHROME_PATH, else the usual Windows, macOS and Linux
// places. Each run is a fresh profile, so the demo seeds itself first.
//
// **puppeteer-core is not a dependency of this repository, deliberately.**
// It was, for one commit, and its download helpers pulled in packages with
// high-severity advisories and no patched release — which fails the audit
// gate for a script nothing ships. Install it somewhere of its own and
// point at it:
//
//   npm install --prefix ~/.cache/liftos-perf puppeteer-core@24
//   PUPPETEER_CORE=~/.cache/liftos-perf/node_modules/puppeteer-core node scripts/perf/measure.mjs
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const where = process.env.PUPPETEER_CORE
if (where === undefined) {
  console.error('Set PUPPETEER_CORE to an installed puppeteer-core (see the top of this file).')
  process.exit(1)
}
const { default: puppeteer } = await import(
  pathToFileURL(`${where}/lib/esm/puppeteer/puppeteer-core.js`).href
)

const base = (process.argv[2] ?? 'http://localhost:5185').replace(/\/$/, '')
const which = process.argv[3] ?? 'all'

const chrome =
  process.env.CHROME_PATH ??
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((path) => existsSync(path))
if (chrome === undefined) {
  console.error('No Chrome found. Set CHROME_PATH.')
  process.exit(1)
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

async function freshPage() {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 412, height: 823, isMobile: true })
  const cdp = await page.createCDPSession()
  return { context, page, slow: () => cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }) }
}

async function openToday(page) {
  await page.goto(`${base}/today`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => document.body.innerText.includes('Start session'), {
    timeout: 60_000,
  })
}

const press = (page, pattern, scope = 'button') =>
  page.evaluate(
    (source, selector) => {
      const button = [...document.querySelectorAll(selector)].find((one) =>
        new RegExp(source).test(one.textContent.trim()),
      )
      button?.click()
      return button !== undefined
    },
    pattern,
    scope,
  )

async function shifts() {
  const { context, page, slow } = await freshPage()
  await slow()
  await page.evaluateOnNewDocument(() => {
    window.__shifts = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__shifts.push({
          value: +entry.value.toFixed(3),
          moved: entry.sources.map((source) =>
            String(source.node?.className || source.node?.nodeName || '').slice(0, 60),
          ),
        })
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await openToday(page)
  await new Promise((resolve) => setTimeout(resolve, 3000))
  const found = await page.evaluate(() => window.__shifts)
  await context.close()
  const total = found.reduce((sum, entry) => sum + entry.value, 0)
  console.log(`layout shift ${total.toFixed(3)}`)
  for (const entry of found.filter((one) => one.value > 0.001)) {
    console.log(`  ${String(entry.value)}  ${entry.moved.join(' | ')}`)
  }
}

async function startToPlayer() {
  const { context, page, slow } = await freshPage()
  await openToday(page)
  await slow()
  const ms = await page.evaluate(async () => {
    const start = [...document.querySelectorAll('button')].find(
      (one) => one.textContent.trim() === 'Start session',
    )
    const t0 = performance.now()
    start.click()
    while (!document.querySelector('.session-player button')) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    return Math.round(performance.now() - t0)
  })
  await context.close()
  return ms
}

async function finishToReport() {
  const { context, page, slow } = await freshPage()
  await openToday(page)
  await press(page, '^Start session$')
  await page.waitForFunction(() => document.querySelector('.session-player button') !== null)
  await press(page, '^Mark all done$', '.session-player button')
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.session-player button')].some((one) =>
      /^Finish/.test(one.textContent.trim()),
    ),
  )
  await slow()
  const ms = await page.evaluate(async () => {
    const finish = [...document.querySelectorAll('.session-player button')].find((one) =>
      /^Finish/.test(one.textContent.trim()),
    )
    const t0 = performance.now()
    finish.click()
    while (!/session complete/i.test(document.body.innerText)) {
      if (performance.now() - t0 > 20_000) return -1
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    return Math.round(performance.now() - t0)
  })
  await context.close()
  return ms
}

async function repeat(label, run) {
  const times = []
  for (let index = 0; index < 5; index += 1) times.push(await run())
  console.log(`${label} median ${String(median(times))} ms  (${times.join(', ')})`)
}

if (which === 'shifts' || which === 'all') await shifts()
if (which === 'start' || which === 'all') await repeat('start -> player', startToPlayer)
if (which === 'finish' || which === 'all') await repeat('finish -> report', finishToReport)
await browser.close()
