'use client'

import { useState, useEffect, useCallback } from 'react'
import { posApi } from '@/lib/api'
import { fmt, fmtShort, fmtDate, PRESETS, presetToDates, type Preset, downloadCsv } from '../_components/utils'
import { LineChart, DonutChart, HBarChart } from '../_components/Charts'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  order_count:    number | string
  total_revenue:  number | string
  pos_revenue:    number | string
  online_revenue: number | string
  kiosk_revenue:  number | string
}

interface PaymentMethod {
  payment_method: string
  total:          number | string
  count?:         number | string
}

interface DailyPoint {
  date:           string
  order_count:    number | string
  total_revenue:  number | string
  pos_revenue:    number | string
  online_revenue: number | string
  kiosk_revenue:  number | string
}

interface ProductRow {
  product_id:   string
  product_name: string
  product_type: string
  units_sold:   number | string
  revenue:      number | string
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'blue' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  const RING: Record<string, string> = {
    blue:   'border-blue-500/30   bg-blue-600/10',
    green:  'border-green-500/30  bg-green-600/10',
    amber:  'border-amber-500/30  bg-amber-600/10',
    violet: 'border-violet-500/30 bg-violet-600/10',
  }
  const TEXT: Record<string, string> = {
    blue: 'text-blue-400', green: 'text-green-400', amber: 'text-amber-400', violet: 'text-violet-400',
  }
  return (
    <div className={clsx('rounded-2xl border p-4', RING[color] ?? RING.blue)}>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={clsx('text-xl sm:text-2xl font-bold tabular-nums', TEXT[color] ?? TEXT.blue)}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Date range controls ──────────────────────────────────────────────────────

function DateControls({
  preset, from, to,
  onPreset, onFrom, onTo, onLoad, loading,
}: {
  preset:   Preset; from: string; to: string
  onPreset: (p: Preset) => void
  onFrom:   (v: string) => void
  onTo:     (v: string) => void
  onLoad:   () => void
  loading:  boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset pills */}
      <div className="flex gap-1 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              preset === p.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date" value={from} onChange={(e) => onFrom(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-500 text-xs">→</span>
          <input
            type="date" value={to} onChange={(e) => onTo(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Manual refresh */}
      <button
        onClick={onLoad}
        disabled={loading}
        title="Refresh"
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
      >
        <svg className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const initDates = presetToDates('today')
  const [preset,  setPreset]  = useState<Preset>('today')
  const [from,    setFrom]    = useState(initDates.from)
  const [to,      setTo]      = useState(initDates.to)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)

  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [trend,    setTrend]    = useState<DailyPoint[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') {
      const d = presetToDates(p)
      setFrom(d.from)
      setTo(d.to)
    }
  }

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const [sumRes, trendRes, prodRes] = await Promise.all([
        posApi.admin.getReportSummary(from, to),
        posApi.admin.reports.dailyTrend(from, to),
        posApi.admin.reports.products(from, to),
      ])
      setSummary(sumRes.data.data.revenue)
      setPayments(sumRes.data.data.paymentMethods ?? [])
      setTrend(trendRes.data.data?.rows ?? [])
      setProducts(prodRes.data.data?.rows ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  // Auto-load on mount and whenever date range changes
  useEffect(() => { load() }, [load])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalRevenue = Number(summary?.total_revenue ?? 0)
  const orderCount   = Number(summary?.order_count ?? 0)
  const avgOrder     = orderCount > 0 ? totalRevenue / orderCount : 0

  const trendLine = trend.map((d) => ({
    label: fmtDate(d.date),
    value: Number(d.total_revenue),
  }))

  const channelBars = [
    { label: 'POS',    value: Number(summary?.pos_revenue    ?? 0) },
    { label: 'Online', value: Number(summary?.online_revenue ?? 0) },
    { label: 'Kiosk',  value: Number(summary?.kiosk_revenue  ?? 0) },
  ].filter((b) => b.value > 0)

  const paymentDonut = payments.map((p) => ({
    label: p.payment_method.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    value: Number(p.total),
  }))

  const topProducts = [...products]
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, 8)

  const handleExport = () => {
    if (!summary) return
    downloadCsv(`overview-${from}-to-${to}.csv`,
      ['Date From', 'Date To', 'Orders', 'Total Revenue', 'POS Revenue', 'Online Revenue', 'Kiosk Revenue'],
      [[from, to, orderCount, totalRevenue, Number(summary.pos_revenue), Number(summary.online_revenue), Number(summary.kiosk_revenue)]]
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateControls
          preset={preset} from={from} to={to}
          onPreset={handlePreset} onFrom={setFrom} onTo={setTo}
          onLoad={load} loading={loading}
        />
        {summary && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400 text-sm">
          Failed to load data. Check your connection and try again.
        </div>
      )}

      {loading && !summary && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {summary && (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard label="Total Revenue"  value={fmtShort(summary.total_revenue)}  color="green"  sub={fmt(summary.total_revenue)} />
            <StatCard label="Orders"         value={orderCount}                        color="blue" />
            <StatCard label="Avg Order"      value={fmtShort(avgOrder)}               color="blue"   sub={fmt(avgOrder)} />
            <StatCard label="POS Revenue"    value={fmtShort(summary.pos_revenue)}    color="violet" />
            <StatCard label="Online / Kiosk" value={fmtShort(Number(summary.online_revenue) + Number(summary.kiosk_revenue))} color="amber" />
          </div>

          {/* ── Revenue trend ── */}
          {trend.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <h2 className="text-white font-semibold text-sm mb-4">Revenue Trend</h2>
              <LineChart data={trendLine} color="#3b82f6" />
            </div>
          )}

          {/* ── Channel + Payment + Top products ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Channel breakdown */}
            {channelBars.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <h2 className="text-white font-semibold text-sm mb-4">By Channel</h2>
                <HBarChart data={channelBars} formatValue={(v) => fmtShort(v)} />
              </div>
            )}

            {/* Payment method donut */}
            {paymentDonut.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Payment Methods</h2>
                <DonutChart data={paymentDonut} formatValue={(v) => fmtShort(v)} />
              </div>
            )}

            {/* Top products */}
            {topProducts.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Top Products</h2>
                <HBarChart
                  data={topProducts.map((p) => ({ label: p.product_name, value: Number(p.revenue) }))}
                  formatValue={(v) => fmtShort(v)}
                />
              </div>
            )}
          </div>

          {/* ── Payment method table ── */}
          {payments.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-slate-800">
                <h2 className="text-white font-semibold text-sm">Payment Breakdown</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 sm:px-5 py-3 font-semibold">Method</th>
                    <th className="text-right px-4 sm:px-5 py-3 font-semibold">Amount</th>
                    <th className="text-right px-4 sm:px-5 py-3 font-semibold hidden sm:table-cell">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {payments.map((m) => (
                    <tr key={m.payment_method} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 sm:px-5 py-3 text-slate-300">
                        {m.payment_method.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-slate-300 text-right tabular-nums">{fmt(m.total)}</td>
                      <td className="px-4 sm:px-5 py-3 text-slate-500 text-right hidden sm:table-cell">
                        {totalRevenue > 0 ? ((Number(m.total) / totalRevenue) * 100).toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
