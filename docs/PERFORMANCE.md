# Performance

Measured with `pnpm build && node scripts/chunk-sizes.mjs` (raw / gzip).
Each change records its before and after; a change that moved nothing is
reverted rather than listed.

| Change                                                          | Entry chunk         |
| --------------------------------------------------------------- | ------------------- |
| Baseline                                                        | 522.4 kB / 158.9 kB |
| Home cards below the fold and the session player load on demand | 386.9 kB / 121.9 kB |

What is left in the entry chunk is mostly framework: React DOM, React
Router, TanStack Query and the IndexedDB layer the first screen reads
through. The hero, the plan and the week stay eager because they are the
first screen on a phone. The session report stays eager on purpose: it is
entered through a view transition run inside `flushSync`, and a lazy
component would suspend in the middle of it.
