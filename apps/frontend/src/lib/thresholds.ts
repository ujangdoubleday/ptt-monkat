/**
 * DC power plant thresholds for a 48V telecom site.
 *
 * All the tuning lives here — change these numbers and every cell on the
 * site page re-grades. Nothing else needs reading.
 */

export type Metric = 'BVolt' | 'BCap' | 'Load' | 'Temp' | 'PLN'
export type Status = 'ok' | 'warn' | 'crit' | 'none'

/** Column order on the page, with the unit and how many decimals to show. */
export const METRICS: { key: Metric; label: string; decimals: number }[] = [
  { key: 'BVolt', label: 'BVolt(V)', decimals: 2 },
  { key: 'BCap', label: 'BCap(%)', decimals: 2 },
  { key: 'Load', label: 'Load(A)', decimals: 1 },
  { key: 'Temp', label: 'Temp(C)', decimals: 1 },
  { key: 'PLN', label: 'PLN(V)', decimals: 0 },
]

/**
 * Bands are expressed as the edges of the OK region and the edges of the
 * tolerable region. Load carries no threshold: it is how much the site draws,
 * not a verdict on its health.
 */
const BANDS: Partial<Record<Metric, { okLo?: number; okHi?: number; warnLo?: number; warnHi?: number }>> =
  {
    BVolt: { okLo: 50.0, warnLo: 48.5 },
    BCap: { okLo: 95, warnLo: 85 },
    Temp: { okHi: 30, warnHi: 40 },
    PLN: { okLo: 200, okHi: 240, warnLo: 190, warnHi: 250 },
  }

/**
 * A missing reading is 'none', never 'crit'. The site has no such sensor —
 * most repeaters have no mains feed at all — and painting that red would
 * train operators to ignore red.
 */
export function statusOf(metric: Metric, value: number | null | undefined): Status {
  if (value === null || value === undefined || Number.isNaN(value)) return 'none'

  const band = BANDS[metric]
  if (!band) return 'ok' // Load, and anything unthresholded.

  const { okLo, okHi, warnLo, warnHi } = band

  const belowOk = okLo !== undefined && value < okLo
  const aboveOk = okHi !== undefined && value > okHi
  if (!belowOk && !aboveOk) return 'ok'

  const belowWarn = warnLo !== undefined && value < warnLo
  const aboveWarn = warnHi !== undefined && value > warnHi
  return belowWarn || aboveWarn ? 'crit' : 'warn'
}

const SEVERITY: Record<Status, number> = { none: 0, ok: 1, warn: 2, crit: 3 }

/** The worst status in a set, for rolling a site up to one verdict. */
export function worstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>(
    (worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst),
    'none',
  )
}

export function formatMetric(metric: Metric, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  const spec = METRICS.find((m) => m.key === metric)
  return value.toFixed(spec ? spec.decimals : 2)
}
