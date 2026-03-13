'use client'

import { useState, useEffect, useRef } from 'react'
import { usePosStore } from '@/store/posStore'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PAYMENT_METHODS = [
  { key: 'cash',      label: 'Cash',   icon: '💵' },
  { key: 'upi',       label: 'UPI',    icon: '📱' },
  { key: 'card',      label: 'Card',   icon: '💳' },
  { key: 'wallet',    label: 'Wallet', icon: '👛' },
  { key: 'gift_card', label: 'Gift',   icon: '🎁' },
]

const todayIso = () => new Date().toISOString().slice(0, 10)
const fmtDate  = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// ─── Customer search result type ───────────────────────────────────────────

interface AccountResult {
  id: string
  displayName: string
  email?: string
  mobileNumber?: string
}

// ─── CustomerSearch component ───────────────────────────────────────────────

const isLikePhone = (s: string) => /^[+\d\s\-()]{6,}$/.test(s.trim())

function CustomerSearch() {
  const { accountId, accountName, setAccountId } = usePosStore()

  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<AccountResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [showDrop, setShowDrop]     = useState(false)

  // Quick-create form state
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createMobile, setCreateMobile] = useState('')
  const [createEmail, setCreateEmail]   = useState('')
  const [creating, setCreating]     = useState(false)

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef   = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDrop(false)
        setShowCreate(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await posApi.accounts.search(query.trim())
        setResults(res.data.data ?? [])
        setShowDrop(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [query])

  const select = (acct: AccountResult) => {
    setAccountId(acct.id, acct.displayName)
    setQuery('')
    setResults([])
    setShowDrop(false)
  }

  const clear = () => {
    setAccountId(null)
    setQuery('')
    setResults([])
    setShowDrop(false)
  }

  // Open the quick-create form, pre-filling mobile if query looks like a phone
  const openCreate = () => {
    const q = query.trim()
    setCreateMobile(isLikePhone(q) ? q : '')
    setCreateName(isLikePhone(q) ? '' : q)
    setCreateEmail('')
    setShowDrop(false)
    setShowCreate(true)
  }

  const cancelCreate = () => {
    setShowCreate(false)
    setCreateName('')
    setCreateMobile('')
    setCreateEmail('')
  }

  const submitCreate = async () => {
    if (!createName.trim()) return
    setCreating(true)
    try {
      const payload: { displayName: string; mobileNumber?: string; email?: string } = {
        displayName: createName.trim(),
      }
      if (createMobile.trim()) payload.mobileNumber = createMobile.trim()
      if (createEmail.trim())  payload.email        = createEmail.trim()
      const res = await posApi.accounts.create(payload)
      const acct: AccountResult = res.data.data
      setAccountId(acct.id, acct.displayName)
      setQuery('')
      setShowCreate(false)
      setCreateName('')
      setCreateMobile('')
      setCreateEmail('')
      toast.success(`Customer "${acct.displayName}" created`)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create customer')
    } finally {
      setCreating(false)
    }
  }

  // ── If customer already selected ──────────────────────────────────────────
  if (accountId) {
    return (
      <div className="flex items-center justify-between bg-blue-900/30 border border-blue-700/50 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">👤</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-300 truncate">{accountName ?? 'Customer'}</p>
            <p className="text-xs text-slate-500">Linked to order</p>
          </div>
        </div>
        <button
          onClick={clear}
          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 rounded shrink-0 ml-2"
          title="Remove customer"
        >✕</button>
      </div>
    )
  }

  // ── Quick-create inline form ───────────────────────────────────────────────
  if (showCreate) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-300 mb-1">New customer</p>
        <input
          type="text"
          className="w-full bg-slate-700 border border-slate-500 rounded-lg text-sm text-white placeholder-slate-500
                     px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="Full name *"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          autoFocus
        />
        <input
          type="tel"
          className="w-full bg-slate-700 border border-slate-500 rounded-lg text-sm text-white placeholder-slate-500
                     px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="Mobile number"
          value={createMobile}
          onChange={(e) => setCreateMobile(e.target.value)}
        />
        <input
          type="email"
          className="w-full bg-slate-700 border border-slate-500 rounded-lg text-sm text-white placeholder-slate-500
                     px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="Email (optional)"
          value={createEmail}
          onChange={(e) => setCreateEmail(e.target.value)}
        />
        <div className="flex gap-2 pt-1">
          <button
            onClick={cancelCreate}
            className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600"
          >Cancel</button>
          <button
            onClick={submitCreate}
            disabled={!createName.trim() || creating}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium
                       hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {creating
              ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              : 'Add customer'
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Search input + dropdown ────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          {searching ? (
            <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
          ) : '🔍'}
        </span>
        <input
          type="text"
          className="w-full bg-slate-800 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500
                     pl-8 pr-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          placeholder="Search by name, phone or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDrop(true)}
        />
      </div>

      {/* Results dropdown */}
      {showDrop && (results.length > 0 || (!searching && query.trim().length >= 2)) && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl
                        shadow-lg overflow-hidden">
          {/* Existing matches */}
          <div className="max-h-36 overflow-y-auto">
            {results.map((acct) => (
              <button
                key={acct.id}
                onClick={() => select(acct)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-700 active:bg-slate-600 transition-colors"
              >
                <p className="text-sm font-medium text-white">{acct.displayName}</p>
                <p className="text-xs text-slate-400 truncate">
                  {[acct.mobileNumber, acct.email].filter(Boolean).join(' · ')}
                </p>
              </button>
            ))}
          </div>

          {/* Always-present "Add new" option */}
          <button
            onClick={openCreate}
            className="w-full text-left px-3 py-2.5 border-t border-slate-700 hover:bg-slate-700 active:bg-slate-600
                       transition-colors flex items-center gap-2 text-blue-400"
          >
            <span className="text-base">➕</span>
            <div>
              <p className="text-sm font-medium">Add new customer</p>
              {results.length === 0 && (
                <p className="text-xs text-slate-500">No existing match for "{query.trim()}"</p>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Cart ──────────────────────────────────────────────────────────────────

interface CartProps {
  /** Called when the cart should close (mobile drawer mode). */
  onClose?: () => void
}

export default function Cart({ onClose }: CartProps) {
  const {
    cart, staff, removeFromCart, updateQuantity, clearCart,
    cartSubtotal, cartTotal, promoDiscount,
    accountId, visitDate, appliedPromo,
    venueConfig,
  } = usePosStore()

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [processing, setProcessing]       = useState(false)
  const [lastOrderId, setLastOrderId]     = useState<string | null>(null)

  const subtotal    = cartSubtotal()
  const discount    = promoDiscount()
  const total       = cartTotal()
  const gst         = total - (subtotal - discount)
  const itemCount   = cart.reduce((n, i) => n + i.quantity, 0)
  const dateIsToday = visitDate === todayIso()

  const requireCustomer   = venueConfig.requireCustomer
  const customerMissing   = requireCustomer && !accountId

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    if (customerMissing) { toast.error('Please select a customer to continue'); return }
    setProcessing(true)
    try {
      const res = await posApi.orders.create({
        channel: 'pos',
        items: cart.map((item) => ({
          productId:      item.productId,
          quantity:       item.quantity,
          unitPrice:      item.unitPrice,
          discountAmount: item.discountAmount,
          visitorTypeId:  item.visitorTypeId,
          resourceSlotId: item.resourceSlotId,
          resourceId:     item.resourceId,
          holdId:         item.holdId,
        })),
        payments: [{ method: paymentMethod, amount: total }],
        accountId:  accountId ?? undefined,
        operatorId: staff?.id,
        promoCode:  appliedPromo?.code ?? undefined,
        notes:      !dateIsToday ? `Visit date: ${visitDate}` : undefined,
      })
      const order = res.data.data
      setLastOrderId(order.orderNumber)
      clearCart()
      toast.success(`Order ${order.orderNumber} complete!`)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Order failed')
    } finally {
      setProcessing(false)
    }
  }

  // ── Empty ──────────────────────────────────────────────────────────────────────

  if (cart.length === 0 && !lastOrderId) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        {/* Customer search always visible at top even when cart is empty */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-700 shrink-0">
          <CustomerSearch />
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-slate-500 gap-3 p-8">
          <span className="text-5xl">🛒</span>
          <p className="text-sm text-center">Tap a product to add it to the cart</p>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────────

  if (lastOrderId && cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-8">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>
        <p className="text-lg font-bold text-green-400">Order Complete</p>
        <p className="text-slate-400 text-sm font-mono">{lastOrderId}</p>
        <button
          onClick={() => { setLastOrderId(null); onClose?.() }}
          className="btn-primary w-full mt-2"
        >
          New Order
        </button>
      </div>
    )
  }

  // ── Main ───────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-900">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <h2 className="font-semibold text-white">
          Cart
          <span className="ml-1.5 text-xs font-normal text-slate-400">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {/* Date indicator (non-today) */}
          {!dateIsToday && (
            <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/50 rounded-full px-2 py-0.5">
              📅 {fmtDate(visitDate)}
            </span>
          )}
          {/* Promo indicator */}
          {appliedPromo && (
            <span className="text-xs bg-green-900/40 text-green-300 border border-green-700/50 rounded-full px-2 py-0.5">
              🏷 {appliedPromo.code}
            </span>
          )}
          <button onClick={clearCart} className="text-xs text-slate-500 hover:text-red-400">
            Clear
          </button>
        </div>
      </div>

      {/* Customer search */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-700 shrink-0">
        {requireCustomer && !accountId && (
          <p className="text-xs text-amber-400 mb-1.5 flex items-center gap-1">
            <span>⚠️</span> Customer required for checkout
          </p>
        )}
        <CustomerSearch />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {cart.map((item) => {
          const lineKey = `${item.productId}::${item.visitorTypeId ?? 'default'}`
          return (
            <div key={lineKey} className="bg-slate-800 rounded-xl px-3 py-2.5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-tight truncate">{item.productName}</p>
                  {item.visitorTypeName && (
                    <p className="text-xs text-blue-400 mt-0.5">{item.visitorTypeName}</p>
                  )}
                  {item.originalUnitPrice !== undefined && (
                    <p className="text-xs text-amber-400 mt-0.5">
                      ₹{item.unitPrice.toLocaleString('en-IN')}
                      <span className="line-through text-slate-500 ml-1">₹{item.originalUnitPrice.toLocaleString('en-IN')}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeFromCart(item.productId, item.visitorTypeId)}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 rounded shrink-0"
                >✕</button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1, item.visitorTypeId)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white font-bold flex items-center justify-center"
                  >−</button>
                  <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1, item.visitorTypeId)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white font-bold flex items-center justify-center"
                  >+</button>
                </div>
                <span className="text-sm font-bold text-white tabular-nums">₹{item.lineTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-slate-700 px-4 py-3 space-y-1 shrink-0">
        {discount > 0 && (
          <>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm text-green-400">
              <span>Promo ({appliedPromo?.code})</span>
              <span className="tabular-nums">−₹{discount.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-baseline pt-0.5">
          <span className="font-bold text-white">Total</span>
          <div className="text-right">
            <p className="font-bold text-white text-xl tabular-nums">₹{total.toFixed(2)}</p>
            <p className="text-xs text-slate-500">incl. ₹{Math.max(0, gst).toFixed(2)} GST</p>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="px-3 pb-3 shrink-0">
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.key}
              onClick={() => setPaymentMethod(pm.key)}
              className={clsx(
                'flex flex-col items-center justify-center py-2 rounded-xl text-xs font-medium transition-colors min-h-[52px]',
                paymentMethod === pm.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 active:bg-slate-600'
              )}
            >
              <span className="text-base mb-0.5">{pm.icon}</span>
              {pm.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleCheckout}
          disabled={processing || customerMissing}
          className={clsx(
            'w-full py-4 rounded-2xl font-bold text-lg transition-colors',
            customerMissing
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {processing
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing…
              </span>
            : customerMissing
              ? 'Select a customer to charge'
              : `Charge  ₹${total.toFixed(2)}`
          }
        </button>
      </div>
    </div>
  )
}
