'use client'

import { useState, useCallback, useEffect } from 'react'
import { posApi } from '@/lib/api'
import { fmt, fmtShort, PRESETS, presetToDates, type Preset, downloadCsv } from '../_components/utils'
import { DonutChart } from '../_components/Charts'
import clsx from 'clsx'

interface PaymentMethod {
  payment_method: string
  total:          number | string
  count?:         number | string
}

const METHOD_COLORS: Record<string, string> = {
  cash:      '#10b981',
  card:      '#3b82f6',
  upi:       '#a855f7',
  wallet:    '#f59e0b',
  gift_card: '#ec4899',
}

const METHOD_ICON: Record<string, string> = {
  cash: '💵', card: '💳', upi: '📱', wallet: '👛', gift_card: '🎁',
}

function prettyMethod(m: string) {
  return m.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function PaymentsPage() {
  const initDates = presetToDates('today')
  const [preset,   setPreset]   = useState<Preset>('today')
  const [from,     setFrom]     = useState(initDates.from)
  const [to,       setTo]       = useState(initDates.to)
  const [methods,  setMethods]  = useState<PaymentMethod[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') { const d = presetToDates(p); setFrom(d.from); setTo(d.to) }
  }

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const res = await posApi.admin.getReportSummary(from, to)
      setMethods(res.data.data?.paymentMethods ?? [])
      setLoaded(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const totalRevenue = methods.reduce((s, m) => s + Number(m.total), 0)

  const donutData = methods.map((m) => ({
    label: prettyMethod(m.payment_method),
    value: Number(m.total),
    color: METHOD_COLORS[m.payment_method],
  }))

  const handleExport = () => {
    downloadCsv(`payments-${from}-to-${to}.csv`,
      ['Method', 'Amount', 'Share %'],
      methods.map((m) => [
        prettyMethod(m.payment_method),
        Number(m.total).toFixed(2),
        totalRevenue > 0 ? ((Number(m.total) / totalRevenue) * 100).toFixed(1) + '%' : '0.0%',
      ])
    )
  }

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
        {methods.length > 0 && (
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
        )}
      </div>

      {error && <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400 text-sm">Failed to load data.</div>}

      {loading && !loaded && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loaded && methods.length > 0 && (
        <div className="space-y-5">

          {/* ── Donut chart ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <h2 className="text-white font-semibold text-sm mb-4">Payment Mix</h2>
              <DonutChart data={donutData} formatValue={(v) => fmtShort(v)} />
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 gap-3 content-start">
              {methods.map((m) => (
                <div key={m.payment_method}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{METHOD_ICON[m.payment_method] ?? '💰'}</span>
                    <span className="text-slate-400 text-xs font-medium">{prettyMethod(m.payment_method)}</span>
                  </div>
                  <p className="text-white font-bold text-base sm:text-lg tabular-nums">{fmtShort(m.total)}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {totalRevenue > 0 ? ((Number(m.total) / totalRevenue) * 100).toFixed(1) + '%' : '0%'} of total
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Payment Breakdown</h2>
              <span className="text-slate-400 text-xs">Total: <span className="text-green-400 font-semibold">{fmt(totalRevenue)}</span></span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold">Method</th>
                  <th className="text-right px-4 sm:px-5 py-3 font-semibold">Amount</th>
                  <th className="text-right px-4 sm:px-5 py-3 font-semibold">Share</th>
                  <th className="text-right px-4 sm:px-5 py-3 font-semibold hidden sm:table-cell">Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {methods.sort((a, b) => Number(b.total) - Number(a.total)).map((m) => {
                  const pct = totalRevenue > 0 ? (Number(m.total) / totalRevenue) * 100 : 0
                  return (
                    <tr key={m.payment_method} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 sm:px-5 py-3 text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>{METHOD_ICON[m.payment_method] ?? '💰'}</span>
                          <span>{prettyMethod(m.payment_method)}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-right text-slate-200 font-semibold tabular-nums">{fmt(m.total)}</td>
                      <td className="px-4 sm:px-5 py-3 text-right text-slate-400">{pct.toFixed(1)}%</td>
                      <td className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                        <div className="h-1.5 bg-slate-800 rounded-full w-24 ml-auto overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: METHOD_COLORS[m.payment_method] ?? '#3b82f6' }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-slate-800/40">
                  <td className="px-4 sm:px-5 py-3 text-white font-semibold" colSpan={1}>Total</td>
                  <td className="px-4 sm:px-5 py-3 text-right text-white font-bold tabular-nums">{fmt(totalRevenue)}</td>
                  <td className="px-4 sm:px-5 py-3 text-right text-slate-400">100%</td>
                  <td className="hidden sm:table-cell" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loaded && methods.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <span className="text-4xl mb-3">💳</span>
          <p>No payment data for this period.</p>
        </div>
      )}
    </div>
  )
}
