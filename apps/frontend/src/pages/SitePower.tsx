import { PageNav } from '@/components/PageNav'
import { SiteTable } from '@/components/SiteTable'
import { useNow } from '@/hooks/useNow'
import { useSnmpMetrics } from '@/hooks/useSnmpMetrics'
import { relativeAge } from '@/lib/metrics'
import { countByStatus, intoColumns, pivotSites } from '@/lib/sites'

const COLUMNS = 3

export function SitePower({ route }: { route: string }) {
  const { data, isPending, isError, error, isFetching } = useSnmpMetrics()

  const now = useNow()

  const sites = pivotSites((data ?? []).filter((m) => m.category === 'power'))
  const counts = countByStatus(sites)
  const columns = intoColumns(sites, COLUMNS)

  // Newest reading anywhere on the page. Between refetches this is the only
  // thing that tells an operator the screen is still live.
  const newest = sites.reduce<number | null>(
    (max, s) => (s.lastSeen !== null && (max === null || s.lastSeen > max) ? s.lastSeen : max),
    null,
  )

  return (
    // h-svh + overflow-hidden: the whole point of this page is that it never
    // scrolls. Anything that does not fit is the layout's problem, not the
    // operator's.
    <div className="site-page flex h-svh flex-col overflow-hidden px-4 py-3">
      <header className="mb-2 flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-semibold tracking-tight">Site power</h1>
          <span className="text-muted-foreground text-xs">{sites.length} sites, DC plant</span>
          {newest && (
            <span className="tabular text-muted-foreground text-xs">
              {relativeAge(new Date(newest).toISOString(), now)}
            </span>
          )}
        </div>

        {/* The counts are what an operator reads first, so they are the
            largest thing here — larger than the page title. */}
        <div
          className={`flex items-baseline gap-5 transition-opacity ${
            isFetching ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <Count label="critical" value={counts.crit} tone="text-grade-crit" critical />
          <Count label="warning" value={counts.warn} tone="text-grade-warn" />
          <Count label="normal" value={counts.ok} tone="text-grade-ok" />
          <PageNav route={route} />
        </div>
      </header>

      {isError ? (
        <Panel>
          Can't reach the monitoring API. The Go server on port 3000 may be down.
          <span className="text-muted-foreground block text-xs">{error.message}</span>
        </Panel>
      ) : isPending ? (
        <Panel>Loading site readings…</Panel>
      ) : sites.length === 0 ? (
        <Panel>
          No power sites configured. Load{' '}
          <span className="tabular">db/003_site_power.sql</span> to add them.
        </Panel>
      ) : (
        // Capped width: past ~1700px the columns stretch into gaps instead of
        // getting denser, and the eye has to travel from a site name to its
        // numbers.
        <div className="mx-auto grid min-h-0 w-full max-w-[1700px] flex-1 grid-cols-1 gap-x-5 lg:grid-cols-3">
          {columns.map((column, i) => (
            // Each column clips independently, so a short viewport never
            // gives the page itself a scrollbar.
            <div
              key={i}
              className={`site-column min-h-0 overflow-hidden ${i > 0 ? 'lg:border-border/70 lg:border-l lg:pl-5' : ''}`}
            >
              <SiteTable sites={column} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Count({
  label,
  value,
  tone,
  critical,
}: {
  label: string
  value: number
  tone: string
  critical?: boolean
}) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span
        aria-hidden="true"
        className={`size-1.5 self-center rounded-full bg-current ${tone} ${critical ? 'site-critical-dot' : ''}`}
      />
      <span className={`tabular text-lg leading-none font-semibold ${tone}`}>
        {value}
      </span>
      <span className="text-muted-foreground text-[11px]">{label}</span>
    </p>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center text-sm">
      <p className="max-w-sm text-center">{children}</p>
    </div>
  )
}
