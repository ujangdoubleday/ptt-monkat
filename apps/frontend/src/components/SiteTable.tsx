import type { SiteRow } from '@/lib/sites'
import { METRICS, formatMetric, statusOf, type Status } from '@/lib/thresholds'

/**
 * Severity uses redundant cues: text color, tint, outline, weight, and the
 * row-level status dot. Hue is never the only signal.
 */
const CELL: Record<Status, string> = {
  ok: 'bg-grade-ok/8 text-grade-ok',
  warn: 'bg-grade-warn/16 text-grade-warn font-medium ring-1 ring-inset ring-grade-warn/25',
  crit: 'bg-grade-crit/20 text-grade-crit font-semibold ring-1 ring-inset ring-grade-crit/30',
  none: 'text-muted-foreground/45',
}

const DOT: Record<Status, string> = {
  ok: 'bg-grade-ok',
  warn: 'bg-grade-warn',
  crit: 'site-critical-dot bg-grade-crit',
  none: 'bg-state-silent',
}

export function SiteTable({ sites }: { sites: SiteRow[] }) {
  return (
    // h-full + fixed layout: rows share the column's height evenly, so the
    // table fills the screen exactly instead of leaving a gap or overflowing.
    <table className="tabular h-full w-full table-fixed border-collapse text-[11px] leading-none">
      <colgroup>
        <col className="w-[26%]" />
        {METRICS.map((m) => (
          <col key={m.key} className="w-[14.8%]" />
        ))}
      </colgroup>

      <thead>
        <tr className="border-border border-b">
          <th className="text-muted-foreground pb-1 text-left font-medium">Site</th>
          {METRICS.map((m) => (
            <th key={m.key} className="text-muted-foreground pb-1 pr-1 text-right font-medium">
              {m.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {sites.map((site) => (
          <tr key={site.site} className="site-row border-border/40 border-b last:border-0">
            <td className="truncate pr-2 font-medium" title={site.site}>
              <span
                aria-hidden="true"
                className={`mr-1.5 inline-block size-1.5 rounded-full ${DOT[site.worst]}`}
              />
              {site.site}
            </td>
            {METRICS.map((m) => {
              const value = site.values[m.key]
              const status = statusOf(m.key, value)
              return (
                <td
                  key={m.key}
                  className={`site-reading rounded-[2px] pr-1 text-right ${CELL[status]}`}
                >
                  {formatMetric(m.key, value)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
