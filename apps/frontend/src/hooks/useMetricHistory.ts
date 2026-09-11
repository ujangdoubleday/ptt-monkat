import { useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS, type MetricSample, type Range } from '@/lib/metrics'

async function fetchHistory(
  targetId: number,
  range: Range,
  signal: AbortSignal,
): Promise<MetricSample[]> {
  const params = new URLSearchParams({ target_id: String(targetId), range })
  const response = await fetch(`/api/metrics/history?${params}`, { signal })

  if (!response.ok) {
    throw new Error(`API responded ${response.status}`)
  }

  return response.json() as Promise<MetricSample[]>
}

/**
 * History for one target. The backend aggregates server-side, so every range
 * comes back around 100 points no matter how long it is.
 */
export function useMetricHistory(targetId: number | null, range: Range) {
  return useQuery({
    queryKey: ['snmp', 'metrics', 'history', targetId, range],
    queryFn: ({ signal }) => fetchHistory(targetId!, range, signal),
    enabled: targetId !== null,
    refetchInterval: POLL_INTERVAL_MS,
  })
}
