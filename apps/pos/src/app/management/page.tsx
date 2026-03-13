'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePosStore } from '@/store/posStore'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  orderNumber: string
  sourceChannel: string
  status: string
  totalAmount: string
  subtotalAmount: string
  discountAmount: string
  taxAmount: string
  createdAt: string
  accountId: string | null
}

interface RefundModal { order: Order }

type DateRange = 'today' | 'week' | 'all'

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter()
  const { token, staff, hasRole, hasPermission } = usePosStore()

  const [orders, setOrders]               = useState<Order[]>([])
  const [liveRevenue, setLiveRevenue]     = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [statusFilter, setStatusFilter]   = useState<string>('all')
  const [dateRange, setDateRange]         = useState<DateRange>('today')
  const [search, setSearch]               = useState('')

  const [refundModal, setRefundModal]       = useState<RefundModal | null>(null)
  const [refundAmount, setRefundAmount]     = useState('')
  const [refundReason, setRefundReason]     = useState('')
  const [refundLoading, setRefundLoading]   = useState(false)

  const isAuthorised =
    hasRole('manager', 'venue_admin', 'super_admin') ||
    hasPermission('report.financial') ||
    hasPermission('report.operational')

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    if (!isAuthorised) {
      toast.error('Insufficient permissions')
      router.push('/')
      return
    }
    loadData()
  }, [token, statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '200' }
      if (statusFilter !== 'all') params.status = statusFilter
      const [ordersRes, revenueRes] = await Promise.all([
        posApi.orders.list(params),
        posApi.reports.liveRevenue().catch(() => null),
      ])
      setOrders(ordersRes.data.data ?? [])
      if (revenueRes) setLiveRevenue(revenueRes.data.data.totalRevenue)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // ── Client-side filtering ─────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    let list = orders

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const cutoff = new Date(now)
      if (dateRange === 'today') {
        cutoff.setHours(0, 0, 0, 0)
      } else {
        cutoff.setDate(now.getDate() - 7)
      }
      list = list.filter((o) => new Date(o.createdAt) >= cutoff)
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.sourceChannel.toLowerCase().includes(q)
      )
    }

    return list
  }, [orders, dateRange, search])

  // ── Refund ────────────────────────────────────────────────────────────────

  const handleRefund = async () => {
    if (!refundModal) return
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid refund amount'); return }
    if (!refundReason.trim())         { toast.error('Refund reason is required'); return }
    setRefundLoading(true)
    try {
      await posApi.orders.refund(refundModal.order.id, {
        amount, reason: refundReason.trim(),
        operatorId: staff?.id, refundMethod: 'original',
      })
      toast.success(`Refund processed for ${refundModal.order.orderNumber}`)
      setRefundModal(null)
      setRefundAmount('')
      setRefundReason('')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Refund failed')
    } finally {
      setRefundLoading(false)
    }
  }

  const statusBadge = (status: string) => ({
    paid: 'badge-green', pending: 'badge-yellow',
    refunded: 'badge-blue', void: 'badge-red',
  }[status] ?? 'badge')

  // ── Summary (from filtered list) ──────────────────────────────────────────

  const paidOrders     = filteredOrders.filter((o) => o.status === 'paid').length
  const refundedOrders = filteredOrders.filter((o) => o.status === 'refunded').length
  const avgOrder = paidOrders > 0
    ? filteredOrders.filter((o) => o.status === 'paid')
        .reduce((s, o) => s + Number(o.totalAmount), 0) / paidOrders
    : 0

  const canRefund =
    hasPermission('order.refund') || hasRole('manager', 'venue_admin', 'super_admin')

  return (
    <div className="min-h-full bg-gray-950 text-white">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            POS
          </button>
          <span className="text-slate-700">|</span>
          <h1 className="text-white font-bold text-lg">Orders</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-slate-400 text-sm hidden sm:block">{staff?.name}</p>
          <button onClick={loadData} className="btn-ghost text-sm py-1.5 px-3 border border-slate-700">
            Refresh
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Today's Revenue"
            value={liveRevenue !== null ? `₹${Number(liveRevenue).toLocaleString('en-IN')}` : '—'}
            accent="green"
          />
          <StatCard label="Showing" value={filteredOrders.length.toString()} accent="blue" />
          <StatCard label="Paid" value={paidOrders.toString()} accent="green" />
          <StatCard label="Avg Order" value={avgOrder > 0 ? `₹${avgOrder.toFixed(0)}` : '—'} accent="yellow" />
        </div>

        {/* ── Orders table ─────────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-slate-700">

            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search order # or channel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-8 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-sm"
                >✕</button>
              )}
            </div>

            {/* Date range toggle */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700 shrink-0 text-xs">
              {(['today', 'week', 'all'] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={clsx(
                    'px-3 py-1.5 font-medium capitalize transition-colors',
                    dateRange === r ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  {r === 'week' ? '7 days' : r}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg text-sm text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No orders found{search ? ` for "${search}"` : ''}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                    <th className="px-4 py-2 text-left">Order #</th>
                    <th className="px-4 py-2 text-left">Channel</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                    <th className="px-4 py-2 text-right">Discount</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    {canRefund && <th className="px-4 py-2 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-white">{order.orderNumber}</td>
                      <td className="px-4 py-2.5 text-slate-400 capitalize">{order.sourceChannel}</td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('badge capitalize', statusBadge(order.status))}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                        ₹{Number(order.subtotalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-green-400">
                        {Number(order.discountAmount) > 0
                          ? `−₹${Number(order.discountAmount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-white">
                        ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      {canRefund && (
                        <td className="px-4 py-2.5 text-center">
                          {order.status === 'paid' && (
                            <button
                              onClick={() => { setRefundModal({ order }); setRefundAmount(Number(order.totalAmount).toFixed(2)); setRefundReason('') }}
                              className="btn-danger text-xs py-1 px-2"
                            >Refund</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count */}
          {!loading && filteredOrders.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-500">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              {refundedOrders > 0 && ` · ${refundedOrders} refunded`}
            </div>
          )}
        </div>
      </div>

      {/* ── Refund Modal ─────────────────────────────────────────────────────── */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setRefundModal(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-sm p-5 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Process Refund</h3>
                <p className="text-slate-400 text-sm font-mono">{refundModal.order.orderNumber}</p>
              </div>
              <button onClick={() => setRefundModal(null)} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Refund Amount (₹) — max ₹{Number(refundModal.order.totalAmount).toFixed(2)}
                </label>
                <input type="number" min="0.01" step="0.01" max={Number(refundModal.order.totalAmount)}
                  className="input" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason</label>
                <input type="text" className="input" placeholder="e.g. Customer request, item unavailable"
                  value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)} className="flex-1 btn-ghost border border-slate-600 py-2.5">Cancel</button>
              <button onClick={handleRefund} disabled={refundLoading} className="flex-1 btn-danger py-2.5">
                {refundLoading ? 'Processing…' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: {
  label: string; value: string
  accent: 'green' | 'blue' | 'yellow' | 'red'
}) {
  const accentMap = { green: 'text-green-400', blue: 'text-blue-400', yellow: 'text-yellow-400', red: 'text-red-400' }
  return (
    <div className="card">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={clsx('text-2xl font-bold tabular-nums', accentMap[accent])}>{value}</p>
    </div>
  )
}
