'use client'

/**
 * Customer-Facing Display — /pos/display
 *
 * Open this page in a second browser window and drag it to the
 * customer-facing monitor. No login required — it's a read-only view.
 *
 * The cashier's Cart broadcasts state via BroadcastChannel('pos-display').
 * Three screens:
 *   idle      — venue name, welcome, clock (shown when cart is empty)
 *   cart      — live item list + totals as cashier scans
 *   confirmed — thank-you + order number (auto-returns to idle after 5 s)
 */

import { useEffect, useState, useCallback } from 'react'

// ─── Message types (must match Cart.tsx) ─────────────────────────────────────

interface CartItem {
  name:        string
  visitorType?: string
  qty:         number
  lineTotal:   number
}

interface CartPayload {
  items:       CartItem[]
  subtotal:    number
  discount:    number
  gst:         number
  total:       number
  accountName: string | null
  venueName:   string
  promoCode:   string | null
}

interface ConfirmedPayload {
  orderNumber: string
  total:       number
  venueName:   string
}

type DisplayMessage =
  | { type: 'cart_update';     payload: CartPayload }
  | { type: 'order_confirmed'; payload: ConfirmedPayload }
  | { type: 'cart_clear' }

type Screen = 'idle' | 'cart' | 'confirmed'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ─── Idle screen ─────────────────────────────────────────────────────────────

function IdleScreen({ venueName }: { venueName: string }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 select-none px-12 gap-8">
      {/* Decorative ring */}
      <div className="w-28 h-28 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
        <span className="text-5xl">🏟️</span>
      </div>

      {venueName && (
        <h1 className="text-4xl font-bold text-white text-center tracking-tight">{venueName}</h1>
      )}

      <p className="text-2xl text-slate-400 font-light">Welcome!</p>

      {/* Clock */}
      <p className="text-6xl font-mono font-thin text-slate-600 tabular-nums mt-4">{time}</p>

      {/* Subtle footer */}
      <p className="absolute bottom-6 text-xs text-slate-700 tracking-widest uppercase">
        Powered by VenuePlus
      </p>
    </div>
  )
}

// ─── Cart screen ─────────────────────────────────────────────────────────────

function CartScreen({ data }: { data: CartPayload }) {
  const { items, subtotal, discount, gst, total, accountName, promoCode } = data
  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 select-none">

      {/* Header */}
      <div className="px-10 py-6 border-b border-slate-800 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Your Order</p>
          <p className="text-white font-semibold text-lg mt-0.5">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
        {accountName && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-base">
              {accountName.charAt(0).toUpperCase()}
            </div>
            <p className="text-slate-300 font-medium text-base">{accountName}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-10 py-6 space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-6 py-3 border-b border-slate-800/60 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-lg leading-snug truncate">{item.name}</p>
              {item.visitorType && (
                <p className="text-blue-400 text-sm mt-0.5">{item.visitorType}</p>
              )}
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <span className="text-slate-500 text-base tabular-nums">×{item.qty}</span>
              <span className="text-white font-semibold text-lg tabular-nums w-28 text-right">
                {fmt(item.lineTotal)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals panel */}
      <div className="border-t border-slate-800 bg-slate-900 px-10 py-6 shrink-0">
        <div className="max-w-sm ml-auto space-y-2.5">
          {/* Subtotal */}
          <div className="flex justify-between text-base text-slate-400">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>

          {/* Promo / discount */}
          {discount > 0 && (
            <div className="flex justify-between text-base text-green-400">
              <span>
                Discount{promoCode ? ` (${promoCode})` : ''}
              </span>
              <span className="tabular-nums">−{fmt(discount)}</span>
            </div>
          )}

          {/* GST */}
          {gst > 0 && (
            <div className="flex justify-between text-base text-slate-500">
              <span>Tax (GST)</span>
              <span className="tabular-nums">{fmt(gst)}</span>
            </div>
          )}

          {/* Total — hero */}
          <div className="flex justify-between items-baseline pt-3 border-t border-slate-700 mt-1">
            <span className="text-white font-bold text-2xl">Total</span>
            <span className="text-white font-bold text-4xl tabular-nums font-mono">
              {fmt(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Confirmed screen ─────────────────────────────────────────────────────────

function ConfirmedScreen({
  data,
  countdown,
}: {
  data: ConfirmedPayload
  countdown: number
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 select-none px-12 gap-8">

      {/* Animated ring + checkmark */}
      <div className="relative">
        <div className="w-40 h-40 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center animate-pulse">
          <div className="w-28 h-28 rounded-full bg-green-500/20 border-2 border-green-400/40 flex items-center justify-center">
            <span className="text-6xl">✓</span>
          </div>
        </div>
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-5xl font-bold text-white">Thank You!</h1>
        <p className="text-slate-400 text-xl">Your order has been confirmed.</p>
      </div>

      {/* Order number */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl px-8 py-4 text-center">
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Order</p>
        <p className="text-white font-mono font-bold text-2xl">{data.orderNumber}</p>
      </div>

      {/* Amount paid */}
      <p className="text-6xl font-bold text-green-400 font-mono tabular-nums">{fmt(data.total)}</p>

      {/* Countdown pip */}
      <div className="flex gap-1.5 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
              i < countdown ? 'bg-slate-600' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CustomerDisplay() {
  const [screen,    setScreen]    = useState<Screen>('idle')
  const [cartData,  setCartData]  = useState<CartPayload | null>(null)
  const [confData,  setConfData]  = useState<ConfirmedPayload | null>(null)
  const [venueName, setVenueName] = useState('')
  const [countdown, setCountdown] = useState(5)

  const handleMessage = useCallback((e: MessageEvent) => {
    const msg = e.data as DisplayMessage

    if (msg.type === 'cart_update') {
      setVenueName(msg.payload.venueName || '')
      setCartData(msg.payload)
      setScreen('cart')
    } else if (msg.type === 'order_confirmed') {
      setVenueName(msg.payload.venueName || '')
      setConfData(msg.payload)
      setCountdown(5)
      setScreen('confirmed')
    } else if (msg.type === 'cart_clear') {
      setCartData(null)
      setScreen('idle')
    }
  }, [])

  // Subscribe to BroadcastChannel
  useEffect(() => {
    const ch = new BroadcastChannel('pos-display')
    ch.onmessage = handleMessage
    return () => ch.close()
  }, [handleMessage])

  // Confirmed → idle countdown
  useEffect(() => {
    if (screen !== 'confirmed') return
    if (countdown <= 0) { setScreen('idle'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [screen, countdown])

  if (screen === 'cart' && cartData)         return <CartScreen data={cartData} />
  if (screen === 'confirmed' && confData)    return <ConfirmedScreen data={confData} countdown={countdown} />
  return <IdleScreen venueName={venueName} />
}
