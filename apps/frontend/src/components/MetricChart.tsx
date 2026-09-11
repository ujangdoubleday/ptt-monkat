import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatValue, type LatestMetric, type MetricSample } from '@/lib/metrics'

/**
 * One series, so no legend — the panel heading names it.
 *
 * #0d9488 clears the validator's lightness, chroma and 3:1 contrast checks on
 * both the light and the dark surface, so a single value serves both themes.
 *
 * The line is deliberately NOT colored by freshness: tinting a whole history
 * by the state of its last point misreads everything before it. Freshness
 * lives on the card and in this panel's heading.
 */
const SERIES = '#0d9488'

interface Point {
  t: number
  v: number
}

const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const clockSeconds = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function MetricChart({
  metric,
  samples,
}: {
  metric: LatestMetric
  samples: MetricSample[]
}) {
  if (samples.length === 0) {
    return (
      <p className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
        No readings in this range yet.
      </p>
    )
  }

  const points: Point[] = samples.map((s) => ({ t: Date.parse(s.t), v: s.v }))

  // On a short span HH:mm repeats across neighbouring ticks and the axis reads
  // as though time stopped. Pick the resolution from the data, not the range.
  const span = points[points.length - 1].t - points[0].t
  const axisClock = span < 20 * 60_000 ? clockSeconds : clock

  // Recharts' 'auto' still anchors to zero here, which flattens a router
  // idling between 38% and 42% into a straight line on a 0-100 axis — and
  // that movement is the entire reason for watching it. Safe because this is
  // a line, not a filled area: no mark encodes magnitude by height from the
  // floor, so a non-zero baseline overstates nothing.
  const values = points.map((p) => p.v)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = (hi - lo) * 0.12 || Math.max(Math.abs(hi) * 0.05, 0.5)

  // Snap the padded bounds to the data's own order of magnitude, otherwise
  // Recharts derives ticks from the raw numbers and the axis reads
  // "711.74 / 628.06 / 428.06" instead of round values.
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(hi - lo, 1e-9))))
  const domain: [number, number] = [
    Math.floor((lo - pad) / step) * step,
    Math.ceil((hi + pad) / step) * step,
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        {/* Horizontal only: vertical rules would compete with the series. */}
        <CartesianGrid
          horizontal
          vertical={false}
          stroke="currentColor"
          className="text-border"
          strokeOpacity={0.6}
        />

        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          scale="time"
          tickFormatter={(t: number) => axisClock.format(t)}
          tickLine={false}
          axisLine={false}
          minTickGap={56}
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          width={52}
          domain={domain}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => formatValue(v)}
          stroke="currentColor"
          className="text-muted-foreground"
        />

        <Tooltip
          cursor={{ stroke: SERIES, strokeOpacity: 0.45, strokeWidth: 1 }}
          content={({ active, payload }) => (
            <Readout
              active={active}
              point={payload?.[0]?.payload as Point | undefined}
              unit={metric.unit}
            />
          )}
        />

        <Line
          type="monotone"
          dataKey="v"
          stroke={SERIES}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
          // Re-animating every 10 seconds makes the chart unreadable.
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function Readout({ active, point, unit }: { active?: boolean; point?: Point; unit: string }) {
  if (!active || !point) return null

  return (
    <div className="bg-popover text-popover-foreground border-border rounded-sm border px-2.5 py-1.5 text-xs shadow-sm">
      <p className="tabular font-medium">
        {formatValue(point.v)}
        {unit && <span className="text-muted-foreground"> {unit}</span>}
      </p>
      <p className="tabular text-muted-foreground mt-0.5">{clockSeconds.format(point.t)}</p>
    </div>
  )
}
