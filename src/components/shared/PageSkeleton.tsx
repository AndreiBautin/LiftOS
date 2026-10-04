import { PageHeader } from './PageHeader'
import { Skeleton } from './Skeleton'

/**
 * A page while its records load: the real header, then the shapes every
 * one of these pages opens on — a hero panel and two cards. It replaced
 * a header over the word "Loading…", which drew a blank screen that
 * filled in a beat later and pushed everything below it down a screen.
 *
 * The heading is real so a screen reader lands on the page it asked
 * for; the hero carries the one polite "Loading" announcement.
 */
export function PageSkeleton({ title }: { readonly title: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <PageHeader title={title} />
      <Skeleton className="h-44 rounded-3xl" label="Loading" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  )
}
