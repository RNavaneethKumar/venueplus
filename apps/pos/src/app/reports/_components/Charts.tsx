'use client'

// ─── Lightweight SVG chart components — no external dependencies ──────────────

// ─── Line Chart ───────────────────────────────────────────────────────────────

interface LinePoint { label: string; value: number }

export function LineChart({
  data,
  color = '#3b82f6',
}: {
  data:   LinePoint[]
  color?: string
}) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No data</div>
  }

  // Need ≥2 points for a meaningful line
  if (data.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-1">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{data[0]!.value.toLocaleString()}</span>
        <span className="text-slate-500 text-xs">{data[0]!.label}</span>
      </div>
    )
  }

  const W      = 800
  const H      = 200   // viewBox height — aspect ratio 4:1
  const PAD_L  = 8
  const PAD_R  = 8
  const PAD_T  = 16
  const PAD_B  = 32
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const values = data.map((d) => d.value)
  const maxVal = Math.max(...values, 1)
  const minVal = 0

  const xs = data.map((_, i) => PAD_L + (i / (data.length - 1)) * chartW)
  const ys = data.map((d) => PAD_T + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH)

  // Smooth bezier path
  const pathD = xs.reduce((acc, x, i) => {
    if (i === 0) return `M ${x},${ys[i]}`
    const cpx = (x + xs[i - 1]!) / 2
    return `${acc} C ${cpx},${ys[i - 1]!} ${cpx},${ys[i]!} ${x},${ys[i]!}`
  }, '')

  const areaD = `${pathD} L ${xs[xs.length - 1]},${PAD_T + chartH} L ${xs[0]},${PAD_T + chartH} Z`

  // Show at most 7 x-axis labels
  const step = Math.max(1, Math.ceil(data.length / 7))

  // Use a wrapper div with padding-bottom aspect-ratio trick so SVG scales uniformly
  // aspect ratio = W:H = 800:200 = 4:1  →  padding-bottom = 200/800 * 100 = 25%
  return (
    <div className="relative w-full" style={{ paddingBottom: '25%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Guide lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD_T + chartH * (1 - t)
          return (
            <line
              key={t}
              x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
              stroke="#334155" strokeWidth="1" strokeDasharray="4 4"
            />
          )
        })}

        {/* Area fill */}
        <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots + x-axis labels */}
        {data.map((d, i) => {
          const isFirst = i === 0
          const isLast  = i === data.length - 1
          const showLabel = i % step === 0 || isLast
          const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
          return (
          <g key={i}>
            {showLabel && (
              <text x={xs[i]} y={H - 6} textAnchor={anchor} fill="#64748b" fontSize="11">
                {d.label}
              </text>
            )}
            <circle cx={xs[i]} cy={ys[i]!} r="5" fill={color} stroke="#0f172a" strokeWidth="2" />
          </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Horizontal Bar Chart ──────────────────────────────────────────────────────

interface BarItem { label: string; value: number; color?: string }

export function HBarChart({
  data,
  formatValue = (v) => String(v),
}: {
  data:         BarItem[]
  formatValue?: (v: number) => string
}) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No data</div>
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const COLORS  = ['#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

  return (
    <div className="space-y-2.5">
      {data.map((item, i) => {
        const pct   = (item.value / maxVal) * 100
        const color = item.color ?? COLORS[i % COLORS.length]
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 text-xs truncate max-w-[55%]">{item.label}</span>
              <span className="text-slate-400 text-xs tabular-nums">{formatValue(item.value)}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Donut / Pie Chart ────────────────────────────────────────────────────────

interface DonutSlice { label: string; value: number; color?: string | undefined }

const DONUT_COLORS = ['#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316']

export function DonutChart({
  data,
  formatValue = (v) => String(v),
  size = 160,
}: {
  data:         DonutSlice[]
  formatValue?: (v: number) => string
  size?:        number
}) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No data</div>
  }

  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No data</div>

  const R  = 70   // outer radius
  const r  = 46   // inner radius
  const cx = 80
  const cy = 80

  // Assign colours up-front
  const coloured = data.map((d, i) => ({
    ...d,
    color: d.color ?? DONUT_COLORS[i % DONUT_COLORS.length]!,
  }))

  // ── Single-slice: arc from point to itself degenerates → render rings instead ──
  const isSingleSlice = data.length === 1 || coloured.every((d, _, arr) => d === arr[0])
  const dominantIdx   = coloured.findIndex((d) => Math.abs(d.value / total - 1) < 1e-9)
  const isFull        = dominantIdx !== -1

  if (isSingleSlice || isFull) {
    const slice = isFull ? coloured[dominantIdx]! : coloured[0]!
    return (
      <div className="flex items-start gap-6">
        <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0">
          {/* Full outer ring */}
          <circle cx={cx} cy={cy} r={R} fill={slice.color} stroke="#0f172a" strokeWidth="2" />
          {/* Inner hole */}
          <circle cx={cx} cy={cy} r={r} fill="#0f172a" />
          {/* Centre labels */}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#94a3b8" fontSize="10">Total</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="600">
            {formatValue(total)}
          </text>
        </svg>
        <div className="space-y-1.5 flex-1 min-w-0 pt-1">
          {coloured.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300 text-xs truncate">{s.label}</span>
              </div>
              <span className="text-slate-400 text-xs tabular-nums shrink-0">{formatValue(s.value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Multi-slice: SVG arc paths ────────────────────────────────────────────────
  let angle = -Math.PI / 2 // 12 o'clock

  const slices = coloured.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const x1    = cx + R * Math.cos(angle)
    const y1    = cy + R * Math.sin(angle)
    angle       += sweep
    const x2    = cx + R * Math.cos(angle)
    const y2    = cy + R * Math.sin(angle)
    const xi1   = cx + r * Math.cos(angle - sweep)
    const yi1   = cy + r * Math.sin(angle - sweep)
    const xi2   = cx + r * Math.cos(angle)
    const yi2   = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return {
      ...d,
      path: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`,
    }
  })

  return (
    <div className="flex items-start gap-6">
      <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#0f172a" strokeWidth="2" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#94a3b8" fontSize="10">Total</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="600">
          {formatValue(total)}
        </text>
      </svg>

      <div className="space-y-1.5 flex-1 min-w-0 pt-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-slate-300 text-xs truncate">{s.label}</span>
            </div>
            <span className="text-slate-400 text-xs tabular-nums shrink-0">{formatValue(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stacked Bar Chart (vertical) ─────────────────────────────────────────────

interface StackedBar {
  label:    string
  segments: { key: string; value: number; color: string }[]
}

export function StackedBarChart({
  data,
  height = 160,
}: {
  data:    StackedBar[]
  height?: number
}) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No data</div>
  }

  const totals = data.map((d) => d.segments.reduce((s, seg) => s + seg.value, 0))
  const maxVal = Math.max(...totals, 1)
  const BAR_W  = 20
  const W      = data.length * 48
  const H      = height
  const PAD_B  = 24
  const PAD_T  = 8
  const chartH = H - PAD_B - PAD_T

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', minWidth: `${W}px`, height }}
      >
        {data.map((bar, i) => {
          const bx = 24 + i * 48
          let yBase = PAD_T + chartH
          return (
            <g key={i}>
              {bar.segments.map((seg, j) => {
                const segH = (seg.value / maxVal) * chartH
                const y    = yBase - segH
                yBase      = y
                return <rect key={j} x={bx - BAR_W / 2} y={y} width={BAR_W} height={segH} fill={seg.color} rx="2" />
              })}
              <text x={bx} y={H - 4} textAnchor="middle" fill="#64748b" fontSize="10">{bar.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
