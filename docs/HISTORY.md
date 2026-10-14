# History

What `CLAUDE.md` used to carry about features LiftOS no longer has: the
life hub it grew out of (goals, quests and the arc, Base and its house
jobs, finance, traits, XP and the character sheet, the Codex, the map,
limits and buffs, dailies, the job search, the resume, Mind, the digest,
house hunting) and the Firebase and Firestore era of sync.

**Moved here verbatim, not rewritten.** These paragraphs are records of
decisions, kept because the reasoning in them is often still why a rule
in the current code is the shape it is — but none of them describes code
that exists now, and `CLAUDE.md` is loaded into every working session.
They were moved on 2026-10-14; the code they describe is in the git
history, and so is the file before the move.

Blocks are in the order they appeared, separated by a rule.

---

**Firebase is gone, and every paragraph below about Firestore, sync,
`AuthGate`, `VITE_ALLOWED_UIDS` or the emulator is history.** Asked for
as _"cut off any sort of firebase integration. Lean into keeping it
strictly as a local only client side DB… if we had a cloud DB involved
that we do it properly."_ The public build never used it, and it cost a
second storage path, a sign-in gate, access rules and an emulator suite.
A cloud store worth adding is the real source of truth with proper
accounts — not a copy kept in step with IndexedDB. The history is in git.

What survives, and why: **tombstones**, because importing an older backup
would otherwise resurrect deleted records; and `settings/synced.ts`,
which only decides when the settings blob is re-stamped.

---

**Quests, house jobs, the job search, the resume and Mind are gone;
every paragraph below about `Project`, quest kinds, contracts, blockers,
`belongsTo` job steps, applications or the practice log is history.**
Asked for as _"drop quests, keep the arc as a checklist"_, with house jobs
and Job search/Resume/Mind answered "drop them too" — projects are worked
through in Notion, which does the board and the steps better.

- **The arc is a checklist card on Today** (`Campaigns` in the masonry),
  every chapter a box. It pays nothing, as it never did. A stage reads
  either a declaration or a finance figure; `house-jobs`, `offers` and
  `Stage.quests` are gone, and `fromStoredCampaign` reads a stored
  stage of a removed kind as declared and drops its quest links — a
  derivation on read, not a migration.
- **`projects`, `attempts` and `resume` are retired stores**, cleared at
  `DB_VERSION` 23 and out of the backup, sync and tombstone lists. The
  rows must be deleted, not left: sync would push them straight back.
- **Base pays nothing now.** Its only acts were house-job steps and
  chores, both gone; it measures the clutter, the footing Finance has.
- `/quests`, `/next`, `/jobs`, `/resume`, `/mind` and `/goals` redirect
  to `/today` — a PWA shortcut outlives the screen it named.
- **No trait bundles two areas any more** (Intelligence lost Mind), so
  the test that asserted bundling went with its last example.

---

**Goals are gone; everything below about them is history.** Dropped as
_"it's causing too much complexity integrating with quests"_: a goal
described the same aim the main quest and the arc already held, so the
app had three overlapping ways to say one thing. Removed: `domain/goals`,
`application/use-cases/goals`, `features/goals`, the repository, the
backup collection, the tombstone entry and the demo fixture. `/goals` and
`/goals/:id` redirect to `/quests`. **The `goals` store stays and step 22
clears it** — the friends and house-candidate pattern, because removing a
store means editing the step that created it. An old backup that still
carries `goals` imports fine; the section is ignored.

**Complex, multi-branch goals are `domain/goals/`, and they are neither a
`Campaign` nor a `Project`.** Asked for as a way to hold a relocation
honestly: several workstreams running at once — shared criteria,
destination research, money, career, the current house, the move
itself — some of it decided, most of it not, with real dependencies
between two of them and no single ordering that is true.

A campaign is one chain of measured-or-declared stages read live against
Base, Jobs and Finance; forcing this into it would mean either one
campaign per workstream, which loses the dependencies between them, or
one chain wearing six unrelated requirement kinds. A project's steps are
homogeneous — things to do — and closing one pays XP in its own area; a
goal item is as often a fact, a hypothesis, a decision or an open
question as it is an action, and none of those is a thing anybody
_does_. **A goal pays no XP**, the same footing a campaign stands on —
it does not join `LIFE_AREAS`, and there is no act to be missing.

**What it borrows rather than reinvents.** The dependency graph —
`dependsOn`, cycle detection via a breadth-first walk with a visited
set, cascade-clear on delete — is the exact shape
`domain/projects/blocking.ts` already solved for quest blockers, applied
to a graph of six-kind items instead of a graph of projects. The
"ordered but not gated" stance is the one `Campaign` already takes:
nothing here refuses to resolve a blocked item, because a screen that
policed that would be deciding your life for you rather than reporting
on it. `standingOf` only ever _names_ an item blocked; `ResolveControl`
in `GoalPage.tsx` shows the control regardless.

**A hypothesis resolves two ways, and ruling one out is not a failure.**
`refutedAt` and `confirmedAt` are both terminal — `isResolved` treats
either as settled — because the whole value of testing a hypothesis is
finding out, and a screen that read a refutation as a dead end would be
punishing the one kind of progress that does not look like progress.
The demo fixture exercises both directions on purpose.

**A dependency can reach into a different workstream, and that is the
actual gap this fills.** "Visit the candidate cities" (Destination)
waits on "how far from family" (Shared criteria); "House listed for
sale" (Sale and move) waits on both a Current-house action and a
Finances decision. Neither is expressible as one campaign's ordered
stages or one project's flat step list — it needs a graph, not a chain.

**One collection, items inline — the same call `Campaign`/`Stage`
makes.** A `Goal` holds its `GoalItem[]` in one document; an item has no
meaning apart from the goal it belongs to and nothing queries them
independently. That single-collection shape is what kept the storage
footprint to one new store rather than one per item type: `goals` joined
`TOMBSTONED_COLLECTIONS`, the IndexedDB schema (`DB_VERSION` 21), the
Firestore mirror via the generic `createFirestoreCollection`, `di.ts`,
and the backup envelope — the same checklist every other collection
here follows, all for one store.

**Reached from the Quests page header, not a ninth nav tab.** The bottom
nav is already at its eight-cell ceiling (see the mobile-UX notes
below), so `/goals` and `/goals/:id` are routed but not tabbed — a
"Goals" link sits beside "Job search" on `ProjectsPage`, the same
`root-of-the-chain` reasoning that link's own comment already states.

**The demo fixture is fictional throughout and is not the real
scenario.** `seedGoals` in `application/use-cases/demo/seed.ts` invents a
couple, an invented city and invented numbers — same shape as the real
motivating case (shared criteria, destination search, money, career,
current-house readiness, sale-and-move) so the feature demonstrates
honestly, deliberately disconnected from any real address or income so
it stays safe to publish. `parity.test.ts` holds it to the same
obligation every other screen's fixture carries: several workstreams,
not one, and at least one dependency that crosses them.

**A goal item can link to a real quest, and resolution then follows the
quest rather than a second tick.** `GoalItem.linkedProjectId` points at a
`Project`; `isEffectivelyResolved` reads the quest's live status through
a `LinkedProjectInfo` the use-case layer builds from `deps.projects.all()`
— the same "evidence gathered live, never copied" stance `Campaign`
already takes on Base and Jobs. **Nothing is written back onto the goal
item.** `completedAt` stays empty forever on a linked item; the badge and
the resolve control both read the live standing instead. Unlinking
returns the item to whatever its own fields say, which for a
never-manually-ticked item is unresolved again — there is no residue.

The point of it: "declutter the garage" as a goal action and "declutter
the garage" as a Base house job were two checkboxes for one piece of
work before this, and ticking one taught you nothing about the other. A
blocked goal item now unblocks the moment the linked quest is marked
complete, verified end to end in the demo fixture — link, complete the
quest, watch the dependent item's standing flip from `blocked` to
`available` with no goal-side write at all.

**The link only ever adds a second way to resolve, never a competing
one.** `isEffectivelyResolved` is `isResolved(item) || linked-and-
completed`, so an item ticked by hand and then linked (or the reverse)
lands on the same answer rather than one overruling the other — the same
"ordered but not gated" tolerance for redundancy the rest of this file
already extends to campaign stages.

**An item's title, workstream and notes are editable now, in one
write.** `renameItem` is the same shape `renameStage`/`relabelDaily`
already are: a label, not a re-interpretation — the item means what it
meant before, and every dependency and every resolution survives
untouched. It was missing for the same reason those two were missing
before they got one: a record typed once and then wrong forever is
worse than the retype-from-scratch it forces.

**The `notes` field existed end to end except in the one place that
could set it.** It was on the domain type, the use-case, the repository
— and the "Add something" form never asked for it, so it could never
actually be populated from a fresh goal. The same trap this file records
elsewhere under "a capability nothing can reach": a field that compiles
is not a field that works. Both the add form and the new item editor
carry it now.

**`COUNT_LABELS` in `SettingsPage.tsx` had drifted, silently, for a
while — and not because of anything to do with goals.** It is a
hand-written list beside `BackupCounts` for the import preview, and
`vices`, `finance`, `campaigns`, `attempts`, `challenges`, `rooms` and
`resume` were all missing from it before `goals` ever existed to add an
eighth. The import itself was never wrong — it reads `BackupCounts`
directly — but the preview screen had been undercounting a real backup
for months with nothing to say so. Moved to its own file,
`count-labels.ts`, for the reason `styles.ts` already states: a file
exporting both a component and a constant breaks Fast Refresh. A guard
test now holds it to naming every key in `BackupCounts` exactly once, so
the next collection that joins the backup fails a test rather than
quietly repeating this.

**Deleting a linked quest clears the link, everywhere it was made.**
`unlinkProjectEverywhere` in `application/use-cases/goals/goals.ts` walks
every goal, not just the one a screen happens to be open on, because
nothing stops the same quest being linked from two different goal items —
verified by a test that links one project into two separate goals and
checks both clear. It mirrors `withoutBlocker`'s cascade-clear for a
deleted project's own blockers, and it has to live in the Goals module
rather than in Projects: `application/projects` must not import
`application/goals`, so `deleteProject` itself cannot know goals exist.
The two writes are sequenced instead at `useDeleteProject` in
`features/projects/hooks.ts`, the one layer allowed to import both
features, which invalidates the `GOALS` query key alongside `PROJECTS` —
the same shape `useSetActiveQuest` already uses for a mutation that moves
more than the record it names.

Without this, `standingFor` already read a missing project as unlinked —
a dangling id was never a _correctness_ bug, only a leak: the reference
would sit in the record forever, travel over sync, and leave the item's
own Unlink control unreachable, since that control only shows for a link
that still resolves to something.

**The link and dependency pickers show which candidates are already
settled.** `LinkPicker` marks a quest `status === 'completed'` with a
check; `DependencyEditor` now takes `readonly GoalItemStanding[]` instead
of `readonly GoalItem[]` so it can read each candidate's own `standing`
and mark a `resolved` one the same way. Picking a quest that is already
done, or making an item depend on one already settled, is a legitimate
thing to do — nothing here gates it — but doing it blind was the one gap:
nothing on either chip said so before you pressed it.

**A workstream renames in one write, across every item that carries
it.** `renameWorkstream` in `domain/goals/goal.ts` matches the string
exactly — the same value `byWorkstream` groups on — because a looser
match would rename items a grouping pass would not have considered the
same workstream. There was no bulk path before this: a workstream typed
once wrong, or named before the plan settled, could only be fixed one
item at a time through `renameItemIn`, which is fine for a title and
wrong for a label sixteen items might share. `WorkstreamSection` in
`GoalPage.tsx` puts the control in the `Section` component's existing
`action` slot rather than making `title` a prop that can be an input —
`Section` is used across the app and its title has always been a plain
string, so the rename form opens as a sibling above the item list
instead, the same "offered inline, not in place" shape `ItemEditor`
already uses for a single item.

**Deleting a goal with linked items says so before the second tap.**
The "Sure?" confirm was generic — the same shape as removing an item —
and a goal's link to a quest is goal-side only, so removing the goal
loses the connection with nothing on the quest itself to show it ever
existed. The warning only appears when there is something to lose, the
rule `Campaigns`' stage-drop confirm already follows: a goal with no
linked items gets the plain "Sure?" and nothing else. It names the
count rather than just warning in the abstract, and says explicitly
that the quest is untouched — the destructive half is entirely on the
goal side, and a lifter reading the warning should not have to guess
whether the quest itself is at risk too.

**A goal surfaces on Today as a readout, the same stance `ArcSlot` takes
on a campaign standing in for a main quest.** `nextAvailableItem` in
`domain/goals/goal.ts` names the earliest _available_ item — never a
resolved or blocked one, and never the most recently touched one, the
same "earliest outstanding, highlighted rather than moved" rule
`Campaign`'s own `next` already follows. `GoalsCard` reads it per goal
and links straight to the goal page; nothing here can be ticked or
closed from Today, because a goal pays no XP and a card that let you
close an item from here would be inventing a second control for a write
the goal page already owns.

**Silent whenever nothing qualifies**, deliberately covering three
different states with one behaviour: no goals exist yet, every item in
every goal is resolved, or everything outstanding is blocked. All three
read the same from Today's point of view — there is nothing available to
name — and a card that distinguished them would be explaining a fact
about the data rather than reporting on the day. Goal creation is
discovered from the Quests page header regardless, so Today does not
need to double as the onboarding surface the way Buffs' "Set up" prompt
does.

**Loading is folded into "nothing yet" rather than given a skeleton**,
the same call the campaign arc slot already makes for `leadingArc`: this
is an optional extra on the day, not a primary control somebody manages
from here, so a card that flickered in after the fetch would be more
noise than the alternative of it simply appearing a moment late.

**`parity.test.ts` gained a line for exactly the failure this feature
invites**: the card is silent by design, which is also how a hollowed-out
demo fixture would fail — every item settled or blocked, and the
reviewer's first screen never shows it. The added test asserts a goal
in the fixture always has something `nextAvailableItem` can name.

---

**Traits are a projection of XP, not a fourth currency.** The ask was
attributes that "get individually leveled up to make this more
gamified", and the tempting build is a pool per attribute that things
pay into. That is the fourth currency the model has three to avoid —
and worse, most of these have no external standard: strength has
published bodyweight multiples nothing in this app can move, and there
is no such table for how charismatic somebody is. Inventing one is the
thing refused everywhere else.

So each life area belongs to **exactly one** trait, and a trait’s XP
is the sum of what those areas already paid. Same acts, new name. The
partition is what makes rule three hold by construction rather than by
attention: `traits.test.ts` asserts every area has a trait, no area has
two, and **the trait totals sum to the XP total exactly**. Measured on
a plausible few months: 9,375 both ways.

The silent failure that test exists for is an area belonging to no
trait — it would pay XP that appears in the character total and in no
bar, so the bars quietly add up to less than the level above them and
nothing errors. Same shape as a muscle group belonging to no tier,
which typechecked cleanly.

**Eight traits over eleven areas, and six was the target.** Forcing
eleven into the classic six meant bundling things whose only shared
property was needing somewhere to go, which is invented structure
wearing a familiar name. Where a bundle is natural it is made — a house
job, a quest step and an upgrade are all Craft — and where it is not,
the trait stands alone.

**Fortune is fed by one act, and that is a feature.** Finance declares
no acts on purpose: typing in a net worth is a measurement, and paying
for the number going up would be paying for an outcome. So Fortune
moves only when an application is sent. Finance still belongs to the
partition, because an area with no trait is exactly what the guard
catches.

**Each row says what feeds it.** A bar labelled "Charisma" with nothing
under it is a number the app made up; one that says "people you
actually saw" is a count of hangouts logged. Unproven traits keep their
bars and read "Nothing yet" rather than zero — absent, never zero — and
stay on screen because the _set_ is the sheet: eight bars with three
empty says where the time is going, where five bars would only say the
app knows about five things.

**They share the character level curve** rather than getting one each.
A second curve would be a second answer to "what is a level worth", and
the first thing anybody would do is compare a Strength 12 to a
character level 20. Sharing it means a trait level is exactly what it
looks like: the level you would be if this were all you had ever done.

**Called traits, not attributes**, because `character.ts` already
exports an `Attribute` — a lift measured against a published standard.
Two things under one word in one folder is how a reader ends up
believing a bench press and Charisma are the same kind of quantity,
when they are precisely not: one is a ladder, one is a re-presentation
of XP.

**The avatar re-presents the sheet and adds nothing to it.**
`domain/game/avatar.ts`. The temptation in a portrait is to give it a
number of its own — a power rating, a gear score — and that would be a
fourth currency where the model has three on purpose. Every field is
traceable: the level is the XP level, the mainstay is whichever area
has paid the most XP, the gear is upgrades actually bought.

**The ring is the level bar, not a frame around one.** XP into the
current level over what the level costs — a real denominator — so the
decoration and the measurement are the same object. It replaced the bar
that used to sit in the Level card rather than joining it, because
drawing one quantity twice on one screen is how two figures start
disagreeing after somebody edits one.

**XP is the only honest basis for "what am I mostly", and the answer is
a share rather than a word.** It is the one quantity comparable across
areas, which is the whole reason it is a single currency; ladders cannot
answer it, because Advanced on the squat and Advanced at exploration are
anchored to different external standards. `mainstayFrom` names the area
that has paid the most and **what share of everything that is**, and the
card reads "100% of your XP is dailies". Absent before anything has been
done — a share of nothing is not nought per cent.

**There were flavour titles over the top of that and they are gone.**
`AREA_TITLES` gave each area a word — Devotee for dailies, Steward for
the house, Athlete for training — and the winning area's word was the
page heading. Asked for directly: _"I don't really care too much about
the level names like Devotee, could we drop those."_

The half that survived is the half that was a measurement. The card's
own note had always called the share _"the difference between a label
and a claim"_, which was an argument for keeping the share and, read
again, not much of an argument for the label: a word invented here could
only be taken on trust, where a percentage can be checked against the
breakdown under it.

It was also **the only derived heading in the app.** Every other page
title says what the screen is; this one said what you were, which is why
getting it wrong read as the app asserting an identity rather than as a
mislabelled tab. The heading is `You` now, which is what the nav cell
says.

**The wishlist is the other half of an inventory, and it is the gear
shelf only.** The ask: _"gear/cosmetics to track apparel, shoes and
accessories that I would like to purchase."_ The portrait already shows
what you are carrying; `wantedFrom` shows what you mean to.

**That is a deliberate asymmetry with the equipped list above it**, and
worth stating because it looks like an inconsistency. `gearFrom` counts
**both** non-house shelves, because a phone is a thing you carry and
somebody whose purchases are all tech would otherwise have an empty
portrait. A wishlist has no such problem: wanted tech already has a
screen that does it better, with gates, prerequisites and a budget, so
repeating it here would add nothing and would make "gear" mean something
else.

**`isOpen`, not "unbought".** Something cancelled is not something you
want, and that predicate already existed.

**Ordered by the upgrade's own priority, which is deliberately not the
tech tree's ranking.** That one inherits priority from whatever a node
unblocks; recomputing it for a four-row summary would put a second
ordering on the same records.

**Capped at four and silent when empty.** A wishlist that scrolls is a
list, on a screen that is scanned — the overflow is counted rather than
dropped. An empty "Wanted" heading is a prompt to go shopping, which is
not what a character sheet is for.

**Gear needed no new field.** `isOwned` excludes a wishlist and
`isOwnArea` excludes the house, which is the split the Base screen
already makes: a dishwasher upgrades the place you live and a belt
upgrades you. Slots are the upgrade's own `category`.

**The figure grows with the level, in five bands.** Reported as _"is
there a way to make the avatar more engaging instead of simply a blank
figure? Perhaps levelling could upgrade it, since currently levelling is
done simply for the sake of levelling."_ That was a fair account: the
silhouette at level 1 was the silhouette at level 20, so levelling moved
a numeral and an arc and nothing else.

`avatar.build` is `0`-`4` from `BUILD_BANDS` at levels 1, 5, 10, 15 and
20 — wider shoulders, then a mantle, then plates, then an arc above the
head. **It is the level drawn and nothing more**, which is what lets it
exist beside the three-currency rule: a portrait that moved on its own
would be the fourth currency, and this one cannot move unless the level
does. `avatar.test.ts` holds that it never goes backwards and never
indexes past the geometry that exists.

**A number, not a name.** The flavour titles were deleted from this file
for being words the app invented, and a rank called _Ascendant_ would be
the same thing wearing armour. Nothing prints the band; it only decides
how much is drawn.

**The thresholds are the app's own, and that is allowed here.** A ladder
must name a published standard; there is no external table for how much
silhouette a level is worth. It is permitted precisely because it
**measures nothing** — it re-draws a number already earned honestly,
where a ladder makes a claim about you against the world.

**The bands are five different figures now, not five sets of marks on
one.** Reported: _"I was also expecting the avatar progression to be more
dramatic."_ Fair — the drawn version added a mantle, then plates, then an
arc, which on a 120-pixel disc are small changes to an outline that never
changed. `features/character/figures.ts` holds five silhouettes:
plain, hooded, crowned, armoured, winged.

**They are from game-icons.net, CC BY 3.0**, by Lorc and Delapouite. The
licence costs nothing — no account, nothing to renew — and asks for a
credit, which the foot of Settings carries and `README.md` repeats.
`ATTRIBUTION` is a constant beside the paths it is about, so the credit
and the art cannot drift apart.

**Committed as paths, never fetched.** About 6 KB in the bundle, so no
eighth outbound host was added for an icon. Each host here is a decision.

**An icon set is allowed where gear is not**, and the distinction is the
one `avatar.ts` already draws: gear is user-typed titles, so drawing a
belt means guessing what an upgrade depicts. A rank is the app's own
number, and these are five pictures of it.

**Ordered by ink, not by story.** Crowned before armoured reads oddly as
a narrative and correctly as a picture — three orderings were rendered
side by side and the story-ordered one visibly dipped at band 3, because
the crowned bust carries less ink than the armoured one. At 62 pixels
nobody reads a narrative; they read _more_. The figure also takes the
season tint from band 2, which is a second axis of escalation for free.

**What the hand-drawn version got right, kept as a warning.** Its marks
had to sit _on_ the outline — the mantle was first drawn as its own
curve below the shoulders and read as a detached bowl sharing the frame.
That problem disappears with whole figures and would come straight back
the moment anything is layered on top of one.

**The figure is geometric because there is nothing to illustrate
honestly.** Gear is user-typed titles, so drawing a belt on a character
means guessing what an upgrade depicts and guessing wrong on most of
them. Items are named beside the portrait instead. The whole portrait
carries one `aria-label` rather than being `aria-hidden` — level,
season and how far through are information, not ornament. It names
exactly what is drawn: the title was in there too and went with the
titles, and what replaced it on screen is an ordinary sentence beside
the figure, which a screen reader reaches without help.

**A silent area still needs a way in, and that is navigation rather
than a reading.** The rule below is right and it had a hole: the area
cards were the only route to a screen, and a card is not drawn for an
area with nothing to say. Job search had nothing to say until an
application existed, and the only way to the screen that creates one
was the card that would not appear until it did.

The You page carries a short list of the four screens with no tab —
Limits, Vitals, Job search, Tech tree — outside the cards and
repeating none of their numbers. A link makes no claim about standing,
so it can be shown where a card cannot.

**An area with nothing to say says nothing.** `AreaStanding.silent` on the
character sheet, and `insufficient-data` counts as silence — it is the
absence of a judgement rather than a bad one. Treating it as something
said made six untouched areas report news on an empty database.

**The list of area cards is gone, and the two measured ladders moved
under the traits that own them.** Asked for: _"take finance and strength
and put those under their corresponding attributes in the section above,
and cut the rest out."_ The lifts are under **Strength**, the credit
score under **Fortune**, indented behind a rule so a ladder reads as
belonging to the trait rather than as another trait.

**It reads as a smaller change than it is, because only three areas ever
declared a ladder** — a ladder must name an external standard, and there
is no published figure for how good at seeing your friends you ought to
be. Every other card carried an area's name, its XP and its ratings: XP
is what the traits already split, and no rating had been recordable
since the review screen went the day before. So most of what was deleted
was an empty frame.

**The traits are bars alone, and two different things have now been
hung under them and taken off again.** Reported: _"I'm not really a fan.
Let's keep all traits as purely bars to keep it more sleek cause this
looks busy."_

The history is the useful part, because it is one mistake made twice.
First the measured ladders moved under the traits when the area cards
were deleted — the lifts under Strength, the credit score under Fortune.
That left content under two rows of seven, which read as ragged, so
every trait then gained a section listing the areas feeding it. That
fixed the symmetry and **made the panel busier than the raggedness it
cured**: twelve extra rows on a panel of seven, nearly all reading
"Nothing yet" on any database not yet lived in for months.

**This panel is a glance, not a breakdown.** It answers "where has my
time gone" in seven bars, and both attempts to make it also answer "and
which records paid for that" made it worse at the first job without
being good at the second. Anything proposed under a trait row is this
mistake a third time.

**The ladders were not deleted; they went to the screens that own
them** — the lifts to Train (`StrengthStandards`), the money to Finance,
the explored share to the Map. `AreaLadders` in `CharacterParts.tsx` is
the shared lookup, by area id against the sheet, so an area gains a row
by gaining a ladder in the registry. Strength does not go through it:
its total is derived from three ladders rather than being one, so it is
read off the character and drawn with `AttributeRow`.

**That home should stick, and it is better than where they started.** A
reading beside the thing it measures and the controls that move it needs
no explaining, where the same reading under a trait bar needed a rule
about why two currencies were adjacent. The exploration ladder in
particular has now been homeless twice and is finally beside the fog it
is computed from.

**Measured, because the cost of the busy version was measured too.** The
day's first heading sat at 1,309 pixels before any of this, 1,725 with
the area sections, and **941 now** — moving the ladders off took the day
368 pixels closer to the top than it had ever been. The fold on the
traits this file keeps recommending is no longer needed.

**`AreaXpRow` and `AREA_LABELS` were deleted with the sections.** The
label map is worth knowing about if area names ever go back in front of
a reader: the registry says Backlog, Projects, Upgrades, Places and
Social where the app says Codex, Quests, Tech tree, Map and Party, and
the vocabulary rule is that **any string a person reads says what the
screens say**. It is in the git history.

**A trait and a ladder stay different currencies and the screen must not
merge them.** The trait's bar is XP into a level; the ladder is a
reading against a standard the app cannot move. Putting them adjacent
says only that they are about the same part of your life. The visible
consequence, which looks like a bug and is not: on a fresh database
**Strength reads "Nothing yet" directly above a Powerlifting total of
959 lb** — no session has been logged, and the estimated maxes are still
a real measurement.

**`LadderRow` came out of `AreaCard` when that was deleted**, and
Training keeps its `AttributeRow`s rather than using it, because those
say a bodyweight multiple and the load needed for the next level where
the generic row says a value and an anchor.

**The total comes from the character, not the sheet**, and cannot come
from the sheet: it is derived from three ladders rather than being one,
and `measure.ts` deliberately names the three lifts instead of computing
it from `STRENGTH_LIFTS`. That is why the override was needed at all —
`area.ladders` is the three lifts and can never hold the total.

**Dailies is the one area kept out of that list, and the test is not the
one Training was kept out by.** Reported: _"dailies probably doesn't
belong there."_ It does not — this screen already gives the habits the
largest block on it, with the day's list, the counts and the streaks, so
a card underneath saying _Dailies · Kept_ is one area appearing twice
under one word for two different readings.

The rule is **whether the area has its own block on this screen**, not
whether some number is duplicated. Training has none, so it earns a
card. Base keeps its card because what it now reports is nowhere else
here. The rating itself is untouched and still judged in the monthly
review, which is the screen whose job is monthly judgements.

**Base is rated on the house, not on its chores.** Reported in the same
breath: _"base should be more about declutter and projects status vs
recurring tasks."_ It read `Chores kept`, a share of expected days —
which is the _dailies_ rating with another name over it, because a chore
is a recurring task that happens to be filed here. Two areas were
reporting the same shape of month.

`base.clear` is how clear the house is, from `houseStanding` over the
rooms with a reading, and `base.jobs` is steps closed on house jobs.
Both are `increase` rather than a threshold: there is no published
figure for how cleared a house ought to be, and inventing one would be
the scale this model refuses — so what is judged is whether it moved the
right way, which is also the honest shape for a level that goes both
ways over months.

**Steps rather than jobs finished**, because a house job is rarely
finished in the month it was opened and a rating that only moved on
completion would read flat through every month of real work.

**It can be counted at all because `projects.actions-closed-in-month` is
own-area only.** The two filters are complements, so a house job's steps
land in exactly one of them and rule three holds by construction rather
than by attention. `base.chore-share-in-month` went with the rating it
fed — a source nothing declares is weight the spine would go on
computing every month.

The card leads the list because Training is `phase: 0`, so it sits about
where the section did, one heading shallower. Its heading now reads
**Training** rather than _Strength_, since it is the area's own name and
carries the Consistency rating too.

**`domain/game/` is the model for the whole hub, and it is all wired up
now.** [docs/GAME_MODEL.md](docs/GAME_MODEL.md) decided — before any area
arrived — what a number is allowed to mean: three currencies (ladder,
rating, XP), one tech tree, three rules. It stayed deliberately unwired
through every migration, because hooking a new domain to XP while it is
being ported is how an exchange rate gets set by accident, in a commit
whose message is about something else. `application/use-cases/character/
sheet.ts` is where it finally joins up, and it restates nothing: an area
reaches the character sheet by gaining a row in `registry.ts`.

The three rules are tests, not prose: **no ladder is fed by XP** (a ladder
must name an external standard), **no rating is promoted to a ladder** (no
measurement may be claimed by both), and **nothing is counted twice**
(`creditFor` returns one credit or none). `registry.test.ts` fails on each.

**The backlog is the first absorbed app, and it is namespaced for a
reason.** `domain/backlog/` holds a second `Settings` and a second
`priority/`: LifeOS's priority is muscle tiers and capacity, the backlog's is
how much you want to get to a book. The directory is what keeps them
apart, and `BacklogSettings` / `BacklogItemId` are named for their area for
the same reason. Its `updatedAt` is optional and written by the repository,
not by `createItem` — the domain deliberately leaves it undefined.

**A progress log is unioned by day, and it is the only merged record in
the app.** `unionProgress` in `domain/sync/payload.ts`. Everything else is
whole-record last-write-wins, which is right for a workout — you log sets
on the phone and read them at the desk — and wrong for a backlog: a chapter
on the phone on Monday and an episode on the laptop on Tuesday, with
neither device having heard from the other, loses Monday entirely. Do not
"simplify" this back to a record-level winner; `synchronise.test.ts` fails
in two places if you do.

**Two read-modify-writes of one record, fired together, lose one of
them — and the comment saying otherwise was mine.** The stage editor
first sent a rename and a retarget as separate mutations, reasoning
that they are separate operations. They are. Both are also a
read-modify-write of the same campaign record, so the second read the
copy from _before_ the first had saved and wrote the old name back.
Driving it caught the target moving to 30,000 while the new name
silently did not stick; the suite was green throughout.

This is the hazard `serialise` exists for in the backlog hooks,
arriving from the other direction. There the answer is a queue, because
two taps really are two events. Here **one form press is one edit**, so
the answer is `reshapeStage` — one function, one write. Any future edit
that changes two fields of a campaign belongs in one call for the same
reason.

**Three kinds of stage edit, and only one loses anything.** A name is a
label: the stage means what it meant and every lap still happened. A
target changes whether it is _met_ and rewrites nothing — unlike a
habit's cadence, which decides which days were expected and re-reads
every streak. `dropStage` is named apart from the rest because it is
the destructive one, the rule that a call site must not be able to ask
for "change this" and receive "wipe it".

**The laps survive a change of kind, deliberately.** Turning a declared
stage into a measured one leaves its dates inert — the reading decides
from then on — and clearing them would be a destructive edit wearing a
settings change's clothes. "2026-08-31 · Maple Street" is a true record
of a day something happened, and it survives the way a retired habit’s
kept days do. The editor says so before the change rather than after.

**The confirm appears only when there is something to lose.** A stage
nobody has reached carries no record, so asking about it is a dialogue
for its own sake — and asking about everything is how somebody learns
to press through the question without reading it.

**Listings cannot be searched and the neighbourhood can. That split is
the whole feature, and it was tested before anything was built.**
Zillow, Redfin and Realtor.com are all _reachable_ and all send no CORS
header — so is the US Census API, which was the other obvious source.
Overpass answers a browser directly. A house is therefore **typed in**
and its surroundings are **measured**, which is the same arrangement the
job search has: the resume is typed and the boards are read. The screen
says so, because a search box that never finds anything is worse than a
stated limit.

Overpass is the third face of OpenStreetMap, which the map already uses
for tiles and geocoding — the same donated service, not a new host.

**Only the wanted kinds are queried, and the difference was measured.**
All eight around a Manhattan address returned 2,300 elements in **13.4
seconds** and sometimes 504’d; the three defaults took **1.8**. Overpass
reports two concurrent slots, so a screen that read every candidate on
load would be both slow and refused. The result is stored on the
candidate with its `readAt`, because OSM changes over months.

**A 504 answers with an XHTML error page**, so `response.ok` is checked
before `json()` — otherwise a busy query fails with a `SyntaxError`
about an unexpected `<`, which is the least useful message available.

**`Neighbourhood.asked` exists because otherwise a zero is a lie**, and
this was found by reading a real address: `schools: 0` sat beside 543
parks purely because schools had not been queried. Add schools to your
wants afterwards and the score would drop against something nobody had
ever looked for. Scoring now runs over `wanted ∩ asked`, and `unmeasured`
is reported so the screen can offer a re-read rather than showing a
quietly lower number. A kind that _was_ asked for and found nothing
still counts — the distinction is "looked and found none" against "never
looked".

**`asked` is optional because stored records outlive the type that
wrote them.** The first version made it required and
`asked.includes(...)` threw on the one record already in the database,
taking the whole screen down. A reading without it is treated as having
measured nothing, which prompts a re-read rather than scoring counts
whose provenance is unknown.

**Wants, not filters.** Nothing is ever dropped for scoring badly: a
house over budget is a house over budget and you may still want to look
at it. Over budget loses points _in proportion_ — ten percent over is a
conversation and double is not — and being cheaper than the budget earns
nothing extra, or the worst affordable option would outrank the best.

**Nearby counts cap at three.** Three supermarkets is a well-served
address and the thirtieth adds nothing; a raw count would rank a dense
city centre top on every kind, which is a fact about density rather than
about whether the address suits you.

**OSM completeness is uneven, and that is a limitation rather than a
caveat.** A low count means either "nothing there" or "nobody mapped
it", and nothing here can tell which. Two addresses in the same town
compare fairly; one in Manhattan against one in rural Vermont does not.
The screen states it.

**It pays no XP.** Looking at houses is part of the move, and the move
is a campaign — a readout. What it does feed is the campaign’s new
`homes-viewed` requirement, so "Find a new house" can be measured.
**Ruled out counts as seen**, because deciding against one is what
viewing is _for_: a count that only rose on houses you liked would
measure optimism rather than effort.

**Mind is study and practice, and the ask was two things of which only
one was missing.** _"A mental training section where I do a daily study
of design patterns, and maybe pull LeetCode questions in and have that
gain XP."_

The **daily study is a habit and needed nothing new** — a `Daily` filed
to Mind, on a cadence, with a streak. What it needed was a home, so it
pays `mind.habit-kept` instead of crowding Today.

The **log did not exist**. A solved problem has a name, a difficulty
and a language, and two in a morning are two things rather than one day
ticked — the shape of a `WorkoutLog`, not of a habit. That is
`domain/mind/practice.ts`.

**A home, not a group**, and the distinction is the one that sent
supplements and pet care to `Daily.group` instead. A group is a label; a
home decides which screen owns the record _and_ which area pays its XP.
Mind wants both halves, so it earns the full cost — a registry area, two
acts, a branch in `tallyActs`, a line in the "exactly one side" test.

**Its trait is Intellect, joining the backlog there.** Practice is the
other half of what that bar meant: one is what you have read, the other
is what you can do. A ninth trait would have split a thing that is one
thing.

**No ladder, and this is where a count is most tempting.** LeetCode
publishes how many problems exist and every practice site shows a total
solved, so a "1,200 problems" ceiling _looks_ like an external standard.
It is a count of one site’s catalogue, which grows, and nothing about
having solved half of it says you are halfway to anything.

**Two ratings, because one number cannot say what happened.** Six
problems in a Sunday and six over six days are very different months, so
problems-solved and days-practised are both counted. Absent when nothing
has been practised, never zero.

**Difficulty is recorded and does not scale the XP.** Points are flat
per occurrence everywhere here. The rule’s usual justification — that
scaling reintroduces the outcome — is weaker for difficulty, which is a
property of the problem rather than of how it went. It is kept anyway,
because a hard problem paying triple turns a record of practice into a
thing to optimise, and the honest reason to do a hard one is that it is
hard. The screen says so where somebody chooses it.

**Exercism is readable and LeetCode is not, and that was tested.**
Exercism’s `/api/v2` is internal, needs a token and is CORS-blocked from
a browser. Their _content_ is open: every track is a public GitHub
repository whose `config.json` `raw.githubusercontent.com` serves with
no key — **111 practice exercises for TypeScript in one request**.
LeetCode publishes no equivalent and blocks browsers, so a problem from
there is typed in by name. That is all the log needs: what pays XP is
having solved it, not the app having fetched the text.

Two quirks came off the real config rather than a guess. A track lists
**`concept` exercises alongside `practice` ones** — the first are its
syllabus, worked through in order, and offering both would mix a course
into a problem list. And **`deprecated` is a real status**, so offering
one is offering a problem the track has withdrawn. Their 1–10 difficulty
is banded into the three used here rather than carried alongside them,
because two answers to "how hard was it" is one too many.

Unauthenticated GitHub allows **60 requests an hour**, which is ample
for reading a track once and caching it and nowhere near enough to
browse. `staleTime: Infinity` and every refetch off. Seventh outbound
host; each one is a decision, not a precedent.

**An attempt is deleted, not retired**, unlike a habit. A habit’s kept
days _are_ the record and retiring keeps them; a problem logged by
mistake is not a thing that happened, and leaving it would go on paying
XP for it.

**A repeat is reported, never refused.** A kata done a second time from
memory is the point of a kata, so `timesSolved` exists to let the form
say "you logged this in March" rather than to stop anybody logging it.

**A contract is a one-off, and it has exactly one step for a reason
that is not tidiness.** The ask: _"maybe we need contracts or something
to track little one-off things that come up."_ The board is for what you
chose and are working through; a parcel to return does not belong there
wearing the same clothes — the crowding argument that moved house work
to Base.

**A view, not a record type.** `domain/projects/contract.ts` is a
predicate over `Project`: no new store, no new act, no new XP price. It
reuses the board's card and every rule about blockers and homes.

**One step, because a stepless one-off would pay nothing.** XP comes
from `projects.side-action-closed` — 20 points — and _nothing pays for
a project existing or being marked done_. So a contract created empty
earns zero, and a section full of things that pay nothing teaches you
not to use it. The one-off **is** the step; closing it is the act, and
the act is what the model pays for. `addContract` writes the step in
the same call, so a half-built contract cannot be left behind.

The alternative was a new act for "closed a project with no steps",
which would have been a way to earn points by creating and closing empty
records — the farming incentive the act/outcome line exists to prevent.

**Derived, so it moves rather than being wrong.** A quest that grows a
second step stops being a contract, which is honest: the moment
something needs breaking down it is no longer a one-off. `contracts`
and `board` partition what is outstanding, so nothing appears twice and
nothing vanishes — there is a test for that.

**Ticking a contract closes it out, and the shared rule is untouched.**
`deriveStatus` still never completes a project on its own — one with
every step done may still have steps to add, and closing it is a
decision. That holds for every checklist. What yields is the one shape
where it read as ceremony: a contract _is_ its single step, so asking
for a separate "and now mark it complete" over a parcel is a tap for
nothing.

The rule lives in `settleContract`, **named and in the domain, rather
than folded into `deriveStatus`** — the point is that there is no second
answer hidden inside the shared derivation. It is a no-op for anything
without exactly one action, and identity when nothing changes, so
`setActionStatus` applies it unconditionally.

**Reopening is the half that must not be forgotten.** Without it a
mis-tap files the contract as completed forever: `deriveStatus`
short-circuits on a requested `completed`, so nothing else would ever
put it back. `paused` is left alone in both directions — parking
something is a statement about whether you mean to do it at all, and a
tick should not quietly overrule it.

**A test had encoded the old behaviour on a single-action project**, and
it failed the moment this landed — correctly. The rule it protects is
still true, so it now uses a two-step quest, and the one-off case has
tests of its own in both directions.

Verified end to end: a contract created from the section arrived as a
side quest with one pending step, stayed off the board, and closing it
took the all-time XP from 1,675 to **1,695** with a new "Projects · 20
XP" line — which is the whole reason it has a step at all.

**The arc names its own section, and the app supplies no title once
there is one.** Reported: _"I don't like 'The long way round' — I'm not
sure what it even means or where it came from."_ It came from here: a
fixed `Section` title over a card that then repeated the campaign's real
name a size smaller. So the screen led with a heading nobody chose and
buried _Move out of GVR_ inside it.

Each arc is a `Section` of its own now, titled by its `name`, with its
`aim` as the description — a campaign already carries both halves of a
section header, and drawing them as one is what makes that part of the
screen read as being about the arc rather than as a list with one entry.
The only title the app still supplies is **"The arc"** on the empty
state, where there is nothing to name it after. With two arcs there are
two headings and no wrapper, which is right: nothing is _the_ arc.

**The name and the aim are editable, and were not.** `renameArc` and
`useRenameArc` were written, exported, and called by **nothing** — the
same pattern as `removeDaily`, `moveDailyHome` and the rest. That is how
a real arc came to carry the aim _"Step 1: don't absolutely despise your
current neighbourhood"_: a description typed into the box above a
numbered stage list, and then unfixable from any screen. This file
already records the labelling fix for that box at creation; what it
missed was that **a field you can only get wrong once still has to be
correctable**.

Both are labels — the stages, their laps and every date under them are
untouched — which is why the arc editor carries no warning where a
stage's _target_ change does.

**Every stage links to the screen its evidence comes from.**
`EVIDENCE_SCREENS` in `Campaigns.tsx`: house jobs to Base, offers to the
job search, houses seen to Houses, money to Finance. Reported as _"all
the other things that just have manual completions, like house search,
should have sections that we could link to like the other sections"_ — a
stage reading _0 of 5 house jobs finished_ is quoting a number Base
owns, and nothing on the row said so.

**Keyed on the requirement, never on the name.** A stage name is free
text and could say anything; the requirement is the app's own statement
about which records it reads, so a link derived from it cannot point
somewhere the number does not come from. The routes live in the feature
because `domain/campaign` must not know a browser exists.

**A declared stage gets none, and that is the definition rather than a
gap.** It is declared precisely because nothing in the app records it —
there is no screen where "we found a house we liked" is written down, so
a link would have to be invented. _Houses seen_ is the measured version
of house-hunting and does link, so a house-search stage that wants one
is a retarget away in the editor rather than a new field.

**The arc stands in for a main quest you have not picked.** Reported:
_"I'm still seeing no main or side quests assigned despite starting an
arc."_ Nothing was broken — a campaign is deliberately not a `Project`
(see below) — but the slot answered "no main quest active" to somebody
who had just declared what they were working towards, which is the
wrong answer to a fair question.

**A readout, not a quest.** The slot links to where stages are actually
worked. Nothing to activate, nothing to close, and it pays nothing — the
same footing as the arc itself. Making a stage into a `Project` to fill
the slot is the move rule three forbids: closing it would pay XP for
work its own area has already paid for.

**The arc is the headline and the stage is the next step, and that was
inverted.** Reported: _"there should be some sort of designation to say
this is the main quest, and then under it the next thing — in our case
the specific job."_ Right, and the slot said the opposite: it led with
_Fix up the house_ and put _Move out of GVR_ a size smaller underneath,
so the thing being worked towards read as a footnote to one of its own
stages. Every other slot on that screen names the quest and says
"Next: …"; the arc is the quest here, so it does the same.

**It is badged _Main_ now, which reverses the call in the paragraph
above.** It read _Arc_, on the reasoning that a campaign is a readout
rather than a quest. All of that is still true and none of it was the
question being asked: the card sits in the main quest slot, under a
heading reading "one main quest, one side quest", so refusing to call it
the main one left the screen declining to name what it was plainly
showing. What keeps it honest is everything around the badge: the
line below counts **stages**, which is the arc's own word where a quest
has steps; there is no stand-down button, because there is nothing to
stand down; and the link says _arc_ outright.

**The word _Arc_ used to prefix that line and had to go.** It read
`Arc · Fix up the house · stage 1 of 6`, reported as _"that reads weird
— it makes it seem like every stage is an arc, when you add arcs and
each has stages."_ Exactly right: **a middot between two nouns reads as
apposition**, so a label meant to mark the _card_ landed on the _stage_
beside it and renamed it. It is `Fix up the house · stage 1 of 6` now,
and `Stage 2 of 2` when the other line already names the stage.

**The stage sits above the step, which is the order the thing nests.**
Asked for as _"it should read stage and then job, just flip those
lines"_ — an arc holds stages and a stage is met by jobs, so reading the
card downwards now goes arc → stage → the thing to do, rather than
meeting the job before knowing what it is for. The stage line stays the
dimmer of the two: it is context, and the line under it is what you can
act on, which is the hierarchy the side quest's slot already draws.

Nothing was lost, because the prefix was the one honest-marker doing its
job by assertion rather than by construction — the vocabulary, the
missing button and the link all still separate this card from a quest.
**A label that has to announce what something is, next to the thing
itself, is usually describing the wrong noun.**

**The slot bottoms out in something you can actually go and do.**
Reported: _"I think here it should show what the next house fix-up thing
would be, you know."_ The two cards made the gap obvious side by side —
the side quest named _Access IRA_, a thing you can do, while the arc
named _Fix up the house_, which is a category. A slot whose whole job is
"what am I on" should end in a sentence, not a heading.

`STAGE_WORK` maps a stage's requirement to the home whose projects carry
that work — house jobs to Base, offers to the job search — and
`recommendation` over that home already picks the next step, skipping
what is blocked. Same engine the Suggested section runs; no second
answer to "what next".

**One level deeper than `EVIDENCE_SCREENS` and a different question.**
That map covers every measured kind and answers "which screen is this
number kept on". This one answers "whose next _step_ is this stage
waiting on", which only the two project-backed kinds can: a net-worth
stage is waiting on a reading, and naming a step for it would be the app
telling somebody to go and have more money. Declared, money and
houses-seen stages fall back to the stage name — absent, never invented.

**The job's name leads that line, because the step alone says nothing.**
Reported next: _"it just says find the right person, but that literally
applies to all the jobs."_ It does — `HIRED_JOB_STEPS` opens every house
job with the same three, so _Find the right person_ is the next step of
the porch roof, the boiler and the leaking tap identically. The name and
the step read as `Fix the porch roof · Find the right person`, in that
order, so a truncated line keeps the half that distinguishes it.

**`useRecommendation` takes the home, and `undefined` means "do not
ask".** That is not a third home; it is how a caller that only sometimes
has one keeps the hook unconditional, since hooks cannot be called in an
`if`. `ArcSlot` is its own component for the same reason — asking in
`Slot` would query on every side quest too.

**The arc's own card carries a `Main quest` badge to match**, because
the same thing appeared twice on one page with neither half mentioning
the other. Both halves compute it from the same two facts — no main
quest activated, and this is the first arc with something outstanding —
in `Campaigns`, passed down as `isMain`. Two components deciding it
separately is how the badge and the slot start disagreeing. Verified in
both directions: activating a real main quest removes the badge and the
arc slot together.

**An activated quest wins.** The arc is the direction underneath; a
quest you picked is the thing you chose this week. Verified by
activating one and watching the slot swap.

**A campaign is the long arc across areas, and it is not a `Project`.**
The report: _"I want to move eventually, but that depends on fixing up
the house, improving income, finding a new house, saving a deposit,
selling, moving."_ Every input already existed — Base holds the house
work, Jobs the applications, Finance the money — and nothing
represented the arc.

**Reusing `Project` was the obvious move and is barred by rule three.**
A project is the app’s shape for "a thing with steps", but closing its
action pays `projects.main-action-closed` — so a stage closing would
pay XP for work its own area had already paid for. The record types are
separate because the scoring has to be. It is not a second tech tree
either: that is gated progression with money, and `registry.test.ts`
holds that exactly one area spends.

**It pays nothing at all**, and the hooks say so where an `xp-award`
call would otherwise go. Finance already showed that an area which
reports and never pays is not incomplete.

**A stage is measured or declared, and saying which is the honest
part.** House jobs and offers are counted from records already kept;
the money is read off the monthly reading. Nothing in a habit tracker
knows you found a house you liked, so that stage is declared and the
app takes your word. A declared stage is not a lesser one. **A measured
stage cannot be declared done** — ticking past a reading that says
otherwise is the whole reason it is measured.

**Absent, never zero, and the two halves differ.** A _count_ is
genuinely zero when nothing has happened — you can count no finished
house jobs. A _money_ figure is typed in monthly, so its absence means
nobody has said, not that it is nothing: that stage reads `unproven`
and draws no bar, because a bar at nought against a target somebody set
reads as failing.

**Ordered but not gated.** The chain really is a chain, but a screen
that refused to record a later stage would be policing somebody’s life
rather than reporting on it, and things do not happen in the order they
were written. A later stage can be met first; `next` names the earliest
outstanding one and is _highlighted rather than moved_, for the reason
habits sort chronologically rather than current-part-first.

**`done` is a count and `nextPosition` is a position, and a screen
confused them.** Reported: _"why is this showing as stage 2 if we're
only on stage one, fix up the house?"_ The card named the right stage
and then numbered it wrongly, because the number was `done + 1`.

That is the position of `next` **only when the met stages are a prefix
of the list**, and the paragraph above is the promise that they need not
be: tick a declared stage further down and the count moves while the
first outstanding stage stays exactly where it was. One met stage at the
bottom of a six-stage arc made "Fix up the house" read as stage two.

`standingFor` carries `nextPosition` now, computed from the **same
search** that finds `next` — one `findIndex`, so the stage and its
number cannot come apart — and absent exactly when `next` is, so nothing
can read a position for a stage that is not there. A derived number
belongs beside the thing it describes rather than being recomputed from
a different quantity at the call site, which is the same lesson
`slotVolume` and the sync cursor's `pages` array both cost.

**An unlabelled field gets filled in with whatever it looks like it
wants.** Reported from real use: an arc was created with the aim box
holding a _description_ — "initially get out of someplace I despise" —
and then read as the arc's first stage. Nothing turned it into one;
`addCampaign` maps `input.stages` and stores `aim` apart. What was
wrong is that both fields carried a placeholder and an `aria-label` and
nothing else, so the moment you typed into either the screen stopped
saying what it was — and the numbered "Opens with" list sits directly
beneath the aim. Both are labelled visibly now, and the aim's label says
what it is _not_: the finish line for the whole arc, not the first step.

**A stage keeps every lap.** _"Job improvement is interesting because I
can progress through multiple jobs, and that applies to houses too."_ A
tick that stopped meaning anything after the first time would lose the
shape of the arc, so `reached` is a list of dated entries with notes —
"2026-08-31 · Maple Street". Undo takes the **most recent** lap only:
clearing the list would cost the record of the first two, which is the
sort of thing noticed afterwards.

**Evidence is gathered live, never copied.** A stored count is a total
that can be wrong. `keepFor` filters projects by home, which is what
stops a quest counting as house work — the third instance of a leak
that has now bitten `recommendation` and
`projects.actions-closed-in-month`. `latest` is read **per field**, so
somebody who checks their credit score quarterly still gets last
month’s net worth.

`DB_VERSION` went to 13 with a new guarded block, and the collection
registered in all five places — payload, `isEmpty`, `payloadSize`, the
Firestore target, the backup table — plus the tombstone list and the
deletion switch. The `switch-exhaustiveness-check` rule caught that last
one, and `repositories.test.ts` caught the store list. That is the
machinery working: five of the seven were found by the compiler or a
guard rather than by memory.

---

**The quest log is the hub's front page, and two of its rules used to be
the database's job.** `/next` is what `/` redirects to. Cycle detection
(`validateBlockers`) was enforced in the schema as well as in code and is
now the only guard there is; cascade delete is `withoutBlocker`, called by
hand, because a dangling blocker id would otherwise sit in the record,
travel over sync, and come back if a later project reused the id.

**The tech tree is drawn as a tree, and the shelf that shared its name
is called Gadgets.** Asked for as _"instead of the tech tree being one
thing, I want that to be renamed to gadgets and just have the tech tree
be an actual tree with the different list we've made (home, tech, etc)
as literally branches of that tree instead like a video game."_

One word had been doing two jobs: the screen was Tech tree and so was
one of the two shelves on it, so "the tech tree" meant the whole thing
or half of it depending on where you stood. The screen keeps the name
and the branch takes one describing what is on it. `base` stays **Base**
rather than becoming Home, because that is what its own tab says.

**`tree-layout.ts` is pure and lives in the feature, not the domain.**
It is geometry over a graph, so it is testable without a browser — and
positions are presentation, which `domain/upgrades/` has no business
holding an opinion about. Columns are fractional because a parent sits
at the midpoint of its outermost children, which is what makes a tidy
tree look drawn rather than stacked.

**SVG for the connectors, HTML for the nodes.** Lines need arbitrary
endpoints; nodes need wrapping text and a 44-pixel tap target. Drawing
labels inside the SVG would mean reimplementing text wrapping and losing
the target the mobile bar requires.

**It scrolls sideways, and that is the one place in this app where that
is correct** — but it was doing far more of it than the tree needed. A
tree of any width cannot be squeezed into 375 pixels with readable nodes,
so the canvas is as wide as it needs and the container scrolls; the
_page_ must still never scroll sideways, so the overflow is on that
container alone.

**Branches stack down the page rather than side by side.** Reported as
_"I have to scroll all the way over to see it in mobile which isn't a
great experience."_ Columns were handed out in one running sequence
across every branch, so the canvas was as wide as **the sum of all of
them**: measured at **1320 pixels** on eight upgrades across two shelves,
on a 375-pixel screen. You could see 28% of your own tech tree, and the
second branch was entirely off the right edge before you had seen
anything.

Each branch now starts at column 0 in a row band of its own, so the width
is **the widest single branch** rather than the sum — the same eight come
out at **528**. Height grows instead, which is the axis a phone already
scrolls.

It can still overflow, and that is now the case the horizontal scroll is
genuinely for: four siblings at 132 pixels is 528 whatever the screen.
What it no longer does is hide a whole branch before you have seen one.

**The gutter became a gap.** `BRANCH_GUTTER` was empty _columns_ between
branches, because side by side with one column sequence the last node of
Base and the first of Gadgets sat adjacent and a Monitor filed under
Gadgets appeared to hang off Base. Stacking answers that by construction
— they cannot be adjacent sideways any more — and `BRANCH_GAP` is the
empty _row_ that keeps the deepest node of one band off the next band's
label.

**The trunk sits above the first branch, not centred across all of
them.** Side by side the centre was between the branches and every edge
ran down and outwards; stacked, they are all below it, so the centre of
the topmost band is the only position from which the edges do not cross
the bands underneath.

**Two layout tests moved from absolute rows to relative ones.** They
asserted rows 2, 3, 4 for a nesting chain, which was the same thing while
every branch's roots sat on row 2 — and would now be asserting _the order
of the shelves_ while claiming to assert nesting. Two more were added: the
canvas is sized to the widest branch rather than the sum, and a band
cannot overlap the one above it.

**A gutter between branches, found by looking rather than by reasoning.**
Columns are handed out in one running sequence, so the last node of Base
and the first of Gadgets sat adjacent with nothing between them; since a
connector leaves the top of a node, telling which branch something was
on meant tracing a line. On the first tree with content on both
branches a Monitor filed under Gadgets appeared to hang off Base.

**A cross-branch prerequisite is laid out as a root and linked with a
dashed edge.** Gates are global — "the desk before the monitor arm" is
real and crosses branches — so nesting it would drag the arm into Home,
and dropping the link would leave a locked node with nothing explaining
why. A dangling prerequisite degrades to a root for the same reason:
drawn oddly is visible, drawn nowhere is not.

**Prices are not shown or asked for either.** Asked for as _"we shouldn't
track pool to spend or price anymore."_ The cost field left both add
forms, and the price left the tree nodes, the Today card, the Base rows
and the list totals; `wishlistTotal` went with its last caller. A tie in
the ranking breaks by name rather than by price, since ordering by a
number nobody can see is no reason anybody could give. `estimatedCostMinorUnits`
stays on the record — stored rows hold it and nothing is migrated.

**The pool no longer gates anything, because finance is not tracked.**
Asked for as _"we aren't tracking how much we have saved or anything
anymore."_ The screens pass `NO_BUDGET` (`features/upgrades/hooks.ts`)
to the tree, so the only gate left is a prerequisite and `affordable`
reads as "unlocked". The pool card, the savings gauge and "beyond the
pool" are gone; `domain/upgrades/pool.ts` and the money gate are left
in place, untouched and unread by any screen, so bringing finance back
is a hook change rather than a rebuild. The paragraphs below describe
the pool as it was.

**The pool replaced the device-local budget, and it is derived.**
`domain/upgrades/pool.ts`: every surplus recorded on a finance reading,
minus what the purchased upgrades cost. Asked for as _"at the end of the
month, whatever surplus I have leftover will be added to the pool to
spend of that."_

**A stored balance was the obvious build and the wrong one**, for the
third time in this app after `readCharges` and `tallyActs`: a running
total drifts on a lost write, cannot survive two devices incrementing
it, and hides a mistyped entry forever. Both halves here are records
that already exist and already sync, so the pool is an opinion about
records rather than a record of its own. It also fixes what the budget
box was — a `localStorage` number, so the phone and the laptop
disagreed about what was affordable and neither was inspectable.

**The surplus is typed, never derived from the net-worth series.** Net
worth moves for reasons that are not surplus — a market swing, a
revaluation — so a good month would hand you money you never had to
spend. What is banked is what you decided was spare.

**It is allowed to go negative.** Flooring an overspend at zero would
forget it by the next month, so the pool would refill to the next
surplus rather than starting from the hole. Same reason
`ChargeReading.over` is separate from `available`: the screen may clamp
a bar, the record must not.

**A pool spanning two areas means both mutations have to invalidate.**
`useRecordFinance` cleared `finance` and `character` and left `upgrades`
alone, so banking a surplus left the tree showing the old gates until
something else happened to reload it. Caught by driving the round trip,
not by a test.

**The history row drifted the same way it drifted before.** Adding the
surplus left two months of real readings displaying "Nothing recorded"
while the figure sat in the database — the defect this file already
records as _"a month's row draws every figure it holds, and drew two of
four"_, arriving again by exactly the route it did the first time. The
recording path's walking test passed throughout, because the storing was
correct; what drifted was the **display**, which kept its own
hand-written copy of the list. It is a `Record<keyof NewFinanceReading,
…>` now, so the next field fails the build here too. **A guard on one
end of a field does not guard the other.**

**Finance is the money hub.** Asked for as _"add all the other upgrades
on that page"_ — so it carries the standards, the monthly readings, the
pool and what the pool is going towards, and the tree keeps the picture
and the gates. The list there is a **readout, not a second editor**: a
control would be a second place for the gate rules to be got wrong,
which is why Base's upgrade rows are read-only too.

**Adding to the tree picks its branch.** With one screen per shelf the
screen implied it; with one tree showing every branch there is nothing
to infer it from, and adding a desk only to move it afterwards is the
round trip Base was given its own add form to avoid.

**The tech tree is where `domain/game/` stops being unwired.**
`domain/upgrades/` projects an upgrade onto the model's `TreeNode`, so
`GATE_KINDS` — money and a prerequisite, nothing bought with points — now
constrains live code. Money is integer minor units everywhere; a budget
filter on floating point eventually disagrees with itself. Two of its
rules had a database behind them and no longer do: `wouldCreateCycle`, and
the refusal to delete anything with dependents still attached.

**The morning digest pays no XP, and that is the design rather than a
gap.** A digest is the one thing in the hub that is not a record of
anything you did — reading a headline list is not an act, and paying
for marking items read would create exactly the farming incentive the
act/outcome line exists to prevent. It is a reading surface, like the
map's tiles, and it is deliberately **not a `LifeArea`**: adding one
would break the trait partition and demand acts it should not have.

**Its one action lands somewhere that already scores.** Saving a story
makes an ordinary backlog item, and logging progress there pays, and
finishing it pays, and both feed Intellect. So the path from "this
looks interesting" to XP runs through a record of having actually read
the thing. The card says so on screen.

**Interests rank; they do not gate** — the one place the job scorer’s
shape was deliberately not copied. There a keyword is a _share_ of the
wanted list, so adding one you rarely match lowers every score, which
is documented because it reads as a bug. A digest has no such excuse:
hiding everything off-subject turns it into a filter bubble somebody
configured by accident. **Mutes do gate**, because that is what a mute
is. Nothing computes a score of its own; the fallback is the source’s
own points, which every reader of that site already understands.

**Hacker News through Algolia, not the official Firebase API.** Both
are open to a browser with no key and both were tested. Firebase
returns 500 story _ids_ and then wants a request per story to get
titles — thirty requests for a front page, where Algolia returns it in
one. Lobsters is reachable and sends no CORS header; Exercism is
CORS-blocked outright. That makes six outbound hosts, and **each one is
a decision, not a precedent.**

**Parsing is what keeps the cache small.** A single Algolia hit carries
`_highlightResult` and a `children` array of every comment id on the
story — eighty on the first one looked at. Twelve parsed stories store
in 4.3 KB; the raw hits would be orders of magnitude more. An Ask HN
has a **null `url`**, verified live, so `url` is optional and the
discussion link always exists.

**`once-a-day.ts` is shared by the digest and the job sweep, and it
fixes a bug the sweep shipped with.** That gate kept a marker and no
store, so the second open of a day answered "already swept" carrying
nothing — the card showing thirty leads at eight in the morning
rendered blank at noon, with the day marked so it could not run again.
A morning’s work vanishing with no way back is worse than not having
run it. The result is remembered now.

The day is still marked **before** the work: a source that hangs would
otherwise leave it unset and every reopening that day would retry the
whole list. The two are stored at different moments, which is what
makes a failure (`failed-earlier`) distinguishable from a success that
returned nothing.

**The manual retry that sentence promised did not exist, and a failed
morning was unrecoverable until midnight.** Reported as _"Hacker News
could not be read / DEV could not be read"_. Both endpoints answer a
browser fine — checked from the deployed origin, 200 with CORS on both —
so the failure was real once and then **stuck**.

Two mechanisms held it there, and they arrive at the same dead card by
different routes:

- `forgetToday` was written, exported and **called by nothing**, the
  eighth instance of that shape here. So `failed-earlier` had no way
  out.
- **A total failure is remembered as a success.** `readDigest` catches
  per source and returns the failures as _data_, so the gate stores a
  perfectly good result that happens to be two error lines —
  `remembered`, not `failed-earlier`. The sweep does the same.

Both cards carry a **Try again** now, through `useRetryToday`: forget
the day, invalidate the query, let the gate re-run. That is the decision
rather than the storm the paragraph above describes. The queries stay
`staleTime: Infinity` with every refetch off, because the point was
never that this should retry _by itself_.

**Why one bad moment is likely rather than rare:** both jobs run on the
first open of a day, and a PWA's first open is a **resume from the
background** — precisely when a phone is most likely to have no usable
connection yet.

**The cause was thrown away at the moment it was caught.** The catch
read `void error` under a comment saying it was "kept for the log". It
was not, so every failure this screen has ever reported was
undiagnosable — a 503, a CORS refusal and a phone with no signal all
rendered as the same sentence with nothing behind it. It logs
`digest.source-failed` now. **A comment claiming something is logged is
worth checking, not trusting.**

**A saved story is checked against the Codex, not against component
state.** A story sits on the front page two days running, and state
alone resets on reload — which is exactly when the duplicate gets made.
Same guard `appliedLinks` gives the job leads.

**The save is marked only once the write succeeds**, and the first
version got this wrong in the most instructive way: it invented a
status (`not-started`, which is not one of the six), the domain refused
it correctly, the error went to the log, and the tick turned green over
a record that did not exist. A button that looks like it worked is
worse than one that looks broken.

`articles` joined `CATEGORY_REGISTRY` because a story is genuinely none
of the other ten, and filing one under `books` would make every reading
statistic about books wrong. Its test was split in two: the ported ten
must all still be present — losing one would orphan every item filed
under it — but the registry is allowed to grow, which the old
exact-array assertion forbade for no stated reason.

**The job search lives in settings, and it was component state — which
made it a bug rather than a preference.** Six `useState` calls on the
leads panel held every board slug and every filter, so all of it was
wiped by any navigation. The panel is reached _from_ the applications
above it, so tapping through to one and coming back is the ordinary
path, not an edge case: the search had to be retyped before it could
be run, every time.

It also left **three of the six filters unreachable**. `titleExcludes`,
`keywordExcludes` and the score floor were literals at the one call
site — `[]`, `[]` and `0` — so two exclusion rules the domain
implements and tests could not be set from anywhere, and the floor of
zero meant the scorer ranked the whole board and hid nothing. The
default floor is 40: a posting still scores for being fresh and in the
right place without matching a single term.

It **syncs**, because a board slug is a fact about the search rather
than about the phone. `parseJobSearch` is its own validator for the
reason the settings parse around it is: this arrives from another
device, and a board kind that is not recognised must be dropped rather
than handed to the gateway.

**"Read daily" is a sweep on the first open of a day, and calling it a
schedule would be a lie.** Nothing can run while the app is closed —
no server, and iOS gives a home-screen web app no background fetch,
the same ceiling that stops a daily from ringing. On something opened
every morning that is most of the way to the same thing, and the copy
says "this morning" rather than implying a timer.

**The marker is written before the boards are read, not after.** A
board that hangs would otherwise leave it unset and every reopening
that day would retry the whole list — one slow morning turning into a
request loop against a free API somebody else pays for. A failed sweep
is reported in `failures` with a button beside it, which makes the
retry a decision.

**The marker is per-device and deliberately not synced**, unlike the
search itself. One that travelled would have the phone skip its
morning sweep because the laptop ran one an hour ago, leaving the
phone showing nothing with no way to explain why. Two devices reading
a board each is the cheaper mistake. Same call the upgrade budget and
the program position make.

`useDailySweep` is a query rather than an effect so Today and the Jobs
screen share one answer, with every refetch turned off: the defaults
would re-read three job boards on each window focus, which is the
polling this whole area is written to avoid.

**Approving a lead _is_ applying, and that diverges from the app this
was ported from on purpose.** There, approving files an application in
_Preparing_ and applying is a later stage. Here, creating the
application pays `jobs.application-sent` — thirty XP for an act — so a
record that existed before anything was sent would pay for something
nobody did. One press opens the form and files the application
together, which is the only arrangement in which both stay true. A
shortlist of postings you are _considering_ is a different record and
is not this one.

The window is opened from the click rather than after the write
resolves, because a popup blocker stops anything a promise opens later.

**`Project.link` is the identity of an approved lead.** A sweep is the
only way to see a lead and a sweep re-reads the whole board, so the
same posting comes back every time — without a key, triaging twice
quietly produces two applications to one job. The apply URL is the one
thing about a posting that is unique _and_ stable across a re-read:
ids are per-board and a title repeats across companies.

**The posting travels with the approval**, into `description`, so the
resume match works the moment the application exists. Nothing is
prepended to it — a "from Greenhouse, scored 80" preamble would put
those words into the match, where "greenhouse" and the board slug would
read as requirements.

**Terms are ranked by count discounted by how late they first appear,
and getting there took one wrong answer worth recording.**

Frequency alone rewards boilerplate, because boilerplate repeats. The
usual fix is inverse document frequency and it wants a corpus of
postings, which an app reading one job ad does not have.

**Capitalisation was tried first and measured wrong.** The idea: a
posting capitalises Kubernetes and Terraform mid-sentence while prose
stays lower, so the writer is telling us which words are names. True of
the requirements — and equally true of benefits sections, which are
written in Title Case. On a real posting it promoted "Medical",
"Available" and "Full-time" and made the list _worse_ than frequency.
A good-sounding idea that did not survive contact with a document.

**Position survived it, and the separation was not subtle.** On the
same posting: endpoint at 18% of the way in, macos 19%, fleet 19%,
gitops 21%, telemetry 25% — against insurance at 67%, 401 at 69%,
parental 71%, bonding 72%, privacy 99%. Postings put the job first and
the benefits and legal last, and that is structural rather than lucky.

The weight is `count × (1 − firstAt / total)`. **First rather than
average**, because a requirement named at the top and mentioned again
among the benefits is still a requirement.

Measured before and after on the posting that started it. Before:
`bonding ×6, coverage ×6, through ×6, weeks ×6, fleet ×5, pay ×5`.
After: `fleet ×5, how, build, endpoint, macos, windows`. Every benefits
word left the top twelve, and the phrases went from `bonding only,
parental leave, weeks birthing` to `fleet macos, corporate security,
fleet telemetry`.

Nothing is dropped, only ranked — `dental` still reports its four
mentions, further down. A word list that removed it would be the app
deciding what counts as a skill, which is the line held everywhere else
here.

**A real posting is mostly not the job, and that is a live limitation.**
The match was built against hand-written three-sentence fixtures. The
first genuine posting — 5,400 characters of Ashby ad — produced a gap
list led by `ramp ×10`, `bonding ×6`, `weeks ×6`, `ll ×5`, `100 ×4`.
Three of those were fixable without the list starting to have opinions
about which _skills_ matter:

- **Bare numbers** are never a skill, and repeat enough to sort high.
- **Contraction tails** are not words: the tokeniser splits on the
  apostrophe, so "we'll" leaves `ll` behind.
- **The employer's own name**, passed to `matchResume` as `ignoring`. A
  posting says its company constantly and never requires it of the
  applicant.

What remains is benefits and legal boilerplate — bonding, coverage,
insurance, leave — which is genuinely in the posting and genuinely not
the job. Filtering it by word list would be the app deciding what a
skill is, which is the line this file holds elsewhere. The honest
options are ranking by distinctiveness rather than raw frequency, or
reading only the part of a posting above the benefits section, and
neither is a stopword.

**The app talks to three job boards now, and that was tested before it
was claimed.** Greenhouse, Lever and Ashby publish every open posting
as JSON with no key and no account, and all three answer a browser
request directly. An earlier answer in this project said job discovery
"requires a server or proxy, full stop" — that is true of LinkedIn and
Indeed and false of the public ATS boards, which is what the other app
was already using. **The correction came from running three fetches,
not from thinking harder.**

This makes four outbound hosts: OpenStreetMap for tiles, Nominatim for
geocoding, Firebase when sync is configured, and now the boards. Each
one is a decision, not a precedent.

**Parsing is pure and fetching is not.** `domain/jobs/boards.ts` turns
a board's JSON into postings and touches no network;
`infrastructure/jobs/ats-gateway.ts` is the only thing that fetches.
Every quirk below is therefore testable against a fixture rather than
against the internet on the day the suite runs — and the fixtures are
shapes taken from the live APIs rather than invented.

Three of those quirks were found in the first posting looked at, which
is why they are worth naming:

- **Ashby's own `isRemote` cannot be trusted.** A Ramp posting had
  `workplaceType: "Hybrid"` and `isRemote: true`. Believing the flag
  floods a remote search with office jobs, so `workplaceType` is
  authoritative whenever present and only a blank one falls back to the
  location text.
- **Ashby's compensation tiers hold several kinds of component.** The
  first was `EquityPercentage` with null values and the salary was
  second; taking the first reports somebody’s option grant as their pay.
- **Greenhouse's `content` is entity-encoded**, so it needs decoding
  twice — once to markup, once to words. Stopping after one leaves
  `&lt;p&gt;` for a keyword search to match through. Its `id` is also a
  _number_, and its `absolute_url` points at whatever embedded board the
  company runs, so the apply URL is built from the canonical address
  instead.

**Lever answers 200 for a board that does not exist**, with
`{"ok":false}` rather than a 404 — so the body shape is the only way to
tell a real empty board from a typo.

**Read on demand, never on a timer.** These are free services run for
employers rather than for us, and boards are read one at a time rather
than in parallel. A dozen simultaneous requests from every device that
opens a screen is how a free API stops being free. Same restraint the
geocoder shows towards Nominatim.

**A board that fails is named, and the sweep continues.** A mistyped
slug is the commonest thing that goes wrong, and a sweep that threw on
the first bad one would report nothing and leave somebody blaming the
network.

**Nothing is stored yet, deliberately.** The other app keeps a SQLite
mirror of every posting from every board; approving a lead into a
tracked application is the next piece, and until that exists,
persisting a mirror of three job boards would be storing something
nobody can act on. LifeOS records what you did, not what the internet
contains.

**The lead scorer is ported from Career Command Center, and it is a
port rather than a rewrite.** `domain/jobs/score.ts`. Hard filters drop
a posting outright; what survives earns 0–100 from title hits, keyword
coverage, location fit, published pay and freshness. **No model is
involved and every point is explainable**, which is the property worth
carrying across: a lead scoring 74 can say which points it earned.

Two deliberate departures from the C#, both rules this codebase
already holds:

- **Reasons are data, not a string.** The original built a
  `StringBuilder` of lines like "+50 title matches …". Structured
  reasons let a screen render them and a test assert on points rather
  than prose, and nothing has to parse English back into numbers.
- **The clock is a parameter.** `DateTime.UtcNow` was read inside the
  scorer, which makes freshness untestable and scores the same posting
  differently depending on the day the suite runs.

Money is minor units, like everywhere else: a pay floor is a budget
filter, and a budget filter on floating point eventually disagrees with
itself.

**Keyword score is a _share_ of the wanted list, which is the most
surprising thing in it.** Adding a keyword you rarely match lowers
every score — the list is for ranking, not for widening the net. It has
a test saying so, because it reads as a bug the first time somebody
meets it.

**The wanted-locations list applies to remote roles too.** "Remote
Poland" is still Poland. A bare `remote` term is how somebody opts into
remote-anywhere; `remote us` or `denver` keeps it local. The other
reading — remote means location does not matter — is the one that
quietly fills a board with jobs in the wrong hemisphere.

**A stale req is penalised, never dropped.** Past ninety days it loses
eight points: often filled or evergreen, occasionally still real, so it
falls behind fresher work rather than vanishing.

**Pay is judged only when the board publishes it**, which most do not.
Dropping every posting that stays quiet about money would throw away
the majority of a board to enforce a floor nobody stated.

**The posting lives in `Project.description`, and the match is a word
count.** `domain/jobs/match.ts`. For an application the posting _is_
the description of the thing, so a parallel field would be a second
place for the same text — the reuse that makes a house job a project
rather than a new record.

**It says on the screen that it does not read either document.** It
cannot tell that "orchestration" and "Kubernetes" are about the same
paragraph, and it will not notice five years being asked for. What it
answers is the one question nobody can answer reliably by eye at
eleven at night: which words in this posting appear nowhere in my
resume. A bare percentage with no caveat would read as advice about
whether to apply, which nothing here is entitled to give.

The alternative is a language model, which needs a key, which in a
client-only app is a key anybody can read out of the bundle. This
needs none, runs offline, and gives the same answer every time.

**The tokeniser keeps punctuation inside a token, and that is the whole
difficulty.** The obvious one strips non-letters, which turns `C#` into
`c`, `.NET` into `net` and `Node.js` into two words — on a software
posting that is most of the vocabulary destroyed before the comparison
starts. So `#`, `+` and `.` survive within a run and are trimmed only
from the ends.

**Single characters are dropped, which loses C and R.** Both are real
languages and both are the commonest stray letters in prose; a posting
with a bullet lettered "c)" would otherwise report C as a requirement.
Losing two languages is the cheaper mistake.

**The stopword list was grown against a real posting, twice.** It began
as words with no meaning in any field, and driving it showed "we" and
"need" at the top of a gap list, then "is" and "to" — noise in the
first column somebody reads is how they stop trusting the rest of it.
Two groups were added: the voice a posting is written in ("looking",
"join", "ideal") and how it says a thing is wanted ("required",
"expertise", "familiarity"). The line held throughout is that the list
never decides which _skills_ matter — that would be the app having an
opinion about somebody’s field. `go` is deliberately absent, being a
language.

**Two-word phrases, because "azure functions" is a different
requirement from "azure".** A word match reports Azure covered and
says nothing about the gap — on a posting built out of product names
that is most of what it was asked. Shown above the single words, since
a specific gap inside something you _do_ know is the sharpest thing on
the panel and would be lost among thirty loose words.

Verified against a real posting: `azure` and `openai` read as covered,
`azure openai` is correctly _not_ a gap, and `azure functions` and
`azure devops` are — three phrases sharing a word, told apart.

**Phrases are not in the `share` denominator.** Every phrase is made of
words already counted, so folding them in weighs the same vocabulary
twice and moves the number for a reason nobody could trace back to the
posting.

**A separator has to actually separate, and the first one did not.**
Resume sections were joined with ". " on the assumption a full stop
breaks a pair — but the tokeniser strips a trailing dot on purpose, so
the words stayed adjacent and a phrase could span two bullets that
never touched: "Wrote TypeScript" and "Mentored engineers" invented
"typescript mentored". `segments` breaks on line endings, on commas and
semicolons, and on a full stop **only when whitespace or the end
follows it** — which is what keeps `node.js` and `.NET` whole, the
whole reason the tokeniser tolerates dots. Caught by a test written to
assert it could not happen.

**Trigrams are deliberately absent.** On a posting of this length they
are mostly noise, and the first thing they produce is a longer list to
read — the opposite of the point.

**No stemming, stated as a limit rather than half-solved.**
"microservice" does not match "microservices". Stemming would fix that
and would also match things that are not the same word, and a match
wrong in a way nobody can predict is worse than one that is plainly
literal.

**The resume is structured, because tailoring means choosing parts of
it.** `domain/resume/resume.ts`. A PDF is a picture of a resume; what
an application needs is the thing underneath — which bullets exist,
which went out for a given role, which summary was on top. None of
that is answerable about a file.

**A bullet has an id, and that is the load-bearing decision.** Tailoring
is choosing which bullets go out and in what order, so a bullet must be
referable. The alternative is storing a second copy of the text on the
application, and two copies of a sentence is how the resume and the
record of what was sent start disagreeing after one edit.

**A company holds roles; a role is not a job.** Two roles at one
employer is a promotion and prints under one heading — a flat list of
jobs prints the employer twice and makes a promotion read as
job-hopping, which is the opposite of what it is evidence of. Matching
is on the trimmed, lower-cased name, so "Northwind" and " northwind " are
one employer and nobody has to notice.

**A current role sorts first, and nothing else is sorted.** A resume
leads with the job you are in; the order roles were _typed_ has nothing
to do with it, and prepending each new one put the older role on top —
caught by looking at the screen, not by a test. Sorting by date is what
you reach for and is not available: `from` is free text on purpose,
because a date picker for something a resume prints as a word is a
worse form. "No end date means current" needs no parsing and is right
every time. Two _past_ roles at one employer keep the order they were
added, which is worth stating rather than pretending otherwise.

**Bulk entry is a paste, never a parser.** Bullets arrive one to a line
and are split on newlines, with a leading glyph stripped. Guessing
structure out of arbitrary resume text works on the document it was
written against and quietly mangles the next one — and a mangled resume
is worse than an empty one, because it looks finished.

**Nothing is seeded.** The repository is public, so a name, a phone
number and an address in source are published the moment they are
committed. Every field arrives from the person using the app.

**The job search is absorbed, and phase 0 had already designed it.**
`registry.ts` declared the `jobs` area before there was anything in it
— no ladders, one act, two ratings — and `sheet.test.ts` carried a line
asserting it was _deliberately_ uncounted. Building it was mostly
reading what had been decided.

**No ladder, and the reason is in the registry**: a campaign has stages
and an end, which is not the same as having a ceiling. There is no such
thing as being maximally good at looking for work.

**An application is a `Project`, not a new record.** Name, fixed steps,
a home that decides which screen it appears on — the shape a house job
already is. `belongsTo` and `steps` on `NewProject` were built for
those a day earlier and needed nothing added.

**`jobs.application-sent` pays 30 XP on _creation_, and reaching a
stage pays nothing.** This is the sharpest instance of the act/outcome
line in the app: sending is a thing you decided to do, being given an
interview is a thing that happened to you. Paying for the second is the
streak mistake in a suit. The stages exist so their **dates** are
recorded — `ActionItem.completedAt` is what makes
`jobs.stage-advances-in-month` countable at all, where storing a
"current stage" would say where every application is and never when it
got there.

`APPLICATION_STAGES` is `Screen · Interview · Offer` and **does not
include "Applied"**, because sending is the record existing. Unlike a
house job's steps these are not offered as checkboxes: every
application has all three ahead of it and nobody declines to be
interviewed, so a checkbox would ask a question with one answer.

**`jobs.applications` is the only weekly rating in the app and has no
producer.** `measure.ts` is monthly throughout, because a snapshot is
what gives a direction two points in time. A declared source with
nothing feeding it reads as **absent**, which the spine skips — so it
says nothing rather than something false, and a weekly cadence is a
decision still to be made rather than a gap to be patched.

**`projects.actions-closed-in-month` is own-area only now**, and it was
not before. That rating is about the quest log, so a house job’s steps
had been scoring as quest throughput all along and a screen and an
interview would have joined them — the same leak `recommendation` had,
one layer down. Both were found by driving the app, not by a test.

**The You page links to each area now** (`AREA_ROUTES` in
`CharacterPage.tsx`). It is the screen that says how every area is
going and it had no way to reach any of them. The map lives in the
feature rather than the registry, because `domain/game/` must not know
that a browser exists; it is partial on purpose, since an area with no
screen is a heading rather than a link that goes nowhere.

**Finance is the one area that measures and pays nothing, and it is
the clearest case in the app for that.** Three numbers a month — net
worth, retirement, credit score — read off a statement. Typing your net
worth in is a _measurement_, which the app already refuses to pay for
when it is a bodyweight, and paying for the number going up would be
paying for an outcome. So `acts: []`, deliberately. An area that
measures without paying is not an incomplete area; Vitals ran that way
for most of its life.

**All three figures are ladders now, and two of them were not.** A
ladder must name an external standard, and the credit score always
qualified: FICO publishes its bands, every lender quotes them, and
nothing this app does can move them — so `CREDIT_BANDS` is
`[300, 580, 670, 740, 800]` and the fit to five levels is genuine rather
than arranged.

This file used to say net worth could never join it, because there is no
published figure at which somebody has finished having money. **That is
still true and it was the wrong test.** A powerlifting ladder has no
finish line either — its levels say where a lifter sits among lifters,
and somebody published that. Asked for as _"net worth and savings should
be displayed too, look up reasonable standards for a 32 year old"_, and
the standards exist:

- **Net worth reads as a percentile among households your age**, from
  the 2022 Federal Reserve Survey of Consumer Finances. Descriptive —
  where do I sit. The ladder's thresholds are the published 25th, 50th,
  75th and 90th, so **every place a level changes is a published point**
  and only the position between them is interpolated.
- **Retirement reads against the benchmark for your age**, Fidelity's
  1× salary by 30, 3× by 40, 10× by 67. Normative — am I on track — so
  Advanced is the benchmark met rather than beaten.

**Two standards rather than one, and the tidier option is useless.**
Reading retirement as a percentile too would share a source and a
method; the median household aged 30–34 holds about $12,700 in
retirement accounts, so anybody contributing seriously lands at the top
of that ladder at once and it stops discriminating.

**Both need a fact about you, which is why `settings.birthYear` and
`settings.annualIncomeMinor` exist.** They are the same shape as
`bodyweight`: a standard expressed per person needs the person. Neither
is guessed and neither is defaulted — with the year absent both ladders
report nothing, which is the absent-never-zero rule doing exactly its
job. The fields are on the Finance screen rather than in Settings,
because the sentence that makes them meaningful — _"at 32 the benchmark
is 1.4× your income"_ — is only sayable next to the figures it changes.

**The SCF measures households and one person is not one**, so somebody
living alone reads low against it. Nothing here can correct that, so the
screen states it. `domain/finance/standards.ts` carries both tables and
the reasoning.

**The salary is tracked as a monthly reading, not held in settings.**
Asked for as _"we should track salary"_, and it was the right correction
twice over: a raise happens on a date and belongs in the record with the
rest of the money, and `settings.annualIncomeMinor` — which had shipped
an hour earlier — was a second copy of a number waiting to disagree with
the first. It is gone; the retirement benchmark reads
`latest(finance, 'salaryMinor')`. **A birth year stays in settings**,
because it is not a series: a reading of it would be the same number
written down repeatedly.

**A stage can require a salary**, so the income leg of a moving arc is
measured rather than declared. It is the one money requirement that is a
**rate** rather than a balance — which changes nothing about how it is
read and everything about what a target means.

**A target cannot be automated and the offer of published figures can.**
Asked as _"we probably need to set some sort of target then huh, any way
to automate that."_ Computing one would be the invented scale this model
refuses — nothing here knows what somebody ought to earn. What the stage
editor does instead is offer the **Census Bureau's own breakpoints for
your age** as one tap each, which fill the box rather than setting the
stage: offered, never applied, the stance `ApplyEstimates` and the
config paste both take. Absent without a birth year, and absent outside
the ages the table covers — `salaryReferences` returns nothing rather
than the nearest bracket, because a suggestion is only worth making if
somebody published it about people your age.

**The published income table covers 25-34 only, deliberately.** It is
the one bracket whose three breakpoints came from a single consistent
cut of the survey; mixing a median from one vintage with quartiles from
another to cover more ages would make every figure slightly untrue.
Adding a bracket is adding a row.

**A month's row draws every figure it holds, and drew two of four.**
Reported as _"I thought I recorded all three, but it says I only put
credit score — went to the finance page and it shows a row but I only
see 2."_ The retirement figure had been written correctly every time and
there was no screen that showed it. The figures are labelled now rather
than positional: four numbers separated by dots are four numbers nobody
can tell apart, which is the shape the bug hid in.

**The form opens on what is already recorded**, which is what makes it
an editor — _"any way to edit?"_ There had been no way to see a stored
figure, let alone correct one, so fixing a typo meant remembering what
you had typed. It is keyed on the month, so the fields fill in when the
record loads and reset if the month turns over with the screen open. The
merge rule is unchanged and now visible: **an empty box keeps what it
had** rather than clearing it, because there is no telling "I did not
check" from "I meant zero".

**`NewFinanceReading` is derived from the record and its fields are a
mapped type, because this dropped one silently.** A salary was added to
`FinanceReading`, collected by the form, passed to `recordFinance`, and
written nowhere: the input type still named three fields and the merge
was built with conditional spreads, **which defeat excess-property
checking**. Nothing failed to compile and the suite was green.

Second instance — `addDaily` lost `timesPerDay` by the same route — and
the fix is the same: `Omit<FinanceReading, 'month' | 'updatedAt'>` plus
a `Record<keyof NewFinanceReading, true>` the compiler makes you fill
in. Found by driving the app. There is a test now that walks the
figures rather than naming them, because a hand-written list beside a
list that already exists is what drifted.

**The two ratings those replaced are gone rather than kept alongside**,
because rule two forbids one measurement being claimed as both a ladder
and a rating — and `finance.net-worth-in-month` differed from the new
source only in wording.

**No transactions, and that is the same call the macros made.** A
ledger needs every purchase entered, it is the first thing to fall
behind, and everything derived from a stale one is quietly wrong.

**A month is one row filled in over time, not three rows pretending to
be one.** `recordFinance` merges: the figures arrive on different days —
a statement on the 1st, a score whenever the issuer refreshes it — so
entering one must not blank the others. An empty box leaves a figure
_alone_ rather than clearing it, because there is no telling "I did not
check" from "I meant zero" once written, and only the second corrupts a
series.

**The score is read live and the money figures are read for the month**,
which is the ladder/rating split made concrete. A ladder must not depend
on whether the review was opened, so it takes the most recent score
whenever that was; the ratings need one figure per month in a series.
`latest` works per _field_ rather than per row, because somebody who
checks their score quarterly has months where one figure is present and
the other is not.

**A score outside 300–850 is refused, not clamped.** Quietly rounding a
typo to 850 would put somebody on the top rung of a ladder by accident,
which is the one thing a ladder must never do.

**`DB_VERSION` went to 11 with a new guarded block**, never an edit to
step 10 — a device that has run a step will not run it again, so a store
added there would reach nobody who has already opened the app.

**No area scores itself.** `domain/review/` is the spine and
`from-registry.ts` is the join: a rating declared in
`domain/game/registry.ts` becomes a metric the evaluators judge. Do not add
scoring to a domain — declare the rating and let the spine do it, or there
are two answers to "is this going well" within a release.

**The spine still reads and nothing writes to it any more.** The review
screen was removed and it was the only thing that filed a month, so the
rating half of the model is dormant: declarations stand, `readout` runs,
and it finds whatever was filed before. **If ratings are wanted back,
the missing piece is a screen rather than a rule** — and if they are
decided against for good, the removal is the registry's `ratings`
declarations, `docs/GAME_MODEL.md`'s three-currency claim, and the
sheet's `RatingStanding`, which is a deliberate model change rather
than a tidy-up.

**A measured value is stored under its metric id, not its source id.** The
two names are separate on purpose — a source produces a number, a metric
judges it — and `seriesFor` looks up by metric. Storing it the other way is
silent and total: every measured area reads as never recorded while the
snapshot sits there full of numbers. That shipped once and was caught by
driving the app, not by a test; there is one now.

**Absent, never zero, everywhere in the review.** A source with nothing to
count reports nothing, `seriesFor` skips unrecorded months, `blend` ignores
what had nothing to say. A zero turns an honest blank into an accusation,
and it compounds — one fabricated reading makes the next month's trend a
lie too.

**A collection joins sync in five places and the resume was in none of
them.** Not `SyncPayload`, not `isEmpty`, not `payloadSize`, not the
Firestore target, not the backup envelope. It was written to IndexedDB
and read back on the one device that wrote it, while both sync and
export reported success on every run — the honest report of a push that
genuinely contained everything it knew about.

It is also the worst record in the app to lose. Everything else here is
a by-product of using the app and comes back by using it again; the
resume was typed in off a PDF, and nothing regenerates it.

It travels as a **singleton, like the settings blob** — one document
under a fixed id, sent only when its stamp differs from `resumeSynced`,
and merged whole-record last-write-wins by `mergeResume`. Same shape as
`mergeSettings` including the identity return, which is what stops two
devices bouncing the document back and forth forever. There is nothing
to union: a habit’s completions and a backlog progress log are per-day
append-only records where a record-level winner really does lose a day,
and a resume is one document somebody edits, so the later edit is a
correction. Unstamped always loses, the rule tombstones already follow.

In the backup it is a **collection of nought or one**, which fits the
table awkwardly and belongs there anyway: the claim that module makes
is that a thing joins the export, the preview and the import by gaining
one row, and the alternative was a fourth hand-written path for a
single record.

**The Firestore cursor could not advance on the app’s most-written
record, and the comment warning about it was sitting directly above the
bug.** `reached` is the high-water mark of what came back, and it was
computed from a **hand-written second list** of the pages — which had
already drifted once when the atlas was added, was repaired by hand,
and had drifted again: `dailies`, `vices`, `weighIns` and `finance`
were all missing. Nothing was lost, because those records were still in
the payload, so it looked like working sync. What actually happened is
that a device whose only change was habit ticks left the cursor
wherever the last workout had put it, and every subsequent pull re-read
everything after that point, forever.

**The fix is structural rather than four added lines.** `pages` is now
the array `Promise.all` returns, and the named results are destructured
_from it_, so a collection cannot be in one list and not the other. A
hand-maintained copy of a list that already exists will drift; that is
twice now.

**Three times now, and the third one was pushing nothing at all.** The
same defect, one function further down and far worse: `push` was a
hand-written list of ten collections beside a `pull` of twenty-four,
and **twelve were read from the server and written to it by nothing** —
places, trips, dailies, vices, weighIns, finance, campaigns, attempts,
homes, rooms, exploredCells, and `dayReadings`, which has since been
scrapped for reasons of its own.

Not a lost record, a lost **direction**. `isEmpty` and `payloadSize`
knew about all twelve, so a device whose changes that day were a habit
tick, a weigh-in or a night's sleep built a payload correctly reported
as non-empty, ran a sync, uploaded none of it, advanced its watermark
past it, and reported success. Most of the app was one-way, and from
both ends it looked exactly like working sync.

**The guard is the compiler, not a test.** `KEYED_BY` is a mapped type
over `SyncPayload` itself, so a field added to the payload without a
key here fails the build — the `Record<MuscleGroup, …>` mechanism, in
the one file that had no equivalent. Three of the twelve are keyed by a
**date rather than an id** (weighIns and dayReadings by their day,
finance by its month), which is the detail a hand-written list gets
wrong silently: writing them under an `id` they do not carry files
every row under one missing key and leaves a single document per
collection.

**`pushOperations` is pure and exported so it can be tested for real.**
The note above says the rest of this file is a query builder a double
would only assert calls itself — true, and _which records go up, under
what key_ is a decision rather than a call. The test walks the payload's
own fields rather than a list repeated in the test, because a
hand-written copy of a list that already exists is the thing that has
now drifted three times.

**The fog is one document per _device_**, keyed by the client id. Per
cell would make a thousand-cell walk a thousand writes; a single shared
document would be worse than either, because two devices would overwrite
each other's walking and a grow-only set that last-write-wins can erase
is not grow-only. The cost, since it is real: the payload carries the
whole set every time, so that document is rewritten on every exchange
and re-read by the other device on the one after.

**The fog is a grow-only set, and that is the only reason it can sync.**
`unionCells` in `domain/sync/payload.ts`, one row per geohash cell in
`exploredCells`. It carries no stamp and no tombstone because neither
question arises — two copies merge by union, and you cannot un-walk
ground. It is the one collection exempt from `acceptableFrom`. Do not
"simplify" it back to a blob: as one record under one stamp, the device
that walked less recently has its morning erased, and no version of
last-write-wins fixes that.

**A vague fix reveals nothing.** `revealCell` refuses anything worse than
100 m, and the gate is irreversible in one direction only: fog cleared by
a bad reading cannot be put back, for the same reason there is no
tombstone. Do not relax it to make the map feel more responsive indoors.

---

**The geocoder is on the add form now, and the reason it was not is
worth keeping.** `usePlaceSearch` was complete from the start — debounced,
rate-limited, tested — and reachable from exactly one screen: the inbox,
where it _repairs_ a place saved without a point. So the ordinary path,
the one everybody actually takes (open the map, press Add, type a name),
had no geocoding at all and produced either a pin dropped wherever you
happened to be standing or an entry with no location to go and fix
somewhere else. **A capability reachable from one screen that nobody
starts on is, from the outside, a capability the app does not have** —
the same shape as a rule nothing can trip, and it took a report of "it
doesn't autofill like Google Maps would" to find it.

**Results are biased by `near`, and that is most of what makes it feel
like a map.** "The coffee place" near you and "the coffee place" in
another country are different answers and only one is ever wanted. The
map's own centre is passed in.

**A chosen result beats the GPS fix.** Both answer "where is this" and
only one was chosen deliberately; filing a searched-for restaurant at
your own front door because the device had a fix is the worse of the two
by a wide margin.

**Picking is optional, and must stay optional.** A place with no point is
a deliberate, supported entry — a name you mean to resolve later — so the
suggestions are an offer, not a gate, and a name the geocoder has never
heard of still adds. **The pick is dropped the moment the text changes**,
or "Blue Bottle" edited into "Blue Mountain" would file the second name
at the first one's coordinates.

**The atlas talks to OpenStreetMap, and only to OpenStreetMap.**
Tiles from `tile.openstreetmap.org`, and geocoding from Nominatim in the
inbox's search. Both are rate-limited services run on donations: Nominatim
allows one request a second and forbids bulk use, which is why the search
debounces and why nothing calls it in a loop. Anything else that wants the
network is a new third party and a new decision — this is one
relationship, not a precedent for others.

**The exploration ladder's denominator comes from a person, not the app.**
`exploredRegionKm2` in settings. The ladder is only a ladder because a
named region has a real boundary, and nothing in the app knows which
region is meant — so with none set, `places.explored-share` is _absent_
rather than zero. Absent readings are skipped by the spine on purpose; a
zero would be the claim that a month's exploration came to nothing.

---

**One section is the whole day, and "Due elsewhere" is gone.** It went
through two reports. The first — _"the due section seems broad, since
dailies and stuff are also considered due"_ — got the name narrowed and
the Codex goals moved out. The second, once the section was empty most
mornings: _"I just see an empty due elsewhere now, that's not really
helpful, why not move everything to where you moved the Codex stuff."*

Right on both counts. A section rendering a heading and an empty state
sat against this screen's own rule — **silent when there is nothing to
say**, which the leads and digest cards already follow — and once the
Codex goals had moved there was no principle keeping the other three
out. The heading is **Today** and it answers one question: what does the
day ask of me, whatever record each row happens to be.

**Overdue and today are the day; soon is a fold.** A trip four days out
is not what today asks, and counting it would make _"N left today"_ say
something it does not mean — the rule that a count and the rows beneath
it are one claim. It folds rather than disappearing, because seeing a
deadline without opening the quest is the entire reason the agenda
exists.

**The dated rows link rather than tick, and that is left visible.** A
habit and a reading goal are answered where they are drawn; a deadline
is answered on the quest, a trip on the map, a person by seeing them. So
those rows are wholly a link and carry no control implying otherwise —
but they are still counted, because a deadline due today is outstanding
today wherever it is answered.

**The section heading is no longer `Dailies`, and the domain still is.**
`domain/dailies` keeps its name; this is a screen word, the same split
Quests keeps over `Project`. The habits are still the largest thing in
the section and still the only thing banded by part of day.

**Today reports what is due everywhere; the other screens own their
lists.** Splitting chores to Base and upkeep to Vitals left Today's
Dailies section meaning "recurring things that are not house chores and
are not body upkeep" — a residue rather than a category — and left the
screen whose whole job is _present tense_ unable to say what the day
actually asks for.

**A screen called Today does not list rows labelled "not today".** Own
dailies used to show in full, on the reasoning that Today is their only
home and therefore also where they are managed. The first half is true
and the second does not follow: a weekday habit sat in Saturday's list
under a "not today" caption, which is a screen arguing with itself, and
it is the same crowding that moved chores to Base — the things the day
asks for buried under the ones it does not.

They are still on the screen, because there is still nowhere else for
them, under an **Other days** heading below everything due. No "all →"
beside it, unlike House and Upkeep: those point at the screen that owns
them, and this _is_ that screen. The count was never wrong — `left`
has always filtered on `dueToday` — which is why this read as a display
quirk rather than as a bug for as long as it did.

**The week has four shapes worth one tap.** `WEEK_SHAPES` — weekdays,
weekends, weeknights, weekend nights. A cadence of "weekdays" was five
taps on a row of single letters, twice over if the evening picker was
meant too, and it is the most common shape a habit has. The letters
stay: a shortcut that replaced them would make anything irregular
impossible, and pressing one only fills them in, so what was chosen is
still visible and still editable.

The nights set the **part of day as well as the days**, which is the
entire difference between "weekdays" and "weeknights" — the same five
days and a claim about which end of them. A shortcut that set only the
days would be the weekdays button under a second name.

**Pressed state is computed from the selection, not remembered from the
tap**, so choosing the five days by hand lights "Weekdays" — the honest
reading of a shortcut. It compares the part too, including when the
shape does not name one: "Weekdays" means those days at any time, so it
must go out once the evening is chosen. Otherwise Weeknights lights two
buttons, and two pressed buttons describing one cadence is worse than
none.

Weeknights is Monday to Friday, so the four shapes are exact
complements. The other reading — a weeknight is the night _before_ a
working day, which makes Sunday one and Friday not — is defensible and
is a different habit, two taps away on the letters.

It aggregates now, **grouped by where each thing lives** rather than
mixed in, because a flat list is what buries the habits somebody chose
under the ones the house and the body simply require. The asymmetry is
deliberate and has a reason: own dailies show in full because Today is
their only home and therefore also where they are managed, while chores
and upkeep appear **only when due or done today**, since anything else
about them belongs on the screen that owns them. The count in the
header is across all three, because "3 left today" is a claim about the
day and not about one section.

**Four homes now, and the fourth is Training.** Carbs before a session,
protein after. They are habits in every respect — cadence, streak,
tick — and what makes them not _dailies_ is that they mean nothing on a
day you do not lift, so on Today they were noise five days out of
seven. Same argument that moved house work to Base and brushing to
Upkeep. They live on Train, appear on Today only when due under a
Training group, and pay `training.habit-kept` at the same fifteen
points every other kept habit is worth.

**The cadence is still weekdays, and that is a limitation rather than a
shortcut.** There is no training calendar to hang them on: the app
stores `daysPerWeek` — a _count_ — and a position in a sequence that
moves only when a session is finished or skipped. Nothing anywhere can
answer "was the 25th a training day", which is exactly what every
`Cadence` kind must answer from the date alone for a streak to be
walkable. A "training day" cadence is therefore not a missing feature,
it is a question the model cannot be asked. The lifter names the days
they lift and the empty state says why.

**Two guard tests caught this being added, which is what they are for.**
`base.test.ts` → "puts every record on exactly one side" failed because
it still only knew three predicates, and `sheet.test.ts` → "has a
counted or deliberately absent entry for every declared act" failed
because `tallyActs` had no line for the new act. That second one is the
valuable one: without it the act would have been declared, awarded on
screen, and counted nowhere.

**A group is a label; a home is a decision.** The report was "pretty
much all of my dailies fall under a certain category", naming
supplements and pet care. The tempting reading is two more
`RecordHome` members, and it is the wrong one: a home decides which
screen owns the record _and_ which area pays its XP, so one costs a
registry area, an act, a branch in `tallyActs`, a screen and a line in
the "exactly one side" test. Nothing about wanting to see supplements
together asks for any of that. `Daily.group` is a string.

Free text rather than a fixed set, because the categories are the
person's rather than the app's — one household has a dog and a
sourdough starter and another has neither. Matched case-insensitively
on the trimmed value, the rule the resume already uses for an employer
name, so `supplements` and `Supplements` are one group.

**Groups are ordered by their earliest habit, never alphabetically**,
and that is the load-bearing choice. The rows are already
chronological because a day is a routine; sorting the group names
would put Teeth above Supplements and have two orderings disagreeing
inside one list. The ungrouped run **last, with no heading** — a
heading over the leftovers is a category called "everything else" that
nobody chose. One unnamed group renders exactly the flat list it
replaced, so adding the capability changes nothing on a screen where
nothing is grouped.

`renameDaily` became **`relabelDaily`** and takes the group too. Both
are labels: the record means what it meant before and every day it was
kept is still a day it was kept. The cadence is still not there, for
the reason it never was — it decides _which days were expected_ and
re-reads every streak the habit ever had.

**A home and a group are one axis on the screen that shows both, and
they were two.** Reported: _"adding a daily to the house category on the
homepage does not group it with the other house items from base, instead
creating a separate house category."_ Exactly what happened. Today drew
its own habits through `byGroup` and then ran a second `DueElsewhere`
pass over House and Training, so a habit somebody labelled **House**
appeared under a House heading in the first pass while the chores sat
under a second House heading in the second — one name, two sections, and
nothing on screen to say why.

`homeOrGroup` is the fix and it is a **display** rule only: a row's
category is `HOME_GROUP_LABELS[belongsTo]` where it has a home and its
group otherwise. Nothing is re-filed. An own-area habit labelled House
is still own-area, still pays `dailies.completed`, and is still managed
on Today — which is the distinction this file draws everywhere, applied
in the one place it had been drawn twice. Reading a typed group as a
_home_ instead would be a string silently deciding which area pays,
which is the line that must not move.

**`byGroup` takes the rule rather than defaulting to one**, the way
`listProjects` takes a required `HomeFilter`, because the wrong answer
is silent in both directions: `homeOrGroup` on Base puts every chore
under one heading called House, and `groupOnly` on Today draws the two
House sections again. `groupOnly` is what Base, Train and Mind pass.

**The picker offers House, and that reverses a rule written here one
pass earlier.** It said House and Training must stay out of the group
chips, because a chip filing by _label_ under a name the app also uses
as a _decision_ is how somebody ends up with a house chore Base has
never heard of. That objection is still correct and the conclusion drawn
from it was wrong.

Reported next: _"with uncategorised dailies, I still can't move them
into the home section with all the other house tasks."_ True, and it is
the same defect as the two House headings arriving from the other side —
**the screen drew a heading the control that picks headings could not
choose.** The only route was an unlabelled icon on the row whose
accessible name said _Base_, which is the area's name and not the word
on the heading, so nothing connected the two.

The fix answers the original objection rather than ignoring it: the chip
does not set a label called House, it **moves the record** — `belongsTo`
— which is what House already means. `relabelDaily` takes the home for
that reason, in **one save** with the title and the group, because three
fields of one record sent as two writes lose one of them.

**Only House is offered as a destination.** It is the one home whose
records are routinely created in the wrong place, which is the whole
report. Training is not: those habits mean nothing on a day you do not
lift, they are created on the screen that knows which days those are,
and a chip here would be a way to make one by accident. A record already
filed to Training still shows its own chip, or the field would draw
nothing pressed under a Training heading — a control disagreeing with
the list it edits.

**Choosing a home clears the group.** `homeOrGroup` puts the home first,
so a group kept alongside one is a label nothing can display and nobody
can correct. The field is labelled **Section**, not Group, because that
is what it now picks and what the headings are called; `Daily.group` is
still `group` in the domain, the screen-word / type-word split this file
already documents for Quests over `Project`.

**_Tidying_ left `GROUP_SUGGESTIONS` in the same breath**, reported in
the same sentence: _"it seems redundant with tidying too."_ It is —
sweeping the kitchen is house work, House is a section, and offering
both invites one household's chores to be split across two headings
meaning the same thing. A group somebody already has called Tidying is
untouched and still offered, since names in use lead the row.

**`DueElsewhere` is gone and the "all →" links went with it.** They were
not dropped for tidiness: a category now appears once per part of the
day it has work in, so House with a morning chore and an evening one
would draw the link twice. `/base` and `/train` are both bottom-nav
tabs, so nothing became unreachable. What that merge buys is that
`left` and the rows beneath it are now built from **one** list — the
count and the rows cannot come apart, which two passes made possible and
which this file already records costing two attempts to get right.

**The day is banded by part, and the categories sit inside the bands.**
_"Group the dailies by morning, afternoon and evening, and then have the
subcategories there."_ `byPartOfDay` in `domain/dailies/groups.ts`,
`DayBands` in `features/today/DailyGroups.tsx`.

**Which axis is outer is the whole of that decision.** A day is read as
a sequence and a category is read as a kind of thing, so the sequence
has to be outermost or the screen answers "what sort of task is this"
before it answers "is this now" — and _now_ is the question a screen
called Today exists for.

A band per part that **has** habits, never one per part: an empty
Afternoon heading claims the afternoon asks something of you, which is
the opposite of what the later-today fold is for. The unbanded habits
come last under **Any time**, not a fourth clock position — an absent
`partOfDay` means the habit belongs to no point in the day rather than
to the end of it. A single band draws no heading at all, the rule one
unnamed group already follows.

**The current band is lit, not moved**, which is the rule the rows
themselves have followed since parts of day arrived: a list that sorts
itself twice a day moves the row you reach for by position.

**Upkeep is called Hygiene.** _"Upkeep doesn't seem like the correct
term, cause upkeep could relate to upkeeping anything — that one is more
hygiene stuff since it's brushing, showers, etc."_ Right, and the word
was a leftover from when this was a **home** covering the body in
general; as a group it has only ever meant brushing, flossing and
washing.

Renaming a label costs nothing the way renaming a home would. What it
costs is a **split**, which is the same defect as the two House
headings arriving by another route: rows stored as _Upkeep_ would sit
beside new ones as _Hygiene_. `fromStoredDaily` reads the old name as
the new one whatever a row's home is — a derivation, not a migration, so
a row converges the next time anything saves it, which a tick does.
Verified by ticking a legacy row and reading `group: 'Hygiene'` back off
IndexedDB.

**The price is stated because it inverts a rule held elsewhere:** nobody
can now have a group genuinely called Upkeep, for house maintenance say,
because the read path renames it. That is the app having an opinion
about somebody's label. It is taken once, deliberately, on the grounds
that every Upkeep group in existence came from this app's own suggestion
list or from the legacy home — and once real data has converged,
`LEGACY_HYGIENE_GROUP` can go. _Teeth_ left `GROUP_SUGGESTIONS` at the
same time, because it and Hygiene were then offering the same habits
under two names.

**A Codex goal carries a cadence, and it is the habits’ `Cadence`.**
"I only read/game on certain days" — without one a reading goal meant
_every_ day, so somebody reading on Tuesdays and Thursdays failed five
days a week. Measured on the same progress log: a Tues/Thurs book
holds a **3-day streak with the cadence and 0 without**, and an off day
stops showing as a gap on the history strip.

`cadenceCovers` was split out of `isExpectedOn` so the backlog asks the
_same_ question rather than reimplementing it — a second answer to "is
this expected today" is a bug with a delay on it. Both humane streak
rules come with it: a day it was not expected does not break the run,
and today does not break it until the day is over. The walk is bounded
rather than a `while`, because `days-of-week: []` is expected on
nothing and would spin forever looking for a day that never comes.

**The board counts what is _due_, not what is tracked.** "2 of 5" on a
Wednesday when three are Tuesday goals reads as being behind while
nothing is outstanding — the defect Today had when it listed habits
that were not due. Not-due goals are still _listed_, because logging on
a day you did not plan to read happens and a row that vanished would
read as lost.

**Today's agenda was the caller that never asked.** `goalCovers` says
in its own comment that it is "the one place the cadence is read, so
every caller — the streak, the board, the day strip — agrees about which
days count". `agendaFor` was a fourth caller and did not: it checked
only whether today's amount had been met, so a Tues/Thurs book was
listed as outstanding **every morning of the week**.

Found from the report _"the due section seems broad, since dailies and
stuff are also considered due"_ — which turned out to be half wording
and half true. A list of things genuinely due had reading goals in it
that were not due at all.

**A comment claiming every caller agrees is worth grepping**, which is
the second time that has paid this month: the digest's `void error`
claimed to be logged and was not. Both were sentences describing a
property nothing enforced.

**A Codex goal is drawn with the dailies now, in a group of its own.**
Asked for as the fix to the same report: _"why not just group 'em with
dailies, just separated."_ It is the right shape — a goal carries the
habits' own `Cadence`, is expected on named days, holds a streak, and is
answered by logging a bit of it. **A daily in every respect except the
record type**, which is exactly why it sat oddly among deadlines and
trips and made that heading claim everything.

`GoalRow` is exported and shared rather than copied: a second row is
where the Codex screen and Today would start disagreeing about what a
plus does. It gets one heading in the shape House and Hygiene already
use, and is **not banded by part of day** — a reading goal names no
time.

**It counts in "N left today", and a met goal folds with the rest.**
The count and the rows beneath it are one claim, which is the rule that
cost two attempts to find. Folded rather than dropped, for the reason
every fold here exists: the minus on that row is the only way back from
a mis-logged page.

**Only what is due today reaches Today; the Codex screen still shows the
rest.** `isDueToday` is the goal's own cadence answer. That split is the
same one the habits make, and the Codex keeps its not-due rows because
logging on a day you did not plan to read happens and a row that
vanished there would read as lost.

**What is left in the agenda is dated rather than cadenced** — a
deadline, a trip, somebody unseen for months. None of those recur, and
`AgendaItem.area` no longer has a `codex` member. Its tests went with it,
and the rule they were protecting did not: it is `getDailyGoalBoard` →
`isDueToday`, tested in `daily-goals.test.ts`, which is where it always
belonged — the agenda had been answering it a second time and badly.

`isPlausibleDailyGoal` validates the cadence now. It arrives from a
backup or another device and `cadenceCovers` reads `days.includes`, so
a `days` that is a string does not degrade — it throws, on a screen
somebody opened to read a book. Ranges are checked too:
`days-of-month: [0]` is expected on no day of any month and would read
as a goal that is simply never due.

**A daily is filed to one of three places, and `RecordHome` was written
to expect the third.** Today owns what you chose, Base owns the house,
and Vitals owns the body — brushing, flossing, washing your hair, filed
under `vitals` and shown as **Upkeep**. It is the Base argument applied
to the other set of chores nobody calls chores: mixed into Today they
crowd out the things somebody actually decided to do. `RECORD_HOMES`
drives `keepFor` and the "exactly one side" test, so a fourth area cannot
leave either passing vacuously — which is precisely what that test did
when the third was added and it still only knew about two.

**Vitals pays XP now, and that is the rule applied rather than bent.**
The note in `registry.ts` said this area measures and never pays, because
every candidate then fell on the wrong side of the act/outcome line: not
drinking is an outcome, and paying for a weigh-in turns a measurement
into a chore with a score. All of that is still true. **Brushing your
teeth is none of it** — it is a thing you did, an act in exactly the
sense a kept daily is one. What was true was that the area held nothing
that qualified; what was never true is that it was barred from holding
anything that does. Same fifteen points, and `tallyActs` splits by
`belongsTo` so no record pays two of them.

That also made `AREA_TITLES.vitals` reachable, where its comment
asserted it never could be — an area that pays nothing can never be the
one that has paid the most. The titles have since gone; the trap the
comment recorded has not, and it is why every "this can never happen"
in that file is written down rather than assumed.

**Preferences move as pasted text, because a file round trip was the
slow part.** The report: _"passing files back and forth is a slow
workflow, same with me seeding job board stuff and everything else when
you already have it."_ `domain/config/document.ts` and the
Configuration panel in Settings — copy out to the clipboard, paste back
in, no file in between.

**It is not the backup and must not become it.** A backup is the whole
database and carries a checksum because a large file can be truncated on
the way to disk. This is three preference blocks small enough to paste,
where a truncation fails to be JSON at all. Reusing the backup envelope
is the trap worth naming: `validateEnvelope` demands `exercises`,
`workouts` and `checkIns` arrays and `parseBackup` demands a verifying
checksum, so a document holding a job search and nothing else is not a
valid backup — and making it one would mean hand-computing a checksum
before a document could be written at all.

**It carries preferences, never records.** A room, a habit and a
campaign stage are things that happened or were decided; they have
screens and history. What is here is the settings whose entire value is
somebody having typed a long list once.

**An absent section is left alone, never cleared**, which is the rule
`recordFinance` already follows and the whole reason a document holding
one section is safe to paste. Verified by driving it: a document with a
job search and home wants and no digest left the digest's interests
exactly as they were.

**A section that is present and is not an object is refused rather than
parsed**, and this is the sharp edge. The three parsers are _total_ —
junk degrades to a default — and for a job search the default is
`EMPTY_JOB_SEARCH`. Passing junk through would be a wipe wearing a
settings change's clothes, which is exactly the destructive/
non-destructive split this file holds elsewhere. For anything it does
accept, the preview says what the section would _become_ in the app's
own words, so a section that genuinely parses to nothing can be seen
before it is taken. **Offered, never applied**, the stance
`ApplyEstimates` and the file import share.

**Boards may be written `greenhouse:stripe`.** `parseJobSearch` wants
`{ provider, token }` because that is what a stored search holds, and
nobody hand-writes that; the screen's own paste box already takes the
readable form, so `parseSources` is reused here. A list of strings, one
newline-separated string, or the stored object form all read — the last
so a copied document round-trips.

**The app is locked to an account list, and being precise about what
that buys is most of the value.** The ask: _"is there a way to lock
access to this app behind only my account?"_ — so `AuthGate` wraps the
whole shell and `decideAccess` checks an **allowlist**, not merely that
somebody is signed in. Signed-in-ness alone admits anybody with a Google
account, which is not what was asked for.

**It protects less than it looks like it does, and the parts it does not
protect were already covered.** The synced data was never exposed:
`firestore.rules` pins every document to one uid and has since sync was
built. The device's own IndexedDB is not protected by this and cannot be
— it belongs to whoever holds the device. And it is **not a lock on the
phone**: a session persists on purpose, so an unlocked device opens
straight through. What it buys is that the app stops being usable by
whoever finds the page, which is the demo posture the ask retires.

**It fails open on a missing account list**, which is a deliberate
inversion of the usual rule for a security control. A gate that failed
closed on an unset variable would brick the app with no way back in, and
there is nothing behind it that failing closed would protect. The
Settings screen states which of the two it is in — a lock nobody can see
is a lock nobody can trust, and "off" is a state somebody can arrive in
without meaning to.

**Refused is its own state, not a return to signed-out.** Sending the
wrong account back to a Sign in button is a loop: the browser hands
Google the session it already has and arrives straight back. So the
refusal screen carries its own sign-out — which it must, because the
gate wraps Settings too and that is where sign-out otherwise lives.

**Checking is its own state as well**, and that decides what every
launch feels like. A persisted session takes a moment to resolve, and
answering "signed out" in the meantime flashes a sign-in screen at
somebody already signed in, on every single launch.

**A build with no Firebase project cannot gate**, because there is no
sign-in to offer — a gate there is a locked door with no key. That is
exactly the local development build, and it must keep working.

**The uid is stated in two places and they can disagree.**
`VITE_ALLOWED_UIDS` and `firestore.rules` name the same account, the
rules file cannot be read from the bundle, and the bundle cannot be read
by Firestore. The symptom of a mismatch is an account that opens the app
and cannot sync.

**The repository went private for an afternoon and came back, and what
it cost is worth knowing before anybody tries it again.** GitHub Pages
does not serve a private repository on a free plan: the site was
unpublished the moment the repo went private, the Pages API answered
404, and `actions/configure-pages` failed the deploy. Verified by asking
the API to re-enable it — _"Your current plan does not support GitHub
Pages for this repository."_ No change to this code could fix it.

So the repository is public again and **the gate is what protects the
app**, which is the arrangement to keep in mind when reading anything
here about a demo. There is no demo any more: the deployed page is gated
by `VITE_ALLOWED_UIDS`, set as a repository variable. Nothing in the
repository is a secret — the Firebase config identifies a project and
authorises nothing, a uid names an account and authorises nothing, and
no personal data has ever been committed. **That last rule is the one to
keep holding**, and it is why the resume fixtures say Northwind.

**Clutter is a level, not a task, and that decides everything else about
it.** The report: _"another aspect of base maintenance is decluttering —
this is ongoing and should be represented by percent of each room and
overall clutter level."_ A house job finishes and closes; a chore recurs
and is done today or not. This is neither. It moves in both directions
over months, which is the shape of a **weigh-in** rather than of a task,
so a room carries a series of readings and everything on the screen is
derived from them. Nothing stores a "current" percentage — a stored
total is a total that can be wrong, and this app already knows what that
costs.

**It goes backwards, and that is the point of tracking it.** A room
cleared in March fills up again by August. A checklist, or a completion
percentage that never fell, would make the one thing worth knowing
invisible.

**It pays no XP, which is the call the weigh-in already got.** Saying a
room is 40% clear is a _measurement_, and paying for the number going up
would be paying for an outcome. The afternoon spent clearing the garage
already has somewhere to be paid — a house job on Base, with steps,
paying `base.action-closed`. The effort scores and the reading reports,
the split Finance and Vitals both run on.

**Unread rooms are left out of the average rather than counted as
zero.** An unmeasured room is not a room full of clutter, and counting it
as nothing would make _adding a room you have not looked at yet_ read as
the house getting worse. The change is averaged over the rooms that have
a _comparison_ for the same reason: a room read for the first time this
week has not held steady. `unread` is reported so the screen can say how
many were left out.

**Comparison starts from the earliest thing known about the window, and
the first version got this wrong in a way the suite could not see.** It
compared only against readings _before_ the window opened — so a garage
read at 90 on the 5th and 32 on the 31st reported **no change at all**
over the month, because there was no reading on the 1st. Useless in
exactly the case the feature exists for, and found by driving it.
`startOfWindow` now takes the reading in force when the window opened,
or failing that the first one taken inside it. Nothing is invented: both
candidates are readings somebody actually took, and what changed is
which counts as "where this started". Still nothing carried forward into
a gap and nothing interpolated.

**Last write wins per day**, like a weigh-in: two readings for one
Tuesday are two opinions about one fact, and the later one is a
correction rather than a second measurement. `recordClear` writes today
only — this is a judgement made by looking at the room, and you cannot
look at last Tuesday's kitchen.

**Five bands, because "62%" is precision nobody has.** The words are the
judgement and the number is there to make two months comparable. It is
**not a ladder** — there is no published standard for how cleared a room
should be, so this sits on the same footing as the weight phase and
deliberately not on that of a strength standard.

`DB_VERSION` went to 16 with a `rooms` store, and the collection
registered in all of the places a collection has to register. The
compiler and the guard tests found most of them, which is that machinery
working as intended.

**A declared stage can have quests attached, and its bar fills from their
steps.** Asked for as _"the job is related to stuff like polishing the
portfolio"_ — the arc said "Get a new job" and the quest log held the
work that gets one, with nothing joining them. `Stage.quests` holds ids,
read live through `Evidence.quests`; a deleted quest stops counting. **It
is still met only when declared**, because finishing the portfolio is not
having the job — and declaring it fills the bar. Links are picked in the
stage editor, kept through a rename and dropped if the stage becomes
measured. The declared stage's control is a box in its header now, ticked
when reached and unticked to take back the latest time; the note form and
"Log another" went with the old button.

**The arc is the main quest, and a quest is main because it is linked to
a chapter.** Asked for as _"really the arc and main quest are the same
thing"_, then _"why would job search system be a side quest then?"_ —
it fed a chapter of the arc and the board filed it as side, because kind
was a toggle somebody set at creation. `reshapeStageIn` now sets `kind`
from linkage: newly linked becomes main, unlinked from every arc goes
back to side (`withKind` drops the `activatedAt` stamp, since that is
per kind). **Only quests whose linkage changed are touched**, so nothing
is rewritten on read. The add form has no Main/Side toggle and the
"make this my main quest" buttons are gone; activation survives for the
side slot only.

`ArcSlot` on Today always leads the main slot when an arc has anything
open, with **one row per open chapter** and a tickable step in each —
the first linked quest's next step, else the home recommendation for a
house-jobs chapter. Showing only the earliest unmet stage hid the
chapter actually being worked on, since the arc is ordered but not gated.

**The arc is three measured stages, and a deposit reads a fund rather than a net worth.** Asked for as _"let's remove the find a new house stage. The house deposit thing should come from a separate saving fund that we should start tracking too… let's also drop sell this house and move stages. So just tracking three progress bar things. But fix up the house should include all the diy as well as getting everything decluttered."_

**The three that went were the three that were declared.** Find a house, sell this one, move — nothing in the app records any of them, so each was a tick somebody would make on the day. What is left is the part the app can witness, which is also the part that takes the years: finding a house and selling one are events rather than campaigns, and there is nothing to watch fill up in the meantime.

**`savingsMinor` is a new figure on the monthly reading, and it is a balance rather than a flow.** The surplus beside it says what was spare _this month_; this says what is in the pot. **Deliberately not net worth**, which is what the deposit stage used to read: most of what you own is not available to put down on a house, so that stage would have completed itself on the day a pension went up.

Both `Record<keyof …>` guards fired on the way in — the merge in `recordFinance` and the history row's field map — which is the mechanism this file already records `salaryMinor` being lost for want of.

**House work sums jobs finished and rooms read as Clear.** Both halves answer one question — what about this house is done — and neither was worth a stage of its own on a three-stage arc. They stay **two fields on the evidence** rather than one pre-summed number, so the sum is visibly a sum and a screen can still say which half moved. A room nobody has read counts for nothing, which is the absent-never-zero rule and the honest reading of "we have not looked in there".

That made `gatherEvidence` read the rooms, so `CampaignDeps` gained `rooms` — the campaign use case now touches Base's clutter as well as its jobs.

**A target that changes unit is cleared, and that was found by driving the repair rather than the feature.** The template change above leaves an existing arc holding the old stages, so the way across is the stage editor — and walking it turned up a trap sitting in the editor since it was written. The target box is seeded once from the stored requirement and did not reset when the kind changed, so retargeting a stage from applications to a salary left the count in it: `offers: 1` saved as **one pound**, a figure nobody chose, which the screen then reported as comfortably met.

`unitOf` is the rule, in the domain beside the union rather than as a list of kinds written out in the editor. **Three units, not eight kinds**, because the question is whether the number still means the same thing: a five carries from house jobs to applications and is helpful, and a one carried into a salary is a different quantity wearing the same digit. Money to money keeps its number — verified both ways.

Nothing else about the edit changed: the laps survive a retarget, which is the rule this file already states and which the repair confirmed on a stage carrying one.

**Changing the template reaches nobody who already started an arc.** `MOVE_STAGES` is the offer made when an arc is created; a stage already stored as `offers` or `net-worth` stays exactly that. The stage editor is the way across, and it takes a kind and a target without touching the laps.

**Every stage is a progress bar, and the income one reads the salary.** Asked for as _"for main quest just make the income quest tied to current income, and it would make sense for all of them to be progress bars — we can figure out specifics for all of them later."_

**A declared stage carries a progress of one step**, so it draws empty or full and never anything between. Expressed as a real fraction in `standingForStage` rather than special-cased on the screen: the row draws whatever `progress` says, so a met stage looks met wherever it appears.

**An unproven stage draws the track and claims nothing**, which is how this meets the rule it looks like it breaks. `Meter` renders an `of` of nought as the track alone — nothing over nothing is not complete — so the row has the shape of its neighbours without putting a bar at zero against a target nobody has measured. That was the reason it used to draw nothing at all, and it is satisfied rather than overruled.

**Income is measured by salary rather than by applications sent.** The suggested arc counted `offers`, which measures the _looking_ — and the looking left the app with the automated job search. The `salary` requirement already existed for exactly this, so the change was one line and a link that now points at Finance instead of Jobs.

**The seeded figure is a placeholder, not a guess the app stands behind.** A stage editor already offers the Census breakpoints for your age, one tap each, which is the only income number anybody published — so the template carries a round number to replace rather than the app deciding what you ought to earn.

**A stale dev server is not a broken app, and this cost a diagnosis.** After the teardown the page went blank at `/` and the console was full of 404s for `LeadsToday.tsx` — a file deleted twenty minutes earlier. Vite was still trying to hot-reload modules that no longer existed. `pnpm verify` had been green throughout; restarting the server fixed it. **A build that passes and a page that does not is a reason to restart the dev server before reading the code.**

**Three features left the app, and the test is where the work happens rather than what it is about.** Asked for as _"get rid of stuff that would be better suited for custom agents rather than living inside the app: automated job search, newsletter, house search."_

What they had in common is that each was **the app going and fetching something from the internet on a schedule** — three job boards, Hacker News and DEV, and Overpass — and then keeping a copy of what it found. That is an agent errand: it runs without you, it is a copy of somebody else s data, and the app was the wrong place to hold it.

**Gone:** `domain/news`, `domain/homes`, `domain/jobs/boards`, `domain/jobs/score`, `domain/jobs/search`, the ATS, Overpass and news gateways, the daily sweep and the digest gate, the leads sections on Jobs and Today, and the `homeWants`/`jobSearch`/`digest` settings.

**`domain/config/document.ts` went with them**, because it carried exactly those three settings and nothing else. A paste-a-config feature whose every section had been deleted is a mechanism with nothing to move.

**Kept: the resume and Mind, deliberately.** Neither is automated — a resume is typed in by hand and a practice log is a record of what you did — and the resume is the one record in the app that **nothing regenerates**, which was confirmed the same afternoon by its owner having lost the PDF it came from.

**Kept: job applications.** Sending one is an act you perform, so `jobs.application-sent` still pays; what left is the machine that found the postings.

**`homes` is the fifth retired store**, cleared by a new guarded block at `DB_VERSION` 20 and out of the payload, both sync targets, the backup collection and the tombstone list. The rows had to be deleted rather than left: a feature that leaves without its records has them pushed straight back by the next device to sync.

**`homes-viewed` left `Requirement` with the house search**, which the compiler turned into a fallthrough bug worth naming: removing its `case` left `case offers` falling into `return requirement.minorUnits`, so an offers stage would have read a count as money. Found by the typechecker rather than by a test.

**The exhaustiveness rule caught the tombstone list**, exactly as it is supposed to: `homes` came out of the payload and `switch-exhaustiveness-check` failed the build until it came out of `TOMBSTONED_COLLECTIONS` too.

**The lower days divided, and the customisation is gone.** Asked for as _"only do calf raises on deadlift day and only do kettlebell swings on squat day"_ and _"we probably do not need any of the customize workout stuff, lets gut it — I am trying to make this app and codebase cleaner and more focused."_

**`LOWER` split into `LOWER_SQUAT` and `LOWER_DEADLIFT`**, the way the upper body already had. The calves move to `ONCE` and sit on the deadlift day; the swings sit on the squat day. **Nothing in the week repeats now** — the note calling the calf raise the deliberate exception went with it.

**There is one split, and `daysPerWeek` is gone with the other three.** They were already inconsistent with the design: the two full-body splits put every muscle on every day, which reproduces exactly the repetition the pairing was built to remove, and the five-day week had a third upper day with no pairing of its own. Keeping them meant shipping three arrangements known to be worse than the default.

**`SYNCED_SETTING_KEYS` is down to one member.** Only `excludedExercises` still shapes a programme, which is why three test files had to stop using days-a-week as their vehicle for "a shared setting that travels".

**`reverseAccessoryBlocks` is deleted, and the reason is worth more than the code.** It alternated the accessory order between a region s two sessions so a fixed order did not spend the fresh part of every session on the same muscle — and it only ever did anything where the two days held the _same_ muscles. No region does any more. The guard could never be true again, which made it a live-looking condition over dead code. What replaced it is better: a muscle appears once a week on the day chosen for it, so "which session meets a fresh lifter" is answered by the pairing rather than by flipping a list every other week.

**A test learned that trailing muscles outrank priority order.** "Runs the isolation work in tier order" started failing on Friday because the trunk is trained directly now and `trailingLast` deliberately moves it past everything else. That rule always outranked the ordering; it only became visible once the trunk had work to move.

**The Zone 2 block left the programme, and the swings stayed.** Asked for
as _"let's drop the post workout cardio — I'd like to just merge that
with my dog walks and make em daily. A 30 minute dog walk covers my
cardio and doesn't need tracked in the train app."_

**It is the argument that removed the macros and the sleep row.** A walk
that happens anyway, every day, is not a thing the training screen needs
to schedule; a slot for it is a checkbox you tick for something you were
doing regardless, and the count it produces is a second copy of a fact
kept better elsewhere — in this case, in the dog.

**The swings stay because they are _programmed_.** Ten on the minute with
a 60 lb bell is a dose somebody decided on; a dog walk is a fact about
owning a dog. That is the line, and it is a better one than "hard against
easy": if the walk were prescribed at a pace and a duration nobody would
otherwise hold to, it would belong here too.

**The upper days now carry no conditioning at all**, which is the visible
consequence. `describeDay` reads a day off its finished slots, so nothing
claims otherwise.

**`incline-walk` stays in the catalogue with its plan**, unscheduled, and
that is not the silent-retirement trap the overhead press was. A
conditioning exercise is only ever reached by a split naming its slug —
`running` has sat there unscheduled all along — so the catalogue is the
menu a split picks from rather than a list of things the assembler can
find on its own.

**The cost to name: Stamina is now fed by the swings alone.**
`cardio.session-logged` fires on a completed session containing a
completed conditioning set, so it pays on the two lower days and on
nothing else. **The dog walk pays Discipline, not Stamina**, because it
is an ordinary daily — and wiring it to Stamina would mean a new
`RecordHome`, which is a registry area, an act, a branch in `tallyActs`
and a line in the "exactly one side" test. That is a decision to take
deliberately rather than a side effect of moving a walk, and it is worth
knowing the bar reads lower until somebody takes it.

**The overhead press is out of training, and `STRENGTH_LIFTS` is three
again.** Asked for as _"let's drop overhead press from training since
there's more compounds on that day already"_ — true, the second upper day
opens with dips and pull-ups.

**The second upper day now carries no competition lift at all**, which is
the visible consequence and is fine: three lifts at one session each
across four days leaves one day to the accessory work. `describeDay`
reads the day off its finished slots, so Thursday simply stops naming a
lift.

**The exercise was converted back to `intent: 'hypertrophy'`, not left
behind.** This file already names that trap in so many words — _a
strength-intent exercise no rotation names is scheduled by nothing at
all_, so leaving it would have retired the overhead press from the
catalogue without saying so. It is pickable front-delt work again, which
is where it started. It is not scheduled today because the front delts
are at zero sessions, and that is a setting rather than silent
unreachability.

**Two costs worth stating, because nothing on a screen says them.** The
side delts lose their only heavy work — the press was what paid them
besides three sets of lateral raises — and the front delts now receive
nothing at all from anywhere. Both are one setting away if they start
looking thin.

**Every call site was found by the compiler**, which is the
`Record<StrengthLift, …>` mechanism doing its job: the labels, the
default sessions, the slug map, the variations, the region map and six
test fixtures all failed the build until they were dealt with. The one
test whose _subject_ had gone — a block led by the overhead press —
was deleted rather than repointed, because the rule it covered is still
held by the bench-led case.

**Finance and Train finished it, and the fold meant something different
on each.** Every tab now reads the same way: a page header, then cards
that name themselves, with what is settled behind an eye.

**Finance has no outstanding-versus-done split** — every row is a reading
rather than a task — so the pattern went to the two things that actually
accumulate. **History shows twelve months and folds the rest.** A finance
record only grows, so the screen's longest part is the bit you scroll
past, and a year is the window that makes a trend readable without the
page becoming the archive. Nothing is taken away by hiding an old row,
because there is no control on one.

**`AboutYou` folds because it is a field you fill in once.** A birth year
does not change, and a permanently open form for it sat between the
month's entry and the history — the largest thing on the screen that
nothing ever asks you to do. **Open by default when there is no year
yet**, which is the one moment it is worth seeing: without it two of the
three ladders report nothing at all.

**Train lost a section rather than restyling it.** "Or train without a
program" was a heading over a single button, and the button already says
what it does — so the heading went entirely instead of becoming a
`CardHeading`. **Not every section becomes a card; some were only ever a
label on a control.**

**Settings keeps `Section`, deliberately.** The note on `CardHeading`
says a heading over a lit rule reads as a settings pane, which is why it
replaced `Section` on six screens — and is exactly right on the screen
that _is_ one.

**The Tech tree was the fifth, and it came with a complaint of its own:**
_"the long list of items isn't the best at the end."_ It ended in three
stacked sections — every open node, then everything decided against, then
everything already bought — so a tree used for a year finished on two
lists of things there is nothing left to do about. Owned and dropped fold
together behind the eye, dropped first, because something you may yet
change your mind about is worth meeting before a list of what is already
in the house.

The width half of that report is answered in `tree-layout.ts`; see
**branches stack down the page** above.

**The Map finished the sweep, and the four screens now read the same.**
Asked for as _"now the map page."_

**Places you have been fold behind the eye.** The list is a list of
somewhere to go, and a map used for a year is mostly somewhere you
already went — so what it opened on was the part with nothing left to do
about it. `archived` folds with `visited`, both being decisions already
taken.

**A favourite never folds, however often you have been.** That is what
the flag is for: somewhere you go back to is still somewhere to go. It is
the one place in this sweep where "done" is not simply a status —
verified by favouriting a place and then marking it visited, which leaves
it in the list.

**The fold suspends while a search or a kind is on**, the rule the Codex
version follows.

**"The world" lost Trips and the inbox prompt**, because its heading
carried four things at 375 and the _title_ was what gave way — wrapping
to "The / world". Trips went to the page header, which is the established
home for a related screen (Train carries Plan and History that way,
Quests carries Job search). The inbox prompt went down to Places as a
full-width link, which is where the pile it counts actually is: places
with no point yet are a fact about that list rather than about the fog.
Walk stayed, being the one control that acts on what is drawn under it.

**The Codex got the same treatment, and it is where the pattern paid for
itself.** Asked for as _"now do the same for the codex page."_

**Finished and dropped entries fold behind the eye.** The list defaulted
to every status, so a Codex with two hundred finished games opened on two
hundred rows you were not working through, with the thing you came for
somewhere below them.

**Only while the status filter says "all"**, which is the part worth
knowing. Picking _Completed_ from the dropdown is an explicit request for
exactly those, and folding them away at that point would be the screen
arguing with its own control. The fold is the default view's opinion, not
a rule about the data — and the eye disappears when a filter is on,
because there is then nothing behind it.

**The search box was 26 pixels wide, and this is the second time that
exact bug has shipped.** It shared a flex row with two selects whose
intrinsic width comes from their longest option — "Currently Using" and
"Recently Added" — so `flex-1` on the field got whatever was left. Not
clipped, not cramped: a box too narrow for one character. The quest add
form failed the same way and is written up above as _"three controls do
not fit on one row at 375"_.

**The lesson is that the rule only reached the screen it was found on.**
It was recorded as a fact about the quests form rather than as a
constraint about the layout, so nothing stopped it recurring and nothing
found it — it was found by **measuring**, which is what this file
already says to do instead of extrapolating. Search now has its own row
and the selects share the next at `flex-1` each: 343 and 168 · 168.

**The goals block keeps its empty state where Quests' "Suggested" is
silent**, and the difference is discoverability rather than taste. This
is the only place in the app that says daily goals exist, so a reader who
has never set one has no other route to finding out. It is one line
instead of a dashed panel — the treatment the empty quest slots got.

**Quests got the same treatment, and the differences are where the rule
had to bend.** Asked for as _"now let's do the same cleanup for the
quests page."_

**Finished quests fold behind the eye instead of getting a section of
their own.** A completed quest is a record rather than something to do,
and its card carries the only route to reopening it — so it folds rather
than being dropped, the call the done chores got on Base. The count moved
into the body with the rows it describes: as a `Section` description it
sat above the add form, which put "3 open" two controls away from the
three cards it was about.

**`CardHeading` also heads a run of cards, which Base did not need.**
`ActiveQuests` and every `ProjectCard` draw their own card, so a wrapper
here would be a card inside a card. The heading row is the same either
way, which is the point — two screens should not grow two ideas of what a
block title looks like.

**`Section` survives for the case it was written for, and an arc is
it.** Each campaign is titled by its `name` with its `aim` as the
description; both are the record's own and `CardHeading` deliberately
carries no description. **Only the arc's _empty state_ converted** —
that was a title, a description and an empty state saying one thing three
times.

**Suggested is silent when there is nothing to suggest**, and the guard
had to be `recommendation.data?.actionId` rather than `data !==
undefined`: the recommendation always resolves, and `NextAction` renders
its own "nothing to do next" card inside it. So the first version still
drew a heading over an empty state — the defect it was meant to remove,
surviving one layer down.

**An empty quest slot is one dashed line, not a card with a paragraph.**
Two slots each drew a full card naming the missing quest and telling you
to pick one from the board, which on an empty board made the two largest
things on screen the two that said nothing. The instruction went with the
card: "pick one from the board below" is only read by somebody who can
already see the board, and the cards down there carry the control that
does it.

**Base shows what is pending and folds the rest, and its sections became
cards.** Asked for as _"you're greeted with a long list of every base
related daily task… show only pending items like the home tab does"_ and
_"refactor its looks so it's cleaner like we did with the homepage."_

**The list was three lists pretending to be one.** Chores drew everything
due _or done_ in one block and everything else under a permanent "Not due
today" heading, so a fifteen-chore house rendered fifteen rows whatever
the day asked for — the same clutter Today was fixed for, arriving on the
screen that had not been. Outstanding is drawn; done and not-due sit
behind the eye in the card header, with an `N left today` line that
counts exactly what is on screen. **Folded, never filtered**: a ticked
row is the only route to undo and a not-due row the only route to
renaming or retiring one.

**`CardHeading` replaced four `Section`s**, and the argument is the
home screen's own: a heading over a lit rule over a description, four
times down one screen, is what a settings pane looks like, and each of
those headings named something the card beneath it already said.
`Section` is still right where a heading groups **several** cards; it
was wrong for one card with a title over it, which is what every use on
Base had become. `space-y-8` went to `space-y-4` with them — two rem
was holding apart blocks that had a heading each.

**The upgrade list folds the same way.** What is already in the house and
what was decided against are records rather than things to do; what you
open the card for is what you are saving for. The "Wanted" label went
with them — with the other two behind the eye, that list is the only one
on screen and a heading over it said nothing the card's own name did not.

**`ChoreRow` draws `DailyRow`'s box rather than a `Button`.** The same
record was rendering its tick as two different controls — a full-size
primary button on Base against a 36-pixel bordered box on Today — which
made a chore read as a heavier commitment on one screen than the other
and took the row to nearly twice the height. It is also the rule this
file already holds for `ActionRow`: an icon that changes between two
actions cannot also be the record of which state you are in.

**`EyeIcon` moved to `components/shared/`.** Two screens now reveal what
they are not asking for, and a second hand-drawn eye is where the two
would start disagreeing about which way the stroke goes.

**The page header stays, and that is deliberate.** Today has none because
it opens on a portrait, which says what the screen is without a word;
Base opens on a list of chores, and a list needs naming. The note on
`PageHeader` says not to extend that exception.

**Base is an area that files records rather than storing them.**
`domain/base/base.ts`. A house job is a `Project`, a chore is a `Daily`,
a house upgrade is an `Upgrade` — the app already knows all three shapes,
and a second implementation of "a thing with steps" would be two places
for a bug about steps to live. What Base changes is _where they appear_.

House work has a different rhythm from a quest log: it arrives when
something breaks rather than when you choose it, it is mostly the same
errand each time — find the right person, get them to come — and it never
finishes. Mixed into the quest list it crowds out what somebody actually
chose.

Membership is one optional field, `belongsTo`, and **absent means the
record's own area** — right for every row written before Base existed.
`isBase` and `isOwnArea` are both named, because a screen listing one of
these types has to pick a side and the failure is silent in exactly one
direction: forget to exclude Base and a house job shows in the quest log
_and_ on Base, reading as a duplicate rather than a bug.

**The record is shared with the tech tree; the screens are not.** That
split is the answer to "are these too tightly coupled", and each half has
a reason.

Shared, and it should stay shared: **one wallet** — a dishwasher and a
barbell come out of the same money — **one set of gates**, because two
implementations of money-and-a-prerequisite are two places for the cycle
bug, and **one spender**, because the model allows exactly one area that
spends rather than measures (`registry.test.ts` → "has exactly one tree").
Base having its own tree would be a second spender and is not a thing to
build.

Not shared, and this was wrong for a commit: **creating.** Adding a
dishwasher meant opening a page about barbells, typing it there, and
coming back to move it — the same friction removed from chores an hour
earlier, left in place here on the reasoning that "a second editor would
be a second place for the gate rules to be got wrong". That argument is
true of _editing_ prerequisites and priority and false of typing a name:
`NewUpgrade` requires only a title, and the tree's own add form is one
text box. Base creates with a title and a rough cost; the tree still owns
editing.

**There are two errands, and for a long time only one had a template.**
The report: _"there are also some base projects that I will handle
myself rather than hiring someone."_ Every job opened with
`HIRED_JOB_STEPS` — find the right person, get a quote, book the
appointment — and on a job you do yourself **all three are wrong**:
there is nobody to find, nothing to quote, no appointment. So the shape
had to be un-ticked three times and typed by hand, which is exactly the
friction the template was added to remove, reappearing for half the
jobs. `DIY_JOB_STEPS` is the parallel: work out what it needs, get the
materials, do the work.

**The approach is chosen before the steps are shown.** The two lists
share no step, so a form that offered one and asked you to un-tick your
way to the other would be arguing with itself. Switching re-ticks the
new list rather than keeping the old selection — carrying it across
would leave every box empty and open the job with nothing.

**Deliberately not stored on the record.** A project already carries its
steps, and "Find the right person" against "Work out what it needs" says
which errand this is more plainly than a field would. A stored approach
would be a second answer to a question the actions already answer, and
the rule here is that a field needs something that reads it — nothing
would.

**Both openings are three steps, and that is load-bearing rather than
tidy.** Every closed step pays `base.action-closed`, so an opening with
four would quietly make one approach worth more XP than the other.
Doing it yourself is a decision about the afternoon, not a harder
version of the same act; difficulty is recorded and does not scale the
points anywhere else here either.

**A house job is created on Base, and opens with the errand it usually
is.** Adding one meant going to the Quests page, typing it among the
things you chose to do, and coming back to move it — the same round
trip already removed from chores and from upgrades, and left in place
here. Third instance of one shape, reported by the person using it.

`NewProject` takes `belongsTo` and `steps`, so the job is _born_ filed
and complete. The steps are written in the same save rather than by
three `addAction` calls after it: three sequential writes is three
chances to leave a half-built job behind, which is what `saveAndSettle`
exists to avoid.

`HOUSE_JOB_STEPS` — find the right person, get a quote, book the
appointment. **This module described that errand in prose from the day
it was written and the empty state printed it on screen, and neither
did anything with it**: every job arrived with no steps and the shape
had to be retyped from memory off a sentence you were no longer looking
at. Knowing a pattern and still making somebody type it is worse than
not knowing it.

Offered, not applied: the three are checkboxes, ticked, and any can be
turned off — a boiler service the landlord books skips the first two.
Same stance as `ApplyEstimates`, for the same reason.

**`recommendation` takes a required `HomeFilter` now, and finding out
why is the useful part.** It read `projects.all()` and scored across
every home, so the Quests page suggested a leaking tap as the next
thing to work on — "highest priority active quest" — on the one screen
Base exists to keep house work off. It hid because the board beside it
filters correctly, so the job was absent from the list and present in
the panel above it, which reads as a quirk rather than as the same bug
twice. Making the parameter required rather than defaulted is the rule
`listProjects` already followed, and the compiler found the two call
sites immediately.

**Base passes a budget of `0` and shows no affordability.** Deliberate —
the tech tree owns the budget control, and duplicating it would be two
places to set one number — but worth stating plainly rather than
implying both screens reason about money. They do not; one number is
stored, one screen applies it.

**There were three shelves and there are two: `gear` is gone.** Asked
for directly: _"I don't really have anything in gear that I want right
now and don't foresee typing progress to that — let's get rid of it."_ A
shelf nobody files to is a screen, a route, a wishlist and two sets of
labels earning nothing. The split it existed for — you against your
tools — was never the expensive one; `base` against everything else is,
and that is the one the paragraph below was actually written about.

**Nothing is orphaned, by the rule `shelfOf` already followed.** A
stored `gear` reads as `tech`, so a pair of boots filed there before this
appears in the tech tree rather than matching no shelf and being drawn
by no screen — the silent loss that function exists to prevent. A
derivation, not a migration: the record normalises the next time
anything saves it. The comparison is widened to `string`, because the
value is no longer in the field's own union and the record on disk can
still say it.

**`/gear` is a redirect, not a deletion**, the rule `/next` and
`/character` follow: a PWA shortcut is registered with the operating
system at install time, so an installed copy goes on asking for the old
path. It lands on the tech tree, which is where the records went.

**The wishlist went with the shelf, and the portrait did not.**
`wantedFrom` listed open upgrades on the gear shelf — deliberately that
shelf only, because wanted _tech_ already has a screen doing it better
with gates, prerequisites and a budget. With no shelf it read from
nothing. The **equipped** list is untouched and never depended on it: it
asks `isOwned` and `isOwnArea`, so a bought phone and a bought pair of
boots both still show in the portrait.

**The hero card carries no links now.** Asked for in the same breath —
_"maybe move tech tree out of the initial hero card."_ It is a
**portrait**: who you are and what you are carrying. Two navigation
buttons at the bottom made the first thing on the screen half a menu.
Both screens are one tap away in _Areas_, which is the list that exists
for exactly that and repeats none of the numbers above it.

**Three shelves, because "is this the house or not" was answering two
questions at once.** The report: _"base upgrades should be separate from
the tech tree — I put a MacBook and a monitor on base upgrades but those
are tech, while a desk and a couch are base"_, and with it a third
shelf: _"gear/cosmetics to track apparel, shoes and accessories."_

`domain/upgrades/shelf.ts`. The question a shelf answers is **what does
this upgrade upgrade** — `base` the place you live, `tech` the tools you
work and play with, `gear` you. The app already made the first cut and
made it in one place, so a pair of boots and a graphics card shared a
screen called Tech tree; the split reads as overdue rather than as new.

**Shelves, not areas.** The model allows exactly one area that _spends_
(`registry.test.ts` → "has exactly one tree") and three screens showing
one record type does not make three spenders — the same reason Base has
`hasTree: false`. One record, one wallet, one set of gates.

**Absent means what it always meant.** `shelfOf` reads a stored record
with no shelf as `base` if it was filed to Base and `tech` otherwise,
which is exactly the two-way split that shipped. Nothing migrates,
nothing moves on its own, and the gear shelf starts empty because nobody
has put anything on it. Verified by driving it against records written
before shelves existed.

**`belongsTo` and `shelf` are two answers about one record, kept in step
by having one writer.** `belongsTo` stays the _area_ answer because
`baseContents`, `keepFor` and the "exactly one side" test all read it;
`shelf` is the finer answer only upgrades have. `moveUpgradeToShelf`
sets both in a single save — the `reshapeStage` lesson — and
`addUpgrade` derives the area from the shelf so the two cannot be
_created_ disagreeing. `shelf.test.ts` holds the invariant that
`shelfOf(u) === 'base'` exactly when `isBase(u)`.

**Gates are global; ranking is per shelf.** `shelfTree` ranks the whole
set and narrows afterwards, because a prerequisite may sit on another
shelf — "the desk before the monitor arm" is a real dependency that
crosses them — and filtering first would make a cross-shelf parent read
as missing. What is per shelf is the _order_, so a graphics card cannot
disturb the priority of a pair of boots.

**The Tech tree and Gear screens are one component.** `ShelfPage` takes
a shelf; `/upgrades` and `/gear` are two-line wrappers. Same record,
same gates, same wallet — a second copy of that file is where a gate bug
would outlive its fix. `/upgrades` keeps its path under a label that no
longer covers what it used to, which is the standing rule that routes
outlive labels.

**`apparel` and `accessories` joined `UPGRADE_CATEGORIES`**, because the
gear shelf had nowhere to put what it is for: a pair of boots was
`lifestyle` or `other`. These are also the avatar's slots, so the
portrait could not show them either.

**The portrait still counts both non-house shelves, deliberately.**
`gearFrom` reads `isOwnArea`, so a phone counts as gear alongside a
belt. Narrowing it to the gear shelf would be more precise about the
word and worse on the screen — somebody whose purchases are all tech
would have an empty portrait to make a label read better.

**Cancelled had nowhere honest to be, in two different wrong ways.**
The tech tree filtered its list on `status !== 'purchased'`, so a
dropped upgrade sat among the live ones — and if it was cheap enough it
appeared under _what you can get today_, which is the screen
recommending something you had decided against. Base then went the other
way when its list was split: cancelled matched neither `isOpen` nor
`isOwned` and rendered nowhere at all, which is worse, because the only
control that can un-cancel one lives on its row.

Both screens now end with a short **Dropped** list. `isOpen` is the
filter for the live tree, and `dropped` is its counterpart, with a test
that the three lists account for every upgrade between them.

**The tech tree says what the whole list comes to, against the budget it
already holds.** Two stated numbers subtracted — costs you typed and a
budget you typed — so the shortfall is arithmetic rather than advice.
The unpriced rows are named and the sentence says **"so this is a floor
rather than a total"**, because a figure that folded them in as free
would be understated in the direction that matters.

**The house list is split into what you are saving for and what is
already here.** It was flat — everything on the shelf in one column with
a Wanted or Owned chip to tell them apart — which is fine at three rows
and stops being fine at fifteen. The two answer different questions, and
a badge is a poor substitute for a heading when the second is what you
opened the screen to read.

**The cost replaced the badge on the row.** Under a heading that says
Wanted, a chip saying "Wanted" is noise, and the price is the thing you
want beside a name you are saving for. Silent when there is no estimate
rather than showing a nought.

**The total names its unpriced rows rather than folding them in as
zero**, which is why `wishlistTotal` is a type and not a `reduce` at
the call site. A couch with no estimate is not a free couch, and a total
that pretended otherwise would be understated **in the direction that
matters** — you would be saving towards a figure the list cannot
support. It reads "570.00 across 2 · 1 unpriced".

Cancelled is in neither list. Something decided against is not on a
wishlist, and it is not in the house either.

**Base files upgrades; the tech tree edits them.** `moveUpgradeHome`
was the last of the three move functions with no caller, which is why
that panel could only ever be empty. The row on Base is deliberately
read-only apart from the way back: an upgrade carries a price, a priority
and a prerequisite, and a second editor for those would be a second place
for the gate rules to be got wrong.

The upgrade hooks did **not** have the invalidation bug the daily ones
did — every mutation invalidates the whole `UPGRADES` prefix and
`useUpgradeTree` carries `home` in its key, so one call reloads both
lists and neither can be left showing a row that has moved. Worth
knowing which of the two shapes to copy.

**A chore is created on Base, and for three commits it could not be
created at all.** `moveDailyHome` and `moveUpgradeHome` were written the
day Base was and **nothing ever called either of them** — so the empty
state saying "add one from Today" was advice that could not be followed:
Today made a daily in its own area and no control existed to move it.
That is worse than a missing button, because a missing button is visible;
this was a screen giving instructions the app could not carry out.

`addDaily` takes a `home` now and `AddDaily` is shared by both screens
rather than copied — a chore and a daily are the same record on the same
three cadences, and a second copy of that form is where a cadence bug
would outlive its fix. The move works both ways, because the common case
is a habit added on Today by somebody who only afterwards noticed it was
house work.

**A mutation must invalidate every list its record can appear on.** These
hooks invalidated `['today']` and `['character']` and not `['base']`, so
the first working "add a chore" wrote the row and left the Base screen
saying "No chores yet" — the record in the database and the list that
should show it never told. A daily lives in one of two places and these
hooks serve both.

**Every list that can return both takes a `HomeFilter`, with no default.**
A default would be an opinion the call site did not state. Making it
required turned the compiler into the thing that finds the missed call
sites, which it did immediately for both existing ones.

**Each record pays exactly one area.** `tallyActs` splits by `belongsTo`
before counting, so a Base chore pays `base.chore-kept` and not
`dailies.completed`. Rule three is that nothing is counted twice, and this
is the most direct way there was to break it. `measure.ts` splits the same
way for the monthly rating.

**Base has `hasTree: false`, and that is deliberate.** It shows house
upgrades and the tech tree shows the rest, but that is a question of which
screen a row appears on — a dishwasher and a barbell are the same record
with the same gates. The model's claim is that exactly one area _spends_
rather than measures, and splitting a tree across two screens does not
make a second spender. `registry.test.ts` → "has exactly one tree" caught
this the first time it was written the other way.

**Moving is a move, not a re-create.** `moveProjectHome` and friends
change one field. The common case is a quest log that has quietly filled
with house work, and the leaking tap on it has a month of steps and
history that retyping would throw away. XP already earned stays where it
was paid; the record simply stops paying its old area from the day it
moves.

**The self-rated condition is gone, and it was never wired to a
session.** Five factors on a poor/ok/good scale — sleep, nutrition,
hydration, stress, motivation — fed `readinessScore`, which fed
`sessionAdjustmentFor`, which returned a set multiplier that **nothing
ever called except its own test**. The same shape as `proposeLandmarks`
before it, and the same removal. Every claim this file used to make
about a bad night trimming the session was false of the shipped app.

It was also the wrong shape twice over. Sleep, nutrition and hydration
are quantities, and a quantity rated `ok` has been thrown away before
it was written down — a pool with a unit counts them properly, which is
what water and caffeine already do. Stress and motivation are a mood,
and a mood deciding how much you lift is a second autoregulation
competing with the one that works: **RTS already answers this set by
set**, because reps at an RPE move the load on a bad day without
anybody rating the day first.

**The rule it used to illustrate has not gone anywhere.** "Two readouts
of different kinds are never averaged into one" was written about the
charges and the condition bar; it is now why the limits are a separate
card from the weight trend rather than a second bar on the same one.

**The `conditions` store still exists and is written by nothing.**
Removing it would mean editing migration step 10, which is the one
thing `database.ts` must never do — a device that ran that step keeps
the store, one that has not would never create it, and the two schemas
diverge with nothing able to tell them apart. The rows are also a true
record of days somebody rated, which is the argument that retires a
habit rather than deleting it. It is typed locally in `database.ts` as
`RetiredDayCondition`, because the domain no longer has an opinion
about the shape.

Gone with it: `domain/vitals/condition.ts`, `ConditionRepository`,
`recordCondition`, the backup collection, the sync collection, and
`'conditions'` from `TOMBSTONED_COLLECTIONS`. A tombstone already
written under that name still arrives from another device and is
simply not matched, which is correct — there is no repository left for
it to purge from. `ReadinessFactors` stays, because
`PreWorkoutCheckIn` holds one and the check-in is its own separate
unwired feature.

**A pool refills on a rolling window or at a calendar boundary, and
people genuinely hold both.** `ChargeCycle` in `domain/vitals/charges.ts`.
Coffee is the case the rolling window was built for: two at a time, and
stating it in hours is what stops midnight handing you a third. Beer is
the case that made hours read as nonsense — four a week, which nobody
computes as "one back every forty-two hours". The report was "beers
recharge on the weekly so hours don't make a lot of sense", and it was
right.

**A calendar reset does not weaken the merge rule below — it satisfies
it.** The constraint is that no refill _time_ may be stored, and "how
many spends since Monday" is a pure function of the timestamps and the
clock, exactly like a daily's cadence being a property of the date alone.
Both shapes go through one cutoff and share everything after it.

**The week starts on Monday, and here that is not a style choice.** A
weekly drink allowance has to hold Friday, Saturday and Sunday together;
a Sunday-start week splits the weekend across two allowances, so a
Saturday beer and a Sunday beer land in different weeks.

**Nothing migrates old pools.** A stored `regenHours` is already a
complete, correct statement of a rolling window, so `cycleOf` is the one
place that reads both shapes and every caller goes through it. Rewriting
records would be churn that risks a merge for no gain.

**"+1" and "resets" are different claims.** A rolling pool returns one
charge; a calendar pool returns all of them. Saying "+1 in 3d" under a
weekly allowance with three spent would have somebody expecting one drink
on Monday when they have four.

**One row component, on both screens, and the Vitals page could not
log anything until there was one.** `features/vitals/PoolRow.tsx`. The
row on the management screen was a badge, a pencil and a bin — a reading
with no button beside it — so the section that exists to create and edit
pools was the one place a pool could not be _used_. Reaching for the plus
on a limit found nothing there, which is the same shape as every other
capability in this file that nothing could reach, arriving from the other
direction: the action existed and the screen had no control for it.

Two sets of buttons is how two screens end up disagreeing about what a
spend does, so there is one set.

**The rule decides the row's shape, not a flag naming a screen.** With a
`rule` — the limit written out, "3 a day, on 2 days a week" — the row
stacks into four bands: name and figure, gauge, detail, controls.
Without one it stays a single line. That is not a stylistic pairing:
three buttons and a row of pips leave about two hundred pixels for the
words, so the rule wrapped four times in a monospaced face while the
buttons sat in open space — and stacking it _unconditionally_ took
Today's card from a glance to a full screen and pushed the dailies below
the fold. The screen that states the rule is the screen being worked on;
Today is scanned. A measured pool stacks either way, because a bar and a
row of quick amounts have never fitted on a line.

**The monospaced face is for the figure, never the sentence.** It was on
the whole detail line, which made a clause about days of the week both
wider and harder to read for the sake of two numerals inside it.

**The pips are `aria-hidden`, so the count has to be in text.** They are
a picture of a number and not the number. A row showing "1 a day" in
place of "0 of 1" left a screen reader the limit with no idea where you
stood against it — which is what happened the first time the rule was
added, because it _replaced_ the state rather than joining it.

**Retiring lives in the editor, not on the row.** It is the one thing you
do to a pool once, and a bin sitting permanently beside a plus pressed
daily is a mis-tap waiting to happen — the more so once the row carries
buttons meant to be pressed.

**The add form folds away.** It stood open at the foot of the section: a
name box, a direction toggle, a unit field, quick amounts, a size, a
period and a day limit, permanently on a screen whose job the rest of the
time is to show four rows and let you press plus. The unit field was the
giveaway — a box asking what you measure kush in, under a list of pools
that already know. A form you open is also a form you finish; one left
open has no moment where it is submitted, so it reads as furniture.

**Editing a pool had no screen for three commits.** `editVice` existed
from the day pools did and nothing called it — the third time in this app
a working capability was invisible because nothing reached it. It became
load-bearing the moment cycles arrived: without it the only way to put an
existing beer pool on a weekly allowance was to retire it and start
again, discarding every spend it had recorded.

**A charge can carry an amount, and the amount lives inside the entry
string.** An entry is `2026-08-30T15:45:34.045Z` for one, or
`…Z#95` for ninety-five of whatever the pool measures. That is not a
trick awaiting an object array: **the merge is a union over strings**, so
two devices logging the same drink produce the same entry and it
collapses, while two different drinks stay two. The amount is part of
what happened — "95mg at 08:00" is one event — so putting it in the
identity is correct, and an array of objects would need a merge rule
written from scratch to say the same thing. A bare timestamp reads as
one, so nothing on a device needed migrating.

**A pool can limit the days as well as the amount, and neither number
can stand in for the other.** `daysLimit` in `domain/vitals/charges.ts`.
"Four a week" permits four on one night; "three a day" permits
twenty-one. Moderating drink is usually both at once — a few on a couple
of nights — and saying it takes two numbers because it is two decisions.
The two run on independent periods: an amount per day with days per week
is the common pairing, and an amount per week on at most two days works
unchanged.

**A day limit is a count _or_ named days, because those are two rules.**
`DaysLimit` in `domain/vitals/charges.ts`. "At most two days a week"
leaves the choice to the day it arrives on; "Friday and Saturday" is
decided once, in advance, and a count cannot express it — any two days
permits Monday and Tuesday. Spelled `days-of-week` and Sunday-indexed to
match `Cadence`, because `Date.getDay()` is what reads both.

**`openToday` is the one question both shapes answer**, and it is what
`available` folds against. A count is open while days remain or the day
has already started; named days are open on the named days and shut on
the others however few have been used. The card asked
`used >= allowed` before this — the _count_ rule — so a weekend-only pool
on a Tuesday read as fine while being shut, with none of its days used.

**An empty day picker is undecided, not "shut every day".**
`saneDaysLimit` returns `undefined` for it, because a limit that can
never be satisfied is the worst of the states it could be in.

**`todayCounts` is the load-bearing part.** A day already started does
not cost a second one, so a pool with both days spent is still open on
one of those days and shut on any other. Without it the third drink on a
Friday you had already begun would read as breaking the limit, which is
the kind of wrongness that makes somebody stop logging.

**The stricter constraint wins in `available`**, because "can I have one"
is answered by both. Out of days on a fresh day reports nothing available
even when that day's own amount is untouched — and **spending is still
never refused**, so logging it anyway records the day overrun as `3 of 2
days used` rather than hiding it.

**Distinct days, not entries.** Three drinks on one Friday is one
drinking day, which is the entire reason this is counted separately from
the amount.

**The pools have their own screen, and it is not Vitals.**
`features/limits/LimitsPage.tsx`, at `/limits`. Vitals measures the
body — what the scale says, what phase you are in, how the day felt,
what upkeep was kept — and a pool is none of that. It is a rule you set
and then spend against, closer to a quest than to a weigh-in: nothing in
it is a reading taken _of_ you. Sharing one screen also made that screen
the longest in the app and gave it a heading covering five unrelated
things.

Today carries a card for each, because Today is where the spending
happens and this is where the deciding does — the same line Settings and
the tech tree sit on relative to You. **A link rather than a ninth tab**,
which was measured rather than argued: every nav cell clears 44px, so
nine need 396 and a 375-pixel phone has 375.

The domain did not move and should not. `domain/vitals/charges.ts`,
`ViceRepository`, the `vices` store and the sync field all stay where
they are — those are addresses, and this is the same screen-word /
type-word split the file already documents for Quests over `Project`
and Codex over `backlog`.

**Its sections are "Staying under" and "Reaching for"**, not "Limits"
and "Targets": the page is already called Limits, and a section under it
repeating the word says nothing. Those are also the words the add form's
own direction toggle uses, so the heading and the control that produces
it agree.

**Limits and targets get their own sections, because a heading that has
to say "or the opposite" is covering two things.** One list read
"A limit to stay under or a target to reach", which is what a description
becomes when water is filed among the things being rationed. They are
read for different questions — what is left, versus how far there is to
go — so they are separate on the Vitals screen and grouped on Today's
card, the same way the dailies are grouped by home.

On the card the group heading appears **only when both kinds are
present**: one group alone is not ambiguous about which it is, and a
label on an unambiguous list is noise.

**Direction and unit are on the form now.** They were reachable only
through a _suggestion_, so anything made by hand was a counting limit
whatever it was for — water existed as a target only because a preset
row said so. Same defect as the geocoder and `moveDailyHome`: a
capability the data model had and no screen could reach.

**`Vice` is now the wrong name for the type and is staying.** It holds
water. The store key, the branded id and the sync payload field all say
`vices`, and those are **addresses rather than labels** — renaming one
opens a fresh empty store beside the old rather than migrating anything.
The screens say Limits and Targets, which is the same split this file
already documents for Quests over `Project` and Codex over `backlog`.

**A pool says where it stands in one word, and the thing that seemed to
break the metaphor is what makes it work.** The ask: _"I want limits to
be more gamified — buffs, rechargeable potions or something. But one of
them is literally the act of going out, so I'm not sure how to reconcile
that."_

Going out is not a limit, it is a **target**, and `direction` has
carried that since water was added. So both halves already exist: a
limit is a flask you are draining and would rather not empty, a target
is one you are filling and want to. `poolStanding` names the state in
the vocabulary each direction deserves — Untouched / Holding / Spent /
Over against Not yet / Part way / Reached.

**No new quantity, which is what keeps this honest.** Every state is
read off a `ChargeReading` already on the screen as a number; this only
says what that number means at a glance. It is a re-presentation, the
same footing `describeClear` sits on, and not a fourth currency — a word
that can be wrong is worse than a number that is plain, which is why the
number stays on the row beside the word. The avatar's calling was the
other example here and is gone, for a related reason: its word had no
number beside it.

**A target is never Over, however much is logged.** Reporting a fourth
glass of water as exceeding something would be scolding somebody for
drinking enough, which is exactly why `over` is a limit's word. Driven:
a target logged past its capacity still reads Reached.

**Spent is neutral and only Over is warned about.** Reaching an
allowance you set for yourself is the plan working, not a failure. A
tone that treated the two the same would make the one day worth
noticing look like every other day.

The add form's placeholder follows the direction now. One form serves
both and it went on asking _"what are you limiting?"_ under a Reach
button — the confusion this distinction exists to prevent, printed on
the control that makes it.

**A pool is a limit or a target, and only a limit can be exceeded.**
Caffeine is spent down and going past 400mg is worth seeing; water is
filled up, and reporting "500 over" for a fourth glass would be scolding
somebody for drinking enough. The arithmetic is identical and only the
sentiment differs, which is why it is a flag on one mechanism rather than
two mechanisms. Absent means limit — every pool written before this was
one.

**Name the substance, not the vessel.** A Coffee pool counting cups sat
beside a Caffeine pool counting milligrams, and the cups measured the
wrong thing: a cold brew and an espresso are one coffee each and roughly
three times apart in the quantity anybody means to keep down. Two pools
for one substance is two numbers to keep in step, one of which is not the
answer. Coffee is gone from the suggestions and lives on as a _preset_ —
which is the one place a vessel belongs, because there it is a number
rather than a name.

Beer went the same way and became **Alcohol, counted in standard
drinks**. It stays a count rather than gaining a unit: four is small
enough to read as pips, and a standard drink already is the unit.

**Converting a count pool to a measured one cannot be done from the
history.** Coffee-counts do not become caffeine-milligrams, because
nothing recorded whether each cup was an espresso or a cold brew, and
inventing a size for every past entry would be fabricating the record.
Retiring the old pool and starting the new one is the honest move — the
old one keeps what it truly held.

**A measured pool must be loggable without presets, and for three
commits it was not.** `MeasuredPool` offered the preset buttons and
nothing else, so a pool that gained a unit any way other than arriving
with one — which is every pool edited into being measured — drew a bar
and gave no way to fill it.

The answer was a typed amount beside the presets, and that is **gone
again**: a box you type into is the largest, loudest control on a row
whose job is to be pressed once, and a number is a thing you have to
compose rather than choose — on a card meant to be used mid-conversation
holding a drink. A pool with no quick amounts gets **a bare plus that
logs one unit** instead, which covers the same gap and is what a pool of
hits wanted anyway.

What that costs is real: an amount with no chip for it now needs a chip
made first. That is one trip to the editor against a text field on every
row forever, and the chips get better with use — the list ends up being
what you actually drink.

**An empty amount box means one, and the plus was doing nothing at
all.** `Number('')` is 0, so the submit fell through its `amount <= 0`
guard and returned — and on a measured pool with no quick amounts, that
plus is the only control on the row. A button that looks pressable, is
not disabled, and has no effect is the worst of the three states it can
be in: a disabled one says why, and a working one works.

One _unit_ in the pool's own terms — one hit, one millilitre, one
milligram. It is the least surprising reading of a plus, it makes a
preset-less pool tappable at all, and every spend is one tap from undo.

**The control band is laid out by kind: logging left, reversing
right.** A preset, the amount field, its plus and undo shared one
wrapping flex row, so "Pre-workout", "mg", "+" and a minus came out as
four interchangeable chips — a shortcut, a text field and two different
reversals, all looking like the same thing. The quick amounts get a line
of their own; the field and its plus sit below them; undo and the pencil
are pushed to the right, because neither is more of what a plus is.

**The unit is a label beside the field, not the placeholder inside it.**
As a placeholder it made an empty box read as a chip saying "mg", which
is most of why the field did not look like a field. Moved out, it names
what the number is, and the placeholder can say the thing worth saying
instead: a dimmed "1", which is exactly what an empty box logs.

**Undo does not wear a minus on a measured pool.** A minus beside a plus
reads as "one less", and undo removes the _last entry_ — which may have
been a 160 mg energy drink. On a counting pool the two readings coincide
and the minus is honest, so it stays there.

**Quick amounts are editable too, and replaced wholesale rather than
merged.** The editor shows the entire list, so merging would make a
removed row reappear — the one thing a list editor must not do. An empty
list clears the field rather than storing `[]`: the card reads
`presets ?? []` either way, and a stored empty array is a state every
future reader has to have explained.

They are shown **only for a measured pool**, because that is the only
place they are used — a counting pool's row is pips and a plus, with
nowhere to put a "Coffee" button. And a half-typed row is dropped on
save: a name with no number is somebody mid-thought, not a preset, and
saving it would put a nameless button on the card.

**The unit and the direction are editable, and the entries are not
rewritten.** They were fixed at creation, so a pool labelled wrongly
could only be retired and rebuilt — throwing away everything it had
recorded to correct a word. Not converting the history is the deliberate
half: relabelling drinks as shots is the same one-each record under a
better word, and drinks to milligrams is not, and **only the person
knows which of the two it is**. The editor says the entries keep their
numbers rather than guessing.

**Clearing a unit has to remove it, not leave it behind.** `editVice`
drops `unit` from the spread before rebuilding, the same as `daysLimit`.
A stored unit still draws a bar, so one surviving a clear would keep
rendering a pool the person had just turned back into a count.

**A unit is not cosmetic.** A double espresso and a cold brew are one
coffee each and very different amounts of caffeine, which is the whole
reason `capacity` had to stop being a count. Pools with a unit get a bar
and their numbers written out; pools without keep the pips, because pips
cannot show four hundred.

**Water is Upkeep too, and it used to be a measured target.** It was
3,000 ml with buttons for 250, 500 and a litre: an accurate account of a
day's drinking, and a running total nobody keeps. A gallon is a thing
you either finished or did not — which is a _daily_ here, one tap, with a
streak, and the streak is the question actually being asked over a week.

The mechanism fitting is what made it tempting. A pool with a capacity of
one and no unit would have worked and would have been a habit wearing a
pool's clothes: a plus, a single pip, and no streak at the end of it.
Same call [[supplements]] got, for the same reason.

**Removing a suggestion reaches nobody who already took it.** A Water
pool already on a device stays a 3,000 ml bar — it is a record, not a
default — so the way across is to retire it and tap the Upkeep
suggestion. This is the trap `SETTINGS_SCHEMA_VERSION` exists for,
appearing again in the one place a migration would be _wrong_: silently
deleting a pool holding weeks of readings, to replace it with a habit
that has no history, is worse than leaving it.

**Upkeep has suggestions now, and it was the only list without them.**
You typed every row, and it is the list whose contents are the least
personal — everybody's is roughly water, brushing, flossing and hair.
Offered by _name not already used_, the same rule the pools follow, so
taking one does not take the rest away.

**A day that is not today can be ticked now, and until it could not,
nothing could correct a forgotten one.** Reported from real use: a
habit asked for three times a day sat at **2 of 3 on yesterday**, and
there was no way anywhere in the app to finish it. `keepToday` only ever
did today, so a third feed forgotten at eleven at night was gone.

It is also the **only repair** for a completion misfiled by the timezone
bug this app shipped five times. Nothing rewrites stored entries — the
offset an entry was written at was never recorded, so there is no way to
know by how much it is wrong — and the honest fix is a person saying
"that day was done" and the app believing them.

**A backfilled tick is stamped midnight of the day it belongs to**, not
the time it was typed. `complete` is called with no `at`, because a late
tick knows which day it was and does not know what time of that day —
stamping "now" would file a Tuesday completion with Thursday’s clock.

**The future is refused.** Ticking tomorrow is not forgetfulness, it is
a claim about something that has not happened, and a streak built on it
would be the one number here that means nothing. The past is allowed
without limit. XP follows automatically and lands correctly, because
`tallyActs` dates a completion by the day it is filed under — so a day
ticked late pays into the season it belonged to.

**The cadence is editable now, and the reason it was not still holds.**
It re-reads every streak the habit has ever had: a habit kept every
weekday for a year becomes a broken run the moment it is told it was an
every-day habit all along. It exists because the alternative was worse —
a habit on the wrong cadence could only be retired and typed again, and
that throws away the run of days, which is a habit’s whole value. So it
sits **behind a press inside the label form**, with the warning stated
before the change rather than after: every day kept stays kept, and only
which days were _expected_ moves.

**Limits are no longer the first thing on the day.** "Can we not have
limits at the very top" — and the old argument for them leading was
sound and beside the point: they are the most present-tense thing on the
screen, and spending a charge happens at an arbitrary moment. Both true.
A limit is still a _readout you consult before spending_, and the
checkbox is what you opened the app for. The band runs actions then
readouts, which restores at this level the ordering the screen as a
whole gave up when the progression moved above it.

**A daily renames now, and only the title.** `renameDaily`. A name was
fixed at creation, so a habit named wrongly — or named before it meant
what it means now — could only be retired and typed again, and that
throws away the streak. Worse than the same trap on a pool: a pool's
value is a list of spends, and a habit's value _is_ the run of days.

**The cadence and the times a day are deliberately not in that form**,
and it is not squeamishness about a bigger one. A title is a label — the
record means exactly what it meant before — where a cadence decides
_which days were expected_ and re-reads every streak the habit has ever
had. A habit kept every weekday for a year becomes a broken run the
moment it is told it was an every-day habit all along. That is a real
operation somebody may want, and it has to say out loud what it does to
the history rather than arriving as a second field on a rename box.

**The title is the control, not a fourth icon button.** The rows already
carry a tick, a streak, a move and a retire; at 375 there is no room for
another, and the name is the only thing on a row that is not already
something you press. The pencil beside it is what says so, because a
phone has no hover to reveal it with. Editing replaces the whole row
rather than swapping the title column for a field — after the tick,
streak and two buttons there are about a hundred and eighty pixels left,
which does not hold a text field and its two buttons.

Shared by Today, Base and Upkeep the way `AddDaily` is: the same record
on three screens, and a second copy of the form is where a rename that
trims differently would live.

**Renaming pays no XP**, like undo and like retiring. Correcting a label
is not a thing done.

**Supplements are Upkeep, not a pool.** Creatine is a thing you take once
a day and either did or did not — a daily with a streak, which is exactly
what Upkeep holds. Building a third mechanism for it would have been a
counting pool wearing a habit's clothes.

**Sleep, calories and macros were scrapped, and the reason is worth
more than the feature was.** Reported: _"what am I really getting from
double tracking this info? Now there's a separate process involved."_

The area held one row a day — sleep hours, calories, protein, carbs,
fat — typed off Cal AI's screen, plus `macroTargets` deriving protein
and a fat floor from bodyweight and a `dailyCalories` figure somebody
typed into settings. All of it is gone: `day-reading.ts`,
`day-standing.ts`, `macros.ts`, the `days` use case, the Vitals boxes,
the Macros card, the cut line, `Condition` on Today, and
`settings.dailyCalories`.

**The test it failed is not "did anybody use it" but "who owns this
number".** Cal AI counts the macros and Apple Health holds the sleep, so
a row here was a **second copy of a figure kept properly somewhere
else** — and a second copy is a thing that can disagree with the first,
silently, with no way to tell which is right. That is the same argument
this file already makes against a food log and against a transaction
ledger, arriving at a feature that had got past it by being small.

**An automated import does not answer it, which is what settled this.**
The removal was decided _while_ a working import was on the branch — an
Apple Shortcut reading Health nightly and a paste panel that previewed
every figure before writing it. It worked, and it was still a second
process to keep running in order to hold a second copy of numbers that
were already fine where they were. **Cheap synchronisation is not a
reason to duplicate**, and the honest cost of a feature includes the
machinery that keeps it fed.

What that leaves in Vitals is what the app itself measures: the scale,
the phase, the corridor, and the pools. **A web app cannot read
HealthKit** — no web API, in Safari or anywhere — so any future version
of this is an outside process again, and the question above has to be
answered before the mechanism is.

**Nothing was migrated and nothing was deleted.** The `dayReadings`
store is still in `database.ts`, typed locally as `RetiredDayRow`
beside `conditions`, written by nothing. Removing it would mean editing
a migration step, which is the one thing that file must never do — and
the rows are a true record of days somebody measured. This was scrapped
"for now", so throwing the history away would make coming back cost more
than leaving it did. It is out of the sync payload, the tombstone list
and the backup envelope; a tombstone arriving under that name from
another device is simply not matched, which is correct.

**A charge comes back exactly `regenHours` after the spend that consumed
it**, so three coffees at eight in the morning on a twelve-hour timer are
all three back at eight in the evening. The alternative — a token bucket
refilling at one per `regenHours`, which is what most games actually do
with charge abilities — is what somebody will propose, and it cannot be
built here: **a bucket has to remember when it last refilled, and a
remembered refill time is device state with no correct merge.** Deriving
the reading from the spend list has no such state, so `readCharges` is
pure and two devices that have seen the same spends agree whatever order
those arrived in. The mechanic was chosen to fit the merge, which is the
right way round.

That makes `spent` a **union over the string**, like a daily's
completions and for a sharper reason: `readCharges` counts _entries_, so
a record-level winner would not merely lose a row — it would hand back a
charge that was genuinely spent.

**Spending is never refused, and going over is recorded rather than
clamped.** An app that refused would be asking to be lied to, and a log
you lie to is worth nothing. `ChargeReading.over` is separate from
`available` so the bar can clamp at empty while the record does not —
otherwise the one day worth noticing looks exactly like a day at the
limit.

**That rule is why a pool shut for today folds rather than
disappearing.** Reported: _"alcohol only applies on certain days, but
it's still cluttering up the screen on days where I don't have charges
available."_ Fair — a card headed _what you have left today_ was giving
a full band to a pool whose own caption read "not today", plus a plus
and an undo, on a screen that is scanned rather than read.

Filtering it out is the obvious fix and is the one thing that must not
happen: a Tuesday drink would become unloggable, which is the same
mistake with a tidier screen. It goes behind a lid on **Today only**,
counted in the summary, one tap from the same controls — the treatment
the day's done and not-due habits already get. Driven: with the row
folded, opening the lid and pressing the plus still records the spend.

The Limits screen is untouched. That is where pools are managed, and a
list you manage has to show everything in it.

**Weigh-ins and conditions are keyed by the day, and are last-write-wins
rather than unioned.** Two devices holding a row for one day are two
opinions about **one fact**, so the later answer wins outright; a second
reading is a correction, not an addition. That is the opposite of
`spent` and of `done`, and the difference is the whole reason both rules
are written down.

**The scale went too, and Vitals went with it.** Reported: _"no need to
track weight either, same reason. Doesn't make sense to have a vitals
section and the upkeep tasks should move somewhere else."_

Gone: `domain/vitals/weight.ts`, the `weighIns` store's repository, the
`WeighIn` record everywhere it travelled, `settings.phase` and
`settings.phaseRate`, the trend, the projected corridor, the Vitals
screen, its card on Today, and the `vitals.phase-held` rating with the
`vitals.weeks-in-band` source that fed it — a rating whose source
nothing produces reads as absent forever, which is worse than not
declaring it.

**`settings.bodyweight` stays, and the distinction is the whole point.**
It is one figure somebody states, not a series: `resolve.ts` needs it to
load a bodyweight-plus set, and the strength ladders are multiples of it.
Removing the tracking did not remove the number, because the number was
never the tracking.

**The area survives under a different name, and the id did not move.**
`area: 'vitals'` is an **address** — it is written into `belongsTo` on
every upkeep habit ever filed — so renaming it would orphan those
records rather than relabel them. `name` is a label and is now
`Upkeep`, which is what is left under that id: the body's chores and the
body's limits. It still pays `vitals.upkeep-kept` and still feeds
Vitality.

**Upkeep moved to Today, and it was already half there.** The obvious
build was a new home or a new screen, and the reply was _"there's
already an upkeep section on the You page though"_ — correct.
`DueElsewhere` had rendered an Upkeep group all along, and Vitals was
only ever where those habits were **added and edited**. So the section
moved to `features/today/Upkeep.tsx` and `DueElsewhere` dropped its
Upkeep group, because one screen must not draw the same record twice.

**The full list had to come with it, not just the due ones.** That group
showed only what was due, on the reasoning that anything else about
these belonged on the screen that owned them. There is no such screen
now, so a weekly hair wash on a Tuesday would have been invisible and
impossible to retire.

**What must not be done here is folding them into Today's own dailies.**
That looks tidier and would re-file them from `UPKEEP` to no home,
paying `dailies.completed` instead of `vitals.upkeep-kept` — which
empties the **Vitality** trait permanently, since `vitals` is its only
area and the limits rating pays no XP. **A home decides which area
scores a record; a screen is only where you touch it**, and this is the
case that shows the two are not the same question.

**`/vitals` is a redirect to `/today`, not a deleted route**, the rule
`/next` and `/character` already follow: a PWA shortcut is registered
with the operating system at install time.

**The `weighIns` store stays in `database.ts`**, typed locally as
`RetiredDayRow` beside `conditions` and `dayReadings`. Three retired
stores now, all for one reason: removing one means editing a migration
step, which is the thing that file must never do.

**A test moved rather than being deleted with its example.**
`synchronise.test.ts` → "lets the later weigh-in for a day replace the
earlier one" was the record that a date-keyed row is last-write-wins
rather than unioned. The rule outlived the weigh-in: finance is keyed by
its month on identical reasoning, so the test is written against that
now. **Deleting a rule's only test because the record it used went away
is how a rule stops being enforced without anybody deciding to stop
enforcing it.**

**Vitals pays no XP at all, and it is the first area that measures
without paying.** Every candidate falls on the wrong side of the act/
outcome line: not drinking is an _outcome_, so paying for it is the
streak mistake in a new costume, and the only real _act_ was spending a
charge, where paying XP for logging a beer is perverse. Weighing in was
the other one, and stepping on a scale is a measurement rather than a
thing done — the reasoning that kept it unpaid is the same one that has
now removed it altogether. An area with no acts is not an incomplete
area, and this one has since gained `vitals.upkeep-kept` anyway.

**Still no ladder.** Nobody publishes how much coffee a person ought
to drink or how often they ought to floss. Bodyweight was the tempting
case and the argument against it is kept as the general one: BMI and
body-fat brackets are published, and every one of them is a claim about
_health_ rather than about the thing measured — a lifter deliberately at
15% on a bulk is not worse at anything. Moot now the series has gone.

**The navigation is eight, and the eighth was measured rather than
argued about.**
Character became "You" and the tech tree moved to a link, because seven
cells on a 375-pixel screen are 53.6 pixels wide and "Character" measured
53 — exactly the width, nothing left for padding.

That note then warned that at eight cells "every label but Map is at
risk", which was an extrapolation and **wrong**. Measured with a real
eighth cell: 46.9 pixels each at 375, the widest label ("Quests") is 37.1,
nothing clips and nothing overflows. Eight is fine.

Where it does break is **320 pixels**, an iPhone SE 1st-gen width: the
44-pixel tap-target minimum refuses to shrink further, so 8 × 44 = 352
overflows a 320 viewport and the last tab is clipped by 32. That cannot be
fixed by narrowing cells — 44 is the accessibility floor and the mobile
bar below says every control clears it — so a ninth tab, or support for
320, needs a horizontally scrolling nav instead.

**Measure before adding a ninth**, and measure it rather than reasoning
about it: this paragraph is what an unmeasured warning costs.

Settings and the tech tree are links from You, which is the hub. That is
the line worth keeping: **a tab is somewhere you act, a link on the hub
is somewhere you decide.** History hangs off Train, Trips and the inbox
off the Map. The monthly review was the third of those links and the
screen is gone; see below.

**The screens and the code use different words, on purpose.** Quests over
`Project`, Codex over `backlog`, Tech tree over `upgrades`, Map over
`domain/atlas`. The presented vocabulary is the game model's; the type
names are the ones the files were written under, and renaming forty of
them buys nothing a reader of this paragraph does not already have. What
must match is any string a _person_ reads — several of those live in
`domain/projects/`, which emits its own refusals, and they say quest.

**Routes outlive the labels on them.** `/next` still resolves, as a
redirect to `/quests`, because a PWA shortcut is registered with the
operating system at install time: an installed copy goes on asking for the
old path long after the manifest stops mentioning it. `/backlog` and
`/upgrades` keep their paths under the Codex and Tech tree labels for the
same reason. `/map` is the one that came back into agreement — it was
always `/map`, and "Atlas" was the label that disagreed with it.

**This was called Lift, and the rename went all the way down.** The
database, the `localStorage` prefix and `BACKUP_MAGIC` all say `lifeos`.
Those are _addresses_, not labels: changing one opens a fresh empty one
beside the old rather than migrating anything, so it was a deliberate
factory reset taken at the only moment it was free — before there was data
worth keeping. Doing it later would have meant a migration, or a database
called `lift` inside an app called LifeOS forever. `LiftTracker` in the
archaeology is a different repository and keeps its name.

**A quest is main or side, and "active" is derived from a stamp.**
`domain/projects/active.ts`. `activatedAt` rather than an `isActive`
boolean, because two devices each activating a different quest while apart
would both set a boolean and last-write-wins has no tie-break — a
timestamp always has a greatest element, so `activeQuest` picks one
deterministically however many stamps survive a merge. The write still
clears the others; the derivation is what makes it safe when that clearing
does not survive the trip. Absent `kind` means side, read through
`kindOf`.

**A closed action records the kind it was closed as.**
`ActionItem.completedAsKind`, written once at completion and never
recomputed. Main quest steps pay 40 XP and side ones 20, and the kind is a
label a person can change — so reading the quest's _current_ kind would
mean promoting a side quest silently repriced everything already done
against it, and demoting one would make XP go **down**. A record of effort
must never shrink. Same principle as a `WorkoutLog` embedding its own
prescription: a log describes itself. Verified by demoting a main quest in
the store and watching the total stay at 75.

**The recommendation is an advisor now, not the answer.**
`getRecommendation` and the whole priority engine are unchanged and still
run — what moved is what they are _for_. The Quests page leads with the
two quests you chose and offers the scoring underneath as a suggestion of
what to activate. Do not restore it to the top of the page: the engine can
say which quest scores highest and can never know which one you mean to be
working on.

**Dailies are the one area where the screen and the code agree.** Quests
sit over `Project`, Codex over `backlog`, Tech tree over `upgrades` — and
`domain/dailies/` is called dailies on both sides, because the MMO word
for a recurring quest and the type name happened to be the same word. Do
not "fix" the label to Habits for plainness; the agreement is worth more
than the plainness, and it is the only one there is.

The wrinkle it carries, stated so nobody treats it as a bug: a
days-of-week cadence means a "daily" can happen weekly. Every MMO with
dailies has the same thing and nobody is confused by it.

**A habit can name parts of the day, and it is deliberately coarse.**
`partsOfDay` in `domain/dailies/daily.ts` — morning, afternoon, evening,
or none. A stored "07:00" would be precision with no consumer: nothing
can ring (see below), so a time could order a list and do nothing else,
which three named parts do just as well without inviting somebody to
expect an alarm.

What it is for is reading a day as a routine — the house is opened at one
end and closed at the other, and an alphabetical list says nothing about
which comes first.

**It is a list, and naming two parts is what says it happens twice.**
Reported: _"some stuff, like brushing my teeth, is done twice a day, but
I'd like it morning and evening — that doesn't seem to be supported
right now since it's one row."_ It was `timesPerDay: 2` and a single
`partOfDay`, which states the number and says nothing about when, and
drew **one row that could not be in two places**.

So naming parts does two things at once, and the form says so: the habit
is drawn once per part, and the parts **are** the times-a-day answer.
`timesPerDay` is ignored entirely when there are any, and the control
for it is hidden — two fields answering "how many times a day" is the
trap the fatigue allowance already records, where the loser sits there
looking authoritative. What that costs is "twice in the morning", which
is not expressible any more; it is rare enough to be the right thing to
give up for one number with one meaning.

**`partsOf` is the only reader, because two shapes are stored.** Every
record on every device was written with the single `partOfDay`, which
reads back as a list of one — a derivation rather than a migration, the
rule `shelfOf` follows, normalising the next time anything saves it. The
list is deduplicated and re-sorted on read too, since a `partsOfDay`
naming morning twice would otherwise mean "twice in the morning" by the
rule above and draw two identical rows in one band.

**A completion of a named part is `<day>#<part>`**, so the first ten
characters are still the day and `timesDoneOn` needs no special case.
The shape was chosen for **idempotency**: two devices ticking the same
morning write the same string and `unionDone` folds them — the property
a once-a-day habit's bare day key has and a multi-times habit's
timestamp deliberately does not. Here it is both available and correct,
because the morning brushing is one event however many devices saw it,
where the dog's second feed genuinely is not the first.

**The unit of the Today list became an occurrence rather than a
record.** Outstanding, later, done — every one of those is asked of a
row, so keeping the morning folds the morning row away and leaves the
evening one asking. Asking the record would have one tick turn both
rows green. A habit naming no parts has exactly one occurrence with no
part, so the ordinary case goes through no special branch, and
`byGroup`/`byPartOfDay` take occurrences for the same reason. The React
key is `${id}#${part}` — two rows from one id sharing a key is the case
React warns about and then renders wrongly.

**`complete` with no part fills the earliest outstanding one.** The
history strip is the caller that has none: a fortnight of nine-pixel
squares cannot say which half of a day was missed, and pressing twice
fills both. Earliest rather than latest because the strip repairs a
forgotten day, and a half-done day is far more often the morning kept
and the evening missed than the reverse.

**`uncomplete` cannot sort the strings.** `#afternoon` sorts before
`#evening` sorts before `#morning`, so the alphabet would take back the
morning and report the evening as still kept. The order of the day is
the only thing that answers it, and `partsOf` already holds it.

**Editing when in the day lives with the cadence, not with the name.**
Reported: _"existing dailies, particularly the ones from home, don't
seem to be able to update the time of day — they're all at any time."_
They could not: `partOfDay` was settable on the add form and **nowhere
else**, so a house chore filed before anybody thought about it read "Any
time" forever. Another instance of the capability the model had and no
screen could reach, which this file keeps recording.

It belongs behind the cadence warning rather than in the rename form
because it is **not a label**: naming morning and evening changes how
many completions a day needs, so it re-reads every streak the habit has
ever had. A title and a group change nothing about the record's
meaning; this does.

**`bestStreakFor` asked `done.includes(day)` and that was a bug.** The
membership test only ever matched a bare day key — the shape a
_once-a-day_ habit stores — so a habit done several times a day reported
a best streak of **0** however long it had been kept, and parted habits
would have joined it. It asks `isDoneOn` now, which is the predicate
that already knows all three shapes. A second implementation of "was
this day done" is a bug with a delay on it.

**Later today folds away, and that is the version of "guide me" that
does not move anything.** The report: _"can we not surface tasks until
it's time for them, so I'm not combing through stuff that isn't
applicable in the moment."_ The obvious answer is to sort the current
part to the top, which is exactly what the paragraph below argues
against and for a reason that has not stopped being true.

Hiding gets what was asked for without that cost: nothing is reordered,
a later part is simply not drawn yet, and one press shows it. The count
in the header still covers the whole day, because "3 left today" is a
claim about the day rather than about this section.

**Only what is still to do gets hidden — and that now covers what is
done as well, which reverses the paragraph this sentence used to be.**
The old rule: a habit finished early stays on the list, because hiding
something already done invites doing it twice and it is evidence rather
than a task. Reported against: _"the homepage is cluttered with
everything that gets checked off and stuff for other days."_

Both halves were on screen permanently — every ticked row, and an
"Other days" block for habits not due — so a fifteen-habit routine drew
fifteen rows whatever the day actually asked for, and **the evidence of
what was finished was what buried what was not.** They fold away now:
`components/shared/Fold.tsx`, one lid each for "N done today" and "N on
other days", on the dailies and on upkeep. Earlier parts of the day
still stay put — a morning pill forgotten at noon is exactly what the
screen is for.

**Folded, never filtered, and that is the load-bearing half.** A done
row is the only route to **undo**, and a not-due row is the only route
to renaming or retiring one. Dropping either from the screen would take
a working control away in order to tidy a list, which is the shape of
mistake this file keeps recording under "a capability nothing can
reach". The summary carries its count, so the lid says what is under it
before it is lifted.

**Upkeep created half of this and inherited the rest.** Moving its full
list onto Today meant every chore rendered whatever the day asked,
captioned "Not due today" — the clutter arrived with that move rather
than being found in it.

**The Dailies section is the day across every home, and getting there
took two wrong shapes.** Reported against the first: _"I have two left
but have to scroll all the way down to find em."_ The header counted
every home — "2 left today" — while the section drew own habits, House
and Training only, with upkeep in a section three blocks below. So the
number was right, the rows were off-screen, and the list directly under
the count was **empty**.

**A count and the rows beneath it have to be the same claim.** That is
the rule this cost, and it is worth more than either arrangement: the
count may describe the day rather than the section only when the section
shows the day. Upkeep is a group in the list again — House, Training,
Upkeep — and `ELSEWHERE_GROUPS` makes `to` optional, because House and
Training point at the screens that manage them and **upkeep has no link,
since this is that screen**.

**Upkeep comes from `useUpkeep`, not from `useDueElsewhere`.** That hook
keeps only what is due or done _today_, and Today is where an upkeep
habit is renamed and retired — so the other-days fold needs the ones
that are neither. It is dropped from `elsewhere` in the same breath or
every upkeep row is counted and drawn twice, which is the bug the
previous shape shipped with.

**Upkeep is a `group` label now, not a home.** Asked for directly:
_"drop upkeep as a home, use group labels instead."_ `UPKEEP` and
`isUpkeep` are gone, `RECORD_HOMES` is back to four, and
`vitals.upkeep-kept` went with them — a kept chore pays
`dailies.completed`, which is the same fifteen points under the one name
it always deserved. **The act was a second name for one thing**, and the
distinction this codebase keeps drawing is why it could go: a group is a
label, a home decides which area pays. Upkeep only ever needed the
label.

**A trait died with it, and letting it live would have been worse.**
Vitality's only area was `vitals`, which now pays nothing at all —
brushing pays Discipline, and the limits measure without paying. The
sheet keeps _unproven_ bars on purpose, because "eight bars with three
empty says where the time is going"; a bar **no act in the app can ever
move** is a different thing, and it would have sat at "Nothing yet"
forever while the XP it described appeared under Discipline. So Vitality
is deleted and `vitals` joins Discipline, whose blurb now says "and
limits held". The partition still has to be total — `traits.test.ts`
asserts every area has exactly one trait — so `vitals` needed _a_ trait
whether or not it pays.

**The legacy rows are the part that would have gone wrong quietly.** A
`belongsTo: 'vitals'` daily matches no `RecordHome` this build knows
**and** is not own-area, so it is filtered off every screen while
sitting in the database: nothing errors, nothing is deleted, and the
habit is simply gone. `fromStoredDaily` in the repository reads one as
an own habit in the `Upkeep` group, and `StoredDaily` in `database.ts`
widens `belongsTo` to `string` so the stored shape can say something
this build does not have a name for.

**A derivation, not a migration**, the rule `shelfOf` already follows:
nothing is rewritten on read, and a row normalises the next time
anything saves it, because callers hand back what they were given.
Driven end to end — ticking a legacy chore wrote it back with
`belongsTo` absent and `group: 'Upkeep'`, and paid "Kept a daily". That
also keeps it safe across sync, where a device still on the old build
goes on reading its own copy the way it always did.

**An existing `group` wins.** Somebody who had already labelled a chore
"Teeth" meant that, and overwriting it would be the read path having an
opinion about their filing.

**`UPKEEP_GROUP` is the one group name the app itself writes**, and it
leads `GROUP_SUGGESTIONS`. Every other group is the person's, which is
why that list is offers rather than a union.

**The Upkeep section is gone, and its one real job moved into the add
form.** Reduced to a `Section` holding an Add button and four chips, it
read as furniture: _"do we even need the upkeep section under dailies,
it seems redundant."_ Fair about the section — and the capability under
it was not redundant at all, because **nothing else in the app could
file a habit to upkeep**. Today's Add filed to your own area, Base's to
the house, and `moveDailyHome` only toggles between an area and Today.
Deleting the section without moving that would have made upkeep a home
you could own habits in and never create one in.

`AddDaily` takes an optional `Filing`: the homes it may file to, the
one-tap suggestions for each, and the titles already used. **Today is
the only screen that passes one**, because it is the only screen that
owns two homes; Base and Train own exactly one each and keep passing a
fixed `home`, so nothing about them changed. House and Training are
deliberately _not_ offered in the chips — those screens have an Add of
their own, and a second route to the same record is a second place for
it to go wrong.

**The suggestions moved with it and are filtered by the chosen home**,
so they appear when Upkeep is selected and not otherwise. They still
offer by _name not already used_ rather than gating on an empty list,
for the reason recorded when they were written: adding the first must
not take the other three away. They submit on their own rather than
filling the field — a suggestion whose whole value is saving a tap
should not cost two.

**`home?: RecordHome | undefined` is written out rather than left as
`?`.** Under `exactOptionalPropertyTypes` an absent key and one holding
`undefined` are different types, and "your own area" **is** an explicit
undefined here rather than an omission — which is what `belongsTo` means
everywhere else. Written as `?` alone the build refuses the `Yours`
chip.

**`DailyRow` moves a habit the way it is not currently filed**, and this
was a latent bug that only bit once upkeep joined the list. The button
was Base unconditionally: harmless while the row drew own habits and
House rows, where "move to Base" is merely useless. With upkeep in the
day list it put a toothbrushing habit one tap from becoming a house
chore with no way back on that screen. An own habit offers Base;
anything already filed elsewhere offers the way back to Today.

**One screen must not draw a record twice, and the first attempt did.**
Today's done fold was built from own dailies plus everything
`useDueElsewhere` returned, which includes upkeep — so a ticked Floss
appeared in the Dailies fold _and_ in Upkeep's. `otherHomes` excludes
`UPKEEP` from what the section **draws**, while `left` still reads the
whole of `elsewhere`, because "3 left today" is a claim about the day
rather than about one section. Found by driving it with six habits in
three homes; the suite was green throughout.

**`DueElsewhere` takes its rows rather than fetching them.** It called
`useDueElsewhere` while its caller called it too — one answer read
twice — and the caller has to split done from outstanding anyway, so
the split has to happen in one place or the fold and the list would
disagree about what is left.

**Sorted chronologically, never "the current part first."** Putting now
at the top is the more obviously clever rule and is worse to live with:
the list would reorder itself twice a day, so the row you reach for by
position moves, and a glance at breakfast and a glance at bedtime
disagree about where anything is. The current part is _lit_ instead,
which says the same thing and moves nothing. A habit with no part sorts
last, because it belongs to no point in the day rather than to the start.

**It never decides whether something counts as done.** Time of day is the
most obvious excuse to start breaking a streak early — a morning habit
undone at noon _looks_ missed — and that would undo the humane rule this
file already sets out: today does not break a streak until the day is
over. `daily.test.ts` holds it.

**A daily cannot ring, and the design is built around that.** iOS gives
a PWA no way to schedule a local notification, and Web Push needs a
server this app does not have. So `domain/dailies/` earns its place by
being the first thing on the home screen rather than by finding you.
Anything proposed here that assumes an alarm is proposing a server.

**A streak has two humane rules and both are load-bearing.** A day the
habit was not expected on does not break it — otherwise every cadence
but every-day reads as a streak of one forever. And **today does not
break it until the day is over**: opening the app on Tuesday morning to
be told a twelve-day run is finished, because you have not yet done the
thing you are about to do, is the single most discouraging thing a habit
tracker can do. `streakFor` has tests for both.

---

**`done` holds two shapes and `timesDoneOn` is the only thing that
reads it.** A habit expected several times a day — feeding a dog morning,
afternoon and evening — could not be recorded at all, because a set of
day keys has nowhere to put "twice". `timesPerDay` sits on the `Daily`
rather than inside `Cadence`, since the two are orthogonal: the cadence
answers _which days_ and this answers _how many on one of them_.

**A once-a-day habit still stores a bare day key, and that idempotency is
load-bearing.** Two devices ticking the same Tuesday write the same
string, the union collapses it, and `daysKept` — which counts _entries_ —
pays fifteen XP once rather than twice. Switching everything to
timestamps would have quietly doubled the XP of every habit synced from
two devices.

**A multi-times habit stores one timestamp per completion**, because
there is nothing to collapse: the evening feed is not a duplicate of the
morning one. Each entry is one completion and pays once, which is the
existing rule rather than a new one — three feeds is 45 XP, verified.
Both shapes are read by comparing the first ten characters, so nothing
needed migrating.

**`isDoneOn` means done _enough times_.** Streaks follow from that
unchanged: a day counts once it is full, and a part-done today still does
not break the run, which is the humane rule already written down.

**The view was computing `done.includes(today)` itself** rather than
calling `isDoneOn` — the same answer while every habit was once a day,
and wrong the moment one asked for three. A second implementation of a
domain predicate is a bug with a delay on it.

**A create that takes four positional parameters will silently drop the
fifth.** `addDaily` grew `home` and then `timesPerDay`, and the screen
passed the latter inside a spread — `...(howMany > 1 ? { timesPerDay } : {})`
— which **defeats excess-property checking**, so a value the form
collected went nowhere and nothing failed to compile. It takes a
`NewDaily` object now, like `addUpgrade` and `addVice`, which puts the
compiler back in charge of noticing.

**Completions are a set of day keys, merged by union.** `unionDone` in
`domain/sync/payload.ts`, beside `unionProgress` for the same reason:
tick Tuesday on the phone and Wednesday on the desktop with neither
having heard from the other, and a record-level winner keeps one — which
on a streak reads as a day missed and a run broken that never was. There
is no amount to take a maximum of, unlike the backlog, because a day is
either done or it is not.

**`isEmpty` and `payloadSize` have to know about every collection.**
Adding `dailies` to the payload without adding it to `isEmpty` meant a
push containing _only_ habit ticks was discarded as empty — so a device
whose sole change that day was keeping a habit synced nothing at all.
Caught by the union test, which never saw a batch reach the server.

**XP is paid per completion, never per streak.** A streak is an outcome
— it is what happened to have worked — and paying a currency from it
would break the rule against feeding XP from outcomes in the one area
where the temptation is strongest.

**Habits retire rather than delete.** `retiredAt` makes them expected on
no day, so they leave the list and their kept days survive. Eighty days
of a habit you have finished with is a thing that happened.

**That rule was right and it was also the only door, which made it a
trap.** Reported: _"I seem to not be able to delete dailies."_ You could
not. `removeDaily` and `useRemoveDaily` were written, exported and
tested, and **called by nothing anywhere in the app** — the seventh
instance of the pattern this file keeps recording, after
`proposeLandmarks`, `readinessScore`, `moveDailyHome`, the fatigue
percent, the stopping rule and the geocoder. So a habit typed with a
typo, added twice, or thought better of an hour later could only be
_retired_: kept forever, invisible on every screen, and travelling over
sync for good.

**The verb now follows what there is to lose, and the row says which it
is doing.** A habit with no kept days is a record of _nothing_ and the
button deletes; one that has been kept is a record of something and the
button retires. That is not a new rule — it is the one `attempts`
already states, where a problem logged by mistake is deleted because it
is not a thing that happened, while a habit's kept days _are_ the
record. Same predicate, applied where it had never been.

**Permanent deletion for a habit with history lives in the editor, not
on the row.** The more destructive thing sits further from the control
pressed daily, which is the reason a pool's retire is in its editor
too — and on a row already carrying a tick, a rename, a move and a
retire there is nothing left to spend at 375 pixels.

**It says the XP will go, because that is the part nobody expects.**
`tallyActs` counts completions, so removing them takes back what they
paid: a habit kept eighty times is 1,200 XP, and the character level can
fall. This is the one place in the app where **a record of effort
shrinks**, and it is allowed only because deleting is exactly the
request to un-record it — the alternative, retiring, keeps both and only
stops asking. Measured end to end: a habit with three kept days took the
all-time total from **45 XP to 0**, which is what the warning promised.

**A deletion writes a tombstone**, so it is a fact rather than an
absence and the record does not come back from the other device on the
next exchange. Verified: `dailies:<id>` in the store after the press.

**What is still missing, named rather than implied: a retired habit
cannot be brought back.** `dailiesToday` drops anything with `retiredAt`
before anything else sees it, so there is no screen that lists one and
nothing to press. Deleting the never-kept rows removes most of the
pressure — that is where the accidents are — but a habit retired by
mistake is still unreachable, and un-retiring needs a screen the day it
needs a function.
**Today and You are one screen, and that reverses the rule below.**
The paragraph that follows is kept rather than deleted, because it is
the argument this decision was made _against_ and it may well be right
again.

The reversal was asked for directly: _the character progression is the
main thing and should be shown first._ It was flagged first — that
ordering had been reversed once already, for a stated reason — and then
made, which is the right way round for a decision about somebody’s own
app.

**Two bands now, and it was three.** The sheet card — portrait, season,
traits and the ladders under them — then the day: dailies, quests,
limits, leads and the digest. The third band was "where you stand", a
list of one card per area, and it is gone: what was worth reading in it
is in the card at the top, and the rest could no longer say anything.
The only thing left below the day is navigation — the screens with no
tab, and the ladder legend.

**The cost is exactly what the old rule predicted.** The dailies now sit
below three blocks of readout where they sat below two, so opening the
app shows a level before it shows a checkbox. If ticking habits starts
feeling like a chore buried under a scoreboard, this ordering is the
thing to suspect, and moving the standing band above the day is a
two-line change.

**It also fixed the 320-pixel overflow this file warned about.** Eight
cells needed 352 against an iPhone SE’s 320 and clipped the last tab by
32; seven need 308. Measured after the merge: at 320 the nav overflows
by **0 pixels**, seven cells at 46 each, the last tab ending exactly at
the edge. The freed seat is deliberately left empty — the eight
screens without a tab are all things you decide rather than do daily.

**The route stayed `/today` under the label "You"**, and `/character`
redirects to it. A PWA shortcut is registered with the operating system
at install time, so an installed copy goes on asking for the path it was
installed with — the same reason `/next` still resolves.

`CharacterPage` is gone; its parts moved to `CharacterParts.tsx` and its
constants to `sheet-constants.ts`, because a module exporting both
components and values breaks fast refresh and the lint rule says so.

**The hub opens as a character sheet, not as a form.** Reported:
_"simply rendering 'You' followed by a date underneath feels very
barebones and non-gamified"_, and it was — a noun over an ISO date is
what a settings pane opens with, on the screen the app opens to.

**There is no header on this screen at all now**, and the whole of that
report is answered by what replaced it rather than by a better heading.
The title went through three values in three days — the calling
(_Devotee_), then `You`, then nothing — which is itself the finding:
**a heading was never what was wrong with that screen.** The portrait,
the ring, the season and the traits were what fixed it, and they are all
still there. `SheetCard` is the whole first band.

**Intellect is Intelligence**, a label change only — the trait id stays
`intellect`, because nothing user-visible reads it and an id is an
address.

**Limits are Buffs: Potions you spend, Rations that keep you up.** Asked
for as _"can we rename limits to make them buffs, to make it feel more
like gamified potions that recharge on cooldown instead of something I'm
limiting myself on."_ The mechanism is untouched and so is the honesty —
going over is still the thing worth seeing and `poolStanding` still says
**Over**. What changed is the frame: a flask with charges that come back
is what a daily allowance actually is.

**The names stayed the substances and the icons do the gamifying.** A
suggestion is offered by _name not already used_, so renaming Caffeine
to something flavourful would stop matching the pool already on the
device and offer a second one beside the first. Any pool can be renamed
in its own editor, which is where a name somebody chose belongs.

**Water is back as a target, reversing the note that removed it.** That
note said a gallon is a thing you either finished or did not, so it
belonged in Upkeep as a habit with a streak rather than as a pool with a
running total nobody keeps. What changed is that a target now _feeds
something_: the health bar reads daily targets met, so a ration is the
thing the bar is made of. 128 oz with a **Gallon jug** preset, plus
Fruit and Vegetables at two servings a day. Nothing migrates; if the
habit and the pool both exist they are two records of one intention and
the pool is the one that moves the bar.

**The health bar is a rolling seven-day reading, never a stored level.**
`domain/vitals/vitality.ts`. A bar that decayed on a timer needs
somewhere to keep how full it was, and device state with no correct
merge is the trap `readCharges` was written to avoid. Reading the last
week means it **drains by itself for free**: a day you hit ages out, so
stopping makes it fall with nothing ticking.

**Its numbers are the app's own and that is said out loud.** Seven days,
and a day over a limit cancels a day of hitting a target. It is allowed
for the same reason the avatar's build bands are — it _measures nothing
about the world_, only pools you set against targets you chose.

**The bar starts full and depletes**, asked for as _"it should really
start full, and deplete with the things replacing them."_ The arithmetic
is written that way now — full, less what was missed and what went over
— rather than as a score climbing from nothing. They are the same
number, and only one of them reads the way the bar behaves.

**Targets and limits share one window, and getting that wrong made a
perfect day read as empty.** Reported: _"hit my water and veggie/fruit
goals and my health bar is empty still."_ Reproduced exactly before
changing anything: **met 3, over 7, possible 3**.

The cause is worth keeping because it is a shape rather than a typo.
Targets only counted days since _they_ were created, which is right; the
limits were judged across the whole seven days, which is not. A caffeine
pool running for months could therefore spend a week of overruns against
a single day of hitting everything — and the restoratives are always the
newer records, so this was going to happen to everybody who set them up.

**A day with nothing to measure is now skipped whole.** A day before you
were keeping any restorative is not a day you failed, and it cannot
drain a bar that was not being kept. The two halves ask the same
question of the same days, or neither does. An overrun on a day that
_was_ being kept still costs — there is a test for each direction.

**The bar takes damage and heals; it is not an average.** Reported as _"for the restoratives, I hit both my goals for the day but am not at full health"_ and reproduced exactly: two restoratives set up four days earlier, both hit today, reading **20%** — with the label honestly saying "2 of 10 target days standing".

**The cause was the shape rather than a slip.** A flat average over seven days times the pools means one perfect day contributes at most a seventh, so **hitting everything today could never get you near full**, and 100% required having hit every target on all seven days. That contradicted what the bar had already been asked for — _"go through today at 100, and if I do not hit my goals by end of day, then it starts draining the next day"_ — which describes a drain, not a mean.

The window is walked oldest to newest from full: a day carrying misses or overruns takes a bite, a day you hit everything heals one back, clamped at both ends. **Still derived rather than stored**, which is what the walk preserves — a pure function of the spend log, so two devices that have seen the same spends agree, and it still drains by itself because missed days age _into_ the window.

**Recovery outruns decay on purpose.** A quarter off for a day fully missed, half back for a day fully hit — four neglected days empty it, two clean days fill it, and the break-even is hitting about a third of your restoratives. A bar that punishes harder than it rewards is one you learn to ignore.

**Heal first, then take the damage, and the order is the rule.** Done in one expression the heal swamped the harm: a day where every restorative was hit _and_ a limit was blown came out full, because +0.5 against −0.08 clamps to one — so **the limits stopped mattering on exactly the days somebody was doing well.** Clamping the heal before subtracting means a day carrying an overrun can never end full.

**Damage is capped at one day per day**, which the average never was: over was added per limit with no ceiling, so one limit run over every day could empty the bar however well the restoratives went.

**The meter and its percentage came from two different numbers for a commit.** The fill still drew the old `met - over` over `possible` while the figure above it came from the walk, so a bar reading 50% could be drawn a fifth full. One quantity, drawn twice, disagreeing — caught before shipping by reading the screen rather than the tests.

**Today does not drain it until the day is over.** Reported as _"health seems to drain awfully quickly — hasn't been a day yet and already down to 33. I should at least be able to go through today at 100, and if I don't hit my goals by end of day, then it starts draining the next day."_ Exactly right, and the arithmetic was doing it deliberately: today sat in the window like any other day, so at nine in the morning three untouched targets read as three misses. On a first day — when the pools were created today and today is therefore the only day in the window — one target of three is 33%, a bar that opens two-thirds empty because the day has not happened yet.

It is the humane rule streaks already follow, applied to the other place it belongs: a run is not broken by a day you have yet to live. An unmet target today is **not yet missed**, so the bar starts full and falls tomorrow for whatever today did not do. Nothing is forgiven, only deferred.

**An overrun is judged today, and the asymmetry is the point.** Missing a target is a thing that has not happened yet and may still; going over a limit has already happened and cannot be taken back. A bar that deferred both would let a heavy night read as a perfect day right up to midnight. Driven: untouched reads 100%, and five energy drinks against a 400 mg ceiling take it to 67% on the spot.

**Today counts toward `met` rather than being left out of the denominator.** Dropping it instead makes a fresh morning `possible: 0` — an absent reading, which draws the "set up your restoratives" empty state at somebody who just did.

**A day before the pool existed is not a day you missed**, and this was
found by looking rather than by reasoning. Three rations set up and all
three hit on the first afternoon read **14% in red**: six of the seven
days counted against pools that did not exist yet. A bar calling a
perfect day a failure is worse than no bar. The denominator now counts
only days the pool has existed for — absent-never-zero applied to the
window — and the same reading is 100%.

**A weekly target is left out of the denominator entirely** rather than
counted as missed. Three of seven days is not a third of a weekly goal
in any sense the bar could use, and being unmeasurable is not being
failed. A weekly _limit_ is judged through `readCharges` at the end of
each day, so going past four drinks on Friday reads as over on Saturday
too — the pool's own rule rather than a second opinion.

**The pool icons are real game-icons.net art, and getting there took
three states worth recording.** They shipped first as ten shapes drawn
here **carrying a false CC BY credit to Lorc and Delapouite** — caught
and corrected before the deploy, because a licence note is a claim about
provenance and one written from memory is a claim about nothing. The
honest version credited nobody and looked it: reported back as the icons
all being much of a muchness, and the carrot read as a dagger.

They are now the genuine article, fetched from game-icons.net and
committed as paths — the route `figures.ts` took, which is what the
corrected comment had already pointed at. **`ATTRIBUTION` widened from
"Figures" to "Figures and icons"**, which is accurate rather than
convenient: same two artists, same licence, and it would have been an
under-credit the day these landed.

**The section headers came off the home screen entirely.** Reported:
_"can we remove the headers on the home page like today what the day
asks of you? It makes the app feel less gamified and breaks up the
flow."_

They were a label over an accent rule over a description, four times
down one screen, and **each named something the card beneath it already
said**: a list of checkboxes is the day, two slots reading "no main
quest active" are the quests, and the Buffs card carries its own name
and its own link. The rules were doing separating that `space-y-8` was
already doing.

This is the argument the page header lost to a portrait — _a screen that
opens on a face does not need to be told it is about you_ — carried one
level down. What is left is cards, which is what a game screen is.

**The season label moved inside its card rather than going with the
rest.** What that line says — which chapter of the year this is — is not
recoverable from a list of challenges, and the rule this file already
holds is that the name travels with the measurement. So it is the
`ChallengePass` card's first line now, above a rule, with the days left
beside it.

**Two spans became `h2`s, and they look identical.** Dropping the
sections took every landmark off the screen bar the level, so somebody
navigating by heading had one stop for the whole page. The cards already
name themselves; making those names headings gives the structure back
without putting a rule and a caption back on screen. Verified: H1 Level,
H2 Buffs, H2 Autumn 2026.

**A JSX comment cannot be a bare sibling inside a `&&` expression**
either — the same trap this file records for attribute expressions, one
shape along. It has to sit above the conditional.

**The two fold lids became one control in the header.** Reported:
_"get rid of the done today and habits on other days lines, it breaks up
the flow of the cards."_ They did — two summary rows sitting between
cards, each announcing a list nobody had asked to see.

**The rows themselves could not simply go**, which is why this is a move
rather than a deletion: a ticked habit's row is the only route to
**undo**, and a not-due habit's is the only route to renaming or
retiring it. Dropping them would take working controls away in order to
tidy a list, which is the shape of mistake this file keeps recording.
So the disclosure is an eye beside **Add** and the lines are gone.

**Hidden when there is nothing behind it**, rather than shown disabled —
a control that cannot do anything is worse than one that is not there.
Not persisted either: it is a glance at what is already done rather than
a preference, and the day should reset it.

**"N left today" is unchanged and still counts only what is
outstanding**, which is the rule that cost two attempts to find: the
count and the rows beneath it are one claim. Revealing the rest does not
move it, because a done habit is not left to do.

**The morning digest moved to Mind.** Asked for as _"let's move the this
morning hacker news stuff to the other mental training page."_ It fits —
Mind is study and practice, and a front page of things worth reading is
the study half arriving from outside — and it sits at the **foot**,
because what the screen is for is the practice log and the digest is a
reading surface that pays nothing.

**The cost is when it fetches.** The digest reads on the first open of a
day and that gate fires when the component mounts: on Today it ran when
the app did, and on Mind it runs the first time Mind is opened. A
morning without visiting the screen is simply a morning it has not swept
yet — the same shape as the job sweep, and why both remember their
result rather than re-running.

**The rename missed the card on Today, which is where it is read
most.** Reported with a screenshot: _"why do I still see limits."_ The
`/limits` page had been renamed twice by then and `LimitsCard` had not —
its section heading, its own header, its two group labels and its fold
all still said Limits and Targets. **A screen is renamed where the thing
is used, not only where it is managed**, and this app puts those in two
places on purpose.

**Every existing pool drew the same icon, which is worse than none.**
Also reported from that screenshot: _"a repeated icon next to each
thing."_ Exactly so — no pool written before the `icon` field has one,
so `poolIcon` handed them all the fallback flask and two different
substances wore one picture.

`poolIcon` takes the **name** now and guesses from it when nothing was
chosen: caffeine reads as a mug, THC as a leaf, water as a droplet. **A
guess is only ever the fallback** — an explicitly chosen icon always
wins, so this can never overrule a decision somebody made. It is a
derivation rather than a migration, the rule `shelfOf` already follows:
nothing is written, and a pool that never opens the picker still looks
like itself.

**"Rations" became "Restoratives", and the reason is the one that
started this whole rename.** Reported: _"I don't like rations as a name,
makes it seem like something I have limited of."_ Exactly right — a
ration is by definition an amount you are _issued_, which is the
scarcity signal water and vegetables must not carry. It is the same trap
"Limits" had one rename earlier, walked into while fixing it.

**The pair now reads Potions / Restoratives**: one you spend and one
that puts health back, and neither word implies a rule you are keeping.
The section name, the direction toggle, the add button, the empty state
and the health bar's own link all say it — the lesson from the previous
pass, where only the headings changed.

**"Limits" survived the first rename in every place that was not a
heading.** Reported as _"it's still framed as limits when I want it
framed like rechargeable buffs."_ The page title and the two section
names had changed and the working copy had not: "New limit", "Stay
under", "What are you limiting?", "Nothing limited yet". A rename that
only reaches the headings is a rename of the table of contents — the
controls are where somebody actually reads the words.

**The shipped Kush suggestion is gone**, on request. What ships as a
suggestion is the app guessing at somebody's life, and a guess nobody
wanted is worse than an empty list. The two left are the ones with a
_number_ worth shipping — a published caffeine ceiling, a standard-drink
count — rather than substances the app assumes you use.

**The health bar was invisible and that was my absent-never-zero rule
misapplied.** It returned nothing when no ration existed, on the
reasoning that a bar at nought reads as dying. True of the _bar_, and it
made the whole feature undiscoverable: nothing had been set up and
nothing said so. It draws a flat track and a **Set rations** link now —
no percentage claimed, no colour claimed, and a way in. **Absent is the
right answer for a number and the wrong one for a control.**

**Craft became Crafting, and it is things you built.** Asked for as
_"can we make craft into crafting and it shouldn't be any dailies or
housework, just the diy stuff I work on myself or Legos from my codex."_
It was quests, the house and the tech tree; it is now one area, split
off two others rather than being a new place to log things.

- **Lego is a Codex category**, counted in **bags** — the unit a set
  arrives in and the one you stop at, where pieces would be precise and
  useless. It is the one category that is not something you consume,
  which is why it feeds Crafting rather than Intellect.
- **House jobs you do yourself.** A DIY job's closed steps pay Crafting;
  a hired job's still pay Base. Getting a plumber in is a thing you did
  and worth the points, and it is not crafting.

**Nothing pays twice.** `tallyActs` takes Lego items out of the backlog
acts and DIY jobs out of `base.action-closed` before counting — the same
split `belongsTo` already makes for a chore, which is rule three holding
by construction. The crafting acts use the **same rates** as the acts
they are split from (5 a progress day, 40 a finish, 20 a step), so
moving a record between areas never changes what it is worth.

**`Project.approach` is stored now, and that reverses a decision
recorded in this file.** The old note said the approach must not be
stored: a project carries its steps, and "Find the right person" against
"Work out what it needs" says which errand it is more plainly than a
field would — and a field needs something that reads it.

Something reads it now. Which errand a job was became a **scoring**
question rather than a display one, and the steps cannot answer it: they
are free text the moment anybody edits one, and a job whose steps were
retyped would silently stop paying. **Absent means neither**, which is
the honest reading of every job filed before the field existed — there
is no telling from a step list what somebody meant, and guessing would
hand XP out on a string match. Those keep paying Base.

**`projects`, `base` and `upgrades` joined `UNCLAIMED_AREAS`.** Quests,
housework and buying things pay the level and have no bar, which the
traits-as-a-selection change made expressible.

Driven: a finished Lego build paid **Crafting 45** (a progress day at 5
and a finish at 40) and the Codex nothing, while a book in progress paid
**Intellect 5** — 50 total against a level reading of 50/100.

**Four traits, no header, no blurbs — and traits stopped being a
partition.** Asked for as _"drop the traits header and description …
drop the descriptions on traits and drop discipline, fortune and
wayfaring completely. Add stamina as a trait that gets boosted from
cardio work."_

**This is the model change on the page, so it goes first.** Every area
used to belong to exactly one trait, which is what made the bars sum to
the XP total exactly and rule three hold by construction. Dropping three
traits left six areas — habits, limits, challenges, job search, finance,
exploration — with no honest home among the survivors. Forcing them in
would have made Craft a catch-all holding half the app, which is the
invented structure this file has refused since the traits were written.

**So the bars now add up to less than the level above them.** That is
the exact symptom the old guard existed to catch. What makes it a
decision rather than the bug: `UNCLAIMED_AREAS` names the six, and
`traits.test.ts` asserts that list _exactly_, so an area added tomorrow
with no trait still fails the build until somebody says which it is. The
sum test changed from "splits the XP total exactly" to "sums to the XP
of the areas it claims, and falls short of the total" — the
double-counting half is still guarded; only the totality claim moved.

**The caption had to go with the header, not just because it was asked
for.** "Your XP, split by what earned it" stopped being true the moment
this became a selection: it is _some_ of your XP now, and a caption
saying otherwise would be the one wrong thing on the card.

**Stamina needed its own area, and that is the whole mechanism.** A
trait re-presents the XP of the areas it claims and an area feeds
exactly one trait — so conditioning could not stay inside `training` and
feed a second bar. `cardio` is a `LifeArea` with one act,
`cardio.session-logged`. Nothing about how conditioning is planned or
logged changed; its sets still pay `training.working-set-logged`. What
changed is which bar the doing of it shows under.

**Counted from `hasConditioning`, which asks whether, not how much.**
A completed session containing a conditioning entry with at least one
_completed_ set. **The slot is not enough** — every session of the
shipped programme schedules conditioning, so counting the slot would pay
Stamina on every lifting day whether or not anybody walked anywhere.
That is the case `conditioning.test.ts` exists for.

**30 points against a session's 50**, because conditioning usually rides
along with a lifting session rather than replacing it — it fires on a
day that has often already paid for the session and its sets. Matching
50 would make Stamina climb fastest on heavy days, which is the reading
backwards. Flat, so a twenty-minute walk and a brutal interval session
are worth the same: paying by duration would make the easy Zone 2 work
the programme leans on the least valuable thing in it.

Driven with three seeded sessions — lifting only, lift plus a completed
walk, and a walk that was skipped. Strength 165 (3 × 50 + 3 sets × 5),
Stamina 30, total 195 against a level-2 reading of 95/300. **The skipped
session paid Strength and not Stamina**, which is the whole point.

**"Earned this season" and the ladder legend are both gone, and Today
now ends on the challenges.** Asked for as _"let's actually entirely get
rid of the 'xp earned this season' section, along with the last 'the
ladder' section."_

**The season card holds one reading now, so the rule inside it went
too.** A rule says "these are two different readings" and there is one:
the heading names a chapter of the year and what is under it is what you
have taken that chapter up on. `SeasonBand.tsx` is deleted. The XP is
not lost — it is the ring and the level at the top of the screen, over
all of your time rather than this quarter of it.

**What the legend cost is worth naming.** Untrained through Elite now
have no explanation anywhere on screen. They are still anchored — the
thresholds are in `domain/game/character.ts` and every ladder row states
the load or figure its next rung needs — but the sentence saying the
scale is not the app's to move lives only in the code. **If a rung ever
reads as arbitrary, that sentence goes on Train**, beside the badges it
explains, rather than back on the home page where it was a key to
symbols that appear elsewhere.

**Four `SeasonProgress` fields are now computed and read by nothing** —
`xp`, `target`, `elapsed` and `months`; only `label` and `daysLeft`
survive, for the section heading. That is the shape this file already
condemns once, where `SeasonProgress.areas` was deleted "because a field
nothing reads is a tally computed on every render", and `useSeasonProgress`
runs `tallyActs` **twice** — this season and last — for numbers nothing
draws.

It is left in deliberately rather than trimmed in the same breath.
Removing `xp` takes the previous-season comparison and the windowed
tally with it, and with them `season-progress.test.ts` → "sums the
seasons to the all-time total" and "excludes an act with no date from
the all-time total too" — the guard that keeps all-time equal to the sum
of its seasons. **That is a measurement to stop taking, not a section to
delete**, and it is a separate decision from this one.

**The stray-links block is gone entirely, and each screen found a
parent instead.** Reported as _"it just felt random having those as
stray links while everything else fit nicely into a gamified layout"_ —
which is exactly right about what it was: a row of chips whose members
shared only the absence of a tab, which is a fact about the navigation
rather than about the person.

- **Resume and Mind hang off Job search**, in its header. _"Resume
  should be navigable from the improve income/job search stuff, and mind
  is really training for job interviews so it should probably go to
  there."_ The resume is the document these applications are matched
  against, so the link sits where the matching happens.
- **Job search hangs off Quests**, in its header, and that link is what
  makes the two above safe. An arc stage does link to Jobs — but only
  once an `offers` stage exists, and the leads card is silent when
  nothing is out. **Two conditionals deep is how a screen becomes
  unreachable**, which is what the block existed to prevent. A tab is
  unconditional, so the chain is rooted there.
- **Houses hangs off the arc's house-search stage**, which already
  worked: `EVIDENCE_SCREENS` maps `homes-viewed` to `/houses`. Nothing
  was built for it; it was verified by seeding a real arc and clicking
  through, because it is now the _only_ route.

**A header action is the established place for a related screen** —
Train has carried Plan and History that way for a long time. What makes
these different from the block is that each is _about_ the screen it
sits on.

**`AREA_LINKS` is deleted, and the note where it stood says not to
bring it back.** The right fix for a routeless screen is to find the
screen it belongs to. Its members were only ever united by a gap in the
navigation.

**The verification caught nothing and the method still mattered.** The
first pass at checking the Houses link reported it missing — the link
renders as "Houses →" and the test matched "Houses" exactly. The app was
right and the check was wrong, which is worth recording because the
opposite conclusion was one keystroke away: a route deleted on the
strength of a bad assertion.

**Social is gone, and the navigation is eight tabs.** Asked for as
_"let's clean up the areas section, seems unnecessary … tech tree and
finances should be its own tab, let's replace the party section … I'm
not interested in tracking social for now so let's drop charisma and
related stuff."_

**Eight cells, measured rather than reasoned about.** 47 pixels each at
375, the widest label ("Finance") 41 — nothing clips. At **320** the bar
is 352 against 320 and the last tab is cut by 32, exactly the figure
this file predicted; the 44-pixel target is an accessibility floor and
does not shrink, so 320 would need a scrolling bar. Taken deliberately.

**"Tech" rather than "Tech tree"**, because nine characters measure past
the 47 available. The screen keeps its full name. Same trade "You" made
for "Character".

**The Areas block became "More", and shrank from seven chips to three.**
Four had grown a better route — Finance and the tree are tabs, Job
search is reached from a main quest's stage and the leads card, Limits
from its own card's "Set up". **The three left are there because
deleting the block outright would have orphaned them**: `/mind` and
`/resume` were linked from _nowhere_ else, and `/houses` only from a
campaign stage that has to exist first. Checked by grep before deleting,
which is the whole reason that list exists. It is named "More" rather
than "Areas" because it no longer describes areas — calling them areas
invites the next area onto a list that is trying to empty.

**Charisma is the second trait deleted, and for the opposite reason to
Vitality.** Vitality went because no act could ever fill it; Charisma
went because the person stopped wanting the thing measured. The area,
its act, its rating, the screen, the tab and the agenda's overdue rows
all went with it.

**The records were deleted, and the store was not.** A new migration
step at `DB_VERSION` 19 clears `friends`; the store stays because
removing it means editing the step that creates it, which is the one
thing `database.ts` must never do. Fourth retired store, typed locally
as `RetiredRow`. It also had to leave the sync payload, both targets,
the backup collection and the tombstone list — otherwise another device
would push the people straight back and the deletion would not stick.

**`/party` is a redirect, not a deleted route**, the rule `/next`,
`/character`, `/vitals` and `/gear` already follow: a PWA shortcut is
registered with the operating system at install time.

**One guard got stronger.** `sheet.test.ts` → "has a counted or
deliberately absent entry for every declared act" used to permit
`social.hangout-logged`, the one act the registry declared that
`tallyActs` could not count. It asserts `[]` now: every declared act is
actually wired. A second test asserting hangouts stay uncounted was
deleted rather than kept, because with the act gone it passed for the
wrong reason — a test that cannot fail is worse than no test.

**Four review tests moved rather than being deleted with their
example.** They used social as the _vehicle_ for testing the spine —
what a draft opens on, what a save re-reads, and the source-vs-metric
key bug this file calls "silent and total". Deleting a rule's tests
because the example went away is how a rule stops being enforced without
anybody deciding to. They run on `upgrades.owned-share` now.

**Seasonal challenges, and a pass that fills against a real
denominator.** Asked for as _"what if we added seasonal 'challenges'
that would be worth extra xp, and completing them would be working
through a 'battle pass'. Think more like completing holidays stuff and
events related to that time."_ `domain/challenges/challenge.ts`.

**A literal battle pass was the one part that could not be built, and
the reason is written in this repository already.** `season.ts` refuses
numbered tiers at thresholds the app picks, in nearly those words, as
"a scale the app can move". So the pass counts **challenges done over
challenges that exist** — nine this season, four finished. That is a
denominator taken from a list rather than a number chosen here, which is
what lets a progress bar mean something. It was flagged before building
rather than after.

**A challenge is an act, which is why it may pay at all.** Carving a
pumpkin is a thing you decided to do and then did. Flat XP, like
everything else: difficulty deliberately does not scale it, the rule the
practice log holds, because paying more for a harder one turns a season
into something to optimise.

**Completion is never gated by the window.** A Halloween challenge
ticked in January is odd and is still a thing you did. Refusing it would
be the app policing a calendar, which is the call campaign stages
already made in being ordered but not gated.

**The catalogue ships and is editable, which is the only arrangement
that survives both objections.** A shipped list makes the app assert
what your year contains; an empty one makes a feature nobody fills. So
every shipped challenge can be removed and any number of your own added.
The list is northern-hemisphere and largely American, stated in the file
as a limit rather than hidden.

**Windows are `MM-DD` and the year comes from the season.** The
catalogue describes Halloween, not Halloween 2026, so one row serves
every year without a migration each December. A shipped row is placed by
matching its month against the season's own `YYYY-MM` months — which is
what makes **Winter** fall out with no special case, since it is named
for the year it ends in and contains the previous December. A window
closing in an earlier month has run into the next year.

**A shipped instance is addressed `<slug>:<year>`.** A bare slug would
mean carving a pumpkin once marked every future Halloween done.

**Removal is `hiddenAt`, never a delete.** The catalogue lives in the
bundle, so deleting a mark would put the challenge straight back on the
next release. A completion already recorded is left underneath and goes
on counting: removing a challenge says you do not want to see it, and it
cannot unmake an afternoon you spent.

**One stored shape covers all three edits** — a completion, a removal
and a challenge of your own are all "something said about a challenge
id". That is what keeps an editable shipped list to one store rather
than two.

**`challenges` is a `LifeArea` under Discipline, and that assignment is
the weakest link.** It has to be an area to pay XP, and every area needs
exactly one trait. A seasonal challenge is explicitly _not_ an ordinary
day, which is what the rest of Discipline is about — the thread is
deliberateness, and it was the closest of seven rather than an obvious
one. Craft is things built, Charisma is people seen, and a trait of its
own would be an eighth bar fed by one act. **If challenges grow past a
seasonal list, revisit this first.**

**`SheetDeps` gained the repository, `MeasureDeps` did not.** Nothing in
the monthly readout measures challenges, and widening the spine's
interface would make every evaluator and test double carry a repository
none of them ask about.

**The store joined in every place a collection has to**, and the
machinery found most of them: the compiler caught the payload, both sync
targets, the backup collection map and four test harnesses;
`repositories.test.ts` caught the store list; `traits.test.ts` caught the
missing trait; the `FIGURES`-style guards caught the rest. `DB_VERSION`
went to 18 with a new guarded block.

**The pass and the season's XP are one card, with a rule between.**
Asked for as _"let's group together the season challenges and progress
into one card so that it's a distinct season section."_ They were two
cards under one heading, which drew the boundary in the wrong place —
the same merge `SheetCard` already made of the portrait, the season and
the traits.

`ChallengePass` renders a **band rather than a card** for that reason:
the card belongs to the caller, which is what lets it place the rule
between the two rather than each band guessing what follows it. The rule
is there because these genuinely are two readings — what you have taken
up this season, and what the season has earned. The sheet card omits one
between the portrait and its season for the opposite reason: those are
one quantity over two windows.

Driven end to end: ticking one took the pass to 1/5, the season to 40,
the level to 40/100 and Discipline to 40 xp **in one render** — then add,
hide and untick each behaved, and the denominator held at 5 across a
hide and an add.

**The season sits below the day, and this is its third position in as
many passes.** Asked for as _"I'd move season info underneath traits and
today."_ It was a section of its own, then a band merged into the
portrait's row, and it is now a `Section` of its own again — beneath
Today, above the Areas list and the ladder legend.

The reason it settles here is one the earlier moves did not have: **a
season is the slowest thing on this screen.** It changes four times a
year where everything above it changes today, and the ordering this
screen has always argued about — work first, readout last — puts the
slowest readout at the bottom rather than in the first thing seen each
morning. It sits above Areas and the legend because those two are
navigation and reference rather than readings.

**Both halves moved, and that is the rule worth keeping from three
attempts.** The name went with the measurement rather than staying in
the portrait column: a label at the top and its bar two screens down is
one quantity drawn in two places, which is the split the sheet card was
assembled to close. Wherever it goes next, the name and the reading
travel together.

Measured: Today's first heading is at **783 pixels**, from 941 after the
ladders left and 1,309 before any of it.

The paragraph below is the arrangement this replaced, kept because it is
the argument that will be made again.

**The season sat in the avatar's own row, and the rule between
them is gone.** Asked for as _"can we move the season progress up into
the row with the avatar and clean it up a bit."_ The season names itself
in the column beside the portrait — label on one line, days left on the
next — and its bar runs full width underneath, which is the only place a
meter fits: the column beside a 120-pixel figure is about 200 wide at
375 and loses another 40 to the settings link.

**No rule between the two, and still one before the traits.** A rule
says these are separate readings; the level and the season are one
quantity over two windows. The traits keep theirs because they are that
same quantity split a third way, which is a change of kind rather than
of scale.

**Three things went in the clean-up and one is a rule worth knowing.**
The "By month" caption — three bars labelled Sep, Oct and Nov under a
season already write that sentence. The paragraph explaining that the
target is last season's own figure rather than a curve the app made up —
true, in `domain/game/season.ts`, and printing it every morning is the
narration being moved away from. And **the date**, which the header had
left behind: the season line says where you are in time at the scale
this card works on, and a screen opened daily does not need telling what
day it is.

**"Autumn 2026 · 90 days left" wrapped after the middot**, leaving _days
left_ alone on a line. That is the second mid-phrase break this column
has produced — the first was "45 / 100 XP into the level" — so the rule
it earns is plain: **a joined phrase does not go in that column**, it
stacks or it goes full width.

**The season and the traits are bands of that card, not sections after
it.** Asked for in the same breath: _"merge in the season and attributes
stuff into the first card."_ They merge cleanly because they are one
reading at three resolutions — the level is XP over all of it, the
season is XP over this chapter, the traits are the same XP split eight
ways. Three headings and 2rem of air between them had been claiming
three separate questions.

**The share went with them.** _"Let's get rid of the info like 100
percent of xp from dailies."_ It was the evidence for the calling and
outlived it by a day. What it said is not lost and is better said by
what is now under it: the season band names **where this season's XP
came from, area by area**, and the traits split the whole of it — both
show the arithmetic where the percentage reduced it to one figure.
`mainstayFrom` is deleted rather than left exported, because a
derivation nothing calls is the trap this file keeps recording.

**Four things came off that card in the pass after it**, and each one
had an argument for existing that is worth knowing before anybody
rebuilds it.

The **XP rule's fold** — "45 XP all time — what counts?" over a
paragraph saying XP is paid for doing a thing and never for it having
worked. This file argued that deleting it would be worse than folding
it, because that sentence is what stops XP being read as a measure of
how well anything went. The answer is that a rule is worth meeting once:
it is still in `docs/GAME_MODEL.md` and `registry.ts`.

**The number stayed at the time and has since gone too**, on _"let's get
rid of the phrase into the level and XP all time — I'm trying to move
away from the app explaining everything, rather than it just being self
explanatory like in a game."_ The card reads `45 / 100 XP` under the
level and nothing else: a level, a fraction and a ring filled to the
same fraction is a thing every game has already taught, where the two
removed phrases were the app narrating its own model.

**The all-time total went with its words rather than losing them**, and
that is the part worth keeping: "45" under a level bar reads as the
level bar again, so the phrase naming it was the whole of what made it a
second quantity. Deleting a measurement is still a larger step than
deleting an explanation — this one is a line in `PortraitBand` if the
number is missed.

The **gear**: _"no need to track or show upgrades in that card."_
Nothing about upgrades changed and the tech tree still owns them.
`gearFrom` is deleted, which takes `upgrades` out of `buildAvatar` — so
a portrait no longer loads a whole store — and leaves every field on the
avatar a reading of XP or the calendar.

The season's **"Where it came from"**, which listed each area that had
earned anything this season. The traits band directly beneath says the
same split over the whole of your history, so what was lost is a
comparison rather than a fact. `SeasonProgress.areas` went with it,
because a field nothing reads is a tally computed on every render.

And the **review link**, covered above.

**The cost is depth, and it is measured rather than guessed.** The
day's first heading sits about 1,250 pixels down — a screen and a half
on a phone. That is the cost this page's own note predicted when the
progression moved above the checkboxes, arriving in full. If ticking a
habit starts to feel buried, **fold the traits** rather than restoring
a section heading: they are eight rows with a blurb each and by far the
tallest thing in the card.

**Nothing is drawn twice, and one commit got that wrong.** The
`Section title="Level N"` wrapper is gone, because the header names the
level and the ring's badge shows it. The progress into the level was in
the subtitle for one commit — directly above a card already saying "75 /
900 XP into the level" — which is the duplication this component exists
to reduce rather than add to. Caught by looking at the screen. There is
no compact ring in `leading` either, for the same reason: the portrait
is 120 pixels below it and its ring _is_ the XP bar.

**The XP rule folds away rather than being deleted.** Reported as
_"the blurb underneath the avatar might be overkill, explaining
everything"_ — fair, since it is a rule and a rule is worth reading once
rather than every morning. Deleting it would be worse: it is the
sentence that stops XP being read as a measure of how well anything
went, and somebody meeting the number for the first time still needs it.
A `details` keeps the number out and the sentence one tap away.

**Today is present tense, You is standing.** That line decides where a
thing goes. Dailies, the active quests, what is due and the season all
describe now, so they live on Today; levels, ladders and ratings describe
where you have got to, so they live on You. The season was on You first
and was wrong there — a season is a chapter you are _in_.

**The monthly review screen is gone**, asked for as _"I don't really
need a monthly review page or link since we can view trends on the home
tab."_ Its link sat beside the season, on the reasoning that both answer
"how is this stretch going" and that a link nobody passed was the only
prompt to file one. That reasoning was right and the conclusion it
supported has been overtaken.

**What that costs is not the screen, and it has to be said plainly: it
is the ratings.** Filing a month was the only thing that ever wrote a
`MonthlySnapshot`, and a rating is a **direction**, which needs two
points in time. With nothing recording them, every area's rating is
absent from here on. The area cards that displayed them have since been
removed too, which is the tidier end state: the rating half of the model
is dormant and nothing on screen implies otherwise. Months already filed
still read — `readout` is untouched — so this is a stop
rather than a deletion.

**`measureAll` is live and must stay**, which is the part that would be
easy to get wrong when tidying: the sheet's **ladders** read it. Only
the recording half went dark. The write use cases — `draftReview`,
`saveReview`, `saveMetric`, `retireMetric` — are deliberately kept
despite having no caller in the app, because they are how
`review.test.ts` constructs a recorded month in order to test `readout`,
which is live code. Deleting them would delete that coverage, and
restoring the screen would then be a rewrite rather than a route.

**Custom metrics can no longer be created**, for the same reason:
`saveMetric` had no other door. Existing ones still read.

Within Today the order is work first, readout last: the season sits below
everything actionable, because a progress bar above the checkboxes makes
the first thing you see each morning a score rather than a task.

**The season and the review are two different questions.** The season
(`domain/game/season.ts`, `use-cases/character/season-progress.ts`) is
live progress through Winter, Spring, Summer or Autumn, and needs no
stored anything — every act carries a date, so it is derived from records
that already exist. The monthly review is retrospective: it _records_
values so a rating can judge a **direction**, and a direction needs two
points in time, which is the only reason snapshots exist at all. Naming
the review "Season review" was wrong on both counts and is undone.

**The season bar fills against last season, not a tier curve.** A battle
pass normally has a hundred tiers at thresholds somebody invented, which
is precisely the "scale the app can move" the game model refuses
everywhere else. Your own previous season is external to the season being
measured and moves only because you moved it. A first season has nothing
to beat and says so rather than filling a bar against zero.

**An act with no date counts in no window at all, the all-time one
included.** `tallyActs` takes an optional `Within` so one implementation
serves all-time, a season and a month — and the strictness is what keeps
all-time equal to the sum of the seasons. Counting an undated act once in
the total and never in a season would put two numbers on one screen that
quietly disagree. Every operation that performs an act stamps it, so this
only excludes records that were already malformed.

**Seasons are meteorological and northern.** Dec–Feb, Mar–May, Jun–Aug,
Sep–Nov, so they sit on month boundaries the existing keys already use;
the astronomical ones start at solstices and would cut months in half.
Winter is named for the year it **ends** in, so December 2025 and January
2026 are both Winter 2026 — the one case in here worth a test, and it has
several.

---

**Logging progress is serialised per item, by hand.** `serialise` in
`features/backlog/hooks.ts`. It is a read-modify-write, so two in flight
at once count two taps as one. React Query's `scope` does exactly this job
and was tried first: it queues correctly and then does not drain when an
observer unmounts mid-queue — which a hot reload does — leaving the row
permanently dead with no error anywhere. Four lines of promise chain has
no such failure mode.

---

**The habits are gone, and that includes the house chores.** Asked for
as _"we don't need dailies anymore. I also don't even care about the ones
tied to training anymore"_, after the whole recurring routine — house,
hygiene, pet care, admin — moved to a calendar agent, supplements became
a restorative, and the session habits stopped being wanted.

**A chore was a `Daily` filed to Base**, so this took them off that
screen too. That is the part the word "dailies" hides: Base now opens on
Clutter, then Jobs, then Upgrades, and `baseContents` returns two kinds
rather than three. Train lost its Habits card and Mind its Study
section.

**It cost no trait bar**, which was checked before anything was deleted:
`dailies` and `base` were already in `UNCLAIMED_AREAS`, so nothing on
the character sheet depended on them. What it does cost is character XP —
every kept day paid 15 — so the level falls. That is the one place this
app lets a record of effort shrink, and it is allowed for the same
reason deleting a habit was: the request _is_ to un-record it.

**Gone:** `domain/dailies`, `application/use-cases/dailies`, the four
`features/today` habit modules, `DailyRepository`, the `dailies` sync
collection and its tombstone entry, the backup collection, and the four
acts — `dailies.completed`, `base.chore-kept`, `training.habit-kept`,
`mind.habit-kept` — with the `dailies` area and its rating.

**Two things had to survive and were given proper homes.** `Cadence`,
`cadenceCovers` and `isPlausibleCadence` moved to
`domain/schedule/cadence.ts`, because the Codex's reading goals carry a
cadence and `cadenceCovers` is the single place "is this expected today"
is answered. `shiftDay` and its `parseDay`/`keyOf` helpers moved to
`domain/time/day.ts`, beside `toDayKey` where they always belonged —
`vitality.ts` and `declutter.ts` both walk day keys.

**The `dailies` store stays in `database.ts`, typed locally as
`RetiredDaily`.** Fifth retired store, all for one reason: removing it
means editing the migration step that creates it, which is the one thing
that file must never do. The rows are also a true record of days somebody
kept a habit, and a backup taken before the move still holds them.

**Three guards caught what memory missed**, which is the machinery
working rather than luck. `switch-exhaustiveness-check` failed until
`dailies` left `TOMBSTONED_COLLECTIONS`; `repositories.test.ts` → "creates
every store the app writes to" failed because the retired store is still
there and the test had been edited as though it were not; and
`sheet.test.ts` → "has a counted or deliberately absent entry for every
declared act" caught `training.habit-kept`, which was declared in
`xp.ts` rather than in the registry and so survived the first two passes.

**A test moved rather than being deleted with its subject.**
`synchronise.test.ts` → "keeps both devices' ticks on the same habit" was
one of two records of the `unionDone` rule. It went, and the rule did not:
the vices' `spent` union test directly below it covers the same function,
which was checked before deleting rather than assumed.

**Both reloads are gone: the data is live, and a new build applies
itself.** Asked as _"could we make that live instead of a manual
reload"_ — two different reloads, and both were manual.

**`watchRecords` is one `onSnapshot` per collection**, not the single
beacon that used to exist. That beacon was telling the app _when to run
an exchange_; there is none now, so what a listener is for is knowing
which data went stale. Firestore bills the documents that changed rather
than the subscription, so for one person this is about a read per edit —
and a shared beacon would mean every write stamping it, which is
coupling bought for nothing.

**A local write is skipped, and that is the loop guard.** Saving raises
a snapshot on the writing device too; treating it as news would
invalidate the query that just wrote it, refetch, and do it again.
`hasPendingWrites` is Firestore’s own word for an unconfirmed local
write, and `fromCache` covers the first snapshot each listener delivers
from its own cache — the state the screen already has.

**It invalidates rather than writing snapshots into the cache.** Pushing
documents straight in would be a second road by which data reaches a
screen, one that knows nothing about the shaping every use case does on
the way out. Marking queries stale keeps one road in — and everything is
invalidated rather than a key per collection, because the Firestore
names and the query keys are different vocabularies and a map between
them is a third list to keep in step.

---

**The account is handed over during render, not in an effect, and that
cost a broken screen.** Reported with a screenshot: signed in, the app
up, and every data-backed card stuck as a skeleton — the portrait, the
traits, the buffs — while the quest slots, which need no data, drew
fine.

`AuthGate` set the holder in a `useEffect`. Effects run **after** the
commit, so on the first render where access is allowed every screen
below mounted and fired its queries against an empty holder. Each hit
`requireAccount`, threw, and with `retry: false` sat in error with
`data` undefined — which is the same state a card draws a skeleton for.
**An errored query and a loading one are indistinguishable to every
component here**, which is why it presented as a hang rather than as a
failure.

A write during render is normally the wrong shape and is right here for
the reason it is normally wrong: it has to happen before children
exist. It is idempotent and lands on a plain object rather than on React
state, so nothing re-renders and there is no order for two passes to
disagree about.

**`AuthGate.test.tsx` is the first component test in the app**, and it
earns its place by failing for the right reason: put the assignment back
in an effect and it goes red, because the child renders before the
holder is set. Verified in both directions rather than assumed.

**The wider fault is still open and worth naming.** Every card reads
`data === undefined` and draws a skeleton, so a genuinely failed
read — offline, or a rules refusal — is indistinguishable from a slow
one and waits forever. With the records in Firestore that is now a
network-shaped failure rather than an impossible one.

**Firestore is the source of truth now, and the whole exchange is
gone.** Asked for as _"let's just set up where we read from firestore …
and then we get rid of all this sync crap"_, after a seeding mishap made
the two-copy model cost more than it paid. The paragraphs below this one
describe the arrangement it replaced; they are kept because the reasoning
in them is still what makes the _merge_ rules right, and anybody
reintroducing two copies has to answer them again.

**`bootstrap` picks the store once**, on whether a Firebase project is
configured. With one, the record repositories are Firestore-backed; with
none they are the local IndexedDB ones, which is what a development build
without `.env.local` gets. That second path is kept on purpose — the app
has to be runnable with no account and no network — and `pnpm emulator`
covers the rest.

**Device state stays local either way.** The program position is the one
record with no correct last-write-wins answer, and the settings hold
preferences two machines legitimately disagree about. Neither belongs in
a shared store.

**The account arrives after the repositories exist**, which is why they
read an `AccountHolder` per call rather than taking a uid: `bootstrap`
runs before sign-in resolves. `AuthGate` sets it, and `decideAccess`
gained `requiresAccount` to hold every screen back until it has —
**unlike `gated`, which fails open deliberately, this one cannot**, because
signed out against Firestore there is no local database and every screen
would sit in front of repositories that can only throw.

**Driving it caught the sharpest version of that**: `bootstrap` read the
exercise count before sign-in, threw, and the app fell back to the
"storage is unavailable" screen — an accurate message about entirely the
wrong thing, on a device whose storage was fine. The read is skipped when
the store is remote; nothing but a log line used it.

**Gone:** `synchronise`, the payload and its unions, the cursor, the
beacon, `AutoSync`, `auto-sync-rules`, the Firestore sync target and the
null target, `SyncTarget`, `SyncState`, `SyncStateRepository` and the
store behind it. The Settings panel is **Account** now and has no button:
there is no exchange to trigger.

**`remove` and `purge` collapsed into one operation.** `purge` existed
only to delete without writing the tombstone that `remove` wrote, and
with one authoritative copy there are no tombstones — a delete is a
delete, and every device sees it on the next read.

**Tombstones are live on both paths, and the paragraph that used to sit
here said the opposite for several months.** It called them "vestigial
rather than removed" and noted, as though it were a tidy-up waiting to
happen, that on a Firestore-backed device nothing writes one. That
sentence described a **bug** and filed it as dead weight.

**The claim above — "with one authoritative copy there are no
tombstones" — is true of _sync_ and false of _import_.** A backup file is
a second copy of the database travelling through time. Delete a session,
import a backup taken before it, and the session comes back, counted as
an _addition_, because from the merge's point of view that is exactly
what it is. Firestore being authoritative does not help, because the
import writes **into** Firestore. That is the original bug this whole
concept exists for, reachable on the Firestore path the entire time it
was labelled vestigial.

`FirestoreCollectionDeps` carries a `TombstoneRepository` now, and it is
**required rather than optional** so a new collection cannot quietly skip
it — the compiler found all six construction sites the moment it changed.

**`buriedAs` is stated per collection, never inferred from the name.**
The two vocabularies genuinely differ — the review's snapshots live under
`metrics` and `snapshots` in Firestore and are buried as `reviews` — so a
name-matching rule would silently bury nothing for exactly the
collections whose names disagree. Same shape as the `KEYED_BY` map, and
`null` means "not merged, nothing to resurrect" explicitly rather than by
omission.

**The sink is the local store, not a Firestore one.** A tombstone answers
"was this deleted, or have I simply never seen it" for a backup being
imported _on this device_. The file is local, the import is local, the
question is local. Putting them in Firestore would make deletions travel,
which sync already does immediately by deleting the document.

**`watchRecords` takes `WatchDeps` instead**, being `firestore` and
`account` only. Watching never deletes, so asking it for a tombstone sink
would make a caller supply one to satisfy a type rather than because
anything reads it — and a dependency nothing reads is the first one to be
wired wrongly.

**The test that encoded the wrong belief was inverted, not deleted.**
`collection.emulator.test.ts` → "removes a record with no tombstone left
behind" is now "records a deletion so a later import cannot undo it", so
quietly restoring the old behaviour has to be said out loud. There is a
second one for the `null` case. Both run against a real Firestore.

**The lesson is about the label rather than the code.** "Vestigial" was
written once, from reasoning that sounded complete, and then repeated in
four documents and several status reports without anybody opening the
file. Nothing in the suite could contradict it, because the missing
behaviour had no test — an absence cannot fail. **A claim that something
is dead is a claim worth checking before it is repeated**, and the check
is one grep: who writes it, who reads it.

**Three things stopped travelling and are named here rather than
discovered.** The shared half of the settings — bodyweight, estimated
maxes, units, rounding — was the one part of `AppSettings` that used to
sync, and is now device-local like the rest. The fog is still IndexedDB,
so walked ground does not follow you between devices. And nothing pushes
a change to a screen that is already open: both devices read the same
collections, so a reload or any query refetch is current, but a live
`onSnapshot` is not wired yet.

**The seed was going to be a script and is not.** Writing to
`users/{uid}/…` needs `request.auth.uid` to be the owner, which means
either a Google sign-in or a service-account key that bypasses the rules
— neither of which an agent should be holding. The app's own **Import**
already writes through the repositories, so once they were
Firestore-backed it did the job with no new tooling. Verified by running
a real backup through `parseBackup` and `applyBackup` against the
emulator: preview valid with no problems, and every collection's count
round-tripped, including the two keyed by month.

**A beacon makes it live, and Firestore is still not the source of
truth.** Asked for as _"I want firestore to be the source of truth and
both apps can just read from it live."_ The second half is built; the
first was **deliberately not**, and the reason was put to the person
asking rather than decided quietly: this file opens with _"no server of
ours, and no database of ours… that constraint is the product"_, and
making Firestore authoritative would mean the app could not run without
it, local development included.

**What was built instead: one listener that says _when_, and the
exchange that still decides _what_.** `domain/sync/beacon.ts`, and
`watch` on `SyncTarget`. A pushing device stamps a single document at
`users/{uid}/meta/pulse`; the other device's `onSnapshot` fires and runs
the exchange it already had. **One subscription, not twenty-one** — a
listener per collection would cost reads on every change and would still
only be answering "should I sync now", which one document answers for
about one read per remote push.

**The merge stays where it is**, which is the point. Tombstones, the
grow-only fog and the three day-unioned records are the reason a
record-level winner is wrong here, and Firestore documents are
last-write-wins. Going Firestore-first means moving those onto
`arrayUnion` and rewriting twenty-three repositories; that is a real
option and it is a different week's work.

**The beacon is written only when something actually went up**, guarded
on `operations.length > 0`. That is what stops two devices pinging each
other forever: A pushes and B wakes, B has nothing of its own to send,
so B writes no beacon and A stays quiet.

**It is written after the batches commit and outside them.** It is a
notification about writes that have landed, so a beacon arriving first
would wake the other device to read a state that does not exist yet.

**`isRemoteBeacon` is a pure function with a test because it fails
silently both ways.** Too strict and the feature quietly does nothing
and the app is back to polling with nobody able to tell; too loose and
every push wakes the device that made it, which syncs, which pushes —
the same loop `SYNC_MUTATION_KEY` exists to prevent, arriving by another
route. It skips a pending write (our own echo), our own confirmed write,
and a missing document.

**No change to `firestore.rules` was needed**, which was checked rather
than assumed: `match /users/{userId}/{collection}/{document}` already
covers `meta/pulse`. A rules change is one of the things that stops and
asks.

**`PULL_INTERVAL_MS` went from 90 seconds to five minutes.** It stopped
being the mechanism and became the safety net — a target that cannot
watch, a dropped listener, a build with no project. Attaching the
listener also delivers the current beacon, so a device coming back
catches up without waiting for either.

**The listener cannot be exercised without signing in, so it ships on
reasoning and a green build** — the same honest caveat the service
worker carries. What was verified locally: the app renders and the
console is clean with the code in place, the null target's missing
`watch` is handled, and the Settings copy no longer says _"Nothing syncs
on its own"_, which had been false since the previous commit.

**Sync runs itself now, and that reverses the rule that made it a
button.** `useSync` said so in as many words: _"a sync that runs on a
timer is a sync that runs while a set is being logged, and the one thing
this app must never do is surprise someone mid-session."_ Asked for as
_"synced live both ways instead of relying on a manual push"_, once the
app went onto a desktop as well as a phone.

**The objection is answered rather than overruled.** `mayExchange`
refuses while a workout is open, so the timer cannot fire during the one
activity it would interrupt. **Not knowing counts as open** — the query
resolves a tick after mount, and guessing "no" for that tick guesses
wrong in the only direction that costs anything. The manual button stays,
because an update path with no override cannot be debugged from the far
end of a phone.

**Three triggers, each answering a different question.** Becoming visible
is "I have just walked up to this device" and is the one that matters
most; a settled local mutation schedules a debounced push at
`PUSH_DEBOUNCE_MS`; an interval at `PULL_INTERVAL_MS` runs **only while
visible**, which is what keeps it from being a background poller. `online`
is not a trigger of its own — it almost always coincides with becoming
visible, and the exchange is a no-op offline.

**It reuses `synchronise` rather than listening to Firestore.** A live
listener per collection would be twenty-four subscriptions and a second
merge path, where the existing exchange is tested, handles tombstones and
the grow-only fog, and carries a cursor. What makes it feel live is
_when_ it runs, not how it reads.

**An exchange must not count as a local change, and this would have been
a silent money leak.** The exchange is itself a mutation, so a debounce
firing on any settled mutation schedules the next sync from the last
one's completion — every four seconds, for as long as the app is open,
burning Firestore reads and **looking exactly like sync working
properly**. `SYNC_MUTATION_KEY` is what tells them apart. Caught by
reasoning about the subscription before shipping, not by a test.

**Both rules are pure functions in `auto-sync-rules.ts` with tests
beside them**, split out of the component for one reason: each fails
**silently**. A guard that fails open syncs mid-session; a trigger that
fails open syncs forever. Neither throws, neither logs, and a component
cannot be tested for either without a browser.

---

**Supplements are a restorative, which reverses a rule written here.**
That rule said creatine is a thing you take once a day and either did or
did not — a daily with a streak — and that a pool of capacity one with
no unit is a habit wearing a pool's clothes. Both halves were right and
one of them stopped mattering: **the health bar did not exist when it
was written.** A restorative now does something a habit cannot, which is
put health back, and a supplement is the clearest case of a thing taken
to that end. Asked for as _"supplements: add these to the restoratives
section instead."_

**One pool of three rather than three pools of one, and the reason is
the bar rather than tidiness.** Vitality reads targets met over targets
possible, so three supplement rows beside water and two servings would
make supplements **three fifths of a day's health** — a morning of pills
outweighing everything else being kept. As one row it is one target
among four, and three taps either way.

**The three things done around a session are habits, not slots.** Asked
for as _"it shouldn't be within the workout since the exact timing can
vary… it doesn't make sense to keep the lift open if walking the dog
happens three hours later."_ Exactly the distinction `RecordHome`
`training` exists for: a slot is ticked inside an open session, so
anything answered hours later either holds the session open or is lost,
where a habit is answered whenever it happens and still lands on the
right day.

`TRAINING_SUGGESTIONS` on the Train screen offers pre-workout carbs,
post-workout protein and thirty minutes of cardio, filtered by **name
not already used** — the rule every other suggestion list here follows,
so adding the first does not take the other two away. The days stay the
lifter's to pick, for the reason that screen's empty state already
gives: the app knows how many days a week you train, not which ones.

**The cardio one is why the conditioning block left the upper days.** A
thirty-minute walk that doubles as walking the dog is a real dose and is
not something the session should be waiting on. It pays
`training.habit-kept` and therefore **Strength rather than Stamina** —
Stamina is fed by `cardio.session-logged`, which fires on a completed
session containing a completed conditioning set, and a habit is not a
session. Moving it would mean a new `RecordHome`, which is a registry
area, an act, a branch in `tallyActs` and a line in the "exactly one
side" test. Worth knowing the bar reads lower until somebody takes that
decision deliberately.

**A suggestion reaches nobody who already has the habit under another
name.** The three existed on the reporting device as _Preworkout Carbs_
and _Postworkout Protien_, so the filter does not match them and both
chips are still offered — two records of one intention. Renaming the
stored ones is the way across; nothing migrates, the rule
`SETTINGS_SCHEMA_VERSION` exists for.
