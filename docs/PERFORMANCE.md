# Performance

Measured with `pnpm build && node scripts/chunk-sizes.mjs` (raw / gzip).
`pnpm size` (part of `pnpm verify` and CI) fails when the entry chunk
passes 120 kB gzip; raise the budget in `scripts/check-size.mjs` in the
same commit as the reason.
Each change records its before and after; a change that moved nothing is
reverted rather than listed.

| Change                                                                        | Entry chunk         |
| ----------------------------------------------------------------------------- | ------------------- |
| Baseline                                                                      | 522.4 kB / 158.9 kB |
| Home cards below the fold and the session player load on demand               | 386.9 kB / 121.9 kB |
| Palette, Everything sheet and the share renderer load on first use            | 369.4 kB / 115.8 kB |
| GitHub sync engine, the demo fixture and the session draft editor load on use | 355.2 kB / 111.3 kB |

What is left in the entry chunk is mostly framework: React DOM, React
Router, TanStack Query and the IndexedDB layer the first screen reads
through. The hero, the plan and the week stay eager because they are the
first screen on a phone. The session report stays eager on purpose: it is
entered through a view transition run inside `flushSync`, and a lazy
component would suspend in the middle of it.

## Cold start

Timed with `scripts/measure-start.html` against the production demo build
on a desktop: the fastest of fifteen loads, to the hero and to every card.

| Change                                                               | Hero   | All cards |
| -------------------------------------------------------------------- | ------ | --------- |
| Baseline                                                             | 102 ms | 452 ms    |
| Dates formatted through cached formatters (`src/lib/format-date.ts`) | 77 ms  | 416 ms    |

`toLocaleDateString` with options builds a new `Intl.DateTimeFormat` per
call — 0.26 ms each, against 0.002 ms reusing one. The training grid made
several hundred per render. A lint rule now refuses the call with
arguments.

**Tried and reverted:** starting the Home card chunks' download as the
page module loads, rather than on first render. On localhost it made
both numbers worse (hero 135 ms, cards 523 ms) — the downloads cost
nothing and their evaluation competed with the hero. It may help on a
slow network; that was not measured.

## Lighthouse (mobile, the demo build)

`npx lighthouse@12.6.1 <url>/today --only-categories=performance
--form-factor=mobile` against `pnpm preview` of the demo build.

| Change                                                                                | Score | FCP   | LCP   | TBT        | CLS   |
| ------------------------------------------------------------------------------------- | ----- | ----- | ----- | ---------- | ----- |
| Baseline                                                                              | 52–54 | 3.3 s | 4.0 s | 320–360 ms | 0.424 |
| The first paint waits for the hero's own data; the notice strip never animates from 0 | 75–78 | 3.3 s | 4.0 s | 170–250 ms | 0     |
| Both fonts preloaded from the HTML (`preloadFonts` in `vite.config.ts`)               | 75–77 | 2.8 s | 4.0 s | —          | 0     |

**On the live site** (`https://andreibautin.github.io/LiftOS/`, 2026-10-14,
after the change above): **87–91**, FCP 2.5 s, LCP 2.9 s, TBT 140–160 ms,
CLS 0. With the fonts preloaded: **90**, FCP 2.3 s, LCP 2.8–2.9 s,
TBT 110–200 ms, CLS 0. Every deploy now records its own run in the
workflow summary (report-only — the shared runner is slow and noisy; its
first reading was 61 with 2.4 s of blocking time). Localhost reads lower because `vite preview` serves the chunks
uncompressed; GitHub Pages compresses them. The chunks already download in
parallel through module preload — no waterfall to break up. A cold deep
link such as `/today` answers 404 with the app shell as the body (the
deploy copies `index.html` to `404.html`), so Lighthouse refuses it;
measure from the root.

The layout shift was the hero sliding down twice: once as the notice
strip above it grew from a height measured while it was still hidden,
and once as the session's name, description and medallion arrived after
it had painted. Found by recording `layout-shift` entries with their
sources in headless Chrome at a 4× CPU slowdown — Lighthouse names the
element that moved, never what moved it.

## In a session

Timed in headless Chrome at a 4× CPU slowdown against the demo build,
from the tap to the next screen, medians of five or six:
`PUPPETEER_CORE=<installed puppeteer-core> node scripts/perf/measure.mjs <preview url> [shifts|start|finish|all]`
(puppeteer-core is installed outside the repository; the script says why).
Absolute numbers move with whatever else the machine is doing; compare a
change against a build without it, run back to back.

| Moment                         | Before  | After                                                       |
| ------------------------------ | ------- | ----------------------------------------------------------- |
| Start → the player's first set | ~630 ms | unchanged — browser layout of the player, no script hotspot |
| Finish → the report            | ~2.1 s  | ~0.29 s                                                     |

Finishing refetched the active workout, which came back empty before the
report was set, so Today built its whole dashboard in between — sixteen
cards and a 440 ms forced layout — only to swap it out. The player now
stays on screen until the report replaces it (`finishing` in
`HomePage`).

**Tried and reverted:** prefetching the player's chunk when Today goes
idle. Start → player moved 635 → 605 ms, inside the noise; on localhost
the chunk was never the cost.

## Reads

Counted on a cold load of Today with the demo (78 sessions), by wrapping
IndexedDB's `getAll`, `openCursor` and `IDBCursor.continue`.

| Change                                                  | Requests | Workout records read |
| ------------------------------------------------------- | -------- | -------------------- |
| Baseline                                                | 31       | 883                  |
| The workout history is read once and held until a write | 8        | 78                   |

Every card asked the repository its own question and each walked the
store, so one session was deserialized about eleven times per load. The
snapshot lives in `workoutSnapshots` (`infrastructure/db/database.ts`) and
is dropped by every write path; `repositories.test.ts` reads, writes and
reads again for each of them.

## Checked and left alone

- **Splitting Today's first render.** Mounting all but the first three
  cards in a transition, to break up the longest task, did not measurably
  lower blocking time and was reverted; live TBT is already 140–160 ms.
- **Settings.** Its 1.6 s at a 4× slowdown is layout, with one forced
  layout from the section chips that paint would have paid anyway.

- **The date index.** `by-date` already existed and `recent` and `inRange` (since removed, unused)
  already used it.
- **The clocks in the player.** The elapsed time, the rest timer and the
  set clock each tick in their own leaf component, so a tick re-renders
  only itself.
- **Fonts.** Both faces are Latin-only woff2 with `font-display: swap`
  and are precached, so an installed copy never fetches them; a preload
  would help only the first visit.
- **Long lists.** History folds at eight and the crest wall is a month at
  a time; nothing on screen is long enough to need windowing.
- **Paint cost** of the five-layer card and the grain texture on a
  mid-range phone was **not measured** — there is no such phone here.
