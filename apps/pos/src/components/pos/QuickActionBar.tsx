'use client'

import { useState, useEffect } from 'react'
import { usePosStore } from '@/store/posStore'
import { posApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import DateCalendar from './DateCalendar'
import ManagerOverrideModal from './ManagerOverrideModal'
import TillMenuSheet from './TillMenuSheet'
import OrdersSheet from './OrdersSheet'

// ─── Types ────────────────────────────────────────────────────────────────────

type Sheet = 'date' | 'promo' | 'override' | 'confirmDateChange' | 'till' | 'orders' | null

interface OverridePending {
  productId: string
  visitorTypeId: string | undefined
  productName: string
  currentPrice: number
}

const todayIso   = () => new Date().toISOString().slice(0, 10)
const maxDateIso = () => {
  const d = new Date(); d.setDate(d.getDate() + 90)
  return d.toISOString().slice(0, 10)
}
const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickActionBar() {
  const {
    cart,
    clearCart,
    visitDate,
    setVisitDate,
    appliedPromo,
    setPromoCode,
    applyPromo,
    overridePrice,
    tillSession,
  } = usePosStore()

  const [sheet, setSheet]                     = useState<Sheet>(null)
  const [pendingDate, setPendingDate]         = useState<string | null>(null)
  const [promoInput, setPromoInput]           = useState('')
  const [promoLoading, setPromoLoading]       = useState(false)
  const [overridePending, setOverridePending] = useState<OverridePending | null>(null)
  // Defer store-derived values that live in localStorage until after hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Use safe client-only values — fall back to neutral defaults during SSR
  const safeTillSession = mounted ? tillSession : null
  const safeVisitDate   = mounted ? visitDate : todayIso()

  const dateIsToday = safeVisitDate === todayIso()

  // ── Date handling ─────────────────────────────────────────────────────────

  // Called when user picks a date in the calendar.
  // DateCalendar no longer calls onClose() after onChange(), so this function
  // is the sole owner of the sheet transition — no batching conflict.
  const handleDateChange = (iso: string) => {
    if (cart.length > 0 && iso !== visitDate) {
      // Cart has items — save pending date and show confirmation
      setPendingDate(iso)
      setSheet('confirmDateChange')
    } else {
      setVisitDate(iso)
      setSheet(null)
    }
  }

  const confirmDateChange = () => {
    if (!pendingDate) return
    clearCart()                   // resets cart, promo, visitDate → today
    setVisitDate(pendingDate)     // override to the chosen date
    setPendingDate(null)
    setSheet(null)
    toast.success(`Visit date set to ${fmtDate(pendingDate)}`)
  }

  const cancelDateChange = () => {
    setPendingDate(null)
    setSheet(null)
  }

  // ── Promo ─────────────────────────────────────────────────────────────────

  const handlePromoApply = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    try {
      const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0)
      const res = await posApi.orders.validatePromo(promoInput.trim(), subtotal)
      const promo = res.data.data
      applyPromo({ code: promo.code, discountType: promo.discountType, discountValue: promo.discountValue, description: promo.description ?? undefined })
      setPromoCode(promo.code)
      setPromoInput('')
      setSheet(null)
      toast.success(`Promo applied: ${promo.description ?? promo.code}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Invalid promo code')
    } finally {
      setPromoLoading(false)
    }
  }

  const handlePromoRemove = () => {
    applyPromo(null)
    setPromoCode(null)
    setPromoInput('')
  }

  // ── Bar buttons ───────────────────────────────────────────────────────────

  type BarButton = { label: string; icon: string; active?: boolean; onClick: () => void; dot?: 'green' | 'red' }

  const buttons: BarButton[] = [
    {
      label:   dateIsToday ? 'Today' : fmtDate(visitDate),
      icon:    '📅',
      active:  !dateIsToday,
      onClick: () => setSheet('date'),
    },
    {
      label:   appliedPromo ? appliedPromo.code : 'Promo',
      icon:    '🏷',
      active:  !!appliedPromo,
      onClick: () => setSheet('promo'),
    },
    {
      label:   'Override',
      icon:    '💲',
      active:  false,
      onClick: () => cart.length > 0 ? setSheet('override') : toast('Add items to cart first', { icon: 'ℹ️' }),
    },
    {
      label:   safeTillSession ? 'Till Open' : 'Till',
      icon:    '💰',
      active:  !!safeTillSession,
      onClick: () => setSheet('till'),
      dot:     safeTillSession ? 'green' : 'red',
    },
    {
      label:   'Orders',
      icon:    '🧾',
      active:  false,
      onClick: () => setSheet('orders'),
    },
  ]

  return (
    <>
      {/* ── Bar ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-t border-slate-700">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className={clsx(
              'flex-1 relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-medium transition-colors min-h-[52px]',
              btn.active
                ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white active:bg-slate-600'
            )}
          >
            <span className="text-base mb-0.5 relative">
              {btn.icon}
              {btn.dot && (
                <span className={clsx(
                  'absolute -top-0.5 -right-1 w-2 h-2 rounded-full border border-slate-800',
                  btn.dot === 'green' ? 'bg-green-400' : 'bg-red-500'
                )} />
              )}
            </span>
            <span className="truncate max-w-full px-1">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* ── Date Calendar Sheet ────────────────────────────────────────────── */}
      {sheet === 'date' && (
        <DateCalendar
          value={visitDate}
          min={todayIso()}
          max={maxDateIso()}
          onChange={handleDateChange}
          onClose={() => setSheet(null)}
        />
      )}

      {/* ── Date Change Confirmation ──────────────────────────────────────── */}
      {sheet === 'confirmDateChange' && pendingDate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={cancelDateChange}
        >
          <div
            className="bg-slate-800 border border-slate-700 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>
            <div className="px-5 pt-5 pb-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl mb-3 mx-auto">
                📅
              </div>
              <h3 className="font-bold text-white text-lg text-center">Change visit date?</h3>
              <p className="text-slate-400 text-sm text-center mt-1">
                Changing to <span className="text-white font-semibold">{fmtDate(pendingDate)}</span> will
                clear your current cart ({cart.length} item{cart.length !== 1 ? 's' : ''}).
              </p>
            </div>
            <div className="px-5 pb-5 pt-3 flex gap-3">
              <button
                onClick={cancelDateChange}
                className="flex-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDateChange}
                className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                Clear &amp; Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Promo Sheet ───────────────────────────────────────────────────── */}
      {sheet === 'promo' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setSheet(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <h3 className="font-bold text-white text-lg">Promo Code</h3>
              <button onClick={() => setSheet(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300">✕</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {appliedPromo ? (
                <div>
                  <div className="flex items-center justify-between bg-green-900/40 border border-green-600/50 rounded-2xl px-4 py-3 mb-3">
                    <div>
                      <p className="font-bold text-green-400">{appliedPromo.code}</p>
                      {appliedPromo.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{appliedPromo.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {appliedPromo.discountType === 'percent'
                          ? `${appliedPromo.discountValue}% off`
                          : `₹${appliedPromo.discountValue} off`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { handlePromoRemove(); setSheet(null) }}
                    className="w-full py-3 rounded-2xl bg-red-900/30 border border-red-700/50 text-red-400 hover:bg-red-900/50 font-semibold"
                  >
                    Remove Promo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    className="input text-base py-3 uppercase tracking-wider"
                    placeholder="Enter promo code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handlePromoApply()}
                    autoFocus
                  />
                  <button
                    onClick={handlePromoApply}
                    disabled={promoLoading || !promoInput.trim()}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-base"
                  >
                    {promoLoading ? 'Validating…' : 'Apply Code'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Price Override: Item Picker Sheet ─────────────────────────────── */}
      {sheet === 'override' && !overridePending && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setSheet(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-700 shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">Price Override</h3>
                <p className="text-slate-400 text-sm">Select a cart item to override</p>
              </div>
              <button onClick={() => setSheet(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300">✕</button>
            </div>
            <div className="overflow-y-auto px-4 py-3 space-y-2">
              {cart.map((item) => {
                const lineKey = `${item.productId}::${item.visitorTypeId ?? 'default'}`
                return (
                  <button
                    key={lineKey}
                    onClick={() => setOverridePending({
                      productId: item.productId,
                      visitorTypeId: item.visitorTypeId,
                      productName: item.visitorTypeName
                        ? `${item.productName} · ${item.visitorTypeName}`
                        : item.productName,
                      currentPrice: item.unitPrice,
                    })}
                    className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl px-4 py-3 transition-colors min-h-[56px]"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-white">{item.productName}</p>
                      {item.visitorTypeName && (
                        <p className="text-xs text-blue-400">{item.visitorTypeName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-bold tabular-nums">₹{item.unitPrice.toLocaleString('en-IN')}</p>
                      {item.originalUnitPrice && (
                        <p className="text-xs text-slate-500 line-through tabular-nums">₹{item.originalUnitPrice.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Manager Override Modal */}
      {overridePending && (
        <ManagerOverrideModal
          productName={overridePending.productName}
          currentPrice={overridePending.currentPrice}
          onApprove={(newPrice) => {
            overridePrice(overridePending.productId, newPrice, overridePending.visitorTypeId)
            setOverridePending(null)
            setSheet(null)
          }}
          onClose={() => { setOverridePending(null); setSheet('override') }}
        />
      )}

      {/* Till Menu Sheet */}
      {sheet === 'till' && (
        <TillMenuSheet onClose={() => setSheet(null)} />
      )}

      {/* Orders Sheet */}
      {sheet === 'orders' && (
        <OrdersSheet onClose={() => setSheet(null)} />
      )}
    </>
  )
}
