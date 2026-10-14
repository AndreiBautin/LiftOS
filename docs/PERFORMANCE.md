# Performance

Measured with `pnpm build && node scripts/chunk-sizes.mjs` (raw / gzip).
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

- **The date index.** `by-date` already existed and `recent` and `inRange`
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
