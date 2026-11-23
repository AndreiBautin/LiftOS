import { useSettings } from '@/app/context'
import { judgesProgramme } from '@/domain/settings/settings'

import { FlexibleToday } from './FlexibleToday'
import { HomePage } from './HomePage'

/**
 * `/today`: the quick log by default, the classic programme-first page when
 * the lifter has chosen "Programme first" in Settings. One setting, nothing
 * migrated, and both pages read the same records, so switching either way
 * loses nothing. The programme page is always at `/routines` as well.
 */
export function TodayPage() {
  const { settings } = useSettings()
  return judgesProgramme(settings) ? <HomePage /> : <FlexibleToday />
}
