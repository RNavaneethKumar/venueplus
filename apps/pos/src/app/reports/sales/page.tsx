'use client'

import { useState, useCallback, useEffect } from 'react'
import { posApi } from '@/lib/api'
import { fmt, fmtDateTime, PRESETS, presetToDates, type Preset, downloadCsv } from '../_components/utils'
import clsx from 'clsx'

const PAGE_SIZE = 30

const STATUS_COLORS: Record<string, string> = {
  paid:      'bg-green-900/50 text-green-300 border border-green-700/50',
  pending:   'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  refunded:  'bg-red-900/50   text-red-300   border border-red-700/50',
  cancelled: 'bg-slate-700   text-slate-400 border border-slate-600',
}

const CHANNEL_ICON: Record<string, string> = { pos: '🖥️', online: '🌐', kiosk: '📟' }

interface Order {
  id:           string
  orderNumber:  string
  orderType:    string
  status:       string
  sourceChannel: string
  totalAmount:  number | string
  discountAmount: number | string
  taxAmount:    number | string
  visitDate:    string | null
  createdAt:    string
  customer?:    { id: string; displayName: string } | null
  orderItems?:  { productName: string; quantity: number }[]
  orderPayments?: { paymentMethod: string }[]
}

export default function SalesPage() {
  const initDates = presetToDates('today')
  const [preset,  setPreset]  = useState<Preset>('today')
  const [from,    setFrom]    = useState(initDates.from)
  const [to,      setTo]      = useState(initDates.to)
  const [orders,  setOrders]  = useState<Order[]>([])
  const [page,    setPage]    = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') {
      const d = presetToDates(p)
      setFrom(d.from); setTo(d.to)
    }
  }

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true); setError(false)
    try {
      const res = await posApi.orders.list({
        from, to,
        page: String(pageNum),
        limit: String(PAGE_SIZE),
        sortBy: 'createdAt', sortDir: 'desc',
      })
      const rows: Order[] = res.data.data?.orders ?? res.data.data ?? []
      const total: number = res.data.data?.total ?? rows.length
      if (pageNum === 1) {
        setOrders(rows)
      } else {
        setOrders((prev) => [...prev, ...rows])
      }
      setPage(pageNum)
      setHasMore(pageNum * PAGE_SIZE < total)
      setLoaded(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { load(1) }, [load])

  const handleExport = () => {
    downloadCsv(
      `sales-${from}-to-${to}.csv`,
      ['Order #', 'Date', 'Customer', 'Channel', 'Items', 'Payment', 'Amount', 'Status'],
      orders.map((o) => [
        o.orderNumber,
        fmtDateTime(o.createdAt),
        o.customer?.displayName ?? '—',
        o.sourceChannel ?? '—',
        o.orderItems?.map((i) => `${i.productName} ×${i.quantity}`).join('; ') ?? '—',
        o.orderPayments?.map((p) => p.paymentMethod).join('+') ?? '—',
        Number(o.totalAmount).toFixed(2),
        o.status,
      ])
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset pills */}
          <div className="flex gap-1 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
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

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-slate-500 text-xs">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <button
            onClick={() => load(1)} disabled={loading} title="Refresh"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            <svg className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        {orders.length > 0 && (
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
          Failed to load orders.
        </div>
      )}

      {/* ── Summary bar ── */}
      {orders.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">
            <span className="text-white font-semibold">{orders.length}</span> orders
          </span>
          <span className="text-slate-400">
            Total: <span className="text-green-400 font-semibold">
              {fmt(orders.reduce((s, o) => s + Number(o.totalAmount), 0))}
            </span>
          </span>
        </div>
      )}

      {/* ── Mobile cards ── */}
      {loaded && orders.length > 0 && (
        <div className="sm:hidden space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-white text-sm font-mono font-semibold">{o.orderNumber}</span>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[o.status] ?? 'bg-slate-700 text-slate-400')}>
                  {o.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-slate-400 text-xs">
                  {o.customer?.displayName ?? 'Walk-in'} · {CHANNEL_ICON[o.sourceChannel] ?? ''} {o.sourceChannel}
                </div>
                <span className="text-slate-200 font-semibold text-sm tabular-nums">{fmt(o.totalAmount)}</span>
              </div>
              <p className="text-slate-600 text-xs mt-0.5">{fmtDateTime(o.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop table ── */}
      {loaded && orders.length > 0 && (
        <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-semibold">Order #</th>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold">Channel</th>
                  <th className="text-left px-4 py-3 font-semibold">Payment</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {orders.map((o) => {
                  const methods = o.orderPayments?.map((p) =>
                    p.paymentMethod.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                  ).join(' + ') ?? '—'
                  return (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-blue-400 font-mono text-xs">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(o.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-300">{o.customer?.displayName ?? 'Walk-in'}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {CHANNEL_ICON[o.sourceChannel] ?? ''} {o.sourceChannel}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{methods}</td>
                      <td className="px-4 py-3 text-right text-slate-200 font-semibold tabular-nums">{fmt(o.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[o.status] ?? 'bg-slate-700 text-slate-400')}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loaded && orders.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <span className="text-4xl mb-3">🛒</span>
          <p>No orders found for this period.</p>
        </div>
      )}

      {/* ── Load more ── */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => load(page + 1)} disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
