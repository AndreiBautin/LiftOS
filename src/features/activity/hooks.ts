import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useServices } from '@/app/context'
import {
  logActivity,
  removeActivity,
  restoreActivity,
  type ActivityInput,
} from '@/application/use-cases/training/log-activity'
import type { ActivityEntry, ActivityId } from '@/domain/logging/activity'

const KEY = ['activities'] as const

/** Every casual activity on this device, oldest day first. */
export function useActivities() {
  const services = useServices()
  return useQuery({ queryKey: KEY, queryFn: () => services.activities.all() })
}

export function useLogActivity() {
  const services = useServices()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ActivityInput) => logActivity(services, input),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRemoveActivity() {
  const services = useServices()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: ActivityId) => removeActivity(services, id),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRestoreActivity() {
  const services = useServices()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (entry: ActivityEntry) => restoreActivity(services, entry),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
  })
}
