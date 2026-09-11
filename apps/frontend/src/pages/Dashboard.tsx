import { useState } from 'react'
import { MetricCard } from '@/components/MetricCard'
import { MetricChart } from '@/components/MetricChart'
import { PageNav } from '@/components/PageNav'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useMetricHistory } from '@/hooks/useMetricHistory'
import { useNow } from '@/hooks/useNow'
import { useSnmpMetrics } from '@/hooks/useSnmpMetrics'
import {
  POLL_INTERVAL_MS,
  RANGES,
  countLive,
  groupByDevice,
  relativeAge,
  type LatestMetric,
  type Range,
} from '@/lib/metrics'

export function Dashboard({ route }: { route: string }) {
  const { data, isPending, isError, error, isFetching, refetch } = useSnmpMetrics()
  const now = useNow()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [range, setRange] = useState<Range>('15m')

  // Site power targets live on their own page — without this filter the card
  // grid would try to render ~340 of them.
  const metrics = (data ?? []).filter((m) => m.category !== 'power')
  const groups = groupByDevice(metrics)
  const live = countLive(metrics, now)

  // Default to the first target that is actually reporting — selecting a
  // silent one would open an empty chart.
  const selected =
    metrics.find((m) => m.target_id === selectedId) ?? metrics.find((m) => m.value !== null) ?? null

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-10 sm:px-8">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">ptt-monkat</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            SNMP device monitoring, polling every {POLL_INTERVAL_MS / 1000}s
          </p>
        </div>

        <div className="flex items-center gap-4">
          {metrics.length > 0 && (
            <p
              className={`tabular text-muted-foreground text-sm transition-opacity ${
                isFetching ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {live} of {metrics.length} reporting
            </p>
          )}
          <PageNav route={route} />
        </div>
      </header>

      {isPending ? (
        <LoadingGrid />
      ) : isError ? (
        <ApiUnreachable message={error.message} onRetry={() => refetch()} />
      ) : groups.length === 0 ? (
        <NoTargets />
      ) : (
        <>
          {selected && (
            <ChartPanel metric={selected} range={range} onRangeChange={setRange} now={now} />
          )}

          <div className="space-y-9">
            {groups.map((group) => (
              <section key={group.deviceName}>
                <div className="border-border mb-3 flex items-baseline justify-between gap-4 border-b pb-2">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-medium">{group.deviceName}</h2>
                    <span className="tabular text-muted-foreground text-sm">{group.ipAddress}</span>
                  </div>
                  <span className="tabular text-muted-foreground text-xs">
                    {countLive(group.metrics, now)} of {group.metrics.length} reporting
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.metrics.map((metric) => (
                    <MetricCard
                      key={metric.target_id}
                      metric={metric}
                      now={now}
                      selected={selected?.target_id === metric.target_id}
                      onSelect={() => setSelectedId(metric.target_id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ChartPanel({
  metric,
  range,
  onRangeChange,
  now,
}: {
  metric: LatestMetric
  range: Range
  onRangeChange: (r: Range) => void
  now: number
}) {
  const { data, isPending, isError } = useMetricHistory(metric.target_id, range)

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          {/* One series, so the heading is the legend. */}
          <h2 className="font-medium">
            {metric.metric_name}{' '}
            <span className="text-muted-foreground font-normal">on {metric.device_name}</span>
          </h2>
          <span className="tabular text-muted-foreground text-xs">
            {relativeAge(metric.timestamp, now)}
          </span>
        </div>

        <div className="flex gap-1" role="group" aria-label="Chart range">
          {RANGES.map((key) => (
            <Button
              key={key}
              variant={key === range ? 'secondary' : 'ghost'}
              size="sm"
              className="tabular h-7 px-2.5 text-xs"
              aria-pressed={key === range}
              onClick={() => onRangeChange(key)}
            >
              {key}
            </Button>
          ))}
        </div>
      </div>

      <Card className="bg-muted/40 rounded-sm border-0 py-4 pr-4 pl-0 shadow-none">
        {isPending ? (
          <div className="h-[220px] animate-pulse" />
        ) : isError ? (
          <p className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
            Couldn't load history for this metric.
          </p>
        ) : (
          <MetricChart metric={metric} samples={data ?? []} />
        )}
      </Card>
    </section>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading readings">
      {Array.from({ length: 6 }, (_, i) => (
        <Card
          key={i}
          className="bg-muted/40 border-l-state-silent h-[100px] animate-pulse rounded-none rounded-r-sm border-0 border-l-[3px] shadow-none"
        />
      ))}
    </div>
  )
}

function ApiUnreachable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-l-state-fault bg-muted/40 gap-0 rounded-none rounded-r-sm border-0 border-l-[3px] p-5 shadow-none">
      <h2 className="font-medium">Can't reach the monitoring API.</h2>
      <p className="text-muted-foreground mt-1.5 text-sm">
        The Go server on port 3000 may be down. The poller keeps collecting either way, so nothing
        is lost.
      </p>
      <p className="text-muted-foreground mt-3 text-xs">{message}</p>
      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </Card>
  )
}

function NoTargets() {
  return (
    <Card className="border-l-state-silent bg-muted/40 gap-0 rounded-none rounded-r-sm border-0 border-l-[3px] p-5 shadow-none">
      <h2 className="font-medium">No active targets.</h2>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Add rows to <span className="tabular">snmp_targets</span> with{' '}
        <span className="tabular">is_active = 1</span> and they'll appear here within a minute.
      </p>
    </Card>
  )
}
