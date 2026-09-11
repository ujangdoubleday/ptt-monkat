import { describe, expect, it } from 'vitest'
import type { LatestMetric } from './metrics'
import { countByStatus, intoColumns, pivotSites } from './sites'
import { formatMetric, statusOf, worstStatus } from './thresholds'

function row(over: Partial<LatestMetric>): LatestMetric {
  return {
    target_id: 1,
    device_name: 'Waingapu',
    ip_address: '127.0.0.1',
    oid: '1.3.6.1.4.1.99999.10.1.1',
    metric_name: 'BVolt',
    unit: 'V',
    category: 'power',
    value: 52,
    timestamp: '2026-09-11T08:00:00Z',
    ...over,
  }
}

describe('statusOf', () => {
  it('grades battery voltage at the band edges', () => {
    expect(statusOf('BVolt', 50.0)).toBe('ok')
    expect(statusOf('BVolt', 49.99)).toBe('warn')
    expect(statusOf('BVolt', 48.5)).toBe('warn')
    expect(statusOf('BVolt', 48.49)).toBe('crit')
  })

  it('grades capacity and temperature in opposite directions', () => {
    expect(statusOf('BCap', 95)).toBe('ok')
    expect(statusOf('BCap', 81)).toBe('crit') // Repeater B13 in the real data
    expect(statusOf('Temp', 30)).toBe('ok')
    expect(statusOf('Temp', 33.2)).toBe('warn')
    expect(statusOf('Temp', 41)).toBe('crit')
  })

  it('grades mains voltage on both sides', () => {
    expect(statusOf('PLN', 221)).toBe('ok')
    expect(statusOf('PLN', 190)).toBe('warn') // Manokwari
    expect(statusOf('PLN', 189)).toBe('crit')
    expect(statusOf('PLN', 251)).toBe('crit')
  })

  it('never grades a missing sensor as an alarm', () => {
    // The dangerous failure: a dash reading as critical and drowning the page.
    expect(statusOf('PLN', null)).toBe('none')
    expect(statusOf('Temp', undefined)).toBe('none')
    expect(formatMetric('PLN', null)).toBe('–')
  })

  it('leaves load unthresholded — it is a draw, not a verdict', () => {
    expect(statusOf('Load', 0.4)).toBe('ok')
    expect(statusOf('Load', 96)).toBe('ok')
  })
})

describe('worstStatus', () => {
  it('ranks crit over warn over ok over none', () => {
    expect(worstStatus(['ok', 'warn', 'crit'])).toBe('crit')
    expect(worstStatus(['ok', 'warn', 'none'])).toBe('warn')
    expect(worstStatus(['none', 'none'])).toBe('none')
    expect(worstStatus([])).toBe('none')
  })
})

describe('pivotSites', () => {
  it('collapses one row per metric into one row per site', () => {
    const sites = pivotSites([
      row({ target_id: 1, metric_name: 'BVolt', value: 52 }),
      row({ target_id: 2, metric_name: 'BCap', value: 100 }),
      row({ target_id: 3, device_name: 'Sugapa', metric_name: 'BVolt', value: 49.39 }),
    ])

    expect(sites.map((s) => s.site)).toEqual(['Waingapu', 'Sugapa'])
    expect(sites[0].values).toEqual({ BVolt: 52, BCap: 100 })
    expect(sites[0].worst).toBe('ok')
    expect(sites[1].worst).toBe('warn')
  })

  it('leaves absent metrics absent rather than zero', () => {
    const [site] = pivotSites([row({ metric_name: 'BVolt', value: 50.31 })])
    expect(site.values.PLN).toBeUndefined()
    expect(formatMetric('PLN', site.values.PLN)).toBe('–')
  })

  it('takes the newest timestamp across the site metrics', () => {
    const [site] = pivotSites([
      row({ target_id: 1, timestamp: '2026-09-11T08:00:00Z' }),
      row({ target_id: 2, metric_name: 'BCap', timestamp: '2026-09-11T08:05:00Z' }),
      row({ target_id: 3, metric_name: 'Temp', timestamp: null, value: null }),
    ])
    expect(site.lastSeen).toBe(Date.parse('2026-09-11T08:05:00Z'))
  })
})

describe('intoColumns', () => {
  it('splits 87 sites into three near-equal columns with nothing lost', () => {
    const items = Array.from({ length: 87 }, (_, i) => i)
    const cols = intoColumns(items, 3)
    expect(cols.map((c) => c.length)).toEqual([29, 29, 29])
    expect(cols.flat()).toEqual(items)
  })

  it('does not drop the remainder on an uneven split', () => {
    const cols = intoColumns([1, 2, 3, 4, 5], 3)
    expect(cols.flat()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('countByStatus', () => {
  it('counts each site once, by its worst metric', () => {
    const counts = countByStatus([
      { site: 'a', values: {}, worst: 'crit', lastSeen: null },
      { site: 'b', values: {}, worst: 'warn', lastSeen: null },
      { site: 'c', values: {}, worst: 'ok', lastSeen: null },
      { site: 'd', values: {}, worst: 'ok', lastSeen: null },
    ])
    expect(counts).toEqual({ crit: 1, warn: 1, ok: 2, none: 0 })
  })
})
