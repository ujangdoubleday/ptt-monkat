import type { LatestMetric } from '@/lib/metrics'
import { statusOf, worstStatus, type Metric, type Status } from '@/lib/thresholds'

export interface SiteRow {
  site: string
  values: Partial<Record<Metric, number | null>>
  /** Worst status across this site's metrics — drives the summary counts. */
  worst: Status
  /** Newest reading across this site's metrics, for the staleness check. */
  lastSeen: number | null
}

/**
 * Pivots the flat API rows into one row per site.
 *
 * A metric a site has no sensor for simply has no row in snmp_targets, so it
 * is absent here too and renders as a dash. Insertion order is preserved, and
 * the backend already sorts by device_name, so sites come out alphabetically.
 */
export function pivotSites(rows: LatestMetric[]): SiteRow[] {
  const sites = new Map<string, SiteRow>()

  for (const row of rows) {
    let site = sites.get(row.device_name)
    if (!site) {
      site = { site: row.device_name, values: {}, worst: 'none', lastSeen: null }
      sites.set(row.device_name, site)
    }

    site.values[row.metric_name as Metric] = row.value

    if (row.timestamp) {
      const t = Date.parse(row.timestamp)
      if (!Number.isNaN(t) && (site.lastSeen === null || t > site.lastSeen)) {
        site.lastSeen = t
      }
    }
  }

  for (const site of sites.values()) {
    site.worst = worstStatus(
      Object.entries(site.values).map(([metric, value]) =>
        statusOf(metric as Metric, value),
      ),
    )
  }

  return [...sites.values()]
}

/** Splits sites into `count` near-equal columns, preserving order down each. */
export function intoColumns<T>(items: T[], count: number): T[][] {
  const perColumn = Math.ceil(items.length / count)
  return Array.from({ length: count }, (_, i) =>
    items.slice(i * perColumn, (i + 1) * perColumn),
  )
}

export function countByStatus(sites: SiteRow[]): Record<Status, number> {
  const counts: Record<Status, number> = { ok: 0, warn: 0, crit: 0, none: 0 }
  for (const site of sites) counts[site.worst]++
  return counts
}
