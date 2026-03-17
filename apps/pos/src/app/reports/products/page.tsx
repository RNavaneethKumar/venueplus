'use client'

import { useState, useCallback, useEffect } from 'react'
import { posApi } from '@/lib/api'
import { fmt, fmtShort, PRESETS, presetToDates, type Preset, downloadCsv } from '../_components/utils'
import { HBarChart } from '../_components/Charts'
import clsx from 'clsx'

interface ProductRow {
  product_id:   string
  product_name: string
  product_type: string
  units_sold:   number | string
  revenue:      number | string
}

interface VisitorTypeRow {
  visitor_type_id:   string
  visitor_type_name: string
  units_sold:        number | string
  revenue:           number | string
}

const TYPE_COLORS: Record<string, string> = {
  ticket:     'bg-blue-900/50 text-blue-300 border border-blue-700/50',
  fnb:        'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  retail:     'bg-violet-900/50 text-violet-300 border border-violet-700/50',
  membership: 'bg-green-900/50 text-green-300 border border-green-700/50',
  wallet:     'bg-pink-900/50 text-pink-300 border border-pink-700/50',
}

export default function ProductsPage() {
  const initDates = presetToDates('today')
  const [preset,    setPreset]    = useState<Preset>('today')
  const [from,      setFrom]      = useState(initDates.from)
  const [to,        setTo]        = useState(initDates.to)
  const [products,  setProducts]  = useState<ProductRow[]>([])
  const [visitors,  setVisitors]  = useState<VisitorTypeRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(false)
  const [loaded,    setLoaded]    = useState(false)
  const [sortCol,   setSortCol]   = useState<'revenue' | 'units_sold'>('revenue')

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') { const d = presetToDates(p); setFrom(d.from); setTo(d.to) }
  }

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const [prodRes, visRes] = await Promise.all([
        posApi.admin.reports.products(from, to),
        posApi.admin.reports.visitorTypes(from, to),
      ])
      setProducts(prodRes.data.data?.rows ?? [])
      setVisitors(visRes.data.data?.rows ?? [])
      setLoaded(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { load() }, [load])

  const sorted = [...products].sort((a, b) => Number(b[sortCol]) - Number(a[sortCol]))
  const top10  = sorted.slice(0, 10)

  const handleExport = () => {
    downloadCsv(`products-${from}-to-${to}.csv`,
      ['Product', 'Type', 'Units Sold', 'Revenue'],
      sorted.map((p) => [p.product_name, p.product_type, Number(p.units_sold), Number(p.revenue)])
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
                )}
              >
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

        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          {loaded && (
            <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
              {(['revenue', 'units_sold'] as const).map((col) => (
                <button key={col} onClick={() => setSortCol(col)}
                  className={clsx('px-2.5 py-1 font-medium transition-colors',
                    sortCol === col ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  )}
                >
                  {col === 'revenue' ? 'By Revenue' : 'By Units'}
                </button>
              ))}
            </div>
          )}
          {products.length > 0 && (
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400 text-sm">Failed to load data.</div>}

      {loading && !loaded && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loaded && (
        <div className="space-y-5">

          {/* ── Top 10 chart ── */}
          {top10.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <h2 className="text-white font-semibold text-sm mb-4">
                Top {top10.length} Products — {sortCol === 'revenue' ? 'by Revenue' : 'by Units Sold'}
              </h2>
              <HBarChart
                data={top10.map((p) => ({ label: p.product_name, value: Number(p[sortCol]) }))}
                formatValue={sortCol === 'revenue' ? (v) => fmtShort(v) : (v) => String(v)}
              />
            </div>
          )}

          {/* ── Visitor type breakdown ── */}
          {visitors.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <h2 className="text-white font-semibold text-sm mb-4">
                By Visitor / Ticket Type — {sortCol === 'revenue' ? 'by Revenue' : 'by Units Sold'}
              </h2>
              <HBarChart
                data={[...visitors]
                  .sort((a, b) => Number(b[sortCol]) - Number(a[sortCol]))
                  .map((v) => ({ label: v.visitor_type_name, value: Number(v[sortCol]) }))}
                formatValue={sortCol === 'revenue' ? (v) => fmtShort(v) : (v) => String(v)}
              />
            </div>
          )}

          {/* ── Full table ── */}
          {sorted.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">Product</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Type</th>
                      <th className="text-right px-4 py-3 font-semibold">Units Sold</th>
                      <th className="text-right px-4 py-3 font-semibold">Revenue</th>
                      <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {sorted.map((p) => {
                      const totalRev = products.reduce((s, x) => s + Number(x.revenue), 0)
                      const share    = totalRev > 0 ? ((Number(p.revenue) / totalRev) * 100).toFixed(1) : '0.0'
                      return (
                        <tr key={p.product_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 text-slate-200">{p.product_name}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                              TYPE_COLORS[p.product_type] ?? 'bg-slate-700 text-slate-400 border border-slate-600')}>
                              {p.product_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{Number(p.units_sold)}</td>
                          <td className="px-4 py-3 text-right text-slate-200 font-semibold tabular-nums">{fmt(p.revenue)}</td>
                          <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{share}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sorted.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <span className="text-4xl mb-3">📦</span>
              <p>No product data for this period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
