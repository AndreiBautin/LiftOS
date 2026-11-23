import type {
  ActivityRepository,
  Clock,
  SettingsRepository,
  WorkoutRepository,
} from '@/domain/repositories/ports'
import type { IdGenerator } from '@/domain/ids/ids'

/** What the demo seed writes through: a training history and one setting. */
export interface DemoDeps {
  readonly workouts: WorkoutRepository
  readonly settings: SettingsRepository
  /** Casual activity; absent in fixtures that only check the sessions. */
  readonly activities?: ActivityRepository
  readonly clock: Clock
  readonly ids: IdGenerator
}
