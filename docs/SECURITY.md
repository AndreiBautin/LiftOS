# Security

## Threat model first

Most of a web security checklist does not apply here, and saying which
parts are _structurally absent_ is more useful than a list of items
marked N/A.

LiftOS is a static bundle. It has:

- **no server**, so no server-side vulnerability class exists;
- **no API of its own**, so no CSRF, no server-side injection, no
  insecure CORS, no API authentication to get wrong;
- **no accounts, sessions, cookies or passwords**, so no session fixation
  and no password storage;
- **no database engine**, so no SQL injection;
- **no content shared between users**, because there is exactly one user
  and no channel between users.

The one outbound request is **optional sync**, to GitHub, with a token
the lifter pastes in themselves; it is covered below. The app used to
fetch map tiles and geocoding from OpenStreetMap as well, and that went
with the map when the app narrowed to training.

What remains is a much shorter list.

## What actually applies

### The trust boundary is the import file

Data enters this app from exactly one place the lifter does not fully
control: a backup file chosen from the filesystem. It may be truncated,
hand-edited, from a future version, or not a backup at all.

Everything is validated before a single record reaches the database
(`domain/backup/envelope.ts`): a magic marker, a schema version checked
against a ceiling, every section's presence and shape, and an integrity
checksum over the contents.

The validator deliberately reads the parsed JSON as
`Record<string, unknown>` rather than asserting it is already the
expected type. Declaring untrusted input to be the shape you hope for is
how a validator ends up "checking" conditions the compiler has decided
cannot fail — and the compiler will happily delete those checks from your
attention by flagging them as unnecessary.

An import shows a preview before writing anything, and the destructive
option requires typing a confirmation word.

### The sync file is a second import

It arrives from a repository anyone with write access can edit, and it
goes through the same envelope checks as a backup — plus two more that
apply to both:

- **Each record is checked**, not only the envelope
  (`domain/backup/plausible.ts`). A workout whose `entries` was not a list
  used to merge in, sync to every device, and break the history on all of
  them. Workouts and exercises are read as `unknown` against the fields
  screens rely on; one that fails is left out with a warning rather than
  refusing the whole file. A test holds that every record the demo seed
  writes passes, so the check cannot quietly drop real data.
- **Size is bounded.** Either file over 20 MB is refused by `File.size`
  (or the response's declared length) before it is read.

### The address the token is sent to

`checkTarget` in `infrastructure/sync/github-file.ts` checks the owner,
the repository and every path segment before any request. Encoding a
segment does not neutralise `..` — the URL parser resolves dot segments —
so an unchecked path such as `../../user` sent the token to other GitHub
endpoints.

### The CSV export

Notes and exercise names are free text that can arrive from another app
or the sync file. A cell starting with `=`, `+`, `-`, `@`, a tab or a
carriage return runs as a formula when the export is opened in a
spreadsheet, so such a cell leads with an apostrophe; numbers are left
alone.

### XSS

React escapes by default. The app contains no `dangerouslySetInnerHTML`,
no `eval`, and no dynamic script construction. Exercise names and notes
render as text.

### Personal data in logs

This is a health and fitness app; its data is personal. All logging goes
through one sink (`shared/logging/logger.ts`) whose field type is
`Record<string, string | number | boolean | null | undefined>` — event
names and scalars, never a set, a weight, a note, or a program name. An
ESLint rule forbids `console` everywhere else, so the guarantee cannot be
bypassed by accident rather than only by policy.

Error handling follows the same rule: the error boundary shows a
recoverable screen and no internals, and stack traces render only in
development.

### Dependency supply chain

`pnpm audit --audit-level high` runs on every push, weekly on a schedule,
and on demand. Gated at `high` deliberately — a personal app blocked by a
moderate advisory in a transitive build-time dependency teaches nothing,
and a gate people learn to ignore is not a gate.

Dependabot groups routine bumps into one weekly PR and keeps majors
separate so they get read rather than rubber-stamped.

**Every workflow action is pinned to a commit**, with its version in a
comment. A tag can be moved to different code by whoever controls the
action's repository, and the deploy job can publish the site; a commit
cannot be moved. Dependabot's github-actions updates keep the pins
current.

**A dev dependency must pass the same audit as a shipped one.**
`puppeteer-core` was added for the timing script once and pulled in two
packages with high advisories, one with no patched release; it now lives
outside the repository (`scripts/perf/measure.mjs` says how).

### The sync token

Sync reads and writes one backup file in a private GitHub repository the
lifter owns, using a token they create and paste in. It is the only
credential the app ever holds, and two rules keep it contained:

- **It lives under one `localStorage` key**
  (`STORAGE_KEYS.githubSync`) and is never part of `AppSettings`.
  Settings travel inside the backup, and the backup is the file written
  to the repository — a token in settings would be committed into the
  very file it guards.
- **It never reaches the log.** The logger takes scalars and event names,
  and the token is neither.
- **It is in no backup** — held by a test (`backup-service.test.ts` →
  "the sync token") that stores a real config beside the data and asserts
  no backup contains it.
- **The service worker never caches a GitHub response.** Its only route
  is the navigation fallback, the API calls are cross-origin and sent
  `cache: 'no-store'`.

The demo build ships no token and cannot sync, which is the point: a
visitor's browser has nothing to leak.

### Secrets

There are none in the repository, and it has never contained one. `gitleaks`
scans the full history in CI to keep it that way.

Every environment variable is `VITE_`-prefixed, which in Vite means
_compiled into the public bundle_. `.env.example` says so explicitly, so
nobody later assumes the prefix hides anything.

## Deployment posture

GitHub Pages serves over HTTPS, which a service worker requires anyway.

Pages does not permit custom response headers, so the
Content-Security-Policy travels as a `<meta http-equiv>` tag, added to the
build by a plugin in `vite.config.ts` (the dev server needs inline scripts
and a websocket, so it gets none).

**This reverses a decision recorded here earlier**, which declined a meta
CSP for three reasons. Two are still true and one was checked away:

- It cannot express `frame-ancestors` — still true, and still acceptable:
  a page framing this one would show the visitor their own data.
- It "looks like protection while providing little" — no longer true once
  the app held a credential. The sync token sits in `localStorage`, and
  the policy is what stops a script that should never have run from
  reading it _and sending it anywhere_: scripts are this origin's own
  files, nothing inline, and `connect-src` names only `api.github.com`.
  Checked by injecting an inline script and a fetch to another host —
  both refused, both reported.
- It is "easy to write in a form that silently blocks the service
  worker" — true in general, and checked here: under the policy the
  worker registers and controls the page, fifteen screens, the share
  picture and a full session raise no violations, and both fonts load.

What keeps it from silently going missing is `pnpm check:csp`, in
`verify` and CI: no policy, an `unsafe-inline` script source, or an
inline `<script>` in the built page fails the gate.

## Remaining risks, stated plainly

- **Physical device access.** Anyone who can unlock the phone can read
  the training history. There is no app-level lock. For sets and reps
  that is a proportionate trade; if the data were medical it would not be.
- **A malicious backup file** could fill storage with junk. It cannot
  execute anything — the file is data, parsed by `JSON.parse`, every
  field validated — but a lifter importing a file from someone else
  should expect it to replace their training history, because that is what import
  does.
- **No `frame-ancestors`, and no CSP reporting**, which a meta policy
  cannot carry.
- **The token at rest.** Browser storage has no secret store a web app
  can use, and encrypting the token with a key kept beside it would be
  theatre. The CSP limits who could read it; a fine-grained token limits
  what it is worth, and the connect form warns when a classic one —
  which reaches every repository on the account — is pasted.
- **No integrity protection against a compromised host.** If GitHub Pages
  served a modified bundle, the service worker would cache it. This is
  true of every static site and is not separately mitigable here.

## Reporting a problem

Open a private security advisory on the repository (Security → Report a
vulnerability), or an ordinary issue if it is not sensitive.
