'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { posApi } from '@/lib/api'
import { usePosStore } from '@/store/posStore'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

const fmtCurrency = (n: number | string) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const STATUS_COLORS: Record<string, string> = {
  paid:       'bg-green-900/50 text-green-300 border border-green-700/50',
  pending:    'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  refunded:   'bg-red-900/50 text-red-300 border border-red-700/50',
  cancelled:  'bg-slate-700 text-slate-400 border border-slate-600',
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash:      'bg-green-900/50 text-green-300 border border-green-700/50',
  card:      'bg-blue-900/50 text-blue-300 border border-blue-700/50',
  upi:       'bg-purple-900/50 text-purple-300 border border-purple-700/50',
  wallet:    'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  gift_card: 'bg-pink-900/50 text-pink-300 border border-pink-700/50',
}

const CHANNEL_ICONS: Record<string, string> = { pos: '🖥️', online: '🌐', kiosk: '📟' }

const PAGE_SIZE = 20

interface OrderItem {
  id: string
  productId: string
  productName: string
  productCode: string | null
  productType: string
  visitorTypeId: string | null
  visitorTypeName: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  priceOverridden: boolean
}

interface OrderPayment {
  id: string
  paymentMethod: string
  amount: number
  status: string
  referenceId: string | null
  createdAt: string
}

interface StatusEntry {
  id: string
  previousStatus: string
  newStatus: string
  changedAt: string
  reason: string | null
}

interface Order {
  id: string
  orderNumber: string
  orderType: string
  status: string
  sourceChannel: string
  totalAmount: number
  discountAmount: number
  taxAmount: number
  notes: string | null
  visitDate: string | null
  createdAt: string
  customer?: { id: string; displayName: string; email?: string; mobileNumber?: string } | null
  orderItems: OrderItem[]
  orderPayments: OrderPayment[]
  statusHistory: StatusEntry[]
}

// ── Inline select style ────────────────────────────────────────────────────────
const SELECT_CLS = 'bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const INPUT_CLS  = 'bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function OrdersPage() {
  const { hasRole, hasPermission, staff } = usePosStore()
  const canRefund = hasRole('manager', 'venue_admin', 'super_admin') || hasPermission('order.refund')

  // ── List state ──────────────────────────────────────────────────────────────
  const [orders, setOrders]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [status, setStatus]           = useState('')
  const [channel, setChannel]         = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')

  // ── Detail panel ────────────────────────────────────────────────────────────
  const [selectedOrderId, setSelectedOrderId]   = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder]       = useState<Order | null>(null)
  const [detailLoading, setDetailLoading]       = useState(false)

  // ── Refund state ────────────────────────────────────────────────────────────
  const [showRefund, setShowRefund]         = useState(false)
  const [refundAmount, setRefundAmount]     = useState('')
  const [refundMethod, setRefundMethod]     = useState<'original' | 'cash'>('original')
  const [refundReason, setRefundReason]     = useState('')
  const [refundLoading, setRefundLoading]   = useState(false)
  const [refundError, setRefundError]       = useState('')
  const [refundSuccess, setRefundSuccess]   = useState('')

  // ── Debounce search ─────────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (v: string) => {
    setSearchInput(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(v)
      setPage(1)
    }, 400)
  }

  // ── Load orders ─────────────────────────────────────────────────────────────
  const load = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        page:  String(pg),
      }
      if (status)      params.status   = status
      if (channel)     params.channel  = channel
      if (searchQuery) params.search   = searchQuery
      if (dateFrom)    params.dateFrom = dateFrom
      if (dateTo)      params.dateTo   = dateTo

      const res = await posApi.orders.list(params)
      setOrders(res.data.data)
      setTotal(res.data.meta?.total ?? res.data.data.length)
    } catch {
      setOrders([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [status, channel, searchQuery, dateFrom, dateTo, page])

  // Reload when filters/page change
  useEffect(() => { load(page) }, [status, channel, searchQuery, dateFrom, dateTo, page])

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => { setPage(1) }, [status, channel, searchQuery, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ── Order detail ─────────────────────────────────────────────────────────────
  const loadOrderDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true)
    try {
      const res = await posApi.admin.getOrder(orderId)
      setSelectedOrder(res.data.data)
    } catch (err) {
      console.error('Failed to load order:', err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const openDetailPanel = useCallback((orderId: string) => {
    setSelectedOrderId(orderId)
    setSelectedOrder(null)
    setShowRefund(false)
    setRefundError('')
    setRefundSuccess('')
    loadOrderDetail(orderId)
  }, [loadOrderDetail])

  const closeDetailPanel = () => {
    setSelectedOrderId(null)
    setSelectedOrder(null)
    setShowRefund(false)
  }

  // ── Refund ───────────────────────────────────────────────────────────────────
  const openRefundPanel = () => {
    if (!selectedOrder) return
    setRefundAmount(Number(selectedOrder.totalAmount).toFixed(2))
    setRefundMethod('original')
    setRefundReason('')
    setRefundError('')
    setRefundSuccess('')
    setShowRefund(true)
  }

  const submitRefund = async () => {
    if (!selectedOrder) return
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      setRefundError('Enter a valid refund amount')
      return
    }
    if (amount > Number(selectedOrder.totalAmount)) {
      setRefundError(`Amount cannot exceed ${fmtCurrency(selectedOrder.totalAmount)}`)
      return
    }
    if (!refundReason.trim()) {
      setRefundError('Reason is required')
      return
    }
    setRefundLoading(true)
    setRefundError('')
    try {
      await posApi.orders.refund(selectedOrder.id, {
        amount,
        reason: refundReason.trim(),
        refundMethod,
        operatorId: staff?.id,
      })
      setRefundSuccess('Refund processed successfully')
      setShowRefund(false)
      // Refresh detail + list
      await loadOrderDetail(selectedOrder.id)
      load(page)
    } catch (err: any) {
      setRefundError(err?.response?.data?.error?.message ?? 'Refund failed')
    } finally {
      setRefundLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminPageShell
      title="Orders"
      description="All orders across POS, online, and kiosk channels"
      icon="📋"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <input
            type="search"
            placeholder="Order number…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={clsx(INPUT_CLS, 'w-40')}
          />
          {/* Status */}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLS}>
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {/* Channel */}
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={SELECT_CLS}>
            <option value="">All Channels</option>
            <option value="pos">POS</option>
            <option value="online">Online</option>
            <option value="kiosk">Kiosk</option>
          </select>
          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={clsx(INPUT_CLS, 'w-36')}
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={clsx(INPUT_CLS, 'w-36')}
            title="To date"
          />
          {/* Clear filters */}
          {(searchQuery || status || channel || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchInput(''); setSearchQuery('')
                setStatus(''); setChannel('')
                setDateFrom(''); setDateTo('')
                setPage(1)
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              ✕ Clear
            </button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">No orders found</p>
            ) : orders.map((o) => (
              <div
                key={o.id}
                onClick={() => openDetailPanel(o.id)}
                className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold font-mono">{o.orderNumber}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                    STATUS_COLORS[o.status] ?? 'bg-slate-700 text-slate-300'
                  )}>{o.status}</span>
                </div>
                <p className="text-slate-400 text-xs">{o.customer?.displayName ?? 'Guest'}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-slate-500 text-xs">{fmtTime(o.createdAt)}</p>
                  <p className="text-white text-sm font-bold tabular-nums">{fmtCurrency(o.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Order</th>
                    <th className="text-left px-4 py-3 font-semibold">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Channel</th>
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                    <th className="text-left px-4 py-3 font-semibold">Created</th>
                    <th className="text-center px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <td className="px-4 py-3" onClick={() => openDetailPanel(o.id)}>
                          <p className="font-mono text-white text-xs">{o.orderNumber}</p>
                          <p className="text-slate-500 text-xs capitalize">{o.orderType}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs" onClick={() => openDetailPanel(o.id)}>
                          {o.customer?.displayName ?? <span className="text-slate-500">Guest</span>}
                        </td>
                        <td className="px-4 py-3" onClick={() => openDetailPanel(o.id)}>
                          <span className={clsx(
                            'px-2 py-1 rounded-full text-xs font-semibold',
                            STATUS_COLORS[o.status] ?? 'bg-slate-700 text-slate-300'
                          )}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300" onClick={() => openDetailPanel(o.id)}>
                          {CHANNEL_ICONS[o.sourceChannel] ?? '?'} <span className="capitalize text-xs">{o.sourceChannel}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-mono font-semibold text-xs" onClick={() => openDetailPanel(o.id)}>
                          {fmtCurrency(o.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs" onClick={() => openDetailPanel(o.id)}>
                          {fmtTime(o.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetailPanel(o.id) }}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-slate-400 text-xs">
                {total} order{total !== 1 ? 's' : ''} · page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Order Detail Panel ── */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto flex flex-col">
            {detailLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedOrder ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                  <p className="font-mono text-white text-lg font-semibold">{selectedOrder.orderNumber}</p>
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'px-2 py-1 rounded-full text-xs font-semibold',
                      STATUS_COLORS[selectedOrder.status] ?? 'bg-slate-700 text-slate-300'
                    )}>
                      {selectedOrder.status}
                    </span>
                    <button onClick={closeDetailPanel} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
                  </div>
                </div>

                <div className="flex-1 px-6 py-6 space-y-6">
                  {/* Refund success */}
                  {refundSuccess && (
                    <div className="bg-green-900/30 border border-green-700/50 rounded-xl px-4 py-3 text-green-300 text-sm">
                      ✓ {refundSuccess}
                    </div>
                  )}

                  {/* Order Info */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Order Info</h3>
                    <div className="space-y-1">
                      {[
                        ['Order Type',  selectedOrder.orderType, 'capitalize'],
                        ['Channel',     selectedOrder.sourceChannel, 'capitalize'],
                        ['Created',     fmtTime(selectedOrder.createdAt), ''],
                        ...(selectedOrder.visitDate ? [['Visit Date', selectedOrder.visitDate, '']] : []),
                      ].map(([label, value, cls]) => (
                        <div key={label} className="flex justify-between py-2 border-b border-slate-800">
                          <span className="text-slate-400 text-sm">{label}</span>
                          <span className={clsx('text-white text-sm font-medium text-right', cls)}>{String(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400 text-sm">Customer</span>
                        {selectedOrder.customer ? (
                          <div className="text-right">
                            <p className="text-white text-sm font-medium">{selectedOrder.customer.displayName}</p>
                            {selectedOrder.customer.email && <p className="text-slate-400 text-xs">{selectedOrder.customer.email}</p>}
                            {selectedOrder.customer.mobileNumber && <p className="text-slate-400 text-xs">{selectedOrder.customer.mobileNumber}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">Guest</span>
                        )}
                      </div>
                      {selectedOrder.notes && (
                        <div className="flex justify-between py-2 border-b border-slate-800">
                          <span className="text-slate-400 text-sm">Notes</span>
                          <span className="text-white text-sm font-medium text-right max-w-xs">{selectedOrder.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="text-white font-mono">{fmtCurrency(Number(selectedOrder.totalAmount) - Number(selectedOrder.taxAmount ?? 0) + Number(selectedOrder.discountAmount ?? 0))}</span>
                    </div>
                    {Number(selectedOrder.discountAmount ?? 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Discount</span>
                        <span className="text-red-400 font-mono">−{fmtCurrency(selectedOrder.discountAmount)}</span>
                      </div>
                    )}
                    {Number(selectedOrder.taxAmount ?? 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Tax</span>
                        <span className="text-slate-300 font-mono">{fmtCurrency(selectedOrder.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t border-slate-700 pt-2 mt-2">
                      <span className="text-white">Total</span>
                      <span className="text-white font-mono">{fmtCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Items ({selectedOrder.orderItems.length})</h3>
                      <div className="space-y-2">
                        {selectedOrder.orderItems.map((item) => (
                          <div key={item.id} className="bg-slate-800 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex-1 min-w-0 mr-2">
                                <p className="text-white text-sm font-medium truncate">{item.productName}</p>
                                <div className="flex gap-2 mt-0.5 flex-wrap">
                                  {item.productCode && <span className="text-slate-500 text-xs font-mono">{item.productCode}</span>}
                                  <span className="text-slate-500 text-xs capitalize">{item.productType?.replace(/_/g, ' ')}</span>
                                  {item.visitorTypeName && <span className="text-blue-400 text-xs">{item.visitorTypeName}</span>}
                                  {item.priceOverridden && <span className="text-amber-400 text-xs">⚠ overridden</span>}
                                </div>
                              </div>
                              <span className="text-white font-mono text-sm font-semibold whitespace-nowrap">{fmtCurrency(item.totalAmount)}</span>
                            </div>
                            <div className="flex gap-4 text-xs text-slate-400">
                              <span>Qty: {item.quantity}</span>
                              <span>Unit: {fmtCurrency(item.unitPrice)}</span>
                              {Number(item.discountAmount) > 0 && <span className="text-red-400">Disc: −{fmtCurrency(item.discountAmount)}</span>}
                              {Number(item.taxAmount) > 0 && <span>Tax: {fmtCurrency(item.taxAmount)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payments */}
                  {selectedOrder.orderPayments && selectedOrder.orderPayments.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Payments</h3>
                      <div className="rounded-xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-800 text-slate-400">
                              <th className="text-left px-3 py-2 font-semibold">Method</th>
                              <th className="text-right px-3 py-2 font-semibold">Amount</th>
                              <th className="text-left px-3 py-2 font-semibold">Status</th>
                              <th className="text-left px-3 py-2 font-semibold">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {selectedOrder.orderPayments.map((payment) => (
                              <tr key={payment.id} className="hover:bg-slate-800/50">
                                <td className="px-3 py-2">
                                  <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold', PAYMENT_METHOD_COLORS[payment.paymentMethod] ?? 'bg-slate-700 text-slate-300')}>
                                    {payment.paymentMethod}
                                  </span>
                                </td>
                                <td className={clsx('px-3 py-2 text-right font-mono font-medium', Number(payment.amount) < 0 ? 'text-red-400' : 'text-white')}>
                                  {Number(payment.amount) < 0 ? '−' : ''}{fmtCurrency(Math.abs(Number(payment.amount)))}
                                  {Number(payment.amount) < 0 && <span className="ml-1 text-red-500 text-xs">(refund)</span>}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold', STATUS_COLORS[payment.status] ?? 'bg-slate-700 text-slate-300')}>
                                    {payment.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-400">{fmtTime(payment.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Status History */}
                  {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Status History</h3>
                      <div className="space-y-3">
                        {selectedOrder.statusHistory.map((entry, idx) => (
                          <div key={entry.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={clsx('w-3 h-3 rounded-full flex-shrink-0', STATUS_COLORS[entry.newStatus]?.split(' ')[0] || 'bg-slate-600')} />
                              {idx < selectedOrder.statusHistory.length - 1 && <div className="w-0.5 h-8 bg-slate-700 mt-2" />}
                            </div>
                            <div className="pt-0.5">
                              <p className="text-sm font-medium text-white">
                                <span className="text-slate-400 capitalize">{entry.previousStatus}</span>
                                <span className="mx-1 text-slate-500">→</span>
                                <span className="capitalize">{entry.newStatus}</span>
                              </p>
                              <p className="text-xs text-slate-400">{fmtTime(entry.changedAt)}</p>
                              {entry.reason && <p className="text-xs text-slate-500 mt-1">{entry.reason}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Refund panel */}
                  {showRefund && (
                    <div className="bg-slate-800 rounded-xl p-4 border border-red-800/50 space-y-4">
                      <h3 className="text-sm font-semibold text-red-300">Process Refund</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">
                            Refund Amount (₹) — max {fmtCurrency(selectedOrder.totalAmount)}
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={Number(selectedOrder.totalAmount)}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className={clsx(INPUT_CLS, 'w-full')}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Refund Method</label>
                          <select
                            value={refundMethod}
                            onChange={(e) => setRefundMethod(e.target.value as 'original' | 'cash')}
                            className={clsx(SELECT_CLS, 'w-full')}
                          >
                            <option value="original">Original method</option>
                            <option value="cash">Cash</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Reason *</label>
                          <input
                            type="text"
                            placeholder="Reason for refund"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            className={clsx(INPUT_CLS, 'w-full')}
                          />
                        </div>
                        {refundError && (
                          <p className="text-red-400 text-xs">{refundError}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={submitRefund}
                            disabled={refundLoading}
                            className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold"
                          >
                            {refundLoading ? 'Processing…' : 'Confirm Refund'}
                          </button>
                          <button
                            onClick={() => { setShowRefund(false); setRefundError('') }}
                            disabled={refundLoading}
                            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: action buttons */}
                <div className="px-6 py-4 border-t border-slate-700 sticky bottom-0 bg-slate-900 flex gap-3">
                  {canRefund && selectedOrder.status === 'paid' && !showRefund && (
                    <button
                      onClick={openRefundPanel}
                      className="flex-1 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold"
                    >
                      ↩ Refund Order
                    </button>
                  )}
                  <button
                    onClick={closeDetailPanel}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Failed to load order details
              </div>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
