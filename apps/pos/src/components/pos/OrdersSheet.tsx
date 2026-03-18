'use client'

/**
 * OrdersSheet — Bottom sheet for viewing, searching, and refunding POS orders.
 *
 * Accessible from the QuickActionBar "Orders" button.
 * - Server-side search by order number (debounced)
 * - Date range filter (from / to)
 * - Status filter tabs: all / paid / refunded
 * - Paginated "Load More" (20 orders per page)
 * - Tap a row → order detail view (items, payments, status history)
 * - Refund from detail view (permission-gated)
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePosStore } from '@/store/posStore'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: string | number
  createdAt: string
  sourceChannel: string
  customer?: { displayName: string; email?: string; mobileNumber?: string } | null
}

interface OrderDetail extends Order {
  orderType: string
  discountAmount: number
  taxAmount: number
  visitDate: string | null
  notes: string | null
  orderItems: {
    id: string
    productName: string
    productCode: string | null
    productType: string
    visitorTypeName: string | null
    quantity: number
    unitPrice: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    priceOverridden: boolean
  }[]
  orderPayments: {
    id: string
    paymentMethod: string
    amount: number
    status: string
    createdAt: string
  }[]
  statusHistory: {
    id: string
    previousStatus: string
    newStatus: string
    changedAt: string
    reason: string | null
  }[]
}

interface RefundState {
  order: Order
  amount: string
  reason: string
  method: 'cash' | 'original'
  loading: boolean
}

interface Props {
  onClose: () => void
}

type StatusFilter = 'all' | 'paid' | 'refunded'

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | string) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

const fmtDateTime = (iso: string) => {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + fmtTime(iso)
}

const STATUS_CHIP: Record<string, string> = {
  paid:      'bg-green-900/40 text-green-300 border border-green-700/40',
  completed: 'bg-green-900/40 text-green-300 border border-green-700/40',
  refunded:  'bg-red-900/40   text-red-300   border border-red-700/40',
  pending:   'bg-amber-900/40 text-amber-300  border border-amber-700/40',
  cancelled: 'bg-slate-700 text-slate-400',
  void:      'bg-slate-700 text-slate-400',
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash:      'bg-green-900/40 text-green-300',
  card:      'bg-blue-900/40 text-blue-300',
  upi:       'bg-purple-900/40 text-purple-300',
  wallet:    'bg-amber-900/40 text-amber-300',
  gift_card: 'bg-pink-900/40 text-pink-300',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersSheet({ onClose }: Props) {
  const { hasPermission, hasRole, tillSession, staff } = usePosStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const canRefund =
    mounted &&
    (hasPermission('order.refund') || hasRole('manager', 'venue_admin', 'super_admin'))

  // ── List state ──────────────────────────────────────────────────────────────
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]     = useState(false)
  const [page, setPage]           = useState(1)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]     = useState('')
  const [searchQuery, setSearchQuery]     = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [showFilters, setShowFilters]     = useState(false)

  // ── Detail / refund ─────────────────────────────────────────────────────────
  const [detail, setDetail]               = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [refund, setRefund]               = useState<RefundState | null>(null)
  const [showRefundPanel, setShowRefundPanel] = useState(false)
  const [refundError, setRefundError]     = useState('')

  // ── Debounce search ─────────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (v: string) => {
    setSearchInput(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(v)
      setPage(1)
      setOrders([])
    }, 400)
  }

  // ── Load orders ─────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (pg: number, append: boolean) => {
    if (pg === 1 && !append) setLoading(true)
    else setLoadingMore(true)
    try {
      const params: Record<string, string> = {
        channel: 'pos',
        limit:   String(PAGE_SIZE),
        page:    String(pg),
      }
      if (statusFilter !== 'all') params.status   = statusFilter
      if (searchQuery)             params.search   = searchQuery
      if (dateFrom)                params.dateFrom = dateFrom
      if (dateTo)                  params.dateTo   = dateTo

      const res   = await posApi.orders.list(params)
      const rows  = res.data.data ?? []
      const total = res.data.meta?.total ?? rows.length

      setOrders(prev => append ? [...prev, ...rows] : rows)
      setHasMore(pg * PAGE_SIZE < total)
      setPage(pg)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [statusFilter, searchQuery, dateFrom, dateTo])

  // Initial load + reload when filters change
  useEffect(() => {
    setPage(1)
    setOrders([])
    fetchOrders(1, false)
  }, [statusFilter, searchQuery, dateFrom, dateTo])

  const loadMore = () => fetchOrders(page + 1, true)

  // ── Order detail ─────────────────────────────────────────────────────────────
  const openDetail = async (orderId: string) => {
    setDetail(null)
    setDetailLoading(true)
    setShowRefundPanel(false)
    setRefundError('')
    try {
      const res = await posApi.orders.get(orderId)
      setDetail(res.data.data)
    } catch {
      toast.error('Failed to load order details')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetail(null)
    setDetailLoading(false)
    setShowRefundPanel(false)
    setRefund(null)
  }

  // ── Refund ────────────────────────────────────────────────────────────────
  const openRefund = () => {
    if (!detail) return
    setRefund({
      order: detail,
      amount: Number(detail.totalAmount).toFixed(2),
      reason: '',
      method: 'cash',
      loading: false,
    })
    setRefundError('')
    setShowRefundPanel(true)
  }

  const updateRefund = (patch: Partial<RefundState>) =>
    setRefund(r => r ? { ...r, ...patch } : r)

  const handleRefund = async () => {
    if (!refund) return
    const amount = parseFloat(refund.amount)
    if (isNaN(amount) || amount <= 0) { setRefundError('Enter a valid refund amount'); return }
    if (amount > Number(refund.order.totalAmount)) { setRefundError(`Amount cannot exceed ${fmtCurrency(refund.order.totalAmount)}`); return }
    if (!refund.reason.trim()) { setRefundError('Reason is required'); return }

    updateRefund({ loading: true })
    setRefundError('')
    try {
      await posApi.orders.refund(refund.order.id, {
        amount,
        reason: refund.reason.trim(),
        refundMethod: refund.method,
        operatorId: staff?.id,
      })

      if (refund.method === 'cash' && tillSession) {
        await posApi.till.recordMovement({
          sessionId:    tillSession.id,
          movementType: 'paid_out',
          amount,
          reason:       `Refund ${refund.order.orderNumber}: ${refund.reason.trim()}`,
        })
      }

      toast.success(`Refund of ${fmtCurrency(amount)} processed`)
      setShowRefundPanel(false)
      setRefund(null)
      // Refresh detail
      if (detail) openDetail(detail.id)
      // Refresh list
      fetchOrders(1, false)
    } catch (err: any) {
      setRefundError(err.response?.data?.error?.message ?? 'Refund failed')
      updateRefund({ loading: false })
    }
  }

  const hasActiveFilters = !!(dateFrom || dateTo)

  // ── Shared sheet wrapper ──────────────────────────────────────────────────

  const SheetWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={detail || detailLoading ? undefined : onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>
        {children}
      </div>
    </div>
  )

  // ── Order Detail View ──────────────────────────────────────────────────────

  if (detailLoading) {
    return (
      <SheetWrapper>
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </SheetWrapper>
    )
  }

  if (detail) {
    return (
      <SheetWrapper>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-slate-700 shrink-0">
          <button
            onClick={closeDetail}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm shrink-0"
          >←</button>
          <div className="flex-1 min-w-0">
            <p className="font-mono font-bold text-white text-base leading-tight">{detail.orderNumber}</p>
            <p className="text-xs text-slate-400">{fmtDateTime(detail.createdAt)}</p>
          </div>
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0', STATUS_CHIP[detail.status] ?? 'bg-slate-700 text-slate-400')}>
            {detail.status}
          </span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Customer */}
          {detail.customer && (
            <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                {detail.customer.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{detail.customer.displayName}</p>
                {detail.customer.mobileNumber && <p className="text-slate-400 text-xs">{detail.customer.mobileNumber}</p>}
              </div>
            </div>
          )}

          {/* Items — shown first so the summary below has context */}
          {detail.orderItems?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Items ({detail.orderItems.length})
              </p>
              <div className="space-y-1.5">
                {detail.orderItems.map(item => (
                  <div key={item.id} className="bg-slate-800 rounded-xl px-3 py-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-snug">{item.productName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {item.visitorTypeName && (
                            <span className="text-blue-400 text-xs">{item.visitorTypeName}</span>
                          )}
                          {item.productCode && (
                            <span className="text-slate-600 text-xs font-mono">{item.productCode}</span>
                          )}
                          {item.priceOverridden && (
                            <span className="text-amber-400 text-xs">⚠ price overridden</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          ×{item.quantity} @ {fmtCurrency(item.unitPrice)}
                          {Number(item.discountAmount) > 0 && (
                            <span className="text-green-500 ml-1.5">−{fmtCurrency(item.discountAmount)}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-white font-mono text-sm font-semibold whitespace-nowrap">{fmtCurrency(item.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receipt-style order summary */}
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 pt-3 pb-2 space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-slate-300 font-mono">
                  {fmtCurrency(detail.orderItems?.reduce((s, i) => s + Number(i.totalAmount), 0) ?? 0)}
                </span>
              </div>
              {/* Discount */}
              {Number(detail.discountAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Discount</span>
                  <span className="text-green-400 font-mono">−{fmtCurrency(detail.discountAmount)}</span>
                </div>
              )}
              {/* Tax */}
              {Number(detail.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tax (GST)</span>
                  <span className="text-slate-400 font-mono">{fmtCurrency(detail.taxAmount)}</span>
                </div>
              )}
            </div>
            {/* Total — prominent */}
            <div className="border-t border-slate-700 px-4 py-3 flex justify-between items-center">
              <span className="text-white font-bold text-base">Total</span>
              <span className="text-white font-bold text-xl font-mono">{fmtCurrency(detail.totalAmount)}</span>
            </div>
          </div>

          {/* Payments */}
          {detail.orderPayments?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Paid via</p>
              <div className="space-y-1.5">
                {detail.orderPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', PAYMENT_METHOD_COLORS[p.paymentMethod] ?? 'bg-slate-700 text-slate-300')}>
                        {p.paymentMethod.replace(/_/g, ' ')}
                      </span>
                      {Number(p.amount) < 0 && (
                        <span className="text-xs text-red-400 font-medium">Refund</span>
                      )}
                    </div>
                    <span className={clsx('font-mono text-sm font-semibold', Number(p.amount) < 0 ? 'text-red-400' : 'text-white')}>
                      {Number(p.amount) < 0 ? '−' : ''}{fmtCurrency(Math.abs(Number(p.amount)))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status history */}
          {detail.statusHistory?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">History</p>
              <div className="bg-slate-800 rounded-xl px-3 py-2 space-y-0">
                {detail.statusHistory.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3 py-2 relative">
                    {/* Timeline spine */}
                    {idx < detail.statusHistory.length - 1 && (
                      <div className="absolute left-[5px] top-5 bottom-0 w-px bg-slate-700" />
                    )}
                    <div className={clsx(
                      'w-3 h-3 rounded-full mt-0.5 shrink-0 border-2',
                      entry.newStatus === 'paid' || entry.newStatus === 'completed'
                        ? 'bg-green-500 border-green-400'
                        : entry.newStatus === 'refunded'
                        ? 'bg-red-500 border-red-400'
                        : 'bg-slate-500 border-slate-400'
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs text-white leading-tight">
                        <span className="text-slate-400 capitalize">{entry.previousStatus}</span>
                        <span className="mx-1.5 text-slate-600">→</span>
                        <span className="capitalize font-semibold">{entry.newStatus}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{fmtDateTime(entry.changedAt)}</p>
                      {entry.reason && <p className="text-xs text-slate-500 italic mt-0.5">{entry.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund panel (inline, shown when open) */}
          {showRefundPanel && refund && (
            <div className="bg-slate-800 rounded-xl p-4 border border-red-800/40 space-y-3">
              <p className="text-sm font-semibold text-red-300">Process Refund</p>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">
                  Amount (₹) — max {fmtCurrency(refund.order.totalAmount)}
                </label>
                <input
                  type="number" min="0.01" step="0.01" max={Number(refund.order.totalAmount)}
                  className="input w-full" value={refund.amount}
                  onChange={e => updateRefund({ amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Reason *</label>
                <input
                  type="text" className="input w-full" placeholder="e.g. Customer complaint"
                  value={refund.reason} onChange={e => updateRefund({ reason: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cash', 'original'] as const).map(m => (
                    <button key={m} onClick={() => updateRefund({ method: m })}
                      className={clsx('py-2 rounded-xl text-xs font-semibold border transition-colors',
                        refund.method === m
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600')}>
                      {m === 'cash' ? '💵 Cash' : '💳 Original'}
                    </button>
                  ))}
                </div>
                {refund.method === 'cash' && !tillSession && (
                  <p className="text-amber-400 text-xs mt-1.5">⚠ No till open — cash movement won't be recorded</p>
                )}
              </div>
              {refundError && <p className="text-red-400 text-xs">{refundError}</p>}
              <div className="flex gap-2">
                <button onClick={handleRefund} disabled={refund.loading}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold">
                  {refund.loading ? 'Processing…' : 'Confirm Refund'}
                </button>
                <button onClick={() => { setShowRefundPanel(false); setRefundError('') }} disabled={refund.loading}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail footer */}
        {!showRefundPanel && (
          <div className="px-5 py-3 border-t border-slate-700 shrink-0 flex gap-2">
            {canRefund && (detail.status === 'paid' || detail.status === 'completed') && (
              <button onClick={openRefund}
                className="flex-1 py-2.5 rounded-2xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold">
                ↩ Refund Order
              </button>
            )}
            <button onClick={closeDetail}
              className="flex-1 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold">
              ← Back to Orders
            </button>
          </div>
        )}
      </SheetWrapper>
    )
  }

  // ── Orders list ───────────────────────────────────────────────────────────

  return (
    <SheetWrapper>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-700 shrink-0">
        <h3 className="font-bold text-white text-lg">Orders</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
              hasActiveFilters || showFilters
                ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            )}
          >
            {hasActiveFilters ? '⚙ Filters •' : '⚙ Filters'}
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
          >✕</button>
        </div>
      </div>

      {/* Date filters (collapsible) */}
      {showFilters && (
        <div className="px-4 pt-3 pb-2 shrink-0 space-y-2 border-b border-slate-700/50">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="input text-xs py-1.5 w-full" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="input text-xs py-1.5 w-full" />
            </div>
            {hasActiveFilters && (
              <div className="flex items-end pb-0.5">
                <button onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs">
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <input
          type="search" className="input text-sm py-2 w-full" placeholder="Search order number…"
          value={searchInput} onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 px-4 pb-3 border-b border-slate-700/50 shrink-0">
        {(['all', 'paid', 'refunded'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx(
              'flex-1 py-2 rounded-xl text-xs font-semibold transition-colors capitalize',
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}>
            {s === 'paid' ? 'Paid' : s === 'all' ? 'All' : 'Refunded'}
          </button>
        ))}
      </div>

      {/* Order rows */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-700/40">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
            <span className="text-3xl">🧾</span>
            No orders found
          </div>
        ) : (
          <>
            {orders.map(order => (
              <button
                key={order.id}
                onClick={() => openDetail(order.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 active:bg-slate-800 transition-colors text-left"
              >
                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-white font-semibold leading-tight">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmtDateTime(order.createdAt)}
                    {order.customer?.displayName && (
                      <span className="text-slate-400 ml-1.5">· {order.customer.displayName}</span>
                    )}
                  </p>
                </div>

                {/* Status */}
                <span className={clsx(
                  'text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0',
                  STATUS_CHIP[order.status] ?? 'bg-slate-700 text-slate-400'
                )}>
                  {order.status}
                </span>

                {/* Amount + chevron */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-white tabular-nums text-sm">{fmtCurrency(order.totalAmount)}</p>
                  <p className="text-slate-600 text-xs">›</p>
                </div>
              </button>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="px-4 py-3">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </span>
                  ) : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </SheetWrapper>
  )
}
