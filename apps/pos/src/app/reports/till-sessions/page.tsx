'use client'

import { useState, useCallback, useEffect } from 'react'
import { posApi } from '@/lib/api'
import { fmt, fmtDateTime, PRESETS, presetToDates, type Preset, downloadCsv } from '../_components/utils'
import clsx from 'clsx'

interface TillMovement {
  id:           string
  movementType: 'drop' | 'paid_in' | 'paid_out'
  amount:       number
  reason:       string
  createdAt:    string
}

interface TillSession {
  id:            string
  status:        'open' | 'closed' | 'blind_closed' | 'forced' | 'auto'
  openTime:      string
  closeTime?:    string | null
  openingAmount: number
  closingAmount?: number | null
  expectedAmount?: number | null
  varianceAmount?: number | null
  openedBy:      string
  drawerId?:     string | null
  drawer?:       { name: string } | null
  movements?:    TillMovement[]
}

const STATUS_COLORS: Record<string, string> = {
  open:         'bg-green-900/50 text-green-300 border border-green-700/50',
  closed:       'bg-slate-700 text-slate-300 border border-slate-600',
  blind_closed: 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
  forced:       'bg-red-900/50 text-red-300 border border-red-700/50',
  auto:         'bg-slate-700 text-slate-400 border border-slate-600',
}

function varianceClass(v: number | null | undefined) {
  if (v == null) return 'text-slate-500'
  if (v < -1)  return 'text-red-400'
  if (v > 1)   return 'text-amber-400'
  return 'text-green-400'
}

export default function TillSessionsPage() {
  const initDates = presetToDates('today')
  const [preset,   setPreset]   = useState<Preset>('today')
  const [from,     setFrom]     = useState(initDates.from)
  const [to,       setTo]       = useState(initDates.to)
  const [sessions, setSessions] = useState<TillSession[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') { const d = presetToDates(p); setFrom(d.from); setTo(d.to) }
  }

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await posApi.till.listSessions({ from, to, limit: '100' })
      const rows: TillSession[] = res.data.data?.sessions ?? res.data.data ?? []
      setSessions(rows)
      setLoaded(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const handleExport = () => {
    downloadCsv(`till-sessions-${from}-to-${to}.csv`,
      ['Date', 'Opened By', 'Drawer', 'Status', 'Opening Float', 'Closing Amount', 'Expected', 'Variance', 'Movements'],
      sessions.map((s) => [
        fmtDateTime(s.openTime),
        s.openedBy,
        s.drawer?.name ?? s.drawerId ?? '—',
        s.status,
        s.openingAmount,
        s.closingAmount ?? '',
        s.expectedAmount ?? '',
        s.varianceAmount ?? '',
        s.movements?.length ?? 0,
      ])
    )
  }

  // Summary stats
  const closedSessions = sessions.filter((s) => s.status !== 'open')
  const totalCash = closedSessions.reduce((s, x) => s + (x.closingAmount ?? 0), 0)
  const openSessions = sessions.filter((s) => s.status === 'open').length

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => handlePreset(p.key)}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  preset === p.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                )}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-slate-500 text-xs">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <button onClick={load} disabled={loading} title="Refresh"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
            <svg className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
        {sessions.length > 0 && (
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
        )}
      </div>

      {error && <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400 text-sm">Failed to load till sessions.</div>}

      {loading && !loaded && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Summary stats ── */}
      {loaded && sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Sessions</p>
            <p className="text-blue-400 text-xl font-bold">{sessions.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Open Now</p>
            <p className={clsx('text-xl font-bold', openSessions > 0 ? 'text-green-400' : 'text-slate-500')}>
              {openSessions}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Total Closed</p>
            <p className="text-amber-400 text-xl font-bold">{fmtShort(totalCash)}</p>
          </div>
        </div>
      )}

      {/* ── Sessions list ── */}
      {loaded && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isOpen    = expanded === s.id
            const variance  = s.varianceAmount
            const movements = s.movements ?? []
            const paidIn    = movements.filter((m) => m.movementType === 'paid_in').reduce((x, m) => x + m.amount, 0)
            const paidOut   = movements.filter((m) => m.movementType === 'paid_out').reduce((x, m) => x + m.amount, 0)
            const drops     = movements.filter((m) => m.movementType === 'drop').reduce((x, m) => x + m.amount, 0)

            return (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Header row — clickable */}
                <button
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      {/* Status badge */}
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', STATUS_COLORS[s.status] ?? 'bg-slate-700 text-slate-400')}>
                        {s.status.replace('_', ' ')}
                      </span>
                      <div>
                        <p className="text-white text-sm font-medium">{s.openedBy}</p>
                        <p className="text-slate-500 text-xs">
                          {s.drawer?.name ? `${s.drawer.name} · ` : ''}
                          {fmtDateTime(s.openTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Opening Float</p>
                        <p className="text-slate-200 font-semibold text-sm tabular-nums">{fmt(s.openingAmount)}</p>
                      </div>
                      {s.closingAmount != null && (
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Closing</p>
                          <p className="text-slate-200 font-semibold text-sm tabular-nums">{fmt(s.closingAmount)}</p>
                        </div>
                      )}
                      {variance != null && (
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Variance</p>
                          <p className={clsx('font-semibold text-sm tabular-nums', varianceClass(variance))}>
                            {variance >= 0 ? '+' : ''}{fmt(Math.abs(variance))}
                          </p>
                        </div>
                      )}
                      {movements.length > 0 && (
                        <div className="text-right hidden sm:block">
                          <p className="text-slate-400 text-xs">Movements</p>
                          <p className="text-slate-300 text-sm">{movements.length}</p>
                        </div>
                      )}
                      <svg
                        className={clsx('w-4 h-4 text-slate-500 transition-transform', isOpen && 'rotate-180')}
                        fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800 space-y-3">

                    {/* Cash summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { label: 'Opening Float', value: fmt(s.openingAmount) },
                        { label: 'Paid In',        value: fmt(paidIn) },
                        { label: 'Paid Out',       value: fmt(paidOut) },
                        { label: 'Drops',          value: fmt(drops) },
                      ].map((row) => (
                        <div key={row.label} className="bg-slate-800/60 rounded-lg p-2.5">
                          <p className="text-slate-500 text-xs mb-0.5">{row.label}</p>
                          <p className="text-slate-200 text-sm font-semibold tabular-nums">{row.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Movements */}
                    {movements.length > 0 && (
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Movements</p>
                        <div className="space-y-1">
                          {movements.map((m) => (
                            <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className={clsx('px-1.5 py-0.5 rounded font-medium',
                                  m.movementType === 'paid_in'  ? 'bg-green-900/50 text-green-400' :
                                  m.movementType === 'paid_out' ? 'bg-red-900/50 text-red-400' :
                                  'bg-blue-900/50 text-blue-400'
                                )}>
                                  {m.movementType.replace('_', ' ')}
                                </span>
                                <span className="text-slate-400">{m.reason}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-slate-300 font-semibold tabular-nums">{fmt(m.amount)}</span>
                                <span className="text-slate-600">{fmtDateTime(m.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.closeTime && (
                      <p className="text-slate-600 text-xs">
                        Closed: {fmtDateTime(s.closeTime)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {loaded && sessions.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <span className="text-4xl mb-3">🗃️</span>
          <p>No till sessions found for this period.</p>
        </div>
      )}
    </div>
  )
}

// small helper used in stats
function fmtShort(n: number | string) {
  const v = Number(n)
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`
  if (v >= 1_000)    return `₹${(v / 1_000).toFixed(1)}K`
  return `₹${v.toFixed(0)}`
}
