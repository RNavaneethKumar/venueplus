// ─── Shared report utilities ──────────────────────────────────────────────────

export const fmt = (n: number | string) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtShort = (n: number | string) => {
  const v = Number(n)
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`
  if (v >= 1_000)    return `₹${(v / 1_000).toFixed(1)}K`
  return `₹${v.toFixed(0)}`
}

export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

/** Client-side CSV download */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers, ...rows].map(r => r.map(escape).join(','))
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Date presets ─────────────────────────────────────────────────────────────

export type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'last7' | 'last30' | 'custom'

export const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: 'This Week' },
  { key: 'month',     label: 'This Month' },
  { key: 'last7',     label: 'Last 7 Days' },
  { key: 'last30',    label: 'Last 30 Days' },
  { key: 'custom',    label: 'Custom' },
]

export function presetToDates(preset: Preset): { from: string; to: string } {
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)

  const pad = (d: Date) => d.toISOString().slice(0, 10)

  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1)
      const s = pad(y)
      return { from: s, to: s }
    }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
      return { from: pad(d), to: today }
    }
    case 'month': {
      return { from: today.slice(0, 7) + '-01', to: today }
    }
    case 'last7': {
      const d = new Date(now); d.setDate(d.getDate() - 6)
      return { from: pad(d), to: today }
    }
    case 'last30': {
      const d = new Date(now); d.setDate(d.getDate() - 29)
      return { from: pad(d), to: today }
    }
    default:
      return { from: today, to: today }
  }
}
