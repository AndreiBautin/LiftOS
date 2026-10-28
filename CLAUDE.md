# Working on LiftOS

A client-only React + TypeScript PWA: **a workout tracker.** A derived
programme, double progression that moves the bar for you, self-adjusting
deloads, a session player, history and plain strength standards. **No
server of ours, and no database of ours.** Persistence is IndexedDB
behind a repository interface; the only outbound host is GitHub, when
sync is connected. See [docs/PERSISTENCE.md](docs/PERSISTENCE.md).

**It was called LifeOS, and before that Lift.** Renamed with the repo,
so the site is `/LiftOS/` — asked for as _"rebrand it since it's liftos
now not lifeos"_. **The storage addresses were deliberately not
renamed**: the IndexedDB name `lifeos`, the `lifeos` / `lifeos.demo`
key prefix, `BACKUP_MAGIC` `lifeos.backup` and the sync file
`lifeos-sync.json`. An address is not a label — renaming one opens a
fresh empty store beside the old rather than migrating anything, which
would have wiped every device. The labels moved: the title, manifest,
build line, sync commit message and the export filename
(`liftos-backup-…`). The origin did not change, so data survives the
URL moving; an installed copy has to be re-added from the new URL.

**There is no gamification, and the history of it lives in
[docs/HISTORY.md](docs/HISTORY.md).** Two cuts, asked for in turn:
_"fully lean into this simply being a gamified workout tracker"_ removed
every area that was not training, then _"let's actually go ahead and drop
the gamification aspect and keep it to a workout tracker"_ removed the
game itself. The paragraphs about the life hub (XP, traits, the arc,
quests, Base, finance, the Codex, the map, buffs, dailies, the job search
and the rest) and about the Firebase era were moved there verbatim on
2026-10-14, because this file is loaded into every session and none of
them described code that exists. **Read HISTORY.md before reintroducing
anything it names** — the reasoning for why each went is there.

A few mentions of those features remain below where a current rule's
reason is tied to them; read those as history too.

- **The swings close every session as a tracked, timed EMOM**
  (`plannedEmom`, `nextEmom`, `deloadEmom`, `emomAt` and
  `emomCuesBetween` in `domain/programs/emom.ts`, tested; the `emom` rep
  target; `SWINGS` on every routine; `EmomTimer` in place of the set clock).
  **The rule, as it now stands**: ten minutes always, a rep on the minute a
  week from 10 to 30, then ten pounds on the bell and back to 10 — _"the
  only thing we progress is reps up to 30, then up the weight and
  reprogress"_. It climbed the minutes too for a few hours, and the deload
  was first a quarter off the bell, then a cut in reps; it is **the 30 lb
  bell at the same reps** — _"i have a 30lb one"_: a kettlebell is the
  bells on the floor, not any load the plates make. **It moves once a
  calendar week, not once a session**; a deload is read past like the
  lifting's. **One row, logged once** — the bell as the load, the reps on
  the minute as the reps — and **the timer logs it** when the last minute
  ends (_"add some sort of emom timer into the app so its not a single
  checkmark"_): a five-second count-in, each minute counted down, a tick in
  its last three seconds and a go at the top of the next, read from an
  absolute start and cued by crossing so a locked phone loses no time and
  never fires a burst. Its sounds play whatever the rest-sounds setting
  says, because the timer is started on purpose. **Checked by moving the
  page's clock**, not by waiting ten minutes: minute 3 read correctly and
  the end logged the set once; the sounds were not heard (the agent's pane
  plays none). It resets if the card is paged away from mid-EMOM. The
  template plans the start and Start climbs it from history
  (`workingLoads`). Tonnage counts every minute. **Records and the bests
  wall read it as a 60 × 10 set** — a heavier bell is a real record, the
  estimated max beside it means nothing.
- **The Strength card and the hero's total read what the sessions
  measure** (`measuredMaxes` in `domain/strength/trend.ts`, tested;
  `isDeloadSession` in `features/train/hooks.ts`). Asked for as _"why
  can't it just be inferred from the most recent session of that lift?
  (unless deload of course)"_. Each lift is its most recent finished
  session's reliable estimate, **a deload session skipped** — read off
  the session's own `position` against the programme's weeks, the
  muscle-year rule — and the stored `estimatedMaxes` stand in only for a
  lift no session has measured. **The stored max is not gone**: it is
  still what a first session is planned from, Settings still edits it,
  and the session report still offers to move it. What went is the
  card's "Your sessions measure N · Use it" row, which left the total a
  tap behind every session. `GoalsCard` already read the trend's last
  point; the trend chart itself still plots deloads, being history.
- **A repeated set is read with reps in reserve** (`inferredReserve` and
  `E1rmEstimate.reserve` in `domain/strength/one-rep-max.ts`, tested).
  Asked for as _"if I can repeat an effort 3/4 times, that doesn't
  represent a max effort lift"_. Every formula assumes the set went to
  failure, and double progression never asks for that: 100 x 10 four
  times reads as 100 x 10 to failure and under-reads the max. A set is
  credited by the **share** of the other completed sets that held it
  (same load, at least as many reps), scaled to `MAX_INFERRED_RESERVE`
  (3) and rounded down, and estimated as the set it would have been
  taken to failure (100 x 13). **A share, not a count**: it was one rep
  per matching set, so when the leg compounds went from four sets to
  two the same clean work read one rep of reserve instead of three and
  the total fell on a session that hit its progression. A top set the later sets fell off from is read as given,
  so a hard triple still beats three easy tens. **Applied in
  `bestEstimate`**, which the report, the exercise page, the trend and
  the forecast all read, and in the records wall's own loop; the
  calculator takes one set and credits nothing. `isReliable` judges the
  reps done, not the reps credited. The report marks a credited
  estimate with a dagger and says why. The demo's lifts are exact
  straight sets, so every demo estimate rose by three reps' worth and
  the Strength card now offers "Your sessions measure" against the
  seeded maxes; that is the rule reading the seed truthfully.
- **Gone with the game:** `domain/game`, `domain/review`, the
  character and review use cases, `features/character`, the XP toast,
  and the `metrics` and `reviews` stores (cleared at `DB_VERSION` 25,
  out of backup, sync and tombstones). The other retired stores were
  cleared at 24.
- **Strength standards are plain numbers** (`domain/strength/
standards.ts`): the estimated max, its multiple of bodyweight, and the
  next published multiple with the load that reaches it, rounded up to
  five. No rank names — the multiples are external and fixed, which is
  the only reason they are worth showing. **Each lift has a bar again**,
  running from the standard `reached` to the `next` one, in the colour
  the strength-over-time chart gives that lift: a bar between two
  published multiples measures against a scale the app cannot move,
  which a bar to the game's next rank did not.
- **The training grid counts working sets per day**
  (`application/use-cases/training/activity.ts`), finished sessions
  only, with fixed bands (1, 10, 20, 30) rather than a share of the
  busiest day. It was the XP tally cut by day; the work was always the
  honest quantity underneath.
- **One page, no navigation.** Asked for as _"lets just condense this
  into one page without a navbar"_. `HomePage` is the session player
  while a workout is open and the whole app otherwise; Program and
  Settings are links from it and `PageHeader` gives both a Back link.
  `/train`, `/history` and every removed path redirect to `/today`,
  because a PWA shortcut outlives the screen it named. The history list
  shows the newest eight and folds the rest.
- **Settings has a health check** ("Health check" under Your data,
  `DataHealth`; `dataHealth` in `domain/logging/health.ts`, tested):
  sessions, working sets, abandoned and the first and last day, then
  either "Everything checks out" or what looks wrong — a session left
  open over a day (or a second one open), a copy of a session (same start
  time and title; which of two identical records is "the copy" is decided
  by id order, since neither is more real), a finished session with no
  set done, and sets under an exercise the library does not know. **Each
  fix is an operation the app already has** — abandon for left open,
  delete (tombstone and all) for copies and empty records — run one
  after another and asked once. An unknown exercise is reported only: the
  sets are real. Checked by planting a copy in the demo: found, asked,
  deleted, and the original kept.
- **Plates are counted by the pair** (Settings → Units → "How many of
  each?", `PlatePairs`; `settings.platePairs`, in the parse with a test;
  `Rack` and `rackFor` in `domain/units/plates.ts`, tested). Unset is any
  number; a count caps how many of that plate one side takes, in the
  heaviest-first pass and in the exact search — so 315 with one pair of
  45s loads 45 · 35 · 35 · 10 · 10. **The exact search now ties
  heaviest-first**: the fewest plates first, then, among combinations
  that many, the one with the heaviest plates earliest (a depth-first walk
  down the sizes), because the old pass returned 35 · 35 · 25 where a
  lifter loads 45 · 25 · 25. `available` on `platesFor`, `warmupRamp`,
  `nearestLoadable` and `PlateLoader` takes a `Rack` — a plain list still
  works — and every screen builds one with `rackFor(settings.plates,
unit, settings.platePairs)`. Checked: one pair of 45s in Settings and
  the palette's 315 drew the lighter loading.
- **A session can be moved within its week** ("Move" beside the week
  name on the hero, `MoveSession`; `moveSession`, `liveMoves` and the
  `moves` argument of `sessionOn` in `domain/programs/schedule.ts`,
  tested in `day-moves.test.ts`; `settings.dayMoves`, in the parse with a
  test). A chip per day from today to Sunday; a day already holding a
  session swaps with it. **Stored per day** — "this day holds that day's
  session", or `null` for none — so a move names dates and lapses with
  them, and the routine is untouched. A moved session keeps its week, day
  and title and is dated where it sits, so `adherence`'s by-title match
  still counts it. **`sessionOn` is the one place moves are read**, and
  `sessionFrom`, `weeksAhead`, `scheduleFor`, Start, the preview, the
  runway, the calendar export and the adherence card all pass them
  through. A move across weeks is refused. Checked: Upper moved onto
  Tuesday swapped with Legs A on the hero, the plan card and the runway,
  and Put the week back restored it.
- **A step too big for the bar offers a smaller one** ("The next step"
  on the exercise page, `StepCard`; `stepJump`, `smallerStep`,
  `defaultStepFor` and `withLoadSteps` in `domain/programs/load-steps.ts`,
  tested; `settings.loadSteps`, in the parse with a test). Past
  `BIG_JUMP` (10%) — five pounds on a 20 lb lateral raise is 25% — a
  ruler draws today's load, the half step and the usual step, and offers
  the half. **Offered, never applied**: only the lifter knows whether the
  gym has the plates or the dumbbells. **The step reaches every plan
  through the exercise library**: `withChosenSteps` in `di.ts` wraps the
  exercise repository and sets `Exercise.loadStep`, which `stepFor`
  already honoured — so Start, the preview, Repeat, templates, an added or
  swapped exercise, the ladder and the debrief all read it without each
  being taught. The card stays while the smaller step is in use, to put
  it back. Checked by pressing it: the card read the 2.5 back through the
  library, and reverting cleared the setting.
- **Every muscle across a year** (`/muscles`, `/muscles/:year`,
  `MuscleYearPage`; `muscleYear` in `domain/volume/muscle-year.ts`,
  tested; "Muscles by week" in `SCREENS`): a row a muscle, a cell a
  calendar week, lit in four steps of the accent against the year's
  busiest muscle-week, with the muscles never trained named under it.
  Counted by `loggedVolume`, so a cell agrees with that muscle's page.
  Weeks run from the week holding January 1st (which may start in
  December) to the week holding today or December 31st. **Deload weeks
  are ringed in violet, found from each session's own `position`** rather
  than from today's block, so a past deload stays marked after the block
  moves. **The demo's sessions carry no position**, so the demo shows no
  rings; checked by planting a deload position on one session, then
  removing it. Rings sit over the cells: drawn under them they vanished.
- **A session can be kept by name and started again** ("Keep this
  session" at the foot of a past session's page, `KeepSession`; the
  "Saved sessions" home card, `SavedSessionsCard`; `templateFrom`,
  `entriesFromTemplate` and `isPlausibleTemplate` in `domain/logging/
template.ts`, tested; `startFromTemplate` beside `repeatSession`,
  tested). **The shape, never the results**: exercises in order with
  their prescribed sets, what was done rather than what was planned (an
  entry skipped entirely is left out). Started, it opens at **today's**
  loads through the same `openAgain` build Repeat uses, so a template
  never carries a stale weight. **A copy, not a pointer** — deleting the
  session it came from leaves it standing (tested). Kept in
  `settings.templates`, in the parse with a test, each template read as
  `unknown` and dropped whole if its shape fails; settings travel in the
  backup and the sync file, so templates do too. The card draws each as a
  strip of movement glyphs and asks once before removing.
- **A failed read says what failed** (`ReadFailure` in the shell,
  `failureSubjects` in `features/errors/subjects.ts`, tested): "Couldn't
  load your sessions and the programme" rather than "2 things could not
  be loaded", named from the head of each failed query key (an unknown
  key reads as "some of your data", never its internal name), with Try
  again refetching only what failed. Every failed read also logs
  `read.failed` with the subject and the error's name — never its
  message — through a `QueryCache` `onError` in `providers.tsx`. Checked
  by making IndexedDB `get` throw in the preview: the banner named your
  sessions, the log line landed, and Try again recovered the page once it
  was restored. **Add a subject when a new query-key head appears.**
- **A load the plates cannot make offers the nearest they can**
  (`nearestLoadable` in `domain/units/plates.ts`, tested): under the
  weight in the set editor for a barbell or EZ-bar exercise, and under
  the palette's bar picture, "The plates make 225 lb · 230 lb", a tap
  each. Loadable means what `platesFor` draws with nothing over, so a
  tapped load always draws clean. **Building it found `platesFor`
  greedy**: with no 5s it read 95 a side as 45 + 45 and five over, when
  45 + 25 + 25 makes it; a leftover now asks for the fewest plates that
  make the side exactly (counted in the plates' common divisor), and
  only a load nothing can make keeps its leftover. Checked in the preview:
  217 offered 215 and 220 and a tap set 215; the palette's 227 offered
  225 and 230.
- **Each lift is read then and now** ("Then and now", `ThenNowCard`;
  `thenAndNow` in `domain/logging/then-now.ts`, tested): the lift's **own**
  first four weeks against the last four — top set (`topSet`'s rule),
  sessions a week and volume a week — as a ghost bar behind a solid one,
  each scaled to the lift itself so a curl and a deadlift both fill their
  row. Four weeks each side so "a week" means the same in both; a lift
  whose first month runs into its last is left out rather than compared
  with itself. Competition lifts lead, then the most trained, five rows.
- **The records wall and the year share as pictures** (Share on
  `/records` and `/year/:year`; `drawWallCard` in `features/share/
wall-card.ts`, `drawYearCard` in `year-card.ts`): the wall's tiles,
  twelve of them three across, gold-edged where the best is from this
  week, and the year as twelve small calendars four across, lit in the
  training grid's bands, days to come left out. **The sheet is
  `SharePicture` now** — `ShareSession` is it with the session card's
  drawing — so every picture is shown before it goes anywhere, with
  Share only where the platform can send a file. The canvas, the ground
  and the PNG are `shareCanvas`, `paintBackground` and `toPng` in
  `session-card.ts`. Checked by drawing both in the preview and looking
  at them; the share sheet itself still cannot be driven there.
- **A set can carry a niggle** (`LoggedSet.niggle`; `niggles.ts` in
  `domain/logging`, tested): "Flag a niggle" in the set editor asks which
  joint — neck, shoulder, elbow, wrist, lower back, hip, knee, ankle —
  and the row reads "Logged · Knee niggle". **Joints, not muscles**,
  because that is how it is said and what aches is rarely the muscle a
  lift is for; `NIGGLE_MUSCLES` maps each joint to the muscles whose work
  loads it. Three weeks of them (`recentNiggles`) show as still amber
  rings on the body map (both sides — side is not recorded) with a line
  naming them, as a card on each muscle page the joint reaches, and
  under a **stalled** lift that had one, as alternatives for the same
  muscle — a swap **for the next session only** through the session
  draft when that session holds the lift, links otherwise. It records
  and reports; it diagnoses nothing. `SetResult.niggle` follows the
  note's rule: given replaces, `null` removes, absent keeps (tested).
  Checked by tagging a set in a real editor and reading it back from
  IndexedDB; **the swap buttons were not pressed** — the demo's stalled
  lift in tomorrow's session (lateral raise) has no alternative.
- **The report ends its hero on three plain lines** (`Debrief`;
  `debrief` in `domain/logging/debrief.ts`, tested): what moved past last
  time, what matched or came in under, and what the bar does next time —
  up a step, the same bar again after a short set, or (most sessions) the
  same bar and a rep more. **Every judgement is one another screen
  makes**: moved and held are `versusLast` on top sets against
  `previousTopSet`, next time is `ladderState`, so the debrief cannot call
  a lift moved that the list beneath calls matched. A first session of an
  exercise is left out of the first two lines. Checked by driving a
  session to the report; its hero figures read mid-count there, which is
  `useCountUp` in the hidden pane, not the stored session (16 sets, read
  back from IndexedDB).
- **The competition lifts forecast twelve weeks out** ("Twelve weeks
  out", `ForecastCard`; `forecastLift` and `forecastTotal` in
  `domain/strength/forecast.ts`, tested): each lift's last twelve weeks as
  a line up to today, then a cone — the line carried forward inside a
  band that widens with distance — and the total read against the
  published total standards. **The fit is `fitTrend`'s**, the line the
  Strength card's "at this rate" date reads, so the two cannot disagree.
  The band is about two standard errors of prediction **with a floor that
  grows a quarter of a percent a week**: the demo's sessions sit exactly
  on a line and the residuals alone drew the forecast as a thread. A
  falling lift forecasts falling rather than going quiet; thin evidence
  (fewer than four sessions over four weeks) silences it. The total's
  band combines the three as independent errors, and is absent unless all
  three lifts have a forecast.
- **A card says how the block has followed the plan** ("Showing up",
  `AdherenceCard`; `adherence` in `domain/programs/adherence.ts`, tested):
  a punch card, a row a week and a hole a scheduled day — punched where
  done, torn amber where its day went by, ringed for today, faint ahead,
  the deload row violet — with full weeks in a row above and missed days
  by name below. Weeks past the next fold into one line. **It asks
  `sessionOn`**, so a missed day is one the app offered, and **matches by
  title within the week** (`doneTitles`' rule): Monday's session done on
  Friday is Monday done. A session with no scheduled title is `extra`,
  never a make-up. The running week does not break the run until a day
  in it is missed. **The missed state was checked by tests, not on
  screen** — the demo has no missed day this block.
- **The next session can be edited before it starts** (Edit on the
  session plan card, `SessionDraftEditor`; `applyDraft` and friends in
  `domain/programs/session-draft.ts`, tested; `settings.sessionDraft`, in
  the parse with a test). Swap an exercise for another of the same
  muscle, move one up or down, drop one — **this session only**: the
  routine is untouched, and the draft is cleared on Start. **Keyed by the
  day it was made for and by slot id**: a draft for Monday is ignored on
  Wednesday, and slot ids are stable because the program is derived
  deterministically. It is applied to the day **before** the session is
  built, in both `startWorkout` and `previewWorkout`, so the plan card
  and Start cannot disagree — `training-flow.test.ts` holds them equal.
  Warm-ups stay first and are not editable; a muscle with one exercise
  shows its name rather than a menu of one. A swap plans from its own
  history, as at Start. The parse takes a draft whole or not at all — a
  half-read one could drop the wrong exercise.
- **Gym mode** (`settings.gymMode`, in the parse with a test; Settings →
  During a session): the session player and the rest timer (both
  `.session-player`) read at arm's length — `--text-*` and the two dim
  inks redefined inside that scope, since Tailwind's utilities read the
  theme variables, so every size grows and every grey brightens with the
  layout untouched (a set row's headline 16 → 20 px, no overflow at 375).
  **Not `zoom`**, which widens the page past a phone. At the larger size
  the session bar's title truncates and the tempo chips stack; both still
  work.
- **Sync says how it is doing** (`SyncBadge` under the hero's header,
  `agoLabel` in `domain/time/ago.ts`, both tested — the badge through a
  pure `SyncBadgeView`): a green cloud and "4m" since the last round, an
  accent "Syncing", or **"Sync failed" in words** with the reason in its
  name — finding out from data missing on the other device was the
  alternative. A press asks for a round now. **Drawn only when a
  repository is connected**, on a row of its own: the header has about
  130 px beside the wordmark at 375, less than "Sync failed" with an icon.
  **Not seen in the preview** — the demo never syncs, and pointing it at
  GitHub with a made-up token would have sent a request for nothing; the
  three states are a component test instead.
- **A week plays as a story too** (`/wrapped/YYYY-MM-DD`, any day of it,
  read from its Monday; `periodOf`, tested — a rolled-over date like
  February 30th is refused). **Play** on the Last week card opens last
  week's, matching the card's own figures; inside a single week the
  "biggest week" card is skipped, being the week itself.
- **Dumbbells are drawn too** (`DumbbellPair`, `BeltLoad` in
  `features/train/Dumbbells.tsx`, chosen in `BarSection`): a dumbbell
  exercise shows the pair side by side — hex heads sized by the weight, a
  short knurled handle, set down once — and the load **per hand**, which
  is how a dumbbell set is logged here; a bodyweight movement with weight
  added shows a dip belt and "BW + 25 lb". The first pair had long
  handles and small heads and read as two barbells. **The belt picture
  was not seen**: nothing in the demo plans an added load on a bodyweight
  movement.
- **A card names what the next session is ripe for** (`RipeCard`, home
  card `ripe`; `ripeLifts` in `domain/logging/ripe.ts`, tested): each lift
  whose planned bar is heavier than its last top set, drawn as the old bar
  climbing to the new, and a gold **Heaviest** where that bar beats every
  bar the lift has carried. Read off the session preview, so it names only
  what Start will ask for; silent when nothing moves. **No rep records**:
  double progression plans one rep past last time, so at the top bar
  nearly every lift is a planned rep record every session — the first
  version tagged four of four and said nothing.
- **A rest day's hero says how rested the next session's muscles are**
  (`RestedFor`, from `dayMuscles` in `domain/programs/day-muscles.ts`,
  tested): each muscle the next session trains directly, in session
  order, with a three-cell bar filled by the body map's own bands and
  the days since for a screen reader. **Days since, nothing more** — the
  app measures no readiness and the bar claims none. Only on a rest day:
  on a training day the session is the news, and a rest day's hero had
  nothing to say but "Rest day". Warm-ups and conditioning are left out.
- **History can be read as a wall of crests** (List / Crests on the
  history card, `CrestWall`): every session's crest a month at a time,
  each opening its session, abandoned ones faded. Search and the day
  chips filter the wall as they do the list; the list's fold of eight
  does not apply, because crests are small. **Drawn still** (`still` on
  `SessionCrest`) — eighty crests drawing in at once was noise; one
  crest on a session page still draws itself. The view is not
  remembered: it is a way of looking, opened on purpose.
- **A deload can be skipped from the hero** ("Skip the deload" beside
  the week's name, asked for as _"I'm not feeling the need for a deload —
  can you skip this one"_): the same `jumpToWeek` the Program page's
  picker writes, so the block starts again at week one. **The week that
  becomes week one is the session's, not today's** (`weekIndexToStartOn`
  in `schedule.ts`, tested): on a rest day at the end of a week the hero
  shows Monday's session, and setting _this_ week to the first would have
  put Monday at the second — so it counts back and wraps into the block
  before. The hero dropped its own Deload pill, which repeated the
  week's name beside it; the plan card's pills are capitalised now
  (Deload, Cycle 2).
- **A session with nothing done cannot be filed** (`anythingDone` in
  `SessionPlayer`). An empty open session's only exit was "Finish with
  nothing logged", which filed a blank record — reported with a
  screenshot of a 0-set, 247-minute "Open session" in the history. Both
  that button and the main Finish now read **Discard** when no set has
  been completed (warm-ups count as something) and go through the
  abandon path, which deletes a session with nothing logged. A blank
  record already filed is removed from the history list like any other.
- **The line charts speak one language**: a line draws itself in once
  (`.line-draw`, `pathLength=1`), a gradient wash fades in under it
  (`.area-fade`), and its end point lands after (`.line-end`), staggered
  by `--line-delay` where there are several — on the strength chart,
  the comparison, the staircase, the peek sparkline, the rep curve, the
  goal glide path and the muscle tide. Two private dialects of the same
  effect (`.fan-line-path`, `.peek-line`) are gone. **One lift palette**
  (`LIFT_COLOURS` in `features/charts/palette.ts`) replaced four copies,
  so a squat is the same cyan everywhere. Shapes stay each chart's own —
  the language is the motion and the colour, not a shared component.
- **Every session has a crest** (`sessionCrest` in `domain/logging/
crest.ts`, tested; `SessionCrest` in `features/history`): a ring cut into
  a segment per exercise as long as its share of the working sets — sets,
  not tonnage, or a deadlift takes the ring — in the timeline's colours,
  a tick inside for every set, a gold stud for a record, and the lead
  lift's glyph at the centre. **Turned by an angle hashed from the
  session's id**, so it draws the same every time and two days of the
  same exercises still differ. On the report hero, the session page and
  the share card (drawn again on the canvas with the colours as literals;
  the title wraps short of it). Draws in once. **The report's crest was
  not seen on screen** — it needs a session finished — and shares the
  component and the data with the session page, which was.
- **The loaded bar is drawn as iron** (`PlateLoader`): each plate has a
  raised lip and a darker hub where the sleeve passes, the collars a
  machined ridge, and the shaft knurling (an SVG pattern) on two grip
  stretches either side of a smooth centre. **Plates land with a clunk**:
  they slide on, overshoot the one before by a hair and settle back, once
  per load. **A logged set sweeps** (`SetSweep` in `SetRow`): a band of
  the good colour crosses the row once, mounted with the completion and
  decided in the state initializer to be fresh (three seconds), the
  `RecordBurst` rule, so a revisited exercise does not sweep again — that
  last part follows from the rule and was not re-measured.
- **The hero draws the day** (`HeroBanner`): beside the session's name
  a **medallion of its lead lift** — the competition lift, else the first
  real exercise — its movement glyph tracing itself in once
  (`pathLength=1` and a dash offset, then the head lands), keyed by the
  exercise so a new day draws again; and **This week** leads with a ring
  of segments, one per planned day, lit for each finished. The medallion
  is `role="img"` named "Leads with …", the ring `aria-hidden` beside
  the number it pictures. Reduced motion shows both finished.
- **An exercise wears a glyph of its movement** (`features/glyphs`:
  `glyphFor`, tested; `GLYPH_PATHS`; `MoveGlyph`): eighteen figures
  hand-drawn on a 24 grid — squat, hinge, bench, press, row, pull-up,
  lunge, carry, curl, extension, raise, calf, fly, shrug, core, run,
  warm-up and a plain dumbbell — in the plan, the Program page, the
  library and the player's pills. **By movement, refined by muscle for
  isolation**, which is half the catalogue under one pattern; a warm-up
  is drawn as one whatever it moves, by slug or by role. A test holds
  every glyph drawn and the plain dumbbell rare. **No icon set draws a
  hinge apart from a row**, which is why they are drawn here; they were
  checked at 96 px and 22 px, and the curl and the row were redrawn after
  the first look. Decorative (`aria-hidden`) — the name is always beside.
- **The backdrop follows the time of day** (`skyAt` and `skyPhase` in
  `domain/time/sky.ts`, tested; `.ambient-sky` in `AmbientBackdrop`): a
  glow low on the left at dawn, high and pale by day, low and amber on
  the right at dusk, violet at night — **interpolated between stops**,
  hue turned the short way round, so it drifts rather than switching.
  Read every five minutes and on returning to the app, and eased over a
  minute through four registered properties (`--sky-*`). It sits under
  the season's washes, which still tint it, and goes with them under
  pure black. Only seen in the gutters between cards, on purpose.
- **Three depths, so a screen reads as layered** (`index.css`): the
  hero (`.hero-panel`, loudest, now with a rim of light along its top
  edge), the card (raised), and the **well** (`.well`, sunken — darker
  than its card, shadowed along its top inner edge, a lighter bottom
  lip). Wells replaced seven hand-written `border-ink-800 rounded-xl
border` boxes that each drew a fourth, flat level; **an inset box
  inside a card is a `.well`**. The two raised tiers carry `--grain`, an
  SVG fractal-noise tile rendered once and repeated. **Only the bright
  half of the noise shows** — the first version laid an even white fog
  that greyed the hero's wash. `.card` now has five background layers
  and five `background-clip` entries; they must stay in step, or the
  spotlit border paints the wrong layer.
- **Two faces, bundled** (`@fontsource-variable/inter` and
  `space-grotesk`, declared by hand at the top of `index.css`): Inter for
  reading, with its single-storey a and open digits (`cv11`, `ss01`), and
  Space Grotesk for `h1`/`h2` and **numeric figures from `text-xl` up** —
  the things a glance lands on. **Latin only, declared rather than
  imported**: the packages' own CSS lists every subset, and the service
  worker precaches every woff2 the build emits, so every phone would
  have downloaded Cyrillic and Vietnamese. 70 KB in all. **Display
  figures take proportional digits**: Space Grotesk's tabular 1 grows a
  slab foot that read as another typeface inside "115 lb". The share
  card draws on a canvas with its own literal fonts and is unchanged.
- **A page loads as its shape, not as "Loading…"** (`PageSkeleton`,
  tested): the real header, a hero block and two cards, with one polite
  status. Eight pages drew a header over the word and then snapped a
  screen of content in under the thumb. **Scripted scrolls ask
  `scrollMotion()`** (`lib/motion.ts`): `behavior: 'smooth'` in a script
  overrides the stylesheet's reduced-motion `scroll-behavior: auto`, and
  five did. The year's day squares are `aria-hidden` — 365 lines of "0
  sets" — since the month link and count say the month. An audit script
  (one `h1`, no skipped heading levels, every control and field named,
  every `role="img"` labelled or titled) passed on the thirteen
  screens; an SVG's `<title>` names it, so those are not failures.
- **The newer pages have a desktop shape, from `lg` only.** Measured at
  1400: Settings ran the full 1356 px with toggles at the far edge, and
  the exercise page, the calculator and the month were one 714 px column
  two screens long. Settings is now a 5xl page with the chips as a
  contents list down the left; the exercise page puts the cue beside the
  notes and the rep-max table beside the weekly towers; the calculator's
  two tables stand side by side; the month's hero puts the totals left
  and the calendar right, at a phone's size — at 5xl its cells were
  each a hand wide. All `lg:` utilities, so a phone cannot reach them
  (checked: no overflow at 375, chips still a row).
- **Settings has a sticky row of section chips** (`SectionChips`):
  Look, Units, Session, Maxes, Sync, Data, the one in view lit — the
  last section whose top has passed a third of the way down, or the last
  at the foot of the page. A press scrolls there. `Section` takes an
  `id` and a scroll margin for this. **Add a section, add its chip.**
  Unverified by watching: the agent's hidden pane fires no scroll events
  (they ride rendering frames) and does not advance a smooth scroll, so
  the lit chip was checked by dispatching `scroll` by hand after each
  jump.
- **A page with nothing to count says so in a sentence** — the block
  report, the year, the balance card and the body map were checked on an
  emptied demo (`sampleData: 'cleared'`, database deleted) and drew rows
  of zeros: four `0`s and "0.0k" on the block, three tugs of war each
  reading "Nothing logged", "0 muscles worked". Each says it once now,
  and what will appear. The muscle page also claimed nothing was
  _programmed_ for a muscle the week trains — it meant nothing had been
  _logged_. **Re-run that walk when a page is added**: the demo fills
  every page, so an empty state is the one thing nobody sees.
- **Every vibration is one vocabulary** (`HAPTICS` and `useHaptics` in
  `features/feel/haptics.ts`): detent, press, logged, skipped, finished,
  record, rest over — so a set logged by the check, the swipe or the key
  feels the same, and a record never feels like a skip. Few and short on
  purpose; iOS has no web vibration, so none of it carries meaning
  alone. `settings.haptics` (on by default, in the parse with a test)
  turns it off. **Call `useHaptics`, never `navigator.vibrate`.** In
  development StrictMode runs effects twice, so the record buzz is heard
  twice there and once in production. **Pressed states**: `.tap-target`
  scales; every other pressable thing lifts in brightness while held
  (`index.css`), and the platform's grey tap box is off.
- **The player's occasional tools are one tray** (`SessionTools`, the
  ⋯ on the exercise card): Focus, Swap, Pair, Recent sessions, Add an
  exercise, Change the order. They were three icons in the card's header
  and two dashed buttons under Next — a toolbox around a set. What a set
  needs stays on the card. A tool is listed only where it applies, so the
  tray holds no dead button; add and reorder open under Next as before
  (`onClose` hands them back to the tray rather than folding). Every
  keyboard key still works. **The Pair and Swap icons note above is
  history.**
- **Every screen is one list** (`SCREENS` in `features/navigation/
screens.ts`), read by the palette and by the **Everything sheet** — a
  grid button beside Settings on the hero opens every screen as tiles,
  grouped Train, Progress, Look back, App. The page has no navigation,
  so the year, the calculator and the comparison were reachable only by
  somebody who knew the card that linked them or knew ⌘K. **Add a screen
  here, not in the palette**, or the two drift. A screen that needs a
  record (a session, an exercise, a muscle) is reached from the record
  and is not listed. The sheet is portalled to `body`: rendered inside
  the hero, the cards after it painted over it.
- **The notices are one strip that swipes** (`NoticeStrip` on Today):
  the sample note, what's new and the install offer sit side by side
  under scroll snap rather than stacked above the hero. Each notice
  still decides for itself whether to show; a slide that renders nothing
  collapses (`empty:hidden`) and a dot is drawn only for what is there,
  so which slides show is read off the DOM. **The strip takes the height
  of the notice on screen**, measured: a flex row is as tall as its
  tallest slide, and a short note sat over a blank the height of the
  release notes. In the agent's hidden pane the height transition stays
  on its first frame; the inline height is the value to read.
- **The page opens on a hero, and the week is a radar.** Asked for as
  _"the 'this week' graph is plain, clunky, and takes up most of the
  screen"_ and _"I don't like the plain LiftOS header in lieu of a
  proper hero banner"_. `HeroBanner` names the next session and owns
  Start, Skip and Open session, so the plan card is detail only;
  `WeekCard` draws this week's sets per muscle as one shape. Both read
  `useNextSession`, so they cannot name different days. **The week is
  a calendar week from Monday** (`weekSummary`), not the last seven
  days — the old bars were a rolling window read off `Date.now()` in a
  component. The streak counts weeks with a finished session and does
  not break on a week that has not had its session yet.
- **The session player got the same pass.** A sticky session bar
  (sets settled, elapsed time from `workout.startedAt` through the
  clock port, and a strip of exercises by name that follows the current
  one) replaced "Exercise 6 of 8" and a row of unlabelled dashes. **A
  set row leads with the planned load**, last time underneath, and a
  check button **logs it as planned in one tap** — offered only when
  the plan holds a number to log, or there is nothing to type (a
  warm-up, a block of time), so an open slot cannot be filed with no
  weight. The row's own press still opens the editor. Finish stays
  quiet ("Finish early · N sets left") until nothing is pending, and
  the rest timer is a ring with +30s rather than a second whole rest
  period. The report opens on a `.hero-panel`. **A run of warm-up rows
  is one step** (`WarmupBlock`): one card of tick rows, one "Warm-up"
  pill, and Next goes past the whole run — it was five one-tap pages
  before the first bar. Each row still logs its own sets, one write
  after another, because a log is a read-modify-write of the workout.
- **A barbell or EZ-bar step draws the bar loaded** (`PlateLoader`,
  from `platesFor` in `domain/units/plates.ts`): the next pending set's
  planned load, plates per side in competition colours, sliding on in
  loading order whenever the weight changes. Greedy from a standard
  gym's plates, and **a load the plates cannot make shows its leftover**
  rather than rounding — a picture of 225 beside a logged 227 is a
  different bar. Bar weights are 45/20 and 25/10 for the EZ bar.
- **A logged set says how it did against last time** (`versusLast` in
  `domain/logging/versus-last.ts`): heavier bar first, then reps at the
  same bar, and a lighter bar is reported as lighter rather than turned
  into a win through an estimated max. Progress is a lit chip that pops
  and shines once; matched or slipped back is quiet ink, never red
  mid-session. **The session report's up/down verdict reads the same
  rule** on each session's `topSet` — it scored best load × reps, so
  320 × 3 read as "came in under" last week's 310 × 5 directly below
  rows saying "+10 lb". One question, one rule.
- **The report puts the volume in pictures** (`heftOf` in
  `domain/units/heft.ts`): the heaviest reference object the total
  covers — "about 1.2 family cars" — so the count is never a fraction of
  one. The hero stats count up once (`useCountUp`); reduced motion shows
  the figure directly, and a screen reader gets the number, not the
  animation.
- **A past session opens** (`/session/:id`, `features/history/
SessionPage.tsx`, from `sessionDetail`). History rows could be deleted
  and reopened and never read. It shows the report's own numbers
  (`SessionStats`, shared) and every exercise judged against **the
  session before it** — `previousTopSet` filters by start time, so a
  session opened in December compares with November, not with today.
  The report's verdict uses the same two helpers. A session that
  finished the minute it started reads as of unknown length rather
  than "0 min"; the demo seed stamped every session that way until this
  page showed it, and now gives each 45–75 minutes.
- **A year in squares** (`/year/:year`, `yearInSquares` in
  `domain/logging/year.ts`, tested; Year on the month page and in the
  palette — the month page's year story link now reads "Play the year"):
  twelve small calendars, a square a day lit in the training grid's own
  bands, today ringed and days to come faint, with weeks trained and the
  best and current **week** streaks above — counted the way the hero's
  streak is, the week still running not breaking the run. Twelve months
  rather than one long ribbon, because a year as a strip is too long to
  take in.
- **The records wall has a timeline view** (`?view=timeline`,
  `RecordTimeline`; `recordTimeline` in `domain/logging/record-timeline.ts`,
  tested): every record in the order it was set on a gold spine, a month
  at a time, newest brightest, each linking to its exercise and session.
  **The wall says where you stand; this says how you got there** — a run
  of records in one month and a quiet one after is the shape of a block.
  Read through the same `sessionRecords` as the session page and report.
- **A card says when you train** (`TrainingTimesCard`, "When you train";
  `trainingTimes` in `domain/logging/training-times.ts`, tested): a dot
  for each weekday and part of the day, as large as the sessions started
  there, and a gold bar per part for the records set in it. **Counts
  beside counts, never a rate**: that most records come in the evening
  says most sessions do, and the closing line only adds "where most
  sessions are, too" when that is true. **The demo had no shape in time**
  — every session stamped at the seeding moment, so the card read "105 of
  105 records in the afternoon"; `startOf` in the seed now starts sessions
  early on Tuesdays and Thursdays, after work on the other weekdays, and
  late morning at the weekend, today's keeping the seeding moment so
  nothing starts in the future.
- **Two exercises can be compared** (`/compare?a=&b=`, `relativeSeries`
  in `domain/strength/relative.ts`, tested; Compare on an exercise page
  and in the palette): each line read against its own first session, so
  a curl from 25 to 35 and a squat from 298 to 356 share one axis as +40%
  and +19.5% — which moved further, not which is heavier. Plotted is the
  session's estimated max where the reps allow one, else its top bar
  (reps for the body alone); a version-split exercise uses its longest
  series. The pickers list only exercises with history, and the pair is
  in the address.
- **The coming sessions export to a calendar** (Calendar on the Program
  page's "Next four weeks", `CalendarExport`; `calendarFile` in
  `domain/programs/calendar.ts`, tested): a start time and a length, then
  a `.ics` of the runway's own days from today on. **Floating local
  times** (a session is at six wherever the lifter is that week), **a UID
  per day** so a second import updates rather than doubles, text escaped
  and lines folded at 75. Folding counts characters, not octets, so a
  line heavy with em dashes can run a few bytes long — lenient calendars
  take it, a pedantic one might not. Checked by catching the file at the
  link rather than downloading it: 15 events from a Saturday, the first on
  Monday at 18:00.
- **A deleted session can be taken back for five seconds** (the player's
  `UndoToast` on the history list; `restoreWorkout` beside
  `deleteWorkout`, tested). The delete returns the record it removed, and
  Undo **saves** it again — stamped now, so newer than the tombstone its
  deletion wrote, which by `shouldAccept` no longer covers it: the
  session is back for good, an old backup imported later cannot remove it
  again, and a device that already saw the deletion takes the newer record
  next round. The tombstone is left in place, because removing one is not
  an operation the store offers and none is needed. Checked in the
  preview by the stamps: deleted at :35.1, restored at :36.0.
- **An open session can be reordered** (`ReorderPanel` at the foot of
  the player, "Change the order"; `moveEntry` in `domain/logging/
reorder.ts` and `reorderSession`, tested): up and down per exercise,
  buttons not a drag, the exercise on screen staying on screen wherever it
  moves. Warm-ups stay at the top (an exercise above them is lifted cold)
  and a superset pair does not move or get split — a button is offered
  only where the move is allowed, and the pair wears a link mark.
- **Two siblings must never share a React key, and one shipped.** The set
  clock was given `key={index}` beside the bar picture's `key={index}`,
  and React orphaned the old bar on every page turn — Pendlay Row's
  plates left on the Bench card, one more stale picture per exercise
  visited. Live from `349cf1b` until found while checking the reorder; the
  console had been saying "two children with the same key" the whole time.
  **Read the console when verifying a player change**, not only the DOM.
- **A past session can be run again, and an open session can be built
  from nothing.** Repeat on the session page (`repeatSession` in
  `application/use-cases/training/repeat-session.ts`, tested) opens the
  same exercises, order, sets and ranges as a freestyle session — **at
  today's loads**, each planned from its own history, so a March session
  repeated in October opens where the lifter is now. Results, times and
  notes are cleared (`replanned`, now shared with the swap, clears set
  notes too — the test found them surviving), a superset pairing is kept,
  a retired exercise is left out, and an open session is resumed instead,
  as Start does. The hero's **Open session** used to land on "add some
  from the program" with no way to; it now opens the library
  (`AddExercisePanel` with `startOpen`) to pick the first exercise.
- **An exercise's progress shares as a picture** (Share on the exercise
  page, from two sessions up): the session card's renderer with its three
  figures relabelled (`statLabels` — sessions, best set, estimated max)
  and a **staircase** drawn on the canvas (`staircase`, the last sixteen
  top sets, the last step gold with its number) — the exercise page's own
  picture of double progression. A bodyweight movement on the body alone
  climbs by reps. Shown before it goes anywhere, Save and Share as for a
  session.
- **Notes can be dictated** (`DictateButton` and `appendDictation` in
  `features/dictation`, tested): a microphone beside the set note and the
  session note, present only where the browser has a speech recogniser —
  absent rather than dead elsewhere. What is heard is added with a space,
  a new note capitalised, and cut at the field's limit on a word boundary.
  The session note saves what was heard as it lands, because dictation
  has no blur to save on. The recognition is the browser's (most send
  audio to the platform's speech service); nothing is recorded here.
  **Checked with a stand-in recogniser** — the agent's pane blocks the
  microphone, so real speech was not heard; the button reads the
  recogniser at render, so the stand-in had to be in place before it.
- **History imports from Strong or Hevy** (Settings → Backup,
  `ImportOther`; `readTrainingExport`, `parseCsv` and `matchExercise` in
  `domain/logging/import-csv.ts`, `importTraining` in `application/
use-cases/training/import-training.ts`, both tested). The two formats
  are told apart by their headers; a file in neither is refused with the
  reason. Before anything is written the screen shows the sessions and
  dates and **asks about every exercise name** — pre-matched only where
  the words outside the brackets overlap by two thirds (equipment breaking
  ties), left out otherwise, every one changeable. That threshold is
  deliberate: a plain "Squat (Barbell)" could be any of three squats here
  and is left for the lifter, because a wrong guess files months of sets
  under the wrong lift. Strong never states its unit, so it is asked;
  Hevy's is read off the column. Loads are converted, warm-ups stay
  warm-ups, the prescription is open (their plan is not this one), and a
  session whose start time is already here is skipped, so a second import
  of the same file adds nothing. Checked in the preview with a synthetic
  file put on the input — no file left the machine.
- **A strength calculator** (`/calculator`, `strengthTable` in
  `domain/strength/calculator.ts`, tested; linked from the records wall
  and the palette): a set in, its estimated max out, what the same
  strength should do for 1–12 reps drawn as a falling curve with the set
  ringed, and 100–50% — every load rounded **down** to one the plates
  make, by the Settings formula. A row loads its bar on the plate picture.
  **Building it found a bug on the exercise page**: run back through the
  formula, a 225 × 5 estimate is 224.99999… for five reps, and rounding
  that down printed the set's own row as 220. Both now forgive the float
  dust before rounding (`rep-max.ts` too), with a test holding them equal.
- **A set can be timed, to a tempo** (`SetClock` under the ladder,
  `tempoAt` in `domain/programs/tempo.ts`, tested): Start, lift, Stop. With
  2-0-1, 3-1-1 or 4-0-2 chosen it calls each part of every rep — Lower 3,
  Hold 1, Lift 1 — and the rep it is on, ticking on each change when rest
  sounds are on (the same synthesised tick, primed on the Start tap). A
  part of nought seconds is skipped rather than flashed. **It records
  nothing**: time under the bar is a reading for the lifter, not a field
  every set should ask for. Keyed by the exercise, so paging on resets it.
- **An exercise can be added mid-session** (`addExercise` in
  `application/use-cases/training/add-exercise.ts`, tested;
  `AddExercisePanel` folded at the foot of the player). It goes after the
  exercise on screen and the player turns to it; straight sets in the
  range its kind runs in (`defaultRepRange`, now exported from the
  assembler rather than copied) at the load its own history earns through
  `planFromHistory` — Start's and the swap's function — and no weight with
  no history. It carries no slot, because nothing in the programme asked
  for it. Exercises already in the session and conditioning (which is
  where warm-up rows are catalogued) are not offered. The player turns to
  it with `showEntry`, not `go`: `go` clamps against the session as it
  was before the add.
- **An open session follows you** (`SessionPill`, in `AppShell` after
  `main`): on any screen but the player and the story, a pill at the foot
  names the session, its sets settled and its clock (through the clock
  port), and goes back with one press. The app is one page and the
  player the only place a set is logged, so stepping out to a past
  session mid-workout used to leave the open one nowhere on screen. A
  spacer reserves its height so it never covers the last card. **No
  pulse on it** — one was written and taken out under the motion rule:
  motion runs once, or slowly one way, never in a loop.
- **Every muscle has a page** (`/muscle/:id`, `muscleHistory` in
  `domain/volume/muscle-history.ts`, tested; reached from the body map's
  readout — "Open" beside a chosen muscle — and the palette). Twelve
  calendar weeks as a filled curve (a tide) with the busiest week marked,
  sets, a weekly average, its share of all sets, when it last worked, and
  the exercises that paid it, each with a bar of its part. **Counted by
  `loggedVolume` one entry at a time**, the rule the radar, the balance
  and the body map use, so a set pays only the muscle its exercise is
  for: the chest page lists the bench, the triceps page does not.
- **The exercise name in the player opens its recent past**
  (`ExercisePeek`): a tap or a 450 ms hold raises a sheet with the last
  six top sets as a sparkline, every point labelled, the best set in gold
  and the lifter's cue, one link from the full exercise page — without
  leaving the session. The open session is left out, the version (Heavy,
  Light) picks the series, and paging on closes it (`peekAt`, the swap's
  pattern). Escape closes it.
- **The set editor has a weight dial** (`LoadDial`, under the steppers;
  `dialValue` in `domain/units/step.ts`, tested): a ruler with a notch per
  rounding step and a label every five, dragged sideways past a fixed
  mark — left to go up, like a tape pulled through a window — snapping to
  the grid and ticking the phone once a notch where it can. For 135 to
  225 in one swipe; the steppers stay for the nudge. It is a
  `role="slider"` and takes the arrow keys. **Two things had to learn to
  leave it alone, both found by driving it**: the exercise card's page
  swipe turned to the next exercise mid-drag (`usePageSwipe` now skips
  `[role=slider]`), and the player's ← → shortcuts turned the page on its
  arrow keys (`isTypingIn` counts a slider as owning its keys).
- **A past session replays** (`SessionReplay` on the session page, from
  `replayFrames` and `frameAt` in `domain/logging/replay.ts`, tested):
  play and the sets come back in the order they were logged — the
  exercise and set named, the bar drawn on the plate loader, rest
  counting between sets of one exercise, a session clock — a whole
  session in about twenty-four seconds; the track scrubs. **The session
  as lived, one moment at a time**, where the timeline under it is the
  whole thing at once. Silent with fewer than two set times, the same
  evidence rule. The two share `timeline-colours.ts` so an exercise is
  one colour on the page; the track is positioned dots, because a
  stretched SVG drew them as ellipses. Playback runs on
  `requestAnimationFrame`, so it was checked by scrubbing — the agent's
  hidden pane fires no frames.
- **A month or a year plays as a story** (`/wrapped/YYYY-MM` or
  `/wrapped/YYYY`, `wrappedFor` and `periodOf` in `domain/logging/
wrapped.ts`, tested; Play and The year on the month page). Full screen,
  one figure a card on its own hue — days, volume with its heft, the
  heaviest bar, what moved most, the biggest week, records — a segment
  per card filling along the top. Tap right for on, left for back, hold
  to pause; it moves on after 5.5 s. **Every figure is one another page
  gives**, by the same rule (totals and the most improved through
  `blockReport`, the heaviest bar by the records wall's tie-break), and a
  card with nothing to say is not drawn. Its numbers count up through
  `useCountUp`, which reads 0 in the agent's hidden pane — the harness.
- **A block has a report** (`/block`, `?ago=` steps back; `blockReport`
  and `blockWindow` in `domain/logging/block.ts`, tested; linked from the
  Program header and the palette). Totals, sets by week with the deload
  in violet and weeks to come dashed, and **a fan**: every loaded
  exercise leaves one point on the left and ends at its top-set change on
  one percentage scale, because 45 and 405 cannot share a load axis and
  changes can. The window is whole weeks from the anchor Monday cut into
  runs of the program's length — `slotOn`'s own arithmetic, so it agrees
  with the week the Program page names. **A day version is its own
  line**: the first build read a light calf raise after a heavy one as
  −28.6%. Unloaded bodyweight sets are left out rather than read as zero.
- **Rest can be heard** (`settings.restSounds`, off by default, in the
  parse with a test; Settings → During a session): a tick in each of the
  last three seconds and two rising notes at the end, synthesised with
  Web Audio (`rest-sounds.ts`) so no file ships. **Fired on a crossing of
  the time left** (`restCuesBetween` in `domain/programs/rest-cues.ts`,
  tested), because readings come every quarter second and a suspended
  tab can jump straight to nothing — which sounds only the chime, never
  a burst of ticks. iOS only wakes audio inside a gesture, so the context
  is primed in `logAt`, on the tap that starts the rest. **The rest
  timer stays mounted behind focus** (`hidden`) so its pause, +30s and
  sounds carry through. Checked: the context is created on the log tap
  and the timer hides and returns with focus; **the sounds themselves
  were not heard** — the agent's pane plays no audio.
- **Focus puts one set on the whole screen** (`FocusView`, the Focus
  button on the exercise card): which set of how many, the planned bar in
  type readable from the floor, and Log as planned / Skip / Edit. While
  resting the bar gives way to a ring countdown with the next set under
  it. **It calls the player's own `logAt`, `skipAt`, `setOpenSet` and
  `go`**, so a set cannot be filed differently from focus; Edit leaves
  focus and opens the row's editor. The countdown reads the rest timer's
  `startedAt` and length but not its +30s or pause, which stay on that
  card — the card is hidden behind focus and returns when it closes.
  Escape closes it. The screen was already kept awake (`useKeepAwake`).
- **A body map says what was trained lately** (`BodyMapCard`, "Lately",
  from `muscleRecency` in `domain/volume/recency.ts`, tested): front and
  back figures of rounded blocks, each muscle lit for today or yesterday,
  half-lit for two or three days, unlit beyond; pressing one names its
  days since and its sets in the last seven days. **Days since, not this
  week's count** — the radar already draws the calendar week, and this
  carries over Monday, which is when it is most wanted. The bands claim
  nothing about readiness; the app measures none. Counted by the week
  card's own `loggedVolume`.
- **The page can be pure black** (`settings.trueBlack`, in the parse
  with a test; Settings → Look → Background, two drawn previews rather
  than a switch). `AppShell` sets `data-black` on the root and moves the
  `theme-color` meta to black with it, so an installed app's status bar
  is not a grey stripe. The washes and the ambient backdrop go too — a
  glow on black lights the pixels the setting exists to switch off — and
  cards stay a shade above black so they still read as surfaces. The
  override is unlayered CSS so it outranks the base layer's tokens.
- **An exercise's notes are kept on its page** (`NotesCard`, from
  `exerciseNotes` in `domain/logging/exercise-notes.ts`, tested). A set
  note was shown once, beside "Last" next session, and then gone; the
  page draws them all on a rail, newest first, each hung from its day (a
  link to the session) and the set it was written on. **A session's own
  note is left out** — it is about the day, not the lift. Silent with no
  notes; four shown, the rest a tap away.
- **The app offers to install itself, once** (`InstallCard`,
  `installOffer` in `features/pwa/install.ts`, tested). Chromium's
  `beforeinstallprompt` fires early and once, so `watchForInstall` in
  `main.tsx` holds it for the card rather than the card listening for
  itself. iOS has no event, so it gets the Share-sheet instructions;
  anywhere else with no dialog gets nothing — a button that does nothing
  is worse than no card. Only after a session has been filed, and
  dismissed **per device** through the long-unused
  `STORAGE_KEYS.installPromptDismissed` (`device-flags.ts`), because a
  phone and a desktop answer it differently. Verified with a synthetic
  event; the real dialog was not driven.
- **Every exercise has a shelf** (`/exercises`, `features/library/
LibraryPage.tsx`, from `libraryShelves` in `domain/logging/library.ts`,
  tested), linked from the Program header and the palette. Shelved by
  primary muscle, the routine's exercises first, then the most recently
  done. **A row's mark is a barcode of its last twelve calendar weeks** —
  a bar per week as tall as its working sets, accent where the routine
  names it — so a shelf says what has been done lately without opening
  anything. A retired exercise shows only if it was ever done.
- **The home cards can be reordered and hidden** (`arrangeCards` in
  `domain/settings/home-cards.ts`, tested; `ArrangeCards` folded to a
  button at the foot of Today; `settings.homeCards` in the parse with a
  test). **Stored as choices, read against the app's list**: a card
  shipped after an order was saved slots in after its default neighbour
  rather than vanishing, and a retired key is ignored. Up/down buttons,
  not drag — a masonry reflows under a dragging finger. `HOME_CARDS` in
  `HomePage` is the one list of cards and their names.
- **Swiping the exercise card sideways turns the page** (`SwipePager`,
  `usePageSwipe`): 70 px, at least twice as sideways as down, read when
  the gesture ends so the card never moves under a scrolling thumb. It
  yields to set rows (`data-swipe-row`, which have log/skip swipes of
  their own), fields, buttons and links. A wrapper component rather than
  a hook in the player: the hook has to run every render and the
  player's `go` exists only after its early returns.
- **An update says what it brought, once** (`WhatsNew` on Today, notes in
  `features/today/releases.ts`, `settings.seenNotes` in the parse with a
  test). An installed app updates itself, so a feature could arrive with
  nothing on screen saying so. Only the newest release shows, two lines
  then "N more", to somebody with training logged; dismissing it is for
  good. **Add a release at the top of `RELEASES` when a change is worth
  telling** — the card only appears for ids nobody has dismissed.
- **The exercise page counts sets by week as towers** (`setsByWeek` in
  `exercise-history.ts`, tested; `WeeklySetsCard`): twelve calendar
  weeks, a column each, a block per working set — three blocks is three
  sets, counted by eye rather than read off an axis. An untrained week is
  an empty column, this week is outlined, and each column's label carries
  the sets and the volume.
- **Every set exports as CSV** (`setsCsv` in `domain/logging/csv.ts`,
  tested; Settings → Backup): a row a set, oldest first, skipped and
  warm-up sets included with their outcome, cells quoted per RFC 4180.
  **Not a backup and never read back** — the backup is the database with
  a checksum. Checked in the preview by intercepting the download link
  and reading the blob: 1,331 rows from the demo.
- **Several stalls at once offer the deload** (`stalledExercises` in
  `domain/programs/stall.ts`, tested; `DeloadSuggestion` under the hero).
  One stalled lift is a lift; three or more trained in the last three
  weeks, each three sessions without beating its best, is usually the
  lifter — so the card names them and offers "Take the deload this
  week", the same `jumpToWeek` the Program page's picker writes. Offered,
  never applied; silent below three, on the deload, or with no deload in
  the block. Checked by cloning a session three times (six stalls, two of
  them real demo plateaus), taking the deload, then restoring week 1.
- **A past session compares itself with another** (`compareSessions`
  in `domain/logging/compare.ts`, tested; `CompareCard`): a butterfly —
  the other session's volume grows left of a centre line, this one's
  right, on one scale — with both top sets and the usual chip under each
  exercise, and exercises only one session had kept in. Defaults to the
  last time this day was run; any finished session can be picked. Top
  sets come from the sets themselves: `topSetIn` filters by day version
  and read a Light calf raise as having none. A bodyweight movement has
  no load, so no bar, only its top sets.
- **Type a weight into the palette and it loads the bar**: "245" or
  "plates 245" draws that load with your plates (`PlateLoader`) above any
  matches, and the "nothing by that name" line steps aside for it.
- **The warm-up ramp ticks off** (`BarSection`): "Done — next step"
  under the step in view ticks it (a green check on its chip, "2/4 done")
  and puts the next undone step on the plate picture; after the last, the
  working load comes up. Ephemeral component state, like the step in
  view — a ramp is not a logged set and is not filed.
- **An exercise carries the lifter's own cue** (`settings.exerciseCues`,
  in the parse with a test, `CueCard` on the exercise page): one line,
  saved when the field is left or on Enter, shown in italic accent under
  the exercise's name in the player. Blank removes it. A script's
  `focus()`/`blur()` does not reach a hidden pane, so it was checked by
  typing into the field for real.
- **A record set bursts once** (`RecordBurst`): twelve gold sparks from
  the chip and a short buzz where the platform allows, only for a set
  logged in the last three seconds — the chip mounts with the record, so
  the decision is made in `useState`'s initializer (a setState inside
  the effect is refused by the hooks lint). Ten seconds was tried and
  re-burst on paging away and back.
- **Two accessories can run as a superset** (`domain/logging/
superset.ts`, tested; `pairSuperset` / `unpairSuperset`, two names for
  two operations). Pair joins an accessory to the next one by a group
  name both entries carry, **on the log**, so history reads how it was
  run. Logging the first half turns straight to the partner with no
  rest; logging the second runs the full rest and turns back. Only
  hypertrophy and assistance slots pair — a competition lift wants its
  whole rest. On a phone the card's Pair and Swap are icons with labels
  (`aria-label`), because the two words wrapped the header to two lines.
- **A month page** (`/month` → the latest month, `/month/YYYY-MM`,
  `monthRecap` in `domain/logging/month.ts`, linked from Last week and
  the palette): totals against the month before, the month as a wall
  calendar lit by sets, each lift's estimate first to last reading, and
  the records, stepped month to month. **A month still running is
  compared like for like** — October 1–2 against September 1–2, said
  under the totals; against all of September it read −93% on the second.
  Its share card reuses the session renderer (`eyebrow`, `dateLine`,
  `timeLabel`, `recordsHeading`) and leads with the lifts' changes: four
  of thirty-two records picked by date said little.
- **The exercise page has a rep-max table** (`repMaxTable` in
  `domain/strength/rep-max.ts`, `RepMaxCard`): the estimate run back
  through the same formula for 1, 3, 5, 8, 10 and 12 reps, rounded down
  to a loadable bar, as dashed bars, with a solid bar for the heaviest
  done **in that row's bracket** (gold where it reaches the prediction).
  "At least that many reps" was tried first and filled the single row
  with five-rep weight under a prediction nobody had attempted, which
  read as a weakness. Hidden for bodyweight movements and without an
  estimate.
- **⌘K (Ctrl+K) or / opens a command palette anywhere**
  (`features/palette`, mounted in `AppShell`): pages, every exercise and
  the last thirty sessions, ranked by `rankItems` (tested) — every word
  must match, a label starting with the query leads, then a word starting
  with it, then any match; hidden keywords let "sep 25" find a session.
  ↑ ↓ Enter Esc, and navigation runs through `withViewTransition`. **The
  slash is ignored while typing** so search boxes keep it. A `*/` inside
  its doc comment ("**/ is ignored**") ended the comment early — the
  typecheck caught it as a type predicate.
- **A lit cell in the training grid opens that day's session**
  (`ActivityDay.workoutId`, the larger session on a day with two,
  tested). The grid lost `role="img"`: an image cannot contain links, so
  the summary is `sr-only` text and each lit cell a labelled link
  ("Fri, Oct 2 · 8 working sets"). Empty and future cells stay hidden.
- **A records wall** (`/records`, `bestsByExercise` in
  `domain/logging/bests.ts`, linked from the Strength card): a tile per
  exercise, heaviest bar in large type (more reps breaking a tie), the
  best estimate from a **reliable** set only, and the day. Competition
  lifts lead, then the freshest. Gold for a best set this week; a best
  untouched for eight weeks reads "Since …" in amber. Gold for the month
  was tried and lit every tile — steady progress makes nearly every best
  recent. The demo still lights all fifteen, truthfully: its generator
  raises every lift every week.
- **The accent is a setting** (Settings → Look, `ACCENT_HUES`,
  `settings.accentHue` in the parse with a test): every accent token is
  `oklch(L C var(--accent-hue))`, and `AppShell` writes the one property,
  so the whole app follows one write. **Five named cool hues, not a
  slider** — a wheel reaches greens that read as the good colour and
  violets that read as the deload. Checked by reading the computed
  colour, not the class: `text-accent-400` resolves to hue 15 under Rose.
  The share card draws on a canvas and stays cyan.
- **The session bar projects the finish** ("⚑ 8:32 PM", `FinishAt`,
  from `remainingSeconds` in `domain/logging/remaining.ts`): every
  pending set's work and the rest the timer will give it, by the
  planner's own `setSeconds` and the timer's own `restAfter`, so the
  three cannot disagree about what a set costs. It is the plan's pace,
  not a measurement of the lifter, and moves as the session does.
- **A one-action log or skip offers Undo for five seconds**
  (`UndoToast`): "Logged 215 lb × 3 · Undo" above the rest timer when one
  is showing. Undo returns the set to pending (`clearSet`) and cancels the
  rest it started. Offered only when the set was pending before — undoing
  a re-log would clear the earlier result rather than restore it. Its
  lifetime is a timer, not the animation, so reduced motion keeps it.
- **A balance card reads four weeks as a tug of war**
  (`domain/volume/balance.ts`, `muscleBalance`, `BalanceCard`): push
  against pull, quads against the hinge, upper against lower, in sets by
  the week card's own `loggedVolume`, over four calendar weeks — one week
  is noise, a missed pull day is not an imbalance. A knob pulled towards
  the heavier side, a faint dot per week behind it (oldest faintest) so
  the drift shows, and a band either side of centre that reads Even
  (`EVEN`, a tenth). **A lean, not a verdict**: a squat-heavy week is
  often the plan, so outside the band it says "Upper-heavy · 2.2×" in
  amber and nothing more.
- **The player takes a keyboard** (`keyboard.ts`, `KeyboardFlow`):
  Enter or L logs the next set as planned, S skips, E opens it, ← → or
  J K move between exercises, Esc closes the key sheet, then the editor,
  then the rest timer, and ? lists the keys; the desktop map says
  "Press ? for keys". **Nothing fires while typing** except Escape, and
  Enter on a focused button stays the button's. It drives the rows' own
  actions — `logAt`/`skipAt` in the player, and `canLogPlanned` /
  `plannedResult` (`planned.ts`) shared with the row's check and swipe —
  so L opens a set the plan cannot fill rather than logging it blank.
  Logging moved out of the row's inline callback, and its rest start now
  reads the clock port: the purity lint refuses `Date.now()` in a
  function declared in render.
- **History searches and filters** (`domain/logging/history-filter.ts`,
  tested): a search matches the day, an exercise **actually done** (a
  skipped slot is not something the session had), or a note, every word
  narrowing; chips for the days the history holds and for sessions with
  records. **The fold steps aside while any filter is on** — folding
  matches behind "Show all" would be the list arguing with its own box —
  and the header reads "11 of 81". The search has a row of its own.
  Updates are functional (`onChange(current => …)`): two taps landing
  in one tick otherwise wrote from the same stale filter, the second
  undoing the first.
- **Notes, on a set and on a session.** The set editor has one line
  under the steppers; the row shows it after "Logged", and **next
  session shows it beside "Last"** on the same set (`previousSetFor`
  carries `notes`), which is when "belt" or "left knee" is worth reading
  again. A note given replaces the old one and an empty one removes it;
  the one-tap log, which gives none, keeps what was there (`applyResult`,
  tested both ways). The session note (`noteWorkout`, trimmed, capped at
  280, blank removes rather than storing `''`) sits on the report before
  Done and on the session page, saving when the field is left; the page
  lists set notes under each exercise.
- **A session shares as a picture** (`features/share`): Share on the
  report and on a past session draws a 1080 × 1350 card on a canvas —
  name, date, sets, volume, minutes, the volume in pictures and up to four
  records — from `shareCardFrom`, which takes what those screens already
  hold. **It is shown before it goes anywhere**, with Share and Save
  under it; the Web Share call needs a tap of its own and drawing first
  would have spent it. Share appears only where `navigator.canShare({
files })` says yes; Save downloads the PNG everywhere. The palette is
  literals because a canvas cannot read CSS variables. **Unverified: the
  share sheet itself** — the agent's browser cannot share files, so only
  the image and Save were checked.
- **The Program page ends on the next four weeks** (`Runway`, from
  `weeksAhead` in `domain/programs/schedule.ts`): a row a week, a cell a
  day, this week's finished days ticked, missed ones dimmed, today
  ringed, and the deload row tinted violet with "Deload in N weeks"
  above. **It asks `sessionOn`**, the question the hero asks, and a test
  holds every cell equal to it. A cell names the day in up to four
  letters — two for everything read Push and Pull both as "Pu".
- **A lift can carry a goal with a date** (`domain/strength/goal.ts`,
  `GoalsCard`, `settings.liftGoals` — in the parse, with a test). Its
  picture is a **glide path**: the dashed line the goal asks for, from
  where the lift measured the day it was set (`from`, stored so the start
  does not move) to the target on the date; the lift's own line since;
  and the trend carried to the date, green on pace and amber behind.
  **Judged on the fitted line, not the last session** — `fitTrend` came
  out of `projectReach` so both read one fit. Too little to fit still
  says the weekly need, never a forecast. A goal at or below where the
  lift already is is refused: it read as reached on setting, with the
  path running downhill. **The form fills its default when opened, not
  when mounted** — the trend loads after the card, and a mount-time
  default offered 145 for a bench sessions put at 245.
- **Finishing grows the session bar into the report's hero.** Both
  carry `view-transition-name: session-hero`, and the swap — one route,
  so React Router's `viewTransition` cannot see it — runs through
  `withViewTransition` in `app/view-transitions.ts`, which wraps the
  state change in `flushSync` so the browser snapshots the new screen
  rather than the old one twice. **The report opens scrolled to the
  top**: it inherited the player's scroll and opened a screen down, with
  the hero the morph lands on out of view. **A view transition in the
  agent's pane freezes**: no frames are painted, so the animation clock
  stops at its first tick and the transition's overlay swallows every
  click until `skipTransition()`. That is the harness (the same reason
  `CountUp` reads 0 there), not the app.
- **Counters roll like an odometer** (`RollingNumber`): the session
  bar's sets settled and the rest timer's clock turn a wheel per digit
  rather than swapping text. **Digits are keyed from the right**, so
  9 → 10 adds a wheel on the left instead of every wheel shifting one
  place and rolling to the wrong neighbour. The wheels are `aria-hidden`
  with the value once as `sr-only` text. A wheel is `1lh` tall, so it
  takes the line height of whatever text it sits in.
- **A tapped name grows into the next page's heading**
  (`components/shared/morph.ts`, `MorphText`): a history row or an
  exercise page's session row into the session heading, an exercise name
  in the plan or a past session into the exercise heading, and back.
  **Named only while that transition runs** (`useViewTransitionState`
  answers both directions): a transition name must be unique on the page
  and a list has many rows, so naming them permanently would abort every
  transition. The heading carries its name always and is `w-fit`, so the
  snapshot is the words and not a full-width bar. **Not watched
  animating**: the agent's pane is hidden and a hidden document aborts
  every view transition (`InvalidStateError`); what was checked is that
  the names land on both sides and are unique.
- **Rest fits the work** (`restAfter` in `domain/programs/rest.ts`):
  3:00 after a heavy lift, 2:00 after a compound, 1:30 after isolation,
  an exercise's own catalogue rest winning on time, and nothing before
  conditioning. It was a flat two minutes everywhere. **The last set of an
  exercise rests for the next one** — the squat after the curls decides —
  and **a set short of its planned reps adds thirty seconds** before the
  next set of the same exercise. The timer's label says which, in a word
  or two (the column is about a hundred pixels at 375 and its "Up next"
  line already names the exercise; "Next: isolation" truncated). The
  setting is now `restEnabled`, a switch rather than a number.
- **An exercise can be swapped mid-session** (`swap-exercise.ts`,
  `SwapPanel`). The entry is filed under what was **done**, with
  `substitutedFor` naming the programmed one, and the swapped exercise
  plans from **its own history** through `planFromHistory` — the
  function Start uses, extracted rather than copied, so a reset or the
  version rule reaches both. No history opens with no weight; no ratio
  to the original is guessed. **Sets already done stay put**: swapping
  after two sets splits the slot, and swapping back rejoins it rather
  than leaving rows twice in a row. Offered: same primary muscle, the
  same movement first, and never lifting for conditioning — the first
  draft offered a squat the foam roller, which also names the quads.
  "Last" in the list excludes the open session, because the swap plans
  from before it.
- **A stall is named, and a reset is offered** (`domain/programs/
stall.ts`). Three sessions in a row that did not beat **the best top set
  before them** — against the best, not the session before, because
  reps bouncing 6, 5, 6 beat the session before on every rebound and
  never stalled; a lighter bar starts a new climb, or every session after
  a reset would read as stalled at once. The exercise page carries the
  card (`StallCard`) with "Reset to N" at 90% rounded down; the player
  names it under the ladder and links there. Accepting writes
  `settings.loadResets[resetKey(id, version)] = { load, at }`, which
  Start honours (`workingLoads`) until a session of the exercise
  **starts after `at`** — an instant, not a day: compared by day, a reset
  pressed after training read as already lifted and never applied. Found
  by pressing it in the preview; `training-flow.test.ts` now holds the
  same-day case.
- **A set shows as logged on the tap, not on the save** (`useLogSet`'s
  `onMutate`): the result is written into the cached workout by
  `withSetResult`, **the same function the save uses**, so the screen
  cannot show a different result from the one stored; the editor closes
  and the rest timer starts on the tap. A failed save restores the old
  workout and the player says so in a `role="alert"` line — a green row
  that is not stored is the one failure this must never hide. Measured:
  the row reads "Logged" 16 ms after the tap. The failure path is not
  driven on screen; it is three lines of React Query's own rollback.
- **The set editor steps rather than types** (`Stepper`): − and + either
  side of each number, weight by the rounding increment and reps by one,
  holding a button repeats, and the field is still typeable for a big
  jump. A press lands **on the step's grid in the direction pressed**
  (`stepValue` in `domain/units/step.ts`, tested) — 317 goes to 320 or
  315, never 322 — and an empty field steps from its placeholder, last
  time's number. The number ticks on each press and not on opening.
- **The Program page's "Sets per muscle" is a muscle × day grid**
  (`MuscleWeekGrid`). It was a list of "8 / 8": every muscle against a
  target that is the routine itself, so every row agreed with itself —
  reported as looking bad "for the same reason as the others", the
  reason the radar lost its target ring. The grid answers what the
  routine decides: how much each muscle gets and on which days, a cell
  lit brighter for more sets, the week's total at the end. Each day is
  `attributeWeek` over that day alone, so a cell and its row cannot
  disagree; a row still opens on the exercises behind it.
- **A set row swipes** (`SwipeRow`): right logs it as planned (the same
  `logPlanned` the check runs), left skips; the row reveals the action as
  it moves and commits past a third of its width. Pointer events with
  `touch-pan-y`, locking only once a drag is clearly sideways, so the page
  still scrolls; a drag never also fires the tap. **A direction with no
  action resists** rather than moving freely — an open slot with no
  planned load has nothing to log, so it does not swipe right. The first
  pending set slides once (`.swipe-peek`) until a set has been swiped
  (`settings.swipeLearned`, in the parse with a test) — a gesture nothing
  shows is a gesture nobody finds.
- **On a desktop the player is a cockpit.** From `lg` the exercise card
  keeps its phone width on the left and `SessionMap` runs down the right
  — every exercise with a pip per working set, the current one lit, each
  a press away — replacing the pill strip, which is `lg:hidden`. Below
  `lg` nothing changes (checked: map `display: none`, pills shown, no
  overflow at 375). The plate picture caps at `max-w-md` so a wide card
  does not draw a bar the width of the window. **The home page needed
  nothing**: `Masonry` already lays three columns under the hero at 1280.
- **A fresh install asks three questions first** (`FirstRunSetup`, above
  the hero): units, bodyweight, and the three maxes — with **the first
  bench drawn on the plate loader as it will open**, from
  `firstSessionLoad` (85%, now in `progression.ts` and shared with
  Start, so the setup cannot promise a different bar). Shown only with
  nothing logged and no sample; `settings.setupDone` (in the parse, with
  a round-trip test) ends it for good, and Skip keeps the defaults. Its
  number fields keep their own text and save only a valid number —
  written straight to settings, clearing a field to retype it left the
  old digit behind.
- **A session shows where its time went** (`sessionTimeline` in
  `domain/logging/timeline.ts`, `SessionTimeline`), in the report and on
  the session page: a band per exercise from its first set to its last,
  a dot per set, durations, and rest between sets. **Rest is measured
  between sets of one exercise only** — the gap to the next exercise is
  changing station. Silent unless sets carry two different times, so a
  session filed in one go draws nothing. The demo seed now stamps every
  set (`stampTimes`: about half a minute a set, two to three of rest,
  four between exercises) and ends the session a few minutes after the
  last set.
- **A "Last week" card** (`weekRecap` in `domain/logging/recap.ts`,
  `LastWeekCard`) sits under This week: seven day columns, last week
  filled and the week before as dashed ghosts, then sessions, sets and
  volume with their change, and how many exercises moved up and records
  were set — by the same `versusLast` / `sessionRecords` rules as every
  other screen. Changes are quiet ink either way: a lighter week is often
  the plan. `mondayOf` lives in `domain/time/day.ts` now; `week.ts`
  re-exports it.
- **The Strength card says when the next standard arrives at this rate**
  (`projectReach` in `domain/strength/projection.ts`): least squares
  through the trend's last twelve weeks, read forward from the fitted
  line rather than the last point. **Silent unless the evidence holds
  it** — four sessions over four weeks, a rising line, and inside a year;
  a date two years out is a line drawn past the edge of the data.
- **Every barbell compound has a warm-up ramp** (`warmupRamp` in
  `domain/units/ramp.ts`, `BarSection`): the empty bar × 10, then 40 / 60
  / 80% at 5 / 3 / 2, each rounded **down to a load the plates to hand
  make exactly**, with a step that lands on the one before or against
  the working load dropped. Tapping a step loads it on the plate picture;
  "Work" goes back. It was the main lift's alone, which sent a Pendlay
  row or a front squat cold under a heavy bar; now the main lift and any
  compound get one (`ramp` in `SessionPlayer`). Isolation work still gets
  none — a light working load is its own warm-up.
- **The plates to hand are a setting** (`settings.plates`, Settings →
  Units). Absent means the standard set; `platesToHand` drops anything
  that is not a plate in the current unit and reads an empty list as the
  standard set, so a unit switch cannot leave a gym with nothing. It is
  in the parse, with a round-trip test — the field-by-field parse has
  silently dropped two settings before.
- **The player draws the ladder** (`LadderStrip`, from `ladderState` in
  `progression.ts`): a column per working set filled to the reps done
  against a dashed line at the top of the range, planned sets as ghosts,
  and one sentence on whether this session earns the next load. **Short
  of the top is not short of the plan**: the plan aims one past last
  time, so 4 in a 3–5 range done as planned is `building`, drawn in a
  soft accent — the first version called it a miss in grey, reading the
  prescription itself as a failure. Only a set below its own plan is
  `missed`.
- **Personal records** (`domain/logging/records.ts`): the heaviest bar
  ever, or more reps than ever at a bar at least this heavy — the first
  outranks the second, one record per exercise per session, and never the
  first time an exercise is done. Shown in gold, not the accent: the
  accent means "ahead of last time", gold means "ahead of every time".
  Live on the set row (beating finished sessions _and_ this session's
  earlier sets), as "New records" leading the report, on the session
  page, and as a star count on history rows. **There is no
  estimated-max record**: it was written, and its own test showed it can
  never fire alone — beating every earlier estimate needs more reps at a
  bar at least as heavy, which is the rep record.
- **An exercise has a page** (`/exercise/:id`, `features/exercise/
ExercisePage.tsx`, from `exerciseHistory` in `domain/logging/
exercise-history.ts`), linked from its name in the session plan and
  in a past session. Its visual is a **staircase**: top-set load per
  session, evenly spaced, with the reps under each step lit where they
  earned the next load — double progression drawn as what it is, and a
  different shape from the smooth strength chart. A bodyweight movement
  with no added load staircases its reps instead.
- **Only a day version splits an exercise's history.** An entry's
  `variant` is usually its sub-category (Compound, Working); grouping on
  it raw would split one exercise across meaningless series. Heavy and
  Light (`DAY_VERSIONS`) are kept apart because they progress apart;
  everything else is one series.
- **The date and name of a history row are the link**, not the whole
  row: reopen and delete are buttons, and a button inside an anchor is
  invalid markup that swallows the tap.
- **The Program strip ticks off the week.** `weekSummary.doneTitles`
  names the sessions finished this calendar week, and a chip whose day
  label is among them gets a check. **By title, not by weekday** — Monday's
  session started early on Friday ticks Monday. Sessions logged under the
  old PPL titles tick nothing, which is correct: those days no longer
  exist.
- **The Strength card names the gap to what sessions measure.** The card
  is the estimated max kept in Settings (what every first-session load
  is planned from); the chart under it is what sessions measure, and
  "Squat 353" above a line ending at 356 read as a bug. Where the two
  part by `DRIFT` (5) or more, the row says "Your sessions measure 245
  lb" with **Use it** — offered, never applied, like the report's own.
- **The strength chart scrubs.** Hover or drag across it and a crosshair
  snaps to the nearest session, ringing each lift's line, while the three
  figures above read that day instead of today. Pointer events with
  `touch-pan-y`, so a vertical swipe still scrolls the page; leaving the
  chart puts the figures back.
- **The home page's plan shows today's bar**, "215 lb · 4 × 3", rather
  than the rule "4 × 3–5". `previewWorkout` in `start-workout.ts` is
  Start's own build run early and saved nowhere, so the preview and the
  session cannot plan different numbers — `training-flow.test.ts` holds
  them equal. Keyed under `workouts`, so filing a session refreshes it.
- **Last time is a time it was done.** `workingLoads` skips entries with
  no performed set: an abandoned session keeps every exercise it never
  reached as pending, and reading that as last time reset the planned
  load on all of them. Found by previewing the plan; a test now fails
  without the filter.
- **The rest timer says what the rest is for**: an "Up next" line with
  the next pending set's planned load and reps (`nextUp` in
  `SessionPlayer`), so the bar is loaded while the clock runs. When the
  rest ends the card glows twice in the good colour and, where the
  platform allows (Android, not iOS), buzzes — once, on the change. It
  is the one card with `backdrop-filter`, which is allowed because it is
  fixed; text behind it was reading through the old 95% fill.
- **The Program page is a week strip and a card per day.** It was six
  sections of flat rows, a third of them warm-ups, each row carrying a
  role badge and a sub-category badge that truncated the exercise name.
  Rows are grouped by `inSections` like the session plan, so the heading
  says what kind of work a row is and the badges are gone; the warm-up
  folds; today's card and chip are lit from the clock's weekday; the
  strip is a grid sized to the days so it never scrolls sideways. Two
  columns from `lg`. Settings toggles are a styled switch over a real
  checkbox (`role="switch"`), because the native box was the one
  system-blue control on the screen. **"Ask how recovery feels before
  and after" is gone** — asked _"is it even acting anymore"_: nothing
  read `checkInsEnabled` and no screen ever asked for a check-in. The
  field left `AppSettings` and the parse, so a stored blob's copy falls
  out on read; the `checkIns` store and its backup collection stay for
  the history they hold.
- **Volume targets are gone from the day; only the week keeps a
  view.** Asked: _"I feel like that might be outdated since we just use
  a flat volume across the board now"_. It was: a day's
  `volumeTargets` are the written routine's own set counts credited to
  each exercise's muscle, so "Aiming for lats 5" on the plan card and
  the player's per-muscle pips repeated the set rows, and
  `replanAccessoryVolume` — built to grow accessories when RTS back-offs
  were skipped — solved for the same count on every logged set and
  changed nothing. All three are deleted, and the log no longer copies
  the targets (old logs still carry the optional field). `WeekCard`
  kept a "scheduled" ring for a while and lost it too — _"this still
  seems tied to the target volumes"_ — and the ring counted accessory
  sets while the shape counted every working set (bench week: chest
  10/5). The radar now plots sets done on labelled rings every five sets, the
  routine only choosing which muscles get a spoke; the "also worked"
  list went with it.
- **The calendar picks the session; the cursor is gone.** Asked for as
  _"the app knows what day it is and the workouts each map to a day so
  we should use that rather than keeping a cursor"_. The weekday picks
  the day (`RpDay.weekday`, copied onto `ProgramDay`), whole weeks since
  `ProgramPosition.blockStartedOn` pick the week and cycle
  (`domain/programs/schedule.ts`, `scheduleFor`). **This reverses the
  "a program is a queue, not a calendar" rule** below — right while a
  day was a slot in a generated week, wrong once the week became the
  lifter's own routine by weekday. Finishing moves nothing, reopening
  rewinds nothing, Skip is deleted (a missed day just passes), and
  `jumpToWeek` writes a new block Monday. Today's session is offered
  until a completed log for it exists today; after that, and on a rest
  day, the next scheduled one is offered as "Start it early". **A
  cursor-era position is read, not migrated**: `blockStartOf` takes the
  week it pointed at on the day it last moved, so the switch kept the
  lifter in week six; `startWorkout` then writes the Monday down. The
  cursor was also the one record with no correct merge — it is what
  read Push A on a phone and Pull B on a desktop.
- **The seasons survive only as the backdrop's tint**
  (`domain/time/season.ts`). Nothing is scored against one.
- **The demo is four months of sessions and nothing else**; its guard is
  `seed.test.ts`, which holds that warm-up and conditioning rows are
  completed and that the seed refuses non-empty storage.

**Sync came back as a file, not a database.** Asked for once the app had
to run on a phone and a desktop, with "nothing paid" as a hard rule and
Dexie Cloud and Firestore both turned down. One backup file in the
lifter's own private GitHub repository, read, merged and written back on
launch, page change and visibility (`features/sync/useGitHubSync.ts`,
throttled to fifteen seconds).

- **`mergeNewer` is not the import's merge and must not become it.** The
  import writes the file over what is here — right for a restore, wrong
  for two devices taking turns, where it would undo whichever edits the
  file had not seen. Sync keeps the newer `updatedAt` and purges what a
  tombstone covers. `sync-merge.test.ts` holds both directions.
- **Every tombstoned collection needs a `purge`** in the collection table,
  or the other device's deletion is accepted and the record survives —
  and is pushed back up on the next round. A test enforces the pairing.
- **`recordsFingerprint` is what stops a commit per page switch.** It
  ignores order and settings; if it ever included either, two devices
  would upload a no-op to each other on every round.
- **The token is never in `AppSettings`.** Settings travel inside the
  backup, and the backup is the file written to the repository.
  `STORAGE_KEYS.githubSync` is its only home.
- **A throttled request is deferred, never dropped**, and a saved change
  and a visible minute both ask for a round. Reported on first use: buffs
  cleared on the phone never reached the desktop, because the request
  landed inside the fifteen seconds, was discarded, and nothing asked
  again.
- **A file that fails its checksum is refused, not overwritten** — it is
  most likely a truncated write, and replacing it would discard whatever
  the other device had.
- **Sync never carries the sample.** The deployed build is the demo
  build, so a phone re-added to the home screen after the `/LiftOS/`
  rename filled itself with generated sessions, connected, and merged
  ninety-four of them into the real file. The merge cannot tell sample
  from real, so the separation happens before the first round:
  connecting a device where `holdsSampleData` is true clears it first
  (with a warning on screen), and **Load sample data** is withheld while
  a device syncs. The file was repaired by hand with tombstones for the
  ninety-four ids, which is also the fix if it ever happens again — a
  tombstone newer than the record purges it on every device.

**The sample data is filled, never replaced.** `sampleData` in settings
is `loaded` after seeding (Today shows a dismissible note), `kept`
once dismissed, and `cleared` after Settings → **Start fresh** — which
is what stops a demo build reseeding an empty database on the next
open. **Load sample data** is only offered on an empty app, and
`seedDemoData` refuses anything else regardless. Two named operations,
never one that wipes and refills.

**The premium pass: what moves, and the rules that keep it honest.**
Asked for as updates "readily apparent" to a quick reviewer, with no
input required.

- **Nothing loops near the portrait.** Pulsing rings there were rejected
  as "blinking". Motion is one-time (ring draw-in, figure entrance, a
  single badge shine) or one-directional and slow (ambient washes,
  falling particles, light flowing along tech-tree edges).
- **`.card` paints its border with background layers** (spotlight over
  hairline, `border: transparent`). A utility adding `bg-*` image layers
  to a card will break the border; `--spot` is a registered property
  and must stay one or it snaps instead of easing.
- **`CountUp` runs on `requestAnimationFrame`**, which does not fire in
  a hidden tab — a count reading 0 in a background preview is the
  harness, not a bug. Reduced motion shows the value directly.
- **Every `Link` carries `viewTransition`.** `quietSkippedTransitions`
  in `app/view-transitions.ts` swallows the `AbortError` a fast double
  tap produces; without it every quick tab switch prints an uncaught
  error.
- **The activity grid is `countActs` cut by day** — `tallyActs` is load
  plus count, both exported, so the grid cannot become a second tally.
  Its bands are fixed XP amounts, never normalised to the busiest day.
- **The sample history ends where the Standards card says each lift
  is.** The generated sessions' final five-rep loads estimate the
  sample's `estimatedMaxes`; they disagreed by seventy pounds once, side
  by side on Train.

**The week is upper, lower, upper, lower — Monday, Tuesday, Thursday,
Friday.** `UPPER_LOWER_SPLIT`, asked for as _"update the split to 4 day
upper lower, mon/tues thurs/fri, lowers stay the same"_, with both upper
days written by the lifter: **Upper A** bench, Pendlay row, lateral
raise, barbell curl, skullcrusher; **Upper B** overhead press, pull-up,
rear delt raise, dumbbell curl, overhead triceps extension
(`french-press`). The leg days are unchanged (squat, RDL, calf raise, ab
wheel; sumo, front squat, calf raise, hanging leg raise), keep their
**Legs A / Legs B** titles so history and this week's ticks still match,
and the swings close every day. **Two sets each, one on a deload.** Every
movement appears once a week except the barbell calf raise. Shrugs, dips
and the EZ-bar curl left the week and stay in the catalogue. The
lateral raise stays off the press day (a test holds it). It replaced
upper, legs, push, pull, legs Monday to Friday (`ULPPL_SPLIT`), whose
shrugs-not-before-deadlifts rule no longer has a shrug to place.
**Wednesday is a rest day**, so Start there opens Thursday's Upper B
early — the training-flow tests start on that Wednesday and read it so.

- **One exercise can be two versions in a week.** A `RoutineEntry`
  exercise may carry its own `reps` and `variant`: the calf raise is
  `Heavy` 10–20 on Legs A and `Light` 20–30 on Legs B. **History is
  read per version** — `workingLoads` and `previousSetFor` match the
  variant first, then fall back to any log that is not the _other_
  version (`sameVersion`, `DAY_VERSIONS`). Read by exercise alone,
  Friday's light sets were planned from Tuesday's heavy ones; and with
  a plain newest-first fallback, the light version's first session read
  the heavy log as its last time. `training-flow.test.ts` → "plans each
  calf raise from its own last time" fails without the rule.
- The paragraphs below about Push A and the A/B pairs describe the week
  this replaced.

**The week is the lifter's own routine, and that reverses the rule
against pinning exercises to days.** Asked for as _"make the workout
routine reflective of my current split"_, then split into A and B days
by the lifter's own pairs (_"push A OHP, push B bench, same for pendlay
row and pull-up, squat and deadlift"_): Push A, Pull A, Legs A Monday
to Wednesday, the B days Thursday to Saturday, Sunday off —
`PPL_SPLIT`, with `RpDay.routine` listing each session in the order it
is run. Each pair splits across its A and B day, so every movement
appears exactly once a week; a test holds that. The old rule ("do not
reintroduce a slug list on a day") was right while the week was derived
from volume targets, because a pinned list outlived the targets that
justified it. A routine the lifter wrote has nothing underneath to drift
from. The generator is untouched, still builds any day without a
routine, and is tested against `FULL_BODY_SPLIT`.

- **Each competition lift runs once a week, in competition version** —
  squat on Legs A, bench on Push B, sumo on Legs B. Push A opens on the
  overhead press, which is accessory work at the compound range, so
  day one of the week carries no competition lift at all; tests that
  need one skip forward to it rather than assuming day one.
- **Pendlay Row is its own exercise**, and two catalogue names changed
  to the lifter's words without touching slugs: `french-press` reads
  "Overhead Triceps Extension", `rear-delt-raise` "Rear Delt Reverse
  Fly". Slugs are written into every log; names are labels.
- **The per-muscle volume targets no longer decide the week, so nothing
  on screen reads them.** History and the Program page take their
  weekly targets from `scheduledVolume` over the derived week — what the
  routine actually lists — and `explainVolume`, whose only caller was
  the Program page, is deleted with its tests.
- **`current-program.test.ts` → "the shipped week" pins every exercise
  and its order**, because a routine drifting would still build a valid
  week and fail nothing else.

## Before you finish anything

```bash
pnpm verify    # typecheck + lint + knip + format:check + test:run + build + size + check:csp
```

**Use `pnpm typecheck`, never `npx tsc --noEmit`.** The root `tsconfig.json`
is a solution file of project references, so `tsc --noEmit` against it
can pass while the app is not checked at all — it did, and reported clean
on a call site passing a `ViceId` where an object was required.
`pnpm typecheck` runs `tsc -b`, which builds the referenced projects and
actually looks.

A pre-push hook runs this and refuses the push if it fails. The same
command gates the deploy. If `pnpm verify` is green the change is
shippable; if it is not, it is not — there is no third state.

## Shipping

**Finishing a change here includes pushing it to `main`.** Asked for
directly — _"can we update the skills so this is always the case for
this project at least? Once you're done running, I want to be able to
open the app on my phone, click the reload thing, and see the changes in
effect."_ This paragraph is that standing authorization, and it
deliberately **overrides the global default** of committing only when
asked. The `ship` skill in `.claude/skills/` carries the procedure.

It has to be standing rather than requested each time because of the
shape of this app. There is no staging and no way to look at a branch:
the only build a person can actually use is the one on the phone, and
the only route there is `main` → the Pages deploy → the update banner.
A change that is green on a laptop has reached nobody, so leaving the
push out is not stopping short of the risky part — it is stopping one
step before the change exists.

**It authorizes pushing finished work, not pushing anything.** A red
`pnpm verify`, a half-built change, and anything destructive all still
stop and ask. A red gate is the one state that is never shippable, and pushing it
burns the deploy and the phone together.

**A push is not a deploy, and the gap is about three minutes.** The
workflow re-runs `pnpm verify`, builds, publishes, and then fetches the
live URL and greps it for the app shell and the manifest — so a green
run means the site answered rather than that an upload succeeded. Do not
tell anybody a change is on their phone before that run is green.

**The sha is what makes the update banner falsifiable.** Settings shows
the commit of the running build, so "Already the newest" beside a sha
that does not match the one just deployed separates a phone that will
not update from a deploy that never happened. That distinction is the
whole reason the manual check exists, and it is useless if nobody says
which sha was expected.

## The layer rule

Dependencies point **inward only**, enforced by ESLint
(`no-restricted-imports` in `eslint.config.js`), so breaking it fails the
build with a message explaining why.

```
features/  →  application/  →  domain/  ←  infrastructure/
```

| Layer                        | May import              | Never imports                                          |
| ---------------------------- | ----------------------- | ------------------------------------------------------ |
| `domain/`                    | nothing but itself      | React, browser APIs, any library, any other layer      |
| `application/`               | `domain/`               | `infrastructure/`, `features/`, React                  |
| `infrastructure/`            | `domain/`               | `features/`, `app/`, React                             |
| `features/`, `app/`          | anything                | —                                                      |
| `components/`                | `lib/`, `domain/` types | `features/`, `app/`, `application/`, `infrastructure/` |
| `lib/`, `config/`, `shared/` | each other              | any layer — they are leaves anything may import        |

If a use-case needs something concrete — a repository, a clock, an id
generator — **take it as a parameter** and wire it in `src/app/di.ts`.
That file is the only place allowed to name a concrete implementation.

## Load-bearing invariants

These are each enforced by a lint rule or a test. They are listed here so
you know _why_ before you meet the error.

**The program is never the log.** A `ProgramTemplate` stores intent and a
`WorkoutLog` stores what happened. Never write a result back into a
template. All three predecessor apps collapsed these, and that single
decision is why editing a program corrupted history in every one of them.
Here it cannot happen at all: the template is derived rather than stored,
so there is nothing to write back into.

**Resolution is pure.** `domain/resolution/resolve.ts` turns a
prescription into a number with no I/O and no clock. Keep it that way; it
is where nearly all the tests live.

**Strength is RTS, and only RTS.** Four lifts are run by reps at an RPE
with back-off work driven by measured fatigue percentages
(`domain/framework/rts.ts`) — and **only three of them are a total.**

The overhead press is the fourth. It was removed as a main lift because
5/3/1 wanted one and it contributes nothing to a powerlifting total; the
second half is still true, and was never an argument against training it
heavy. `measure.ts` names squat, bench and deadlift explicitly and
`isCompetition` is false on the press, so it gets a top set and back-offs
without entering the score. **Do not compute the total from
`STRENGTH_LIFTS`** — that was safe while the two were the same three
lifts and is exactly the kind of thing that looks like a tidy-up later.

**One bench, and it is the touch-and-go one under its plain name.** Three
bench variations existed to fill three sessions a week; at one session a
week a rotation has nowhere to go. `bench-press` is the tracked lift again
— the slug never moved, because it is written into every filed log — and
the paused and close-grip versions keep `VARIATION_OF` ratios off it so a
lifter picking one by hand gets a suggested load.

The cost is real and belongs on the record: **this number is no longer a
competition bench.** A touch-and-go single is worth more than a paused
one, so the character sheet's bench standard and the total both read a
little high against a meet. `migrateBenchEstimate` has now pointed both
ways for this reason and is documented in the direction it currently
runs.

**The top set is a triple.** `topSetReps` is 3. The top set is a
measurement before it is training — reps at an RPE, read back through the
chart as an implied max — and a triple sits closer to the single the total
is scored on, so less of the chart's error lies between what was lifted
and what it claims you can lift.

It costs the other job the top set was doing, and that cost is not
recorded anywhere on a screen: five reps at RPE 8 is a real hypertrophy
stimulus for the muscles the lift trains, and three is much less. The
back-offs carry that alone now. If the chest or the quads start looking
thin, this is the change to suspect first — the bench and the squat pay
them less than they did.

5/3/1 was removed wholesale — framework, assembler, recipes, splits,
progression, `percent-training-max`, training maxes. It is in the git
history if it is ever wanted back. Do not reintroduce a second framework
without deciding to carry two of everything again.

**A session measures the estimate it is derived from, and until now
nothing could keep the reading.** The report showed "e1RM 353" and the
only route from there to `estimatedMaxes` — which drives every suggested
load in the app — was reading the figure off the screen and typing it
into Settings from memory. `ApplyEstimates` in `SessionReport.tsx` closes
it: **offered, never applied**, with the old and new numbers side by
side, the same stance the file import takes and the one
`adjust-landmarks` was built with. An estimate that moved on its own
after every session would shift the loads for reasons the lifter did not
choose and cannot see.

Unreliable readings are excluded rather than shown with a warning. A set
of fifteen produces a number the formula is not fitted for, and writing
that into the basis for every future load is worse than leaving the basis
alone.

**Changing `DEFAULT_SETTINGS.estimatedMaxes` reaches nobody who has
opened the app.** `settings-store` takes stored maxes wholesale whenever
there are any, so the constant is the fresh-install figure and nothing
more — the same trap `SETTINGS_SCHEMA_VERSION` exists for, and the reason
the apply path above had to exist rather than a bumped default.

**A test about a ratio must state its own numerator.**
`review.test.ts` → "measures strength as a multiple of bodyweight" read
the squat off `DEFAULT_SETTINGS` and asserted 1.515, so it failed the day
that default moved — a true fact about a constant it does not own, and
nothing about the division it exists to check. It states both numbers now.

**A suggested load is never the prescription.** `estimatedMaxes` (in
settings) is the basis for every suggestion, and an estimate is
acceptable _because_ RTS asks for reps at an RPE: get the number wrong
and the lifter corrects it by loading the bar they were going to load
anyway. This was the opposite under 5/3/1, where the percentage _was_
the prescription and an estimate would have silently changed what a cycle
meant — which is why training maxes existed and why they went with it.

**Strength sets are not hypertrophy volume, and this reverses a rule that
stood for a long time.** The fill used to subtract what the competition
lifting had already paid a muscle — `committed` started at the week's
strength spend, `added` at the day's — on the reasoning that not doing so
turns one coherent programme into a powerlifting block with a
bodybuilding routine stapled to it. That reasoning was sound while a top
set was five reps.

Triples broke it. A top set of three plus three back-off triples is
twelve reps at high load: a real strength dose and close to nothing as
hypertrophy, which the accounting still called eight sets. Eight covered
the chest's entire six-set target, so **the week scheduled no chest work
at all** — no dips anywhere, on a split whose first exercise is a bench
press.

They are counted apart now. A muscle's setting is a claim about the
accessory work scheduled _for_ it, and the competition lifting sits on
top: the chest asks for six, gets six of dips, and is benched heavily
twice besides. The cost the old comment named is real and is now the
lifter's to manage by setting a muscle to fewer sessions, rather than the
assembler's to hide.

**`countsAsHypertrophy` is the one predicate, and conditioning is on the
wrong side of it too.** Volume tracking counts `hypertrophy` and
`assistance` slots and nothing else — not warm-ups, not the competition
lifts, not conditioning. The conditioning case is the one that shows why
this is a _role_ check rather than a judgement about set counts: thirty
sets of ten kettlebell swings arrived as **sixty glute sets a week**
against a target of zero, and it only became absurd once the swings were
prescribed as sets rather than as a block of time. Nothing about the work
had changed. A twenty-minute walk was quietly adding two calf sets by the
same route.

Any test comparing delivery against a target uses `hypertrophyVolume`
rather than `weeklyVolume`, or it is measuring two things against a number
that describes one.

**Incidental credit is spent once.** The fill budgets **compounds before
isolation** (two passes over the same muscles, the first restricted to
`isCompound`), and `shareOwed` subtracts what the day has already paid a
muscle from that day's share **in full**, not diluted across the sessions
that follow.

Both halves are needed and the bug they fix is invisible from the totals.
Monday sized six curl sets against an unpaid biceps target and _then_
placed chin-ups for the lats, which paid the biceps another two and a
half: the day delivered 8.5 against a fair share of 5.7, the week
delivered 21 against a target of 17, and Wednesday — the crowded day —
got the two sets that were left. It reads as a scheduling quirk and is
actually the same credit being spent twice.

**That subtraction starts from the day's strength work, not from zero.**
`added` is seeded with the volume of `existingSlots` — the competition
lifting is the largest thing in the session, and a Monday bench pays the
chest about six credited sets before any accessory is chosen. Seeding it
empty told the fill the chest was untouched, so it added a full share on
top, and the muscles sorted below it got whatever minutes were left. The
rear delts were the visible casualty: 7.5 against a target of 11, fixed
to exactly 11 by this one line.

**A session's share is the remainder divided by the sessions left, not
`target / frequency`.** The fixed share is the cleaner-sounding rule and
is worse, which is recorded here because it will be proposed again: it
spreads the _plan_ evenly and cannot absorb an error, so a day that
over-delivers leaves the whole overshoot on the last session — biceps
7.5 / 5.5 / 3 against 5.5 / 6 / 5.5 for the remainder rule. What matters
is that sessions-left is a **count of days that train the muscle**, not a
measure of how long any of them ran: two sessions with the same muscles
get the same share whether one finished in forty minutes and the other
in eighty.

The backfill has a slot grace of **one**, not just a time grace. A
two-set frequency slot costs four minutes, so a day with time left will
take four or five of them and arrive at thirteen exercises of two sets —
inside the minute budget, and the shape splitting the volume was meant to
avoid.

**The whole volume model is one multiplication.**

```
  weekly sets = sessions a week × sets per session for its level
```

Each muscle carries a `sessionsPerWeek` and a `level`; the levels are four
shared numbers — deload 2, low 3, medium 4, high 5 — and a deload swaps
the level for the deload number while keeping the frequency. Each
competition lift carries a `sessionsPerWeek` of its own.
`domain/volume/levels.ts` and `DEFAULT_LIFT_SESSIONS` in
`domain/priority/tiers.ts`. **Nothing is derived from anything else, and
no number depends on any other muscle.**

Zero sessions is a first-class answer, not a bottom tier. It means the
muscle gets no dedicated work and lives on what the competition lifts pay
it, and it is what most muscles are set to.

**Five sets and three sets are `MAX_SETS_PER_SESSION` and
`minSetsPerSlot`.** With one exercise per muscle per session a level is
choosing how long that single exercise runs, so the high level and the
slot ceiling are the same number by construction. If they drift apart a
level will ask for a slot the fill cannot build.

**What this replaced, so nobody rebuilds it by accident.** Four eras of
increasingly elaborate derivation, each a reasonable fix for the last:
per-muscle RP landmarks (MV/MEV/MAV/MRV, fifteen rows) scaled by a
two-thirds factor for direct-only credit and clamped to what a week could
schedule; a priority _tier_ that chose a position between 0 and 1; that
position lerped through the four landmarks; and the result clamped again
by a frequency the same tier had chosen. Gone with it: `Tier`,
`priorityPosition`, `weeklyTargetFor`, `TIER_FREQUENCY`,
`reachableWeeklySets`, `VolumeLandmarks`, `DEFAULT_LANDMARKS`,
`adjust-landmarks.ts`, and the four position constants.

What is genuinely lost is worth naming because it will look like an
oversight. A landmark is a claim about a **muscle** — side delts recover
faster than quads and can take more — and a level is a claim about a
**session**, shared by everything assigned to it. Per-muscle difference is
now expressed by assigning a different level, which is coarser and is a
decision a person can see and make. If evidence ever justifies real
per-muscle numbers, that is a new field on `MuscleVolume`, not a return to
interpolation.

**The check-in loop went with the landmarks, and it was never wired up.**
`adjust-landmarks.ts` turned check-in history into a proposal to move MAV
— three sessions of evidence, clamped to the band, never applied silently
— and `proposeLandmarks` had no caller outside its own test. It was the
rule nothing could reach that this file warns about elsewhere. If
autoregulated volume comes back, the thing to move is a muscle's level,
and it needs a screen the same day it needs a function.

**Each lift carries its own sessions a week**, `liftSessions` in
settings, two by default. `assignStrengthLifts` places them on the days
whose `carries` matches the lift, choosing the **emptiest** eligible day
each time. Spacing each lift across its own eligible days is the obvious
implementation and is wrong the moment two lifts share a pool: a squat and
a deadlift wanting one session each from the same two lower days both
computed the same index and landed on Tuesday.

**A day holding two lifts runs them in `STRENGTH_LIFTS` order**, so the
squat opens every lower day and the deadlift always follows it. This used
to alternate, and the reason it did has not stopped being true: whichever
lift is second is second after a full top set and its back-offs, every
session, for the whole block, and never gets a day where it is the
priority. The alternation was removed because squat-then-pull was asked
for, and the order of two lifts in a session is a training preference
rather than a correctness property. **The cost is real, unmeasured and
invisible on every screen — if the pull stalls while the squat does not,
suspect this first.** `rp-assemble.test.ts` → "opens every lower day with
the squat" is the record, inverted rather than deleted so that quietly
restoring the alternation has to be said out loud.

**The fatigue allowance equals the load drop, always.** One setting —
`settings.fatiguePercent`, 5 by default and adjustable from 5 to 10 — read
as both. That
equality is what makes the stopping rule sayable: at matched reps and
RPE an implied max is proportional to bar weight, so stopping at a 5%
drop in implied max _is_ the moment the 5%-lighter bar feels like the
top set did. One sentence, no arithmetic, true on every lift. Varying
the allowance by tier (2% to 7%) was coherent and made that sentence false
for every tier but one, which is why the setting is a single number rather
than a pair: two fields would let a lifter set a 5% bar and a 9% target
and there would be no sentence left to say.

**The setting is RTS's published scale and nothing else** — 0 none, 2
minimal, 5 moderate, 7 high, in `FATIGUE_CHOICES`. It was a free integer
from 5 to 10 on the reasoning that a lifter who has run 7% knows something
a general scale cannot. True, and it made the control a slider over
numbers that mean nothing individually: these are four _named amounts of
work_, not samples from a continuum, and "moderate" is a decision a lifter
can make where 5 is a number they can only accept.

`nearestFatigueChoice` snaps a stored value rather than clamping it,
because devices hold 8s and 9s from the old range — a 9 reads as "high"
rather than being dragged to the top of a range it was never on.

**The stopping rule was never wired up, and it printed advice about
itself the whole time.** Reported: _"I hit RPE 8 on back-off set two and
it didn't cap the sets or anything."_ It could not have.
`evaluateFatigue`, `accumulatedFatiguePercent`, `nextBackoffLoad` and
`nextBackoffReps` had **no caller outside their own test** — the entire
live half of RTS. The app planned the slots, wrote "until RPE 8" into
the note, and never read the RPE.

Fifth instance of the pattern this file keeps recording, after
`proposeLandmarks`, `readinessScore` feeding a session adjustment
nothing called, `moveDailyHome` with no control, and the fatigue percent
being decorative for two commits. **A rule that prints advice about
itself is the worst version**, because the lifter believes it is
watching.

`domain/framework/backoff-stop.ts` is the adapter — deliberately not in
`rts.ts`, which works in `PerformedSet` and must not learn what a
`WorkoutLog` is.

**The printed rule and the evaluated rule were not the same rule, and
rounding made them disagree almost every time.** This is the part worth
keeping. The slot says "until RPE 8" from a `stopRpe` baked into its
prescription; the evaluation asked whether the accumulated drop had
reached the target percent. Those agree only when the bar _is_ exactly
the drop — and the bar is rounded to something you can load. Measured on
a real session: 305 drops 5% to 289.75, rounds to **290**, which is
**4.92%** lighter. At matched reps and RPE the implied-max drop equals
the bar drop, so RPE 8 accumulated 4.92% against a 5% target and the
arithmetic said keep going while the screen said stop. The RPE is now
compared to the number that was displayed, read from the record that
displayed it — one rule, one source. It only ever _adds_ a reason to
stop; the arithmetic still owns target-reached and the set cap.

**It reports and offers; it does not act.** The remaining sets are not
cleared automatically — this is a reading of a self-reported RPE, and a
session that deleted work on one tap would be hard to argue with when
the tap was wrong. One button does it, and the sets can still be logged
if the lifter disagrees. They are **skipped, not cleared**: "I chose not
to do this" is a recorded outcome and `pending` means the session was
never finished, which the volume count reads differently.

**The back-off count is derived from the fatigue target, and for a long
time it was not.** Reported from real use: _"back-off sets shouldn't
always display 1–3, they should be the range based on the fatigue
percent set."_ They always did — the count was
`min(maxBackoffSets, STRENGTH_BACKOFF_CAP)` with the cap a flat 3, so
every non-zero target built the same session and the setting decided
only _when to stop_, never what went in the plan.

**The reasoning behind the flat cap was right and incomplete**, which is
why it survived: it said the number should sit where the stopping rule
usually fires, because the slots are materialised and counted as volume
whether or not you reach them. True — and it then fixed that number at
one point on a scale with four. It is the same defect `none` was
already fixed for, arriving further along the same scale.

`plannedBackoffSets` derives it at about `DROP_PER_BACKOFF_PERCENT`
(1.75) lost per set, so 2% plans one, 5% plans three and 7% plans four,
with a floor of one for any non-zero target — rounding a small target to
zero would silently turn it into "top set only", a different choice the
lifter did not make. The constant is an estimate and is named as one;
the stopping rule stays authoritative and fires on the day's readings.

Measured across a working week: **0 / 6 / 18 / 24** back-off sets for
none / minimal / moderate / high, where every non-zero setting used to
give 18. **Moderate is unchanged**, so the shipped default programme
does not move — only choosing a different target does, which is the
whole point.

`STRENGTH_BACKOFF_CAP` is gone. The Plan screen said "At most 3"
whatever the setting was, from the same constant, and now reports the
number your own target plans for.

**None means no back-off slot at all**, not three the stopping rule
immediately cancels. The cap is materialised as slots and counted as
volume, so a plan that is only correct if you skip most of it is not
correct.

**The setting was decorative for two commits and that is the lesson.**
`settings.fatiguePercent` existed, the editor changed it, and
`recipeFromSettings` went on passing `DEFAULT_RTS` — so the control
decided nothing while looking like it worked. A rule nothing can reach is
a rule nobody can trust; a _control_ nothing can reach is worse, because
the lifter believes they changed something. Two tests now assert the
number arrives.
**Frequency is a means to volume, never a goal.** The backfill will not
schedule a muscle already at its weekly target, secondary credit
included. This is the one exception to "every muscle gets the sessions it
asked for", and it is why `rp-assemble.test.ts` → "trains every muscle as
often as its tier asks" exempts a muscle already at target — a second
session for a muscle at its number buys fatigue and no stimulus. Without that guard the two-session floor applied to the front
delts — asking for three sets while the bench press and dips paid them
ten — and put an overhead press on every Friday to satisfy an arithmetic
minimum for a muscle at three times its target. The backfill also orders
by deficit, not by the order muscles happen to appear in `RpDay.muscles`;
that array is grouped by region, and walking it verbatim left the side
delts last in `UPPER` and finishing blocks ten sets short.

**One exercise per muscle per session, three to five sets, or the muscle
is not trained today.** `alreadyCovered` in `pickHypertrophyExercise` keys
on `primaryMuscle` alone. It keyed on muscle _and_ pattern, which let the
compound pass place a row for the upper back and the isolation pass a
shrug, so one muscle's session dose arrived split across two movements and
two ramp-ups. The pattern half is subsumed — two movements for one muscle
are barred whether they share a pattern or not. Day-scoped, because
`placed` is: the _weekly_ repeat penalty still keys on muscle-and-pattern,
and that is what gives the forearms flexion one session and extension the
other.

`minSetsPerSlot` is 3 and `maxSetsPerSlot` is `MAX_DIRECT_SETS_PER_SESSION`.
Those two now describe the same quantity rather than bounding a slot and a
muscle separately, which is what one-exercise-per-muscle makes true — keep
them in step. The floor is the load-bearing half: a one-set slot costs a
warm-up and a machine and delivers almost nothing, and the fill will
happily produce a dozen of them to make a total come out. Below three the
muscle waits for a session that can do it properly.

**There is no session length at all — no minimum and no maximum.** The
minimum went first, and enforcing it had taken three mechanisms: a grace
period letting the frequency backfill overrun, a top-up pass scheduling
muscles already at their target, and a loop lengthening existing slots one
set at a time, all to move a thirty-nine minute session to forty-one.

The ceiling outlived it by a while, as `SESSION_MINUTES_CAP = 70`,
defended as a recovery budget rather than a clock — "one day must not
claim the whole week". That defence stopped holding once a muscle's weekly
target was itself clamped to what its tier's frequency can deliver. **The
target is the recovery budget now**, and the ceiling was a second one laid
on top: a day could satisfy every landmark it was accountable for and be
cut off mid-fill regardless.

What it cost is the reason it is worth a paragraph rather than a line,
because it read as a cap nobody reached right up until the split changed.
Four days with nine tier-2 muscles ran the upper days out of clock at six
accessory slots, so the side delts and the triceps got one session where
their tier asked for two and the traps got nothing at all — a training
decision made by a constant, invisible on every screen and unreachable
from any setting. Removing it took the week from three muscles short to
**zero**, at the price of upper days that run about ninety minutes of
lifting.

**Nothing bounds a day now except the arithmetic that produced its
volume**, and that is genuinely a bound rather than an absence of one: one
exercise per muscle per session, at most five sets, over a muscle list the
split fixes. `estimateDayMinutes` still reports how long a day takes —
reporting is not enforcing — and `SESSION_TOO_LONG_MINUTES` survives as a
line the suite holds the assembler to, not as anything the assembler
consults. If a session comes out too long the answer is fewer muscles at
tier 2 or more days, decisions a person makes and can see, rather than a
constant quietly declining to schedule the last two exercises.

Gone with it: `maxHypertrophySlotsPerDay`, `BACKFILL_TIME_GRACE`,
`BACKFILL_SLOT_GRACE`, `slotMinutes` and `isEasyConditioning`. That last
one is worth knowing about if you go looking for it — it kept the Zone 2
walk out of the accessory budget, because charging twenty minutes of
walking against a recovery allowance it does not consume had once halved
the side delts. With no budget to charge against, it had nothing left to
decide.

A short day is information. A deadlift day with the legs on maintenance
runs fifty minutes because that is what the tiers asked for, and the Plan
screen reports what the week does and does not deliver.

**Zero sessions is zero, and one muscle pays for that.** Quads and
glutes are maintained and fine, because the squat and the deadlift are
scheduled _for_ them and pay well past what maintenance would ask. The
trunk and the grip are maintained and get nothing, which is the intent.

The hamstrings are the case to know about: no competition lift has them as
its primary muscle, and secondary credit is gone, so at tier 3 they
receive **literally nothing** — the Romanian deadlift that used to cover
them was a tier-3 slot and tier 3 no longer has slots. If that is not
wanted, the fix is to move them to tier 2 rather than to reintroduce a
maintenance dose.

**Every working week is identical.** `weeklyTargetForWeek` returns the
target the priority asked for, and MV on the deload. There is no ramp.

There was: week one opened near MEV, the target climbed across the block,
and the last working week touched MRV. That is defensible periodisation
and it cost more than it paid. Every measurement of the program had to
name a week to mean anything, every screen showing volume had to pick
one, and the Program page carried a tab per week that differed only by a
gradient nobody had asked to see. What the ramp was for is autoregulated
instead — RTS moves the loads set by set, the check-ins move the
landmarks on evidence.

The consequence the UI depends on: the Program page shows **one** working
week and the deload, and says that is the whole block. If the weeks ever
diverge again that screen becomes a lie, which is what
`rp-assemble.test.ts` → "gives every working week the same volume" is
guarding.

**Conditioning is programmed but not scored.** It was a mile time nobody
was running, so it sat at Untrained permanently — a fixed zero on a screen
whose job is to show movement. Consistency levelled the session count,
which XP already spends. Nothing measures conditioning, so nothing scores
it; that is the same rule every other area follows.

**Every screen's header comes from `PageHeader` — except Today, which
has none.** It was seventeen copies of one class string, and the
duplication was the smaller half of the problem: a heading over a grey
line is what a settings pane looks like, so every screen in the app
opened the way a form does.

The exception was asked for: _"let's just drop that entire heading
section and just start with the card."_ It holds because every other
title says what the screen is, and **a portrait of you at the top of the
page says it without a word** — so what the header added there was a
noun over an ISO date, above a picture that had already answered. The
level and the date moved into the card and the settings link went with
them. **Do not extend the exception**: a screen that opens on a list
needs to be named, and this one opens on a face.

The page's `h1` had to move with it, and did not for a commit — Today's
headings started at `h2`, leaving somebody navigating by heading no
title for the screen the app opens on. It is the visible `Level N` line
now rather than a hidden "You" beside it: a hidden title is a second
name for the same thing and drifts the moment either changes.

It briefly carried a lit accent rule above the title, and that is gone
again — asked about, within a day, by the person using it. **Decoration
that means nothing has to at least read as structure**, and this did not:
it sat above whatever `leading` put first, which on Today is the
portrait, aligned to the container edge with nothing tying it to the
heading. So it floated in a corner looking like an artifact. The section
rules work because they are _attached_ — a vertical bar directly beside
the words it belongs to — and the accent bar now means "section", once,
everywhere. A page title is the largest thing on its screen and needs no
badge.

`leading` and `action` exist because three screens already needed
them — Today's portrait, Character's settings link, Train's two links —
and a component that could not hold those would have left three headers
hand-rolled and defeated the point.

Two traps came out of migrating them, both worth knowing. A regex of
`^import .*$` matches `import {` — the _first line of a multi-line
import_ — so inserting after it splits the statement. And **a JSX comment
cannot sit inside an attribute expression**: moving a commented block
into `action={…}` is a syntax error, and the note has to move above the
element instead.

**A skeleton reserves the layout; it is not decoration.** Screens
rendered nothing until their query resolved, so opening the app was a
blank page snapping into a full one — and worse than the flicker is that
whatever you were reaching for moved under your thumb as the real content
pushed it down. Verified by the thing that actually matters: Today's
`h1` sits at the same x before and after the portrait loads.

The sweep animates `background-position`, which the compositor handles
without re-laying-out, and the reduced-motion block collapses it to a
flat block — the correct still version, rather than a gradient frozen
mid-sweep.

**The act acknowledgement reports; it does not reward.**
`app/xp-award.ts` and `components/shared/XpAwards.tsx`. Ticking a habit
changed a checkbox and finishing a session navigated away — the XP was
real the whole time and nothing said so at the moment it was earned. The
badge reads its number from `actById` in the registry, so it can never
announce a figure `tallyActs` will not agree with; a component holding
its own copy of "a daily is 15" would drift silently, with the sheet and
the badge both looking authoritative. `registry.test.ts` holds that
coupling.

It fires on an **act**, never on an outcome, which is the line XP itself
is paid along. **Undo pays nothing** — not a negative badge and not a
silent one; it takes the day back and the sheet shows that at the next
read.

**Which act a habit performs comes from the record, not the screen.**
`dailyActFor` in `registry.ts`. A chore pays `base.chore-kept`, upkeep
pays `vitals.upkeep-kept` and a daily pays `dailies.completed` — the same
fifteen points under three names, split by `belongsTo` in `tallyActs`.

This used to be the _caller's_ answer, on the reasoning that the screen
doing the calling was the area. That was true while each screen showed
one home and stopped being true the moment Today began reporting
everything due: a chore ticked there announced "Kept a daily". The XP was
never wrong — `tallyActs` reads `belongsTo` and always did — but the
badge is supposed to say what the registry says. **Reading the same field
in both places is what makes them agree by construction**, where naming
the act at the call site only made them agree by attention.

**Its lifetime is a timer, not `animationend`.** The reduced-motion block
collapses every animation to 0.01ms with `!important`, so a toast that
removed itself when its animation finished would flash and vanish for
exactly the people who asked for less movement. The timer decides when it
goes; the animation only decides how.

**`Empty` is a slot, not an apology.** On a database that is mostly empty
— which every database is for its first weeks — empty states are the
majority of what is on screen, so "this app looks unfinished" and "this
app is new" are the same picture unless that one component separates
them. A dashed edge and a marked centre read as a space with a shape.

**Visual work has to land on what is always on screen, and the first
attempt did not.** A whole pass went into a weight chart, meters and
motion, and the honest report from the person using it was that it looked
the same. It did, and the reason is worth keeping: **almost all of it was
conditional on data.** The chart needs two weigh-ins inside twenty-eight
days, the season bar needs a previous season to beat, the meters replaced
bars that already existed, and a gradient on a six-pixel bar is invisible.
Meanwhile `body` was a flat colour and `.card` was a flat colour with a
hairline border — the two rules that render on every route, untouched.

So the ordering rule: **change the always-visible surfaces first, and the
data-conditional ones after.** Page background, card, navigation,
section heading, primary button. Those five are on screen on an empty
database, and they are what "does it look different" actually means.

**The accent is cool, and the palette is one place.** Asked for as
_"I'm not a fan of the orange in the app, I'm more a cool dark tones
guy."_ `--color-accent-*` went from orange at hue 44 to cyan at 200, and
that one trio reaches the navigation, every meter, the level ring, the
focus outline and the glow behind the page — which is the whole argument
for a token: the change is three lines rather than forty files.

**`--color-cool-500` had to move with it**, from blue at 235 to violet
at 285. It was a blue distinct from an orange accent, and against a cyan
accent it was two shades of one idea — Elite and Intermediate sit beside
each other in the ladder legend and stopped being two badges. Checked on
the legend, which is the one place all five levels appear at once.

**`--glow-warm` is `--glow-accent` now.** A token named for a
temperature that is no longer true is the kind of name this file keeps
warning about; it is named for the token it mixes from instead.

**`.numeric` dropped the monospaced face and kept `tabular-nums`.**
Reported as _"that font is hard to read"_ — and at `text-xs` on a dim
ink a typewriter face costs legibility for nothing. What the class is
_for_ is figures that do not shift width between renders, which the sans
stack does just as well. `--font-mono` still exists as a Tailwind theme
token and nothing uses it.

**There is no light theme, and what was removed had never worked.**
Headings are `text-ink-50` directly rather than through
`--text-primary`, so the semantic tokens flipped and the headings stayed
near-white on white — the deployed sign-in card had an invisible title.
Reported and settled in one line: _"I don't care about light theme, can
we just gut that code."_ Gone are the `prefers-color-scheme: light`
block, the `[data-theme='light']` block, and `light` from the
`color-scheme` meta, which would otherwise have the browser paint form
controls for a theme the app does not have.

**Bringing one back is not putting those blocks back.** The work is
routing every `text-ink-*` in the app through the semantic tokens
first — that is the bug that made them useless, and re-adding the blocks
without it recreates exactly the version that shipped broken.

**`--color-ink-600` did not exist, and twenty call sites were rendering
near-white because of it.** An undefined token compiles to no colour at
all, so `text-ink-600` left the text inheriting `--text-primary` — every
"Nothing measured yet", every "Looking…" and every muted caption across
the atlas, quests, dailies, train and character screens read at full
strength instead of receding.

It survived because **it looked like a design choice rather than a
fault**: a bright caption is perfectly legible, it is only wrong about
its own importance. Nothing could catch it — the class is spelled
correctly, so no linter or typecheck has an opinion, and it renders
without error. It was found by inspecting a _computed_ colour in the
browser while checking something else, which is the only way it could
have been.

The lesson is narrow and worth keeping: **a Tailwind colour class is not
evidence that a colour was applied.** If a shade matters, read it back
off the element.

**The buttons are made of what the cards are made of.** Reported against
the old primary: _"I don't like the style of this button. Let's make all
of these similar to the glassmorphism cards."_ It was a solid saturated
fill with black text — a paint swatch on a page made of panels, and the
one element that looked like it came from a different app.

**`.control-surface` is `.card`'s recipe with the tint left to the
caller**: a vertical gradient, an inset hairline along the top, a shadow
underneath, and a border at the same hue. One class serves every variant
through `--control-tint`, and `--control-fill` is how loud the fill is.

**It is not `backdrop-filter`, and that is the point rather than a
shortcut.** Real glass re-samples what is behind it every frame, which
this file already forbids on anything that scrolls — and these buttons
sit in lists. What makes a surface read as _lit_ is the gradient and the
top edge, not the blur.

**The primary keeps a glow, and it is the only variant that does.** That
is what stops "made of the same stuff as the cards" collapsing into
"indistinguishable from the cards": a card does not glow, and on most
screens this is still the one thing you came to press. `ghost` stays flat
for the opposite reason — giving it a surface would make every icon on a
row read as something to press.

**`text-accent-300` does not exist, and the first version of this shipped
it.** An undefined Tailwind colour compiles to no declaration at all, so
the label inherited `--text-primary` and came out near-white: legible,
plausible, and not the colour anybody chose. **This is the
`--color-ink-600` bug in this same file, reproduced within a day of
reading the note about it** — the scale is 400 / 500 / 600. It was caught
the only way it can be, by reading the _computed_ colour off the element,
which is exactly what that note says to do.

**A long-lived dev tab is not evidence about CSS.** Debugging the above,
a pressed toggle measured as `ink-300` with **no rule setting `color` on
it at all** — which is not a state the code can produce. A hard reload
gave `oklch(0.79 0.11 200)`, the right answer. After enough HMR passes
the stylesheet in the tab had drifted from the one on disk; a surprising
computed value is worth re-checking on a clean load before it is worth
explaining.

**A card reads as a panel through three cheap things**: a vertical
gradient so the surface is not uniform, an inset hairline along the top
so it catches light, and a shadow so it sits above the page. None of them
is `backdrop-filter`, which must stay off the surface that scrolls.

**The sheen and shadow are tokens because they invert.** A highlight is
white on dark and _nothing_ on white, so a hardcoded
`rgba(255,255,255,…)` would draw a bright smear along the top of every
card in the light theme. `--card-sheen` is transparent there.

**`Meter` takes `value` and `of`, and there is no `percent` prop.**
`components/shared/Meter.tsx`. A percentage is where a denominator goes
to hide: a bar at 70% of a threshold this app invented looks exactly like
a bar at 70% of your own last season, and only one of those is a
measurement. Making both numbers required forces every call site to name
what it divides by, which is the question `docs/GAME_MODEL.md` answers.
`of <= 0` draws the track alone — nothing over nothing is not complete.
`BarSeries` takes its scale the same way rather than normalising to the
tallest bar present, which would make a season where nothing happened
look exactly like one where a great deal did.

**The weight chart's corridor is projected, because the target is a
rate.** `projectCorridor` in `domain/vitals/weight.ts`. A rate is not a
range of weights until it is anchored to a starting point and a length of
time, so the band is two lines spreading from the earliest reading shown.
Its limitation is real and stated on the screen: one unrepresentative
first weigh-in shifts the whole corridor. **`phaseVerdict` remains the
judgement** — it reads the smoothed fortnight — and the corridor is
guidance drawn behind the line. `low` and `high` are named by value, not
by which edge of the band produced them: on a cut both edges are negative
and `min` is the lower weight, on a bulk `min` is the upper one, so a
caller assuming otherwise draws one phase inside out.

**A trend chart is scaled to its data; a bar series is anchored at zero.**
A weight chart from zero is a flat line near the top of the box, because
the interesting range is the three pounds it moved. That reasoning is
exactly wrong for a count, which is why the two are separate components
rather than one with a flag.

**Motion is gated once, globally, and never per component.** The
`prefers-reduced-motion: reduce` block in `index.css` collapses every
transition in the app to 0.01ms with `!important`, so a new animated
thing is covered by construction and there is no per-component gate to
forget.

**`backdrop-filter` belongs on fixed surfaces only.** It is among the
most expensive things a mobile browser can be asked for and it costs most
on a surface that moves, because every scrolled frame re-samples what is
behind it. The navigation is fixed and composited once. **It does not go
on cards** — that is where it would be asked for next, and a gym app
would pay for it on every frame of every list.

**`Date.now()` slips past the no-`new Date()` lint rule, and it is the
same defect.** The chart's window was written with it and had to be
changed to take the clock: a window that cannot be held still is a chart
no test can assert about. If a component needs the time, it takes
`useServices().clock.now()`.

**A text field does not share a row with two other controls at 375.**
This has now shipped four times, and it is written as a constraint rather
than as a story about one form because the story is what let it recur:

| Where                                                     | The field came out at                          |
| --------------------------------------------------------- | ---------------------------------------------- |
| Quests, add form (name + Side/Main + Add)                 | **177 px**, clipping _"Something you are tr…"_ |
| Codex, filter row (search + status + sort)                | **26 px**                                      |
| Map, filter row (search + kind + sort)                    | **109 px**                                     |
| Map, "The world" heading (title + Trips + waiting + Walk) | the **title** wrapped to "The / world"         |

**The mechanism is always the same**: a `select` takes its intrinsic
width from its longest option — "Currently Using", "Recently Added" — and
a button from its label, so `flex-1` on the field gets the remainder,
and the remainder at 375 is nothing. Two of these were found by
_measuring_ rather than by looking, which is the only thing that finds a
26-pixel box: it does not look broken, it looks like a narrow control.

**The fix is a row of its own for the field**, with the remaining
controls sharing the next row at `flex-1` each. Measured after: 343, then
168 · 168.

**A report of "I can't do X" is not always a broken X.** The quests one
was reported as _"I don't seem to be able to add new side quests"_ and
**the form worked**. A control that cannot finish saying what it is for
reads as disabled, and the loud button beside it reads as the whole form.
The fix is layout, and saying so is more useful than a changelog line
claiming a bug was fixed.

**A report of "I can't do X" is not always a broken X.** Driving it
found a working form nobody could see was a form; the fix is layout, and
saying so is more useful than a changelog line claiming a bug was fixed.

**A step's tick is a box, empty or ticked — never a ✓ that means "press
me".** Reported: _"I added a new side quest, but the steps make it seem
like they're already completed once we add them."_ They did. A pending
step drew a bare check and a closed one drew an **undo arrow**, so a
fresh three-step quest opened looking exactly like a finished checklist,
with _0% done_ directly above it saying the opposite.

The icon was the **affordance** rather than the state — press this to
close it — and nothing on the row reported which state it was in except
a strikethrough that is easy to miss. An empty square reads as
outstanding to everybody, which is why `DailyRow` has drawn one since it
was written; `ActionRow` uses that control now rather than a new one.
Unticking is the same box, for the same reason a daily's is.

**The general rule this is the second instance of: an icon that changes
between two actions cannot also be the record of which state you are
in.** Both readings are available and the wrong one is the first one
anybody takes. Where a control toggles, draw the _state_ and let the
press be implied.

**The worker and the page answer two different questions, and
`registerType: 'prompt'` answered both with "wait".** "Should the new
version take over as the worker" and "should this page reload right now"
are not the same question. Prompt mode installed a new version and left
it _waiting_ indefinitely for a client to send `SKIP_WAITING` — so a
banner missed once, or answered with "Later", left the old shell serving
forever, and closing the app and opening it again never promotes a
waiting worker. Every restart re-showed the banner and changed nothing.

**The client-side repair for that shipped and could not reach the device
that needed it**, which is the part worth remembering. It lived in the
bundle the stale worker was refusing to serve. **Only a change to the
worker itself reaches a stuck install**, because a browser fetches
`sw.js` from the network directly rather than through the worker it is
replacing — it is the one file that always gets through.

So the registration is `autoUpdate`: the _worker_ activates as soon as it
installs. The _page_ keeps the prompt, through `onNeedReload` — without
that handler the library reloads by itself, which is the mid-session swap
prompt mode existed to prevent. The banner's button is a plain
`window.location.reload()`, because `updateServiceWorker` only does work
in prompt mode and would otherwise look like a button that did nothing.

**`autoUpdate` also forces `clientsClaim`, and the workbox options cannot
turn it off** — setting `clientsClaim: false` there is inert, verified by
reading the generated `sw.js`. That matters because claiming hands the
open page to the new worker while it is still running the _old_ bundle,
so a dynamic import asks for a chunk by a hash the new precache does not
hold and a fresh deploy has removed from the server. `stale-chunk.ts`
closes it: Vite raises `vite:preloadError` for exactly this, and the
handler reloads once. It reads `PerformanceNavigationTiming.type` rather
than storing a flag — a page that is already the product of a reload must
not reload again, and a flag written to survive a reload is persistence,
which belongs behind a port.

**There was already a version line in Settings and it said "Lift".**
`VITE_COMMIT_SHA` and `VITE_APP_VERSION` have been injected by the deploy
all along. The rename missed this one footer, so the single place that
could answer "which build am I on" was labelled with a name the app has
not had for months — worse than nothing, because it reads as a different
app — and it sat below the fold with nothing to press. A `define` was
added to solve that before anybody looked for what existed, and has been
removed again. **Look for the thing before building it** is the standing
rule, and this is the freshest example of what ignoring it costs.

**Settings also carries a manual "Check for updates", and that is
deliberate duplication.** The banner asks, a waiting worker is applied at
launch, and if either fails there has to be something a person can press:
an update path with no manual override cannot be debugged from the far
end of a phone. It answers in words — "Already the newest" is the reply
that was impossible to get before, and it is the one that separates a
device that will not update from a deploy that did not happen.

**The service worker registers fine, and the paragraph that used to sit
here said it could not.** It claimed registration was refused in the
agent's browser ("An unknown error occurred when fetching the script"),
so the whole lifecycle shipped on reasoning. Measured against the
deployed HTTPS site: **one registration, `activated`, controlling the
page** — and the "new version is ready" banner has been seen firing after
a deploy, so `onNeedReload` is exercised too.

**What is genuinely still undriven is narrower:** offline serving from
the precache, and the full install → wait → skip-waiting sequence across
two versions in one session. Those want a real browser against
`vite preview` with the network cut.

**Third carried-forward claim checked this round, and the second one
wrong**, after "tombstones are vestigial". Both were written once from
reasoning that sounded complete and then repeated for months across
several documents. **A claim that something _cannot_ be done is worth
re-running before it is repeated** — environments change, and nothing in
a test suite can contradict a claim about what is untestable.

**A shipped change reaches an installed PWA only when something asks for
it.** `registerType: 'prompt'` decides what happens once a new version is
_found_ and does nothing about finding one; the browser checks on a full
page load, and a PWA on a phone is rarely loaded again — it is resumed
from the background for weeks. So a green deploy could sit undelivered
indefinitely with no banner and nothing visibly wrong, which is what was
behind every "it hasn't updated" in this project's history. `UpdatePrompt`
now calls `registration.update()` whenever the app becomes visible.
Resuming is the right moment: the check is a conditional request for one
small file, and it lands when the user has just come back rather than
mid-set.

**An installed iOS web app reports `best-effort`, and that is the
safest state the platform has.** Safari refuses
`navigator.storage.persist()` outright, so the state alone cannot
separate a tab from a Home Screen app — while iOS deletes an
unvisited site's script-writable storage after about a week and
exempts an installed app from exactly that. So the reading was amber
and the advice was "add the app to your home screen", on a device
where the app was already on the home screen. Advice nobody can act
on, beside a warning nobody can clear, is how a person learns to
ignore the one screen that reports durability.

`StorageStatus` carries `installed` beside the state for that reason,
from `display-mode: standalone` with `navigator.standalone` checked
first. The badge goes neutral rather than good — best-effort is
genuinely what it is — and the sentence names what can still take the
data instead of asking for an install that already happened.

**Home Screen storage is separate from Safari on iOS, which is the
trap worth knowing.** The same origin opened in the browser and
opened from the icon are two IndexedDB stores, so anything entered
before the shortcut existed is not in the installed copy and never
will be. Nothing in the app can merge them; **sync is the only route
across**, which makes Firebase the difference between an annoyance
and a silent loss on iOS specifically.

**iOS 16.4 gave a Home Screen web app Web Push, and the daily still
cannot ring.** The reason narrowed rather than went away: push needs
a server to send from, and scheduling a purely local notification is
available nowhere. The design stands — see the dailies note — but the
blanket claim that iOS gives a PWA no notifications at all is now
too strong.

**Form fields are 16px on coarse pointers, and it is a bug fix.** Mobile
Safari zooms the whole page when a focused input's font is under 16px,
and the viewport meta deliberately sets no `maximum-scale` — suppressing
the zoom that way disables pinch-zoom, which is an accessibility control
and not ours to remove. It does not zoom back out, so one tap on a search
box left the layout scrolled sideways with the heading clipped on one
edge and the navigation clipped on both. It reads as a broken app; the
cause is two pixels of font size.

**That rule lives outside `@layer` on purpose.** Unlayered CSS outranks
every layered rule, and the fields carry Tailwind's `text-sm` from the
utilities layer, which is emitted after `components` — so the same rule
written there loses and the zoom returns. It is not a specificity trick
awaiting a tidy-up; it is the only place it can sit and win.

**A rule nothing can reach is a rule nobody can trust.** Both the quest
log's cycle guard and the tree's were briefly unreachable from the UI —
the domain refused correctly and no screen could ask it to. Adding a
domain rule means adding the control that can trip it, or the guard is
decoration with a test attached.

**A day key is local, and mixing it with a UTC date shipped five
times.** `toDayKey` reads `getFullYear`/`getMonth`/`getDate`, so it is
the day the person is standing in. `toISOString().slice(0, 10)` is the
UTC date. West of Greenwich those disagree for the last hours of every
evening, and every place the two met was a bug:

- A habit asked for three times a day **could not be finished after
  about seven in the evening**. `complete` stamped `at.toISOString()`,
  so the entry carried tomorrow’s date, `timesDoneOn` did not count it,
  and the row stuck at 2 of 3 — while the write succeeded and the XP was
  paid, which is what made it look like the tick was working.
- `vitals.days-within-limits` counted an evening drink against the
  wrong day, **and counted entries rather than amounts**, so a 400 mg
  caffeine ceiling needed four hundred separate coffees to register as
  breached.
- A trip flipped from upcoming to past several hours early.
- The weight chart’s window boundary dropped its oldest reading.

`complete` now writes `${day}T${localTime}` with **no `Z`** — the first
ten characters are the day key by construction, which is the only
contract `timesDoneOn` has, and a `Z` would be a claim about an offset
the string does not carry. `amountSpentOn` in `charges.ts` is the same
answer for pools: it parses the entry and converts, because a spend
_is_ a real instant and `#95` on the end means `new Date` on it yields
Invalid Date.

**Nothing rewrites entries already stored.** An evening completion
filed under tomorrow is wrong by a day and there is no way to know by
how much — the offset it was written at was never recorded, and
assuming the current one would corrupt anything logged while
travelling. They stay as they are and read as a completion on the
following day, which is what the record actually says.

**The suite runs in `America/New_York` now, and that is the real fix.**
In UTC a local day key and a UTC date prefix are the same ten
characters, so every assertion about this passed while the app was
wrong for half of every day for anyone in the Americas. Moving the
suite cost nothing — all 1,227 tests passed unchanged on the first run
— which is the measure of how little it was covering. A lint rule bans
`.toISOString().slice(0, 10)` so the next one fails the build instead.
The ten-character slice only: a longer one is a timestamp for a
filename, where UTC is right and nothing compares it to anything.

`shiftDay` is the one deliberate exception and carries a disable
comment. It is calendar arithmetic on a key rather than a reading of a
clock — `parseDay` builds midnight UTC and `keyOf` formats one back, so
a day is exactly 86,400,000 ms. Reading it locally would be the bug.

**A shipped change to a default reaches nobody who has already opened the
app, and `SETTINGS_SCHEMA_VERSION` is the way out.** Settings are
persisted on first run, so **the store cannot tell a value the lifter
chose from a default it saved on their behalf.** `completeLiftSessions`
and `completeMuscleVolumes` correctly refuse to overwrite either — which
meant the overhead press shipped and nobody saw it, because every stored
copy had `bench: 2` and no `press` key. The programme on the device went
on using numbers from the version it was installed under, and the only
way out was a button on the Settings screen nobody knew to press.

The version was stored and never read, deciding nothing. It now gates
`liftSessionsOf` in `settings-store.ts`: a copy older than schema 2 is
re-seeded wholesale rather than completed, because completing it produces
neither the old programme nor the new one — the bench keeps both upper
days and the press has nowhere to go.

**Bump it for a change of _meaning_, not for every change of value.** It
overwrites a real choice, once, for anyone who had deliberately set the
bench to twice a week; that is the price of not being able to tell that
apart from a default. A default that merely moves is still surfaced by the
divergence card rather than forced.

**A field added to `AppSettings` must be added to the parse.**
`infrastructure/storage/settings-store.ts` builds its result field by
field rather than spreading, which is what makes an unknown blob safe —
and what makes a new field silently vanish on the way back in. This has
now caught two fields: `updatedAt`, which meant settings were stamped on
every write and never synced, and `exploredRegionKm2`, which meant the
exploration ladder read "nothing measured" against a number sitting in
storage the whole time.

**Upper, lower, upper, lower — and no borrowing.** `RpDay.muscles`,
one list, one fill pass. Two earlier attempts at balancing the week are
in the git history and both were wrong: listing the arms on every day
(heavy pulls followed by upright rows) and an `overflowMuscles` list a
leg day picked up once its own work was done (better ordering, same
output). A deadlift day briefly owned the back as well, which was
coherent while the lats were prioritised and stopped being so when they
were not. What does not fit is reported on the Plan screen rather than
tucked into whichever session had a gap.

**A lift trained more than once a week needs .** RTS
autoregulates the _load_ on a third bench session — you are tired, the
weight that feels like RPE 8 is lighter, nobody prescribes that. It does
not autoregulate the **fatigue allowance**, because that is a decision,
not a reading: left at the same value it asks for a full session of
fatigue three times a week and a twelve-set chest target came out at
eighteen. A day spends of it.
The cap moves with the allowance too — the app materialises the cap as
slots and counts them as volume, so a plan that is only correct if you
stop early is not correct.
**The deload keeps the muscle's frequency and shrinks the session, and
getting there took three fixes and one reversal.** `setsPerSession.deload`
is 2, so a muscle trained twice a week gets two sets on each of those two
days.

The frequency backfill does not run on a deload at all. It places at the
slot floor regardless of the target, so it was putting three sets on both
upper days and the biceps came out at six in the deload and six in the
peak week. Frequency is a means to volume, and on the one week where the
goal is _less_ volume a floor that only ever adds has no business firing.

`floorFor` caps the slot floor at what the settings say a session holds,
because a floor above the ask schedules nothing — a flat three against a
two-set deload delivered zero.

**And the third fix had to be undone when the model changed under it,
which is the part worth remembering.** `shareOwed` briefly forced the
deload to a single session. That was right while a deload target was a
weekly _total_ of two sets: spreading two over two days asks for one each,
under any floor, and scheduled nothing. The deload is now stated per
session, so the frequency is already accounted for — and the override
survived long enough to deliver the whole week in one sitting: four sets
on Monday and none on Thursday, for a setting that reads "two sets per
session". A fix that encodes the shape of the model it was written against
outlives its reason silently.

**A muscle's numbers depend on that muscle and nothing else.** Two
settings multiplied makes this nearly impossible to break, which is
exactly when the warning is worth keeping: there used to be a
`spreadFactor` scaling every target by how crowded the top tier was —
sound reasoning ("prioritising everything prioritises nothing"),
catastrophic as an implementation. Every target depended on every other
muscle's placement, so moving the biceps out of tier 1 silently raised the
side delts from 22 to 24, and a lifter could not state a mental map
without the app renegotiating it. The idea returns as a reasonable
suggestion rather than as a bug. **Do not reintroduce a cross-muscle term
here.**

**"You cannot prioritise everything" is a capacity report, not a
multiplier.** It lives on the Plan screen: the settings state the ask, and
the page lists any muscle the hardest week of the built program leaves
short. Measured off the assembler's output rather than modelled, so it
cannot drift from what the program does — and **counted per muscle, never
in aggregate**, because every set pays two or three muscles and the
delivered total therefore exceeds the asked total even when individual
muscles are starved.

**A jump is the only non-training way to move the position.**
`jumpToWeek`. Everything else advances by finishing or skipping, which
is right — the position records what happened. But a lifter arriving
mid-block would otherwise skip fifteen sessions to line the app up.

**Nothing scales today's session from a self-report, and the rule behind
that survives the thing that broke it.** A readiness check used to claim
it trimmed a session and never did — it is gone. What must stay true is
the second half: a bad night is not evidence about **intent**, so
nothing may write back to a muscle's sessions or level. Those are the
lifter's statement of what they mean to do. The load is autoregulated
set by set by RTS instead, which is a reading rather than a rating.

**The program is derived, never stored.** `deriveProgram(settings,
library)` in `application/use-cases/programs/current-program.ts`. Only the
_position_ persists. Storing the program produced the same bug four times
— a change reaching the code and not the copy on the device — and each
fix patched one delivery route while leaving the others open: additive
sync, then content refresh, then retirement, then re-snapshotting. All of
it is gone. There is no library, no built-in program, no instance, no
frozen snapshot, and nothing to press to pick up a change.

**Derivation must be deterministic.** Same settings in, byte-identical
program out, slot ids included. A workout in progress refers to its day
by position and its sets by index; a program that differed between reads
would make every one of those a guess. That is why assembly takes an id
generator as a parameter — `current-program.ts` passes a counter, not
`crypto.randomUUID`.

**A log describes itself.** A `WorkoutLog` embeds the prescription,
planned load and planned reps of every set. That is what made the frozen
snapshot unnecessary: history never needed the template to interpret it.
Do not "normalise" this by referencing a program instead.

**A position is clamped, not reset.** The program can get shorter under a
lifter — five days a week to three. `clampPosition` pulls them back
inside it. Resetting to week one instead would cost them a block.

**Skipping, abandoning and finishing are three different things.**
Finishing advances the program and files a log. Skipping advances it and
writes _nothing_ — a day trained elsewhere did not happen here.
Abandoning does not advance it at all: with nothing logged the record is
deleted, and with sets logged it is kept as `abandoned`. Every one of the
alternatives puts an empty workout in the history, where it counts as a
training day and drags every frequency and volume figure down. Finishing
and skipping share `nextPosition` so they cannot drift.

Two more say something about the _record_ rather than the training, and
they are the pair most easily confused. **Deleting** answers "this
session did not happen" and deliberately **moves nothing** — removing a
record is a claim about the record, and rewinding the program from there
would make one destructive action into two, the second invisible.
**Reopening** answers "it is not over yet", and therefore **must** move
the program: the session is still running, so the position finishing
advanced past is simply wrong, and left forward the lifter finishes
today a second time and lands two days on.

`reopenWorkout` restores the position **from the log**, not by inverting
`nextPosition`. A `WorkoutLog` records where it sat, so there is a right
answer to read; a subtly wrong inverse would only surface on the last
day of a block. It refuses four cases rather than resolving them —
nothing left pending, another session already open, a later session
already filed, no such workout — because each of those is a different
request wearing a resumption's clothes.

**Choosing is not ordering.** The fill picks exercises by which muscle
is owed the most, which is right for deciding _what_ is in a session and
wrong for deciding _when_. `inSessionOrder` is a separate pass:
warm-ups, the competition lift, compounds heaviest-first, isolation,
conditioning. Without it a day opened with a maximal deadlift, went to a
calf raise, and came back to a squat.

**The grip and the trunk go last.** `TRAILING_MUSCLES` — forearms and
core — sort after every other lift and before the conditioning. Both are
prime movers in work they are not the point of: the forearms hold every
row, chin-up and deadlift, and the trunk braces every squat and press. A
session that curls the wrists first arrives at its pulling with a grip
that gives out before the lats do.

Applied **after** the alternating reversal rather than inside the sort,
because the reversal would otherwise flip them to the front on every
second session — the exact arrangement this prevents, arriving by a route
that looks like variety. And reinserted at the last accessory position
rather than appended, or a kettlebell swing ends up ahead of a wrist curl
and "finishes with conditioning" is quietly undone.

Worth knowing where they land: **the forearms are on upper days and the
core is on lower ones** (`LOWER` in `rp-splits.ts`), so the rule shows up
as a wrist curl closing an upper session and ab work closing a lower one.
Both are at zero sessions by default, so neither is scheduled until
somebody turns them on.

**The session preview groups consecutive runs, and must never group
by role.** `inSections` in `domain/programs/program.ts`, used by the Train
screen's next-session card. Splitting the warm-up into a row per movement
took that card from nine rows to sixteen, a third of them the same five
things every session, so it reads as sections now — Warm-up, Strength,
Compounds, Isolation, Conditioning — with the warm-up folded.

Grouping by role would look identical almost always and would be **a
fourth opinion about session order**, competing with `inSessionOrder`,
`reverseAccessoryBlocks` and `trailingLast`. The last one is where it
breaks: it moves the grip and trunk work to the end of the accessory
block _past slots of another role_, and a by-role pass would quietly pull
a wrist curl back above the isolation it was deliberately placed after.
Consecutive runs cannot reorder anything, at the price of a heading that
can repeat — which is honest rather than a defect.

The headings are deliberately not `SLOT_ROLE_LABELS`: that map answers
"what kind of work is this row" for a badge and therefore collapses
`hypertrophy` and `assistance` into one word, which is exactly the split
a heading needs. Only the warm-up folds, because it is the one part that
is the same every session and asks for no decision.

**The accessories run backwards on alternate sessions of a region.**
Compounds still precede isolation — each block is reversed within itself,
never across the boundary — so what changes is which muscle meets a fresh
lifter. A fixed order spends the fresh part of every session on the same
muscle for a whole block: the row opened both upper days and the lateral
raise closed both, every week.

The cost is the mirror of the rule it bends, and it is why this
alternates rather than applying to every day. Compounds are ordered
heaviest-first so the work that most needs a fresh lifter gets one, and on
the reversed day the heaviest compound goes last — each arrangement is had
half the time. The parity is counted per _region_ rather than from the day
index, for the reason the exercise rotation had to be: the two upper days
of a four-day split are indices 0 and 2, both even.

**Names are derived, never written.** `describeDay` reads a day's `label`
and `focus` off its finished slots; `describeBlock` reads the block's name
and description off the tiers. A hardcoded "Monday — press and pull" is a
claim that goes stale the moment a tier moves. The `focus` line separates
direct work from what the day only pays incidentally, ranked by share of
each muscle's weekly target — merging the two named an upper day after
the core, because pull-ups pay it a fraction and its target is small
enough for that fraction to win. The heading is **which half of the body, and which time
through** — "Thursday — Upper 2", from `RpDay.focusName`; the muscles are
the sentence under it. It named the kinds of work present until every day
carried all three, at which point four identical headings distinguished
nothing. **Every muscle with direct work is named**, uncapped: a reader
who can see a curl in the session and no biceps in the description has
found a bug whatever the arithmetic said.

**Every slot has a category and a sub-category.** Strength splits into
`Top set` and `Back-off`, hypertrophy into `Compound` and `Isolation`,
warm-ups into `Upper` and `Lower`, conditioning into its intensity
domain — `Zone 2` or `HIIT`. **Two conditioning domains, not three**:
LISS and Zone 2 are the same work under two names, so the incline walk
and the easy run share a label. What separates those two is systemic
cost, which the exercise already carries. The sub-category lives on
`Slot.variant` and is copied onto `LogEntry.variant` at start, not
derived from the role — a warm-up's body half and a strength slot's
position in the pair cannot be read off `role` at all. The roles stay
`hypertrophy` and `assistance` because they are written into every stored
log, but both _label_ as "Hypertrophy".

**A variation shares its `pattern` with the movement it varies.** The
underhand barbell row is `horizontal-pull` like the overhand one, and the
chin-up is `vertical-pull` like the pull-up. The weekly repeat penalty
keys on `primaryMuscle|pattern`, so giving a variation its own pattern
would let the week schedule both and count the muscle trained twice under
two names — which is the bug that key exists to stop. Sharing it makes
them one movement the rotation alternates between.

**A lift rotates through variations; the competition version is always
first.** `STRENGTH_VARIATIONS` in `domain/exercises/catalogue.ts`. The
bench runs **paused, touch-and-go**, the squat **low bar, high bar**, the
deadlift **sumo, conventional**.

**A day holding two competition lifts runs one comp and one variation,
and the competing lift goes first.** Two maximal efforts in one session is
one thing avoided; a top set taken _after_ another lift's top set and
back-offs is the other — a top set is a reading before it is training, and
that one reads low for a reason that has nothing to do with strength.
**Lower 1 is low bar then conventional, Lower 2 is sumo then high bar.**

That is why a paired day takes its variation index from its position in
the pair rather than from the lift's own session ordinal: the lift that
opens is competing and takes index 0. A lift alone on its day still walks
the rotation in order — which is what makes dropping a lift to one session
a week cost the variations rather than the lift the total is measured on.

**The within-day order has been three things, and the third answers the
objection the second one recorded.** It alternated by day; then it was
fixed to squat-first, with a note that whichever lift is second is second
every session for a whole block, making the deadlift permanently the tired
lift. Ordering by which lift is competing today alternates on its own,
because that alternates — so neither lift is always second and neither is
always the one being measured. `rp-assemble.test.ts` → "opens a paired day
with the lift that is competing".

**A rotation shorter than the frequency repeats.** `strengthSlugFor` takes
the index modulo the rotation length, so a single entry is a deliberate
way to say "always the competition version" rather than an omission. The
squat was written that way for a while and the deadlift before it.

Adding a variation is adding a row here, and three more things: converting
that exercise to `intent: 'strength'` with `loadBasis: 'estimated-1rm'`,
which takes it out of the hypertrophy pool; adding a `VARIATION_OF` ratio
so the first session has a load to suggest; and checking what the
hypertrophy pool just lost. **Removing one is the same list backwards**,
and the backwards direction is the one that goes wrong quietly: a
strength-intent exercise no rotation names is scheduled by nothing at all,
so leaving it converted retires it from the catalogue without saying so.
The high bar squat made that round trip — into the rotation when the squat
had two entries, back to hypertrophy when it did not — and two
`VARIATION_OF` ratios outlived their rotations before anyone noticed
(close-grip bench, high bar squat), each deriving a max nothing loads.

Which variation a session gets is picked by the lift's session ordinal —
not by the day. Index 0 is the competition version so that dropping a lift
a tier, which buys fewer sessions, costs the variations rather than the
lift the total is measured on.

**The paused bench is the competition lift**, because a raw meet bench is
judged on a pause and a touch-and-go single measures something else.
`bench-press` is therefore the _touch-and-go_ variation despite its slug,
which is the one genuinely confusing thing here — the slug is kept
because it is written into every existing log, and renaming ids to match
a change of meaning is how history stops resolving.

This is a rotation, **not** an anchor, and the distinction is the reason
`RpDay.anchors` is not coming back: nothing is pinned to a _day_. The day
asks for the bench and gets whichever version the tiers' session count
implies.

The variations are separate exercises with their own slugs, their own
`estimatedMaxes` entry and their own history, because a close-grip bench
is a lift with its own maximum rather than a bench done differently.
`withDerivedMaxes` fills an unmeasured variation from its parent (95% and
90%) so the first session has a suggestion; **anything measured always
wins** — a derived value that overrode a real one would be the training
max mistake in a new costume. It is applied where the athlete is
assembled, never inside `resolve`, so resolution stays a function of the
numbers it is handed.

The cost, stated plainly: only `paused-bench-press` is `isCompetition`,
so the character sheet's bench standard and the total now move on one
session a week rather than three. That is correct — the other two days
are not measuring the lift being scored — but it is a real change to how
fast that number responds.

`migrateBenchEstimate` moved the old `bench-press` estimate onto the
paused bench at 95%, because a number stored under that slug was pressed
without a pause whatever the exercise was called at the time; copying it
across would have credited a paused max nobody had lifted. It is
idempotent and never overwrites an existing paused estimate, so a
correction sticks. **A settings migration that silently changes a
strength score is the failure to avoid here** — this one is discounted,
tested in both directions, and visible as an 11 lb drop in the total.

**The competition lift is two slots, not one.** They were merged once on
the reasoning that it is one exercise in one trip to the rack — true, and
it hid what makes this RTS: the top set is a _measurement_ everything
below derives from, and the back-off count is discovered rather than
planned. As one six-set row it read exactly like a percentage
prescription. They stay adjacent because `inSessionOrder` is a stable
sort and both rank the same. **`previousSetFor` must take the variant**:
matching on the exercise alone hands the first back-off the previous
session's _top set_ as its "last time".

**Strength is double progression now, and RTS is gone.** _"Just do a
double progression for everything. No RPE or anything… Straight 3 sets
on anything."_ `domain/programs/progression.ts`.

**The whole method is two sentences.** Work in a rep range for three
sets; when every set reaches the top of it, put the next increment on
the bar. Strength runs 3–5, hypertrophy compounds 10–15, isolations
15–30, and every slot is three straight sets at one load.

**The planned reps aim to beat last time.** Asked for as _"make the
planned reps aim to beat last time, unless it falls outside of the rep
range, in which case up the weight and start back up at the bottom"_.
`plannedRepsFor` gives **one target for every set: one past the weakest
set last session**, at the same load, capped at the top of the range;
once every set topped and the load went up, back to the bottom. It
planned the bottom of the range every session — "115 × 5" beside "Last
115 × 8" — and then, for one release, a target per set (16, 16, 16, 15,
15 became 17, 17, 17, 16, 16), corrected as _"it should always just be a
straight rep target across all sets. 5x16 then 5x17"_. The weakest set
is the count the exercise has not yet held on every set, so it is the
one to beat.

**A deload takes a quarter off the bar as well as a set** (`deloadLoad`
and `deloadRepsFor` in `progression.ts`, applied at Start in
`workingLoads`; `training-flow.test.ts` → "a deload week"). Asked for as
_"deloads only cut volume in half. They should also cut load by about a
quarter"_. 75% of the working load, rounded **down** to the increment,
the reps matching last time's weakest set rather than one past it. **The
session is stamped `WorkoutLog.deload` and `planFromHistory` reads past
it** — progressed from, the deload's 75 would plan the next working week
at 75, so the week after picks up from the bar before. Read off the log
rather than the programme so swap, add and repeat get it too. Not
changed: the stall count still sees a deload's lighter bar as "a new
climb", which clears a stall, arguably what a deload is for. **On the
body alone the quarter comes off the reps** (`deloadRepsFor`, tested) —
_"for bodyweight stuff that doesn't have a load, we need a way to make
it easier for deloads other than just dropping sets"_: 12, 12, 10
pull-ups deload to 2 × 7, rounded down and allowed under the range's
floor, or a lifter at the bottom of 5–30 would deload at the same five.
A belted set keeps the loaded rule.

**Two sets now, one on a deload** (it has been three, five, four, a split, two and three). It went to five on _"let's bump our
sets up to 5 per exercise"_ and back to four with the ULPPL week, when
every day became four exercises — `STRAIGHT_SETS` and `DELOAD_SETS` in
`progression.ts`. **`topped` is judged against the sets the previous
session asked for, read off its own log** (`start-workout.ts`), not
against today's count: otherwise every three-set session filed before the
change could never earn an increment.

**Nothing stores a working weight.** The load is derived from the last
session that trained the exercise, the way the programme itself is
derived from settings — so there is no "current weight" record to drift,
to lose, or to reconcile between two devices. `startWorkout` reads it,
because `resolve` is pure and reads no repository, and hands it to
resolution through `AthleteState.working` beside the estimated maxes.

**A slot with no history resolves to open**, which is the design rather
than a gap: the app does not know what you lift until you have lifted
it, and a number guessed from an estimate is a prescription nobody
chose. You type it once and it carries.

**Increments are 5 upper and 10 lower, derived rather than written on
every exercise.** Fifty entries would each need a number and forty-eight
would say five; `loadStep` overrides it where a movement differs. Lower
means **compound and lower** — a calf raise is a lower-body isolation
and ten pounds a session on one is a jump nobody makes.

**What the trade costs, recorded because it is real.** RTS moved the
load _within_ the session from a reading taken on the day, so a bad
night lightened the bar without anybody deciding to. Double progression
cannot: the bar is what it was until the reps say otherwise, and a bad
day is a day you miss the top of the range. In exchange the method is
sayable in two sentences and nothing is self-reported.

**The competition lift is one slot, not two.** The top-set/back-off pair
existed because they were different kinds of set — a measurement and the
work derived from it. Three straight sets at one load are one kind of
thing, and splitting them would put a lift on the session screen twice
for one trip to the rack.

**`rpe` and `rts-backoff` stay in the prescription union and must not be
tidied away.** Nothing prescribes them any more, but **a log describes
itself**: every `WorkoutLog` embeds the prescription it was performed
under, so sessions filed while RTS ran still hold `rpe` sets. Removing
the variants would not delete those records, it would make them
unreadable — the same reason the retired IndexedDB stores are still
declared.

**Gone with it**: `framework/rts.ts`, `backoff-stop.ts`,
`replan-backoffs.ts`, `RtsExplainer`, the back-off re-plan in
`log-set`, the live stopping-rule card in `SessionPlayer`,
`settings.fatiguePercent` and its editor, and `recipe.rts`. Eight tests
went with their subject; two were kept and re-pointed at what survives —
the frequency rule and the resolution shape.

**The training redesign is under way, and this is the first stage of
it.** Asked for as _"let's begin redesigning the training… just do a
double progression for everything. No RPE. Strength 3-5, hypertrophy
compounds 10-15, isolations 15-30. Straight 3 sets on anything"_, plus a
list of exercises to drop.

**What has landed: the catalogue cuts and the compound range.** Ten
entries are gone — the underhand barbell row, the chin-up, the upright
row, the EZ bar rear delt raise, the feet-elevated push-up, and all five
forearm movements — and compounds run 10–15 rather than 5–8.

**What has not, and why it is one piece rather than three.** Double
progression, three straight sets and the removal of RPE cannot land
separately: without RTS a strength slot has no load, and a percentage
would be the "the percentage _is_ the prescription" trap this file
records 5/3/1 being removed for. The load has to come from what you
lifted last time, which means the working load reaches `resolve` through
the athlete rather than being assembled — a change spanning
`prescription.ts`, `resolve.ts`, `AthleteState`, the assembler and two
large test files that encode RTS throughout. Shipping half of it would
leave a programme that prescribes nothing.

**The decisions are made and recorded here so the next pass does not
re-litigate them**: increments are per lift (5 lb upper, 10 lb lower,
5 lb isolation, a field on the exercise); the first session of an
exercise is **open** — you type what you did, and history carries it
from then on; and the customisation goes almost entirely — muscle
volumes, per-lift sessions, the fatigue setting, weeks-before-deload and
the priority tiers, leaving days-a-week, rounding, estimated maxes and
exclusions.

**The customisation is gone, which was the third and last stage.** Four
fields left `AppSettings` — `muscleVolumes`, `liftSessions`,
`setsPerSession` and `weeksBeforeDeload` — with the tier editor, the
Priorities section of Settings, the divergence card and
`liftSessionsOf`. What is left of the programme's inputs is **days a
week, rounding, the estimated maxes and the exclusions**: the things
that are about the person rather than about the programme.

**`defaultRpRecipe` already held every one of them as a default**, so
this was mostly a matter of no longer overriding them.
`recipeFromSettings` passes three fields where it passed seven, and the
constants it falls through to are the same numbers the app had been
shipping. **The programme did not change shape** — verified by driving
it, which still builds the same four days.

**The screens that read those settings now read the constants.**
`explainVolume` takes its three inputs with defaults rather than
arguments, because the tests still vary them and that is the whole
reason it is pure; the Plan and Program pages call it with none. The
history page's weekly target reads `DEFAULT_MUSCLE_VOLUMES` directly.

**A stored blob keeps the four fields and nothing reads them**, which is
deliberate rather than an omission. The parse builds field by field, so
an unknown key falls out on its own — no migration, no rewrite, and a
device that has run this build still holds the old values under their
old names. Reinstating any of them is a line in the parse rather than a
recovery.

**`SETTINGS_SCHEMA_VERSION` is now written and read by nothing**, and is
kept anyway. `liftSessions` was its only reader. The gap it exists for
has not closed — settings are persisted on first run, so the store still
cannot tell a value the lifter chose from a default it saved on their
behalf — and the next setting whose meaning changes needs a version
already sitting in every stored blob to compare against. Deleting it
would mean the devices that matter had no version on the day one was
wanted. The tests for the re-seeding it used to do went with the field;
the mechanism did not.

**The list of settings that travel is down to two.**
`SYNCED_SETTING_KEYS` lost four members, and `synced.test.ts` → "sends
the settings the program is derived from" checks `daysPerWeek` and
`excludedExercises` rather than a list of five. That list shrinking _is_
the change: the programme is not derived from the others any more, so
sending one would be syncing a setting nothing reads.

**A first strength session opens at 85% of the estimated max, and this
reverses the note above it.** That note said a slot with no history
resolves to open, full stop, because "a number guessed from an estimate
is a prescription nobody chose". Driving it showed what that costs: a
fresh install has four estimated maxes on the Standards card and offered
a blank bar for the bench, on a figure the lifter had typed themselves.

`firstSessionLoad` in `start-workout.ts`. **Strength slots only**, and
that restriction is the load-bearing half rather than a matter of which
lifts happen to carry an estimate: a share of a one-rep max only means
anything against a rep count. 85% is about a five-rep load, which is the
strength range and is nowhere near a set of twenty. Turning an estimate
into a load for an arbitrary range needs the RPE chart, which is exactly
what went with RTS — so an accessory stays open and says, honestly, that
the app does not know what you curl.

It holds for **one session**. The moment something is logged the log is
the source, which is what stops an estimate edited months later silently
rewriting a load somebody has been progressing by hand. There is a test
in each direction.

**The RPE field is gone from the logging form**, which is a removal
rather than a tidy-up. It was the third number on the row, plus a line
of coaching before the set and a reading after it — all of which was
true of RTS and none of which is true of double progression, where the
load descends from the _reps_. A logged RPE reached no rule, no
suggestion and no screen. `SetResult.rpe` went with the form that fed
it; `LoggedSet.actualRpe` stays, because sessions filed under RTS carry
real readings and history still shows them.

**The badge on a strength set reads "Working" and the record still says
`'Top set'`.** That string is written into every log ever filed and is
how `previousSetFor` tells a heavy set from a lighter one when comparing
against an RTS-era session, so changing it would make a new set read
against the wrong old one. The label is a different question: with no
back-offs, "Top set" names a position in a pair that does not exist.
`VARIANT_LABELS` in `program.ts` is that one mapping — **the value is
an address and the label says what the set is.**

**Four pieces of copy described the framework that went, and finding
them took driving rather than grepping.** Each read as an ordinary
sentence and each was false:

- The accessory slot's own note said _"Last set to failure; the rest at
  one rep in reserve"_ — printed on every accessory in the app,
  describing a rule nothing applied. **A note is not decoration**: it is
  the only place the session screen says what to do with the set. It
  states the range and the increment now, from the same numbers that
  built the slot.
- Settings' maxes editor said _"RTS decides the real weight by feel"_.
- The Train card said _"cut the back-offs short and the accessories grow
  to cover it"_.
- The session report said volume counted _"secondary work at half"_,
  which stopped being true when fractional credit was removed long
  before any of this.

**The Program page draws the week you are on, and the deload tab is
gone.** Reported in the same breath as the Plan screen: _"the whole what
week are you on and working week/Deload button feels overkill
considering it's just identical working weeks and a slight drop of load
and volume on deloads."_

This screen has now been a tab strip of six, then two, and is none. Each
cut had the same cause arriving further along: **every working week is
identical by construction**, so a control offering a choice between them
was offering one thing under several names. The last pair looked like a
real choice and was not — a deload is the same session list at a lower
level, so drawing it is drawing this page again with smaller numbers.
What a deload _is_ is worth a sentence, which the week picker now
carries; it was never worth a tab, and a tab is what made it read as a
second programme to study rather than a lighter week of this one.

**Defaulting to the working week instead is the version to avoid, and it
shipped for one commit.** It is wrong for the one week in seven that
differs: somebody whose actual week is the light one would be shown a
full session list, which is worse than the tab was. Drawing
`weeks[currentWeek]` is what makes the control removable rather than
merely hidden — the page has no view state left, so there is nothing to
be out of step with the position. Verified by picking the deload and
watching the bench go from **3 sets to 2** with the header following.

**The shell widens at `lg` and `xl`, and mobile is untouched by
construction.** Reported as _"on desktop it's a single column down the
middle with tons of padding on each side."_ The cap goes
`max-w-2xl lg:max-w-4xl xl:max-w-5xl` — 672 on a phone, 896 from 1024px,
1024 from 1280px.

**The breakpoint prefixes are the guarantee, not a promise to be
careful.** `lg:` and `xl:` are min-width rules, so nothing below 1024px
can be reached by them; the phone layout cannot change because no rule
applies to it. Measured either way: 375 viewport gives main 375 and nav
375 with **0** overflow, unchanged; 1400 gives both 1024.

**Three files carry that cap and all three must agree** — `main`, the
nav's `ul`, and `RestTimer`, which is `fixed` and lines up with the
content it belongs to. A width that lived in one of them would drift the
first time somebody changed another.

**The tech tree shrinks to fit before it scrolls.** Reported in the same
breath: _"the tech tree still needs to scroll which probably shouldn't
happen on mobile either but definitely not on desktop."_ The canvas is
measured against its container and scaled **down only** — blowing a small
tree up to fill a desktop would make three upgrades look like a skill
web.

**`MIN_SCALE` is what keeps the old argument alive rather than
overruling it.** That note said a tree of any width cannot be squeezed
into 375 pixels with readable nodes, which is still true: below 0.7 it
stops shrinking and scrolls exactly as it did. Measured on seven
siblings — a 924px canvas — 375 clamps to 0.7 and still scrolls, 1024
draws it whole.

**`ResizeObserver` was the first build and was replaced, which is worth
recording because it is the better tool.** It **never fired** in the
agent's browser pane, so the scale stayed 1 and the feature silently did
nothing — and a probe written by hand against the same element timed out
too, which is what identified the pane rather than the code. The cause is
that the pane was hidden, and a hidden document is not laid out.

The lesson is not "avoid `ResizeObserver`". It is that **the difference
between "fits" and "scrolls" must not depend on something that can
silently not happen.** The only thing that changes this container's width
is the window — the shell's cap moves at `lg` and `xl` and nothing else
on the page resizes it — so a mount measurement plus a `resize` listener
answers the actual question and can be verified by resizing. The known
gap is a scrollbar appearing without a window resize, which is worth
about fifteen pixels and only at the boundary.

**Emulated viewport changes do not fire `resize`.** Switching the pane
to 1400 left the tree at the 0.7 it had computed at 375, and dispatching
the event by hand corrected it to full size. A real browser fires it on
every window change and on rotation, so this is a fact about the test
harness — but it is the reason a measurement taken straight after
`resize_window` reads stale.

**A waiting build now applies itself when the app becomes visible.** The
banner had to be pressed, so a green deploy could sit undelivered for as
long as somebody kept answering later. Becoming visible is exactly the
moment the old objection does not apply — you have just walked up to the
app and started nothing — **and an open session still blocks it**, with
`undefined` counting as open so a race at startup errs towards asking.
The banner is what is left for that case, and says why it is waiting
rather than announcing news the app could have acted on itself.

**The week is Monday, Wednesday, Friday full body — squat, bench,
deadlift.** Asked for as _"rearrange the lifts in a sensible way for a
Monday Wednesday Friday full body split, ordered squat bench deadlift
with those being the main lift for each respectively"_.

**`RpDay.carries` names lifts again, and the reason it stopped naming
them is gone.** It held a _region_ — upper or lower — so that the split
did not decide how often anybody benched; that was a priority question
and priority lived in the tiers. The tiers went with the customisation
and every lift has one session, so there is nothing left to derive. What
a region cannot express is which of two lower-body lifts opens which
day: with both the squat and the deadlift eligible everywhere, the
emptiest-day rule picked, and it had no way to know Monday was the
squat. `STRENGTH_REGION` is deleted.

**The accessory pairing survives the move to full body**, because its
reason does: a muscle sits on a day whose main lift does not already
train it. Chest on Monday (benched Wednesday), upper back on Wednesday
(deadlifted Friday, and a row against the bench besides), lats on Monday,
rear delts on Friday away from the row, triceps Monday and Friday away
from the bench, biceps Monday and Wednesday away from the pull.

**The core is the one collision and it is deliberate.** It wants two
sessions and all three days brace — the squat and the deadlift heavily,
the bench barely. Wednesday is free and the second has to land on a
braced day, so it is Friday, where `trailingLast` already puts it at
the end of the session rather than before the pull.

**A paired day is now unreachable from the shipped split**, so
`RpAssembleDeps` gained an optional `split`. Every rule about how two
competition lifts share a day is still live code, and the alternative
was leaving it as a live-looking condition nothing could reach — the
thing `reverseAccessoryBlocks` was deleted for. A test injects a split
that pairs.

**A test learned the trailing-muscle lesson for the third time.** The
assistance work is asserted to run in priority order, and
`trailingLast` moves the grip and the trunk past everything else on purpose. It only
became visible again when the full-body week put the core on a day
beside other accessory work; the check now excludes the trailing
muscles rather than encoding the ordering they are exempt from.

**A desktop install needed no code.** The manifest already declares
`display: standalone`, so Edge or Chrome's **Install** turns the deployed
site into an application window with a Start-menu entry that pins to the
taskbar. **Do not add an Electron or Tauri wrapper** — it would be a
second thing to build, sign and update in exchange for nothing the
install does not already do, and it would fork the update path this file
has spent so long getting right.

**The desktop layout was checked and needed nothing**, which is worth
recording because the first measurement said otherwise. The `nav`
element is full-width at 1400px — correctly, it is the bar's background —
and measuring it nearly bought a fix for a bug that does not exist. The
cells inside it are `mx-auto max-w-2xl`, the same 672px cap as `main`,
and both sit at x=357 on a 1400px window. **Measure the element the
question is about.**

**The backup nag is gone, and what it was protecting has to be said
out loud.** Reported as _"that pop message to export the training is
annoying can we get rid of that?"_ It was a warning-toned card in
`AppShell`, so it sat above **every screen in the app**, and it was
dismissed with `useState` — session-only, so it came back on the next
launch. A reminder that returns however many times you answer it is
training somebody to look past that part of the screen.

Gone with it: `BackupReminder.tsx`, `backupStatus`, `BackupStatus`,
`BACKUP_REMINDER_DAYS`, `BACKUP_REMINDER_WORKOUTS`, the `status` field on
`useBackup` and the workout-count query that fed it. Settings never read
`status` — only export and import — so nothing else changed, and no test
covered the rule, because the rule was only ever about when to nag.

**Its argument was sound and it had gone stale.** The card said
_"Everything lives on this device only"_, which was true when it was
written and is false whenever Firebase sync is configured — and it had
no way to know which. So it nagged about a risk that may already be
covered, in words asserting it is not. **A warning that cannot check its
own premise is worse than no warning.**

**The replacement is a status line in Settings**, beside the button that
answers it. `backupAge` in `domain/settings/settings.ts`: how many whole
days since the last export, and whether that is past
`BACKUP_STALE_DAYS`. Never having exported is `stale` with **no
`days`** — absent rather than zero, because "no export" is not "an
export nought days ago".

**It reports two facts and draws no conclusion**, which is the whole
difference from the card. How old the backup is, and whether sync means
this device is the only copy. `backupAge` deliberately cannot see the
second: the screen pairs it with `syncConfig` and `useAccount`, and
**both are required** — a configured build nobody has signed into syncs
nothing, and an account on a build with no Firebase project has nowhere
to put it. Only the stale-_and_-unsynced case is tinted; the reading is
otherwise muted text.

**The same stale sentence was sitting in the panel above it.** _"There
is no account and no server to sync from"_, written before sync existed
and false in exactly the case the card was wrong about. It reads the
state now instead of asserting it. **One removal is not the fix when the
claim was copied** — worth grepping for a sentence, not just deleting
the component that said it loudest.

Verified by reading the _computed_ colour rather than the class, which is
what this file says to do: 20 days unsynced resolves amber
(`oklch(0.78 0.15 85)`), 3 days resolves the muted ink, and a fresh
database reads "No backup taken yet."

**The week you are on is the control**, and the section that asked the
same question is gone. Asked for as _"we already have the 'on week 5'
under program, let's just make that editable and drop the section
underneath it with the blocks."_ The page stated a fact in the header and
then offered a way to change it a screen below, so one question had two
answers on one screen — the shape this file keeps recording as a
quantity drawn twice.

Saying the week in words is what made the picker removable. A tinted tab
could never be read without being decoded, so the sentence had to exist
first; once it did, the picker was a second copy of it. **The two only
ever needed to be the same object.**

**It is a `select` in the subtitle, wrapping rather than sharing a fixed
row.** A select takes its intrinsic width from its longest option, which
is what this file's four recorded instances of a 26- to 177-pixel field
all cost. Measured after: the control is **44px** tall and the page
overflows by **0**.

The picker could not simply be deleted, which is why this is a move. The
position only advances by finishing or skipping a session, so a lifter
arriving mid-block has no other way to say where they are — and
`jumpToWeek` would have been left with no caller, the
rule-nothing-can-reach pattern this file keeps recording. Verified end to
end: choosing the deload takes the bench from **3 sets to 2**, choosing
week 5 puts it back, and the choice survives a reload.

**The Plan screen is gone, and its own last section had already said
why.** Asked for as _"remove the plan page of train completely — it's no
longer necessary since we have a simple plan hardcoded in."_ It existed
to answer "what did my settings cost me": which muscles were trained,
how often, how hard, and where the budget went. That was a real question
while those were settings. It stopped being one when the customisation
went, and the page's own final card had already been rewritten to
**"Why there is nothing to change"** — a screen explaining that it no
longer has a subject.

**Deleting it orphaned the Program page, which is the trap to check for
every time a screen goes.** `/program` was reached from exactly one
place: a link on Plan. The same shape as `/mind` and `/resume`, which
this file already records being rescued by finding the screen each
belonged to. Program belongs to Train, so it took Plan's seat in that
header — the established home for a screen related to this one — and
Train's two header links now read Program and History.

**`/plan` redirects to `/program` rather than 404ing.** It is not a PWA
shortcut, so nothing registered it with the operating system, but the
question the page ended on — fine, so what does the week look like — is
answered by the screen it now lands on.

**`domain/priority/capacity.ts` went with it.** `shortfalls` had one
caller and it was Plan's capacity report, so leaving it would have been
a rule nothing can reach with a test attached — the pattern this file
keeps recording. `explainVolume` stays, because Program still reads it.

**Verified by driving the whole loop, which is the only thing that could
have.** A bench opened at 200 from a 238 estimate, three sets of five
were logged, the session filed, and the same lift **opened at 205 the
next week** — the +5 upper step, read out of the log. That round trip is
the entire redesign, and it is also held end to end through the real
repositories by `training-flow.test.ts` → "carries the logged load
forward" (this paragraph said it was not, and was wrong).

**One exercise a week, and the two upper days stopped being the same
day.** Reported as _"I'm noticing redundancy in the exercises — don't
repeat dips or lateral raises on both upper days… barbell calf raise is
the only exercise we should repeat twice in the week."_ Dips, lateral
raises, rows, pull-ups and rear delt raises were all appearing twice.

**The cause is one line of arithmetic, not a bug in the picker.** One
exercise per muscle per session, times a muscle listed on both upper
days, is two slots — and the chest's hypertrophy pool holds exactly one
movement. So it filled both with dips. The rotation the picker does have
was working the whole time: the arms have four and two options and were
correctly getting a different movement each session.

**Two changes that have to move together.** `DEFAULT_MUSCLE_VOLUMES`
splits into `ONCE` (chest, side delts, rear delts, lats, upper back) at
one session at the **high** level and `TWICE` (biceps, triceps, calves)
at two at low. The level moving is the load-bearing half: a level is
choosing how long that single exercise runs, so halving the sessions and
leaving it alone would have halved the week. **Five sets in one session
against six across two** — very nearly the same volume, in one movement
instead of the same movement twice.

**And `UPPER` divides into `UPPER_1` and `UPPER_2` in `rp-splits.ts`**,
because setting a muscle to one session decides _how often_ and not
_which day_. The fill places the neediest muscle first, so left to
itself it would have put all five on Monday and left Thursday with the
arms.

**A muscle's accessory work sits opposite the lift that already trains
it**, which is the reason given with the report — _"since there's
overlap"_ — and is what makes this a pairing rather than two arbitrary
piles. The chest is benched on Monday so dips are on Thursday; the side
delts are pressed on Thursday so lateral raises are on Monday. The row
goes against the horizontal press and the pull-up against the vertical
one, which settles a question the report left open. Rear delt work goes
on the day without the row, asked for directly, because a row pays them
on the way past.

**Which day carries which lift is derived, and that is the seam.**
`assignStrengthLifts` places the bench and the press; these lists assume
the bench lands on `UPPER_1`, which it does because lifts are placed in
`STRENGTH_LIFTS` order onto the emptiest eligible day and the session
counts are now constants. If that ever inverts, the week still holds one
of each exercise and every one of them is on the wrong day —
**a no-repeats assertion passes just as happily either way**, which is
why there are two tests: "uses each exercise once in a week, apart from
the calf raise" and "pairs each muscle against the lift that does not
already train it". Both were checked against the reported bug by
reproducing it, and the first names the offender —
`dips on Monday — Upper 1 and Thursday — Upper 2`.

**The accessory reversal is conditional now, and this is a regression it
would otherwise have shipped.** `reverseAccessoryBlocks` exists so a
fixed order does not spend the fresh part of every session on the same
muscle for a whole block. That argument needs two sessions holding the
**same** work: reversing the second of two sessions holding _different_
work rotates nothing, because each day's order is then fixed for the
whole block anyway — while still paying the cost, which is that one day
permanently runs its compounds lightest-first and its isolation in
reverse priority order. Thursday started running rear delt raises ahead
of the arms, every week. It now fires only when the region's second
session is accountable for the same muscle list as its first, which
keeps it live for the lower days.

**A frequency setting can now ask for more sessions than the split has
days to give.** Side delts at two get one, because only `UPPER_1` lists
them. That is the deliberate cost of the pairing and it is why
`rp-assemble.test.ts` → "trains a muscle as often as its own setting
asks" runs on the **biceps** rather than the side delts — the arms are on
both upper days precisely because their pools hold several movements, so
twice is two exercises rather than one done twice.

**The block renamed itself and that was a third-time correction to one
sentence.** `describeBlock`'s focus was "the muscles in tier 1", then
"the muscles getting the most weekly sets" — better, and still wrong by
one set: the arms and calves came out at six against everything else's
five, so the Train header read **"Triceps, biceps and calves · Squat and
deadlift strength"**. Nobody had emphasised anything. `FOCUS_MARGIN` is
3 — one slot's work, the smallest amount of "more" this model can
express. **One set of daylight is arithmetic; three is a decision.**

**`domain/priority/divergence.ts` is deleted, and it is my own dead code
from the commit before.** It powered the Settings card naming settings
that had drifted from the shipped defaults, and that card went with the
volume customisation — so `musclesDivergeFrom` and `liftsDivergeFrom`
had no caller anywhere. The problem it solved no longer exists either:
the values are constants in the bundle now, identical on every device by
construction, so there is nothing left to diverge.

Driven end to end. Monday: bench, barbell row ×5, dumbbell curl,
French press, lateral raise ×5. Thursday: overhead press, pull-up ×5,
dips ×5, EZ bar curl, skullcrusher, rear delt raise ×5. Tuesday and
Friday: barbell calf raise. **Every target met exactly** — 6/6 for the
three at twice a week, 5/5 for the five at once — and no exercise twice
in the week but the calf raise.

**Three sets everywhere, one lift a day, abs on the lower days, and the
treadmill on all four.** A single round of reports, each of which moved
something the round before had just settled.

**`ONCE` went back to `low`, reversing the note above it.** Those five
muscles were raised to the `high` level when they dropped to one session
a week, to keep the weekly volume where it had been. Reported back as
_"I'm seeing some exercises still run as 5 sets"_ — fair, because the
whole method is _straight 3 sets on anything_, and preserving a number by
breaking the one rule the programme is built on was the wrong trade. The
chest now gets three direct sets a week on top of being benched heavily.

**One competition lift a day.** _"Let's drop the second strength movement
on lower days."_ `DEFAULT_LIFT_SESSIONS` is 1 across the board, so the
squat opens Tuesday and the deadlift opens Friday with nothing following
either. **The cost lands on the variations, which is how the rotation was
designed to fail**: `strengthSlugFor` indexes by the lift's session
ordinal and index 0 is always the competition version, so a lift trained
once a week never reaches index 1. The high bar squat and the
conventional deadlift are no longer scheduled at all. The number the
total is scored on keeps getting trained; the variety around it goes.

**The trunk is trained directly**, ab wheel on one lower day and hanging
leg raise on the other — it has exactly two movements and uses both, so
it joins `TWICE` without repeating an exercise. The lower days had the
room the moment they stopped carrying two competition lifts each.

**Conditioning is a treadmill block on every day, after the swings on
the lower ones**, and the swings are **one checkbox** rather than fifteen
rows. `asSets` is deleted: it materialised a thirty-minute EMOM as thirty
sets of ten so the session screen could log each one, and the reply was
_"no need to track that specific part, just a checkbox like we have now,
I have a separate EMOM app."_ An app that already runs the minute is a
better clock than a list of tick-boxes, and mirroring its output here is
a second copy of a count kept properly somewhere else — the argument that
removed the macros and the sleep row. The protocol is in the note, where
it is read before starting.

**Adding the walk to the lower days exposed two bugs, both found by
looking at the week rather than by a test.**

**The fill's "already paid today" seed counted conditioning.** It asked
`role !== 'strength'`, which is the same answer as `countsAsHypertrophy`
for everything except a conditioning slot — and `incline-walk` is
`primaryMuscle: 'calves'`. So a thirty-minute walk paid the calves a set
they had not done: Friday saw two owed where three is the floor, refused
the slot, and the week delivered **3 of 6 calf sets** with nothing on
screen saying why. This file already records that exact bug — swings
arriving as glute sets, a walk adding two calf sets — and already names
`countsAsHypertrophy` as the one predicate that settles it. The tracking
was fixed to use it and **this seed was left phrased its own way**. A
rule with two implementations is a bug with a delay on it.

**And `trailingLast` put the trunk work at the top of the day.** It
reinserted trailing muscles at "the last accessory position", found by
scanning for the last hypertrophy slot — which answers 0 when there are
none. Friday's only accessory was the leg raise, so the day opened on it
with the deadlift underneath: the one thing `inSessionOrder` exists to
prevent. It is found from the first _conditioning_ slot now, which gives
the same answer whenever another accessory is present and the right one
when it is not. It could not have shown up before, because the trunk and
the grip were at zero sessions and a day with trailing work and nothing
else could not be built.

**`describeBlock`'s focus is the level now, and that is a third
correction to one sentence.** It was "the muscles in tier 1", then "the
muscles getting the most weekly sets" — a real improvement at the time,
argued as _a lifter who trains their side delts three times a week has
emphasised them whether or not they ever opened a tier list_. **That
argument died when frequency stopped being a choice.** The split decides
it: four of nine muscles landed at six weekly sets against five at three,
and the block named itself **"Triceps, biceps, calves and core"** — true
about set counts, useless as a name. A level is still a decision, and it
is the one that says "train this harder", so the focus reads
`setsPerSessionFor` and a week where every muscle shares a level is
General. **A margin and then a share were both tried first and neither
separated the cases** — 1 of 2 muscles is a focus and 4 of 9 is not, so
no count ratio works; the discriminator was never the count.

**Four tests moved to their own recipe rather than being deleted.** The
paired-day rules — one competition version and one variation, the
competing lift first — are still live code any recipe with two sessions
for a lift reaches, so `pairedBlock()` builds a week that has one. The
shipped default no longer does, which is not the same as the rule being
gone.

Driven end to end. Monday: bench, row, curl, French press, lateral
raise, 30 min walk. Tuesday: low bar squat, calf raise, ab wheel, 15 min
swings, 30 min walk. Thursday: press, pull-up, dips, EZ curl,
skullcrusher, rear delt raise, 30 min walk. Friday: sumo deadlift, calf
raise, hanging leg raise, 15 min swings, 30 min walk. **Every target met
exactly** — 6/6 for the four at twice a week, 3/3 for the five at once —
every slot three sets, and no exercise twice in the week but the calf
raise.

**Dropping the forearms made the repeat penalty's pattern key inert**,
which is measured rather than assumed: after the cut **no muscle has
more than one hypertrophy pattern**, so `primaryMuscle|pattern` keys the
same as `primaryMuscle` alone everywhere. It stays because it costs
nothing and goes live again the moment two patterns share a muscle. The
two forearm tests that were its only coverage went with the exercises,
and are in the git history.

**`repRange` has two entries: pull-ups and dips run 5–30.** Asked for
as _"pull-ups and dips are actually done 5-30"_ — on a bodyweight
compound the reps are the progression until a belt is needed, and the
compound 5–10 asked for added weight at eleven dips. **A bodyweight set
logged with no load is the body alone** (`lastPerformance` with
`bodyweight`): requiring a load read a month of pull-ups as no history,
and the session planned the bare range. **`topped` is judged against
today's range** (`rangeToday` in `start-workout.ts`), not the range last
time was logged under, or widening a range bumps the load on the spot.

**Two rep ranges, chosen by the movement, and one exception.** Compounds
run 5–10 and isolations 15–30 — `COMPOUND_REPS` and `ISOLATION_REPS` in
`domain/assembly/rp-assemble.ts`. Every exercise used to hold a
`defaultRepRange`: fifteen or so hand-set pairs whose differences nobody
could account for and which drifted as the catalogue grew.

`repRange` is that field back with a much narrower remit — **an exception
for a movement the rule gets wrong, not a place to tune every exercise.**
Pull-ups and dips are the entries now (see above); the feet-elevated
push-up was the first and went with the catalogue cuts. The field stays as the escape hatch it
was written to be — **an exception for a movement the rule gets wrong,
not a place to tune every exercise.** **If a third or fourth entry
appears, the rule is what needs changing.**

Both have moved more than once. The compounds were 5–8, then 10–15, and
are 5–10; the isolations were 12–20, then 15–30, briefly 10–30, and are
15–30 again. What the current pair says is that a compound is a
strength-adjacent movement done for reps and an isolation is a long set —
and that the bottom of each range is where the load lives, which is why
the compounds came back down after the accessory volume was cut to three
sets a week. The isolation floor went back up because ten reps of a
lateral raise is a compound's rep count on an isolation's implement.

**Every hypertrophy slot used to end in a set to failure, and none does
now.** Three straight sets in a range, and the range is what says when to
stop — double progression has no proximity-to-failure term at all. What
follows is why `safeToFail` went before that, kept because the reasoning
outlived its subject.

`safeToFail` is gone with the exceptions it encoded. It marked twelve
exercises for three different reasons and the third was the strongest:
**failure is not a clean event on every movement.** On a lateral raise, a
shrug or a calf raise there is always another rep if you cheat the form,
so "to failure" resolves to "until your technique goes" rather than to a
definite point — and an instruction that resolves differently every week
is worse than one rep in reserve every week. Dips and pull-ups are the
contrast: you either complete the rep or you do not.

The 15–30 range defuses most of the safety half of that argument — a
thirty-rep French press is a light implement and a long set. It does not
defuse a compound hinge at 5–8, and a Romanian deadlift or a good morning
taken to failure is the slot to look at first if this proves too broad.
The full reasoning is preserved in `hypertrophySets` rather than deleted
with the flag.

**A set is one set, for the muscle it is programmed for.** No fractions,
in either direction: not scaled by reps or proximity to failure, and not
paid out at half to secondary movers. Both existed, both were defensible,
and between them one set of dumbbell bench landed as 0.6 chest, 0.3
triceps and 0.3 front delts — three numbers arrived at by two
multiplications nobody could see and nobody could check against a
training log.

What it costs is real: a heavy triple counts the same as a set of ten, and
a bench press pays the triceps nothing. Both errors are now visible on the
Plan screen as work that has to be scheduled, rather than hidden in a
coefficient. That is the trade — a model you can audit by counting rows in
a session, over one that was more nearly right and opaque.

**The landmarks had to follow, and then stopped being a table at all.**
Published landmarks are _total_ volume: every source producing them counts
secondary involvement, so keeping them while crediting only direct work
asked the week to schedule that whole total directly — measured at eight
muscles short by twenty-seven sets. A `DIRECT_ONLY` factor of two thirds
brought it back, and `PUBLISHED_LANDMARKS` was kept beside it as the
citation.

All of that is gone with the flat table. It is recorded here because the
correction was right, and anyone reintroducing per-muscle landmarks has to
make it again: **a published figure is total volume and this app counts
direct sets**, so the two are not interchangeable and copying a table
across will silently ask for half again as much work as it looks like.

**`FREE_RIR` and `hypertrophyCredit` are gone**, and the note that used to
be here explained why RPE-scaling mattered. It did. It also could not be
checked by a person holding a training log, which turned out to matter
more.

**The forearms are trained both ways or not at all, and the shipped week
picks "not at all".** Flexion and extension are different movements and
one session cannot be both, so a forearm target that fits in a single
session lets the fill train one direction and call the muscle done. That
used to be handled by a structural MEV — `TWO_SESSION_MUSCLES` floored it
above what a session holds — which the flat landmark table removed along
with every other per-muscle number.

It does not currently matter, because the forearms are set to zero
sessions and get nothing, and the pulls are strapped so no lift pays them
either. It starts mattering the moment anyone turns them on: at two
sessions they get two slots, and nothing now forces those to be different
directions except the repeat penalty below.
`rp-assemble.test.ts` → "trains the forearms both ways rather than twice
the same way" builds that promotion itself and is the only thing watching.

**The repeat penalty only sees movements it has been told about.** A
reverse curl is pronated-grip elbow flexion — the wrist extensors hold the
bar every rep — and it was catalogued as `pattern: 'isolation'`, so it
collided with nothing. The week scheduled a reverse wrist curl _and_ a
reverse curl, two extensor slots, and reported the forearm target as met
with the flexors untrained. Exactly the bug the wrist patterns were
introduced to fix; that one exercise had not been named. Adding a forearm
or grip exercise means giving it `wrist-flexion` or `wrist-extension`.

**Credit has one implementation.** `attributeWeek` asks `slotVolume`
rather than repeating the arithmetic. It used to carry a copy — same
shape, same constants — and the copies drifted the moment RPE entered
the calculation, so the program was built against one number while the
breakdown explaining it printed another.

**A repeat is penalised across the week, not just against yesterday —
and the repeat is the _movement_, not the exercise id.** Keyed on
`primaryMuscle|pattern`, the same key the day-level check uses. Four
wrist exercises are two movements, so an id-level penalty cheerfully
scheduled a barbell wrist curl and then a dumbbell wrist curl and called
the forearms trained: twice into flexion, extensors untouched. Naming
`wrist-flexion` and `wrist-extension` as patterns is what makes "once
each way" fall out of the rule rather than needing a special case.

**The rotation counts a muscle's own sessions, not the day's index.**
`args.directDays[muscle] % pool.length`. Counting by day index looks
equivalent and is not: on a four-day split the two upper days are indices
0 and 2, both even, so `index % 2` was zero on both and **every
two-option pool handed out the same exercise twice a week**. The triceps
have exactly two and got the French press on Monday and again on Thursday.
It hid for a long time because the muscles with four options varied
normally, so the rotation looked like it worked everywhere. A per-muscle
counter has no parity to collide with. `rp-assemble.test.ts` → "does not
repeat an exercise across a muscle's sessions when it has a choice".

It is a soft sort, never a filter: side delts have two hypertrophy
options and calves have one, so banning a repeat would drop the muscle
from the day instead.

**Straps mean the pulls stop paying the forearms.** `STRAPPED` in
`domain/exercises/catalogue.ts` strips `forearms` from the secondary
list of every strapped pull as the catalogue is built. The forearm work
in a heavy pull is _grip_; in straps it is gone, while the lat and
hamstring credit is untouched. Leaving it in had the app believe a
strapped deadlift trained the forearms — twelve credited sets against a
target of six, and nothing direct ever scheduled.

A list rather than a setting on purpose: this is one lifter's garage,
the catalogue is how content is delivered, and a boolean would mean a
settings field, a sync key, a screen and a migration to express
something that is one line to reverse. The kettlebell swing is not on
it — nobody straps a swing — and neither are the curls, whose forearm
involvement is wrist and elbow work rather than grip.

The forearm landmarks were raised with it at the time, from MEV 2 to
MEV 6 — a landmark set against a source that no longer exists is a target
the week meets on paper with two sets of curls. The flat table has since
removed every per-muscle landmark, so that correction now lives only as a
reason to be careful: **strapping a lift silently removes a muscle's only
source of work**, and nothing in the landmark numbers records which
muscles depend on which lifts.

**A warm-up is one row per thing you do.** The lower routine was a single
"Foam Rolling" slot whose note listed seven areas. Accurate, and unusable
where it matters: the session screen ticks off _slots_, so seven areas
inside one are seven things you remember or skip together. Six rows now,
one per area, and the lats and upper back moved to the upper routine
because that is the day they are about to be worked.

**Conditioning is prescribed as a clock or as sets, whichever it actually
is.** `ConditioningPlan.asSets` in `rp-assemble.ts`. An incline walk is
twenty minutes with nothing to count; thirty minutes of swings is sets of
ten on the minute with a named bell, and a single timed row would give the
lifter one thing to tick at the end of half an hour.

**The unit is the interval, not the rest.** `intervalSeconds`, with the
set count and the rest both derived from it. Storing the rest instead
makes the same protocol cost more the heavier the set gets — thirty sets
of ten with a minute's rest is forty-five minutes, not thirty — so the
stated duration and the set count drift apart. That is exactly what
happened the first time, and the day estimate said 83 minutes for a
68-minute session.

**A set is costed by its reps, and a timed set by its duration.**
`setSeconds` in `domain/programs/program.ts`, at `SECONDS_PER_REP` = 3
with a fifteen-second floor. Counting a twenty-minute walk as one
thirty-second set made conditioning free to the planner, which then
stacked a run onto the longest day of the week and still believed it fit.

The per-rep part is newer and has the same shape of cause. It was a flat
`SECONDS_PER_SET = 30`, defended on the grounds that rest dominates —
true while every set was eight to twelve reps, and false the moment
isolations went to 15–30 and the competition lifts to triples. A flat cost
prices a thirty-rep lateral raise the same as a three-rep squat, and the
upper days were being reported at 81 minutes while genuinely running 88.
**A constant that encodes the shape of the programme it was written
against goes wrong silently when the programme changes.**

**Exclusions are absolute.** A lifter who cannot do an exercise means it
everywhere — warm-ups and conditioning included, not only the hypertrophy
picker.

**No day is pinned to an exercise.** `RpDay` used to carry `anchors`, a
list of slugs a day was built around: Monday to an overhead press,
pull-ups, lateral raises and curls, Friday to dips and rows. It existed
to make a generated block continue the session a lifter had actually
trained, which was worth having while history was being imported.

It is gone, and the reason it had to go is the reason everything else
here is derived: an anchor is a transcript, not a derivation. The pinned
exercises went on being scheduled after the tiers that justified them had
moved, and an overhead press outlived the front delts falling to
maintenance. **Do not reintroduce a slug list on a day.** If a movement
pattern is worth guaranteeing, guarantee the _pattern_ and let the picker
choose — and know that a muscle whose target is zero will receive no
direct work at all, which is the model behaving correctly.

**`pending` is a real set outcome.** A set that has not been performed is
not a completed set with no numbers in it. Volume accounting depends on
the distinction.

**The exercise library is derived too.** `resolveLibrary` in
`domain/exercises/library.ts`, called from the exercise repository. The
catalogue is read at every use; the store holds only a lifter's own
exercises and _retired built-ins_, which come back archived so old logs
still resolve. This replaced three delivery mechanisms — seed on first
run, additive sync, hand-written retirement list — which between them
still could not deliver an edit to an exercise that already existed. A
device went on showing "Pull-Ups" and a 12–20 lateral raise long after
the catalogue said otherwise. **Editing the catalogue is now the whole
delivery.** Do not reintroduce a store-of-record for shipped content.

**No `console` outside the logger.** No `localStorage` outside
`infrastructure/storage/`. No `indexedDB` outside `infrastructure/db/`.
No bare `new Date()` — take a `Clock`. Each is a lint rule with a
message.

## Where new code goes

A feature is usually a slice through the layers, inner first:

1. **`domain/`** — the rule, as a pure function, with `x.test.ts` beside it.
2. **`application/use-cases/<area>/`** — takes dependencies as a
   parameter. Load → apply the rule → save.
3. **`app/di.ts`** — register it on `AppServices` if it needs a new port.
4. **`features/<area>/hooks.ts`** — a TanStack Query hook resolving
   services from `useServices()`.
5. **`features/<area>/`** — the component.
   **The app is a portfolio piece now, and the deployed build is the demo
   build.** Asked for as _"everything I want out of this app I can get
   better from another. Instead of trying to use this, let's take what we
   have and make a solid portfolio ready gamified productivity system. Not
   need to try to actually implement, just set it up with demo data."_

**That reverses the deploy.** `VITE_DEMO_MODE=true` and **no**
`VITE_FIREBASE_*`, so the published page signs into nothing, stores
locally, and fills itself on first open. The account gate is untouched
and still works — it is simply not applied to what deploys, and
`VITE_ALLOWED_UIDS` is now an inert repository variable. **The deployed
site does not sync**; personal use runs from a local build with
`.env.local`. This is the one paragraph that overrides everything above
about the deploy being the personal app.

**The fixture is generated, never captured**, and that is the whole
safety argument. There is no export step from a personal device anywhere
in the pipeline, so there is no path by which real records could reach
it. `seed.test.ts` reads its own source and scans for emails, phone
numbers, credential shapes and links out — the risk is not a typo, it is
somebody pasting a real record in while debugging.

**Two more barriers, both structural.** `VITE_DEMO_MODE` moves the
database name and every storage key to a `lifeos.demo` prefix, so the
demo and a personal build on one browser cannot collide. And
`seedDemoData` **refuses when anything is already stored** — named for
filling, with deliberately no flag that makes it overwrite, the rule this
file holds for destructive pairs everywhere else.

**It drives the use cases rather than writing records**, so a fixture
that compiles is a fixture the app could have produced. **The workout
history is the one exception and says why in place**: `startWorkout`
opens _today's_ day and `finishWorkout` advances the position, so a loop
of start-then-finish yields three sessions all dated today with the block
three days ahead of what the history claims. There is no way to ask those
use cases for a session that happened last week.

**Every date is an offset from the seed moment**, and the weekday in a
session title is read off the date rather than written beside it — a
hardcoded "Friday" is right on the day it is typed and wrong every day
after, which is the exact rot relative dates exist to avoid, reappearing
in the label.

**Four defects were found by opening the demo, with the suite green
throughout.** They are listed because the shape is the lesson: a fixture
is the first thing that has ever exercised these paths together.

- **Finishing is a stamp, not a status.** `tallyActs` counts
  `dateCompleted`, so a fixture of `status: 'completed'` records with no
  completion dates paid **no XP at all** — the landing page read Level 1
  with every trait empty.
- **A counted _target_ drew what was left rather than what was done.**
  Hitting two of two servings rendered an empty row of pips reading
  `0 of 2` beside a **Reached** badge. The measured branch had always
  shown `onCooldown`; `litPips` is the counted half catching up. **A
  limit draws what is left; a target draws what is done.**
- **The drawn tech tree recommended what you had decided against.** It
  was handed every entry, so a cancelled upgrade rendered with the
  accented tone — which on that screen means _the thing you can act on_.
  That is the defect the **lists** were already fixed for, surviving one
  layer up in the picture. There are four node states now, and a dropped
  one is struck through. It stays **drawn** rather than filtered, for the
  reason a locked node is: it may be another node's prerequisite.
- **Session titles named weekdays their dates did not match.**

**`parity.test.ts` is the guard, and the failure it catches is unique to
having a demo.** A feature works perfectly against real data and renders
an empty box on the deployed site, because the fixture has nothing that
exercises it. Nothing errors, the feature's own tests keep passing, and
the person who notices is the employer. It asserts obligations as
**properties** — more than one trait proved, both shelves of the tree
populated, the map holding places _and_ cleared ground — so editing the
fixture stays free and hollowing it out does not.

**Two areas read silent and that is correct**: `upgrades` and `vitals`
both measure without paying.

**CI builds the demo configuration too**, because it takes a different
branch at startup and it is the one that actually deploys.

**`COMPOUND_RANGE` and `ISOLATION_RANGE` are deleted from
`progression.ts`.** Neither had a caller anywhere — the assembler carries
its own `COMPOUND_REPS` and `ISOLATION_REPS` — and `COMPOUND_RANGE` had
**drifted to 10–15 while the live one moved to 5–10.** A constant that
looks authoritative, disagrees with the live one and is read by nothing
is the worst of the three states it can be in: it is what somebody
documenting the rep ranges would cite, which is exactly how it was found.

**The docs had gone stale in the way this file warns about, and the
README was the visible half.** It described RTS, tiers, MEV/MAV/MRV
landmarks, five-day splits and a Social area, none of which have existed
for months. Three others were worse in kind:

- `ARCHITECTURE.md` opened _"no network calls at runtime"_, which stopped
  being true the day Leaflet rendered a tile, and traced a request
  through RTS top sets and a `ProgramInstance` with a frozen
  `templateSnapshot` — a type that no longer exists.
- `TESTING.md` **claimed coverage that is not there**: "no muscle exceeds
  its MRV", "landmarks stay ordered under sustained pressure", "readiness
  never moves a landmark". No test names `MRV` or `proposeLandmarks`
  anywhere. A testing document asserting tests that were deleted with
  their subject is worse than no document.
- `GAME_MODEL.md` listed Social as area 4 of seven. There are thirteen.

**A stale document is the same defect as a stale comment**, which this
file already records four instances of, and it fails the same way: it
reads as an ordinary sentence and is false. The rule that follows is
narrow — **when a subject is removed, grep the docs for it in the same
change**, because the tests go with the code and the prose does not.

## Traps

**Adding a load or rep variant** means adding to the union in
`domain/programs/prescription.ts`. `switch-exhaustiveness-check` will
then fail the build at every consumer until each is handled. That is
working as intended — silently falling through to a default is how a
prescription becomes a wrong number.

**Traps are their own muscle, split out of the upper back.** One
group was covering two regions: a barbell row and a barbell shrug were
both `upper-back` while training almost nothing in common, so rowing
satisfied a target a shrug was then scheduled to fill. Traps used to carry a low MEV
because nearly everything paid them — every deadlift, row and heavy carry
loads them isometrically, and naming that credit was the point of the
split.

That credit is now zero, and the landmark that recorded it is gone too.
The shipped week delivered 7.5 trap sets incidentally against a
maintenance ask of 2; removing fractional credit for secondary movers took
the 7.5 to 0. The traps are tier 3 and ask for nothing, so the two
cancel — but the split is still worth having, because a row and a shrug
train almost nothing in common and one satisfying the other's target was
the original bug.

The trap that came with it: `MUSCLE_GROUP_LABELS` and
`DEFAULT_LANDMARKS` are `Record<MuscleGroup, …>` so a new group fails the
build until both are filled, but **tiers are an array** and a new group
silently belongs to no tier. Typecheck passed with traps untiered.
`tiers.test.ts` → "places every muscle group in exactly one tier" is the
guard, and `completeTiers` drops an unknown muscle into the bottom tier
when reading settings saved before it existed.

**A deletion is a fact, not an absence.** `domain/sync/tombstone.ts`.
Removing a row leaves nothing behind, and nothing is indistinguishable
from "never existed" — so any merge reads it as a record the other copy
knows about and puts it back. This was reachable before any sync existed:
export a backup, delete a session, import in merge mode, and it returned,
counted as an _addition_, because that is genuinely what the merge
thought it was doing. `repositories.remove` now writes a tombstone, and
`acceptable()` in the backup service filters incoming records through
them.

The comparison is against the record's own `updatedAt`, not absolute, so
a deletion is a statement about the record as it stood rather than a
claim on every future version. A record with **no** `updatedAt` loses to
any tombstone: it cannot prove it is newer, and assuming otherwise
resurrects exactly what the tombstone was added to prevent.

**`save` stamps, `restoreMany` does not.** Two names, because they are
two operations. `save` sets `updatedAt` to now; `restoreMany` writes
records exactly as given, and is what the import path uses. Stamping on
restore would make every incoming record the newest thing in the
database, which is the one comparison a merge depends on. Stamping lives
in the repository rather than in callers: five paths write a workout, and
a rule living in any of them is a rule the sixth will miss.

**Position is deliberately not synced and not backed up.** It is absent
from the backup envelope, and that was decided before any of this. It is
also the only record with no correct last-write-wins answer — two devices
both advancing a single cursor cannot be reconciled by timestamp — so
leaving it device-local is what makes every _other_ record safely
mergeable. Deriving it from history instead does not work: skipping
advances the position and deliberately writes nothing, so the log cannot
reconstruct it.

**It syncs now, beside the backup rather than inside it.** Reported once
the GitHub file sync existed: _"my phone still shows Push A while desktop
shows Pull B."_ One person trains on one device at a time, so the later
move wins: `save` stamps `updatedAt`, the sync file carries `position`
next to the envelope (outside `data`, so the checksum and the import are
untouched), and `isNewerPosition` decides. An unstamped position never
wins — every position written before this has none, so the device that
moves first after the update is the one that propagates.

**Never edit an existing IndexedDB migration step.** Bump `DB_VERSION`
and add a new guarded block. A device that already ran a step will not
run it again, so editing one leaves two devices with different schemas
and no way to tell.

**Bump the version and write the step in the same edit.** The trap has a
sharper edge than it reads: with `pnpm dev` running and a browser open,
saving a `DB_VERSION` bump _before_ the `if (oldVersion < n)` block exists
means the tab reloads, opens the database at the new version, and runs no
new step. The version is now spent — that device is at version _n_ with
the store missing, and adding the block afterwards cannot reach it,
because it already ran _n_. It cost a development database here, which was
empty; on a real device it would cost a repair migration in the chain
forever.

**Exercise ids are slugs, not UUIDs** (`bench-press`). They are stable
across devices and readable in an export file. Do not "fix" this.

**Icons are generated**, not hand-placed: `node scripts/generate-icons.mjs`.
CI fails if `public/icons` and the script disagree.

**The rest timer derives from an absolute timestamp.** Do not rewrite it
as a countdown; a locked phone suspends the tab and the timer would
under-report.

## Mobile UX bar

Used one-handed, in a gym, with chalky hands, between sets.

- Every control clears 44px (`.tap-target`).
- Numeric inputs use `inputMode="decimal"` and no spinners.
- Nothing important sits at the top of the screen; navigation is at the
  bottom, where a thumb reaches.
- A set is logged in one tap plus two prefilled numbers.
