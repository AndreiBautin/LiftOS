/**
 * How long ago an instant was, in the fewest characters that still say it:
 * "now", "4m", "2h", "3d". For a status that sits in a corner and is read
 * at a glance; a sentence goes in its accessible name instead.
 */
export function agoLabel(then: Date, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - then.getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${String(minutes)}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)}h`
  return `${String(Math.floor(hours / 24))}d`
}
