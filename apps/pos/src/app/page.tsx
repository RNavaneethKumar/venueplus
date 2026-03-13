'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePosStore } from '@/store/posStore'
import { type TillSession } from '@/store/posStore'
import { posApi } from '@/lib/api'
import ProductGrid from '@/components/pos/ProductGrid'
import Cart from '@/components/pos/Cart'
import Topbar from '@/components/pos/Topbar'
import Tabs from '@/components/pos/Tabs'
import QuickActionBar from '@/components/pos/QuickActionBar'

const DEVICE_TOKEN_KEY = 'venueplus_device_token'
const HEARTBEAT_INTERVAL_MS = 60_000 // 1 minute

export default function PosPage() {
  const router = useRouter()
  const { token, activeTab, setVenueConfig, setTillSession, cart, cartTotal, hasRole } = usePosStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  // Periodic heartbeat — keeps device lastHeartbeatAt fresh in admin panel
  useEffect(() => {
    if (!token) return
    const deviceToken = typeof window !== 'undefined'
      ? window.localStorage.getItem(DEVICE_TOKEN_KEY)
      : null
    if (!deviceToken) return

    const sendHeartbeat = () => { posApi.device.heartbeat(deviceToken).catch(() => {}) }
    sendHeartbeat() // immediate on mount
    const id = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(id)
  }, [token])

  // Guard: POS terminal must be licensed.
  // Admin roles (super_admin, venue_admin, manager) are exempt — send them to /admin.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const deviceToken = window.localStorage.getItem(DEVICE_TOKEN_KEY)
      if (!deviceToken) {
        const exempt = hasRole('super_admin', 'venue_admin', 'manager')
        router.replace(exempt ? '/admin' : '/activate')
      }
    }
  }, [router, hasRole])

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    // Fetch venue config (not persisted — refresh each session)
    posApi.venue.getPosConfig()
      .then((res) => setVenueConfig(res.data.data))
      .catch(() => { /* silently ignore — default is requireCustomer: false */ })
    // Reload active till session (not persisted — check API each mount)
    posApi.till.getActiveSession()
      .then((res) => {
        const s = res.data.data
        setTillSession({
          id:            s.id,
          drawerId:      s.drawerId ?? null,
          openedBy:      s.openedBy,
          status:        s.status,
          openTime:      s.openTime,
          openingAmount: Number(s.openingAmount),
          movements:     s.movements ?? [],
        } satisfies TillSession)
      })
      .catch(() => setTillSession(null))
    loadProducts()
  }, [token, activeTab])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await posApi.products.list('pos')
      const allProducts: any[] = res.data.data

      const categoryMap: Record<string, string[]> = {
        tickets:    ['ticket', 'add_on'],
        fnb:        ['food_beverage'],
        retail:     ['retail'],
        wallet:     ['wallet_load', 'gift_card'],
        membership: ['membership'],
      }
      setProducts(allProducts.filter((p) => (categoryMap[activeTab] ?? []).includes(p.productType)))
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const itemCount = cart.reduce((n, i) => n + i.quantity, 0)
  const total     = cartTotal()

  return (
    <div className="h-full flex overflow-hidden bg-gray-950">

      {/* ── Left: product area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 sm:border-r sm:border-slate-700">
        <Topbar />
        <Tabs />

        {/* Scrollable product grid */}
        <div className="flex-1 overflow-y-auto p-3 xl:p-4 pb-[136px] sm:pb-3">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>

        {/* Quick action bar pinned to bottom of left column */}
        <QuickActionBar />
      </div>

      {/* ── Right: cart — desktop only ── */}
      <div className="hidden sm:flex w-80 xl:w-96 flex-col shrink-0">
        <Cart />
      </div>

      {/* ── Mobile: floating "View Cart" pill (above QuickActionBar ~72px) ── */}
      {itemCount > 0 && (
        <button
          onClick={() => setCartDrawerOpen(true)}
          className="sm:hidden fixed bottom-[76px] left-4 right-4 z-30
                     flex items-center justify-between
                     bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                     text-white rounded-2xl px-4 py-3 shadow-xl shadow-blue-950/70"
        >
          <span className="flex items-center gap-2.5 font-semibold">
            <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
              {itemCount}
            </span>
            View Cart
          </span>
          <span className="font-bold tabular-nums">₹{total.toFixed(2)}</span>
        </button>
      )}

      {/* ── Mobile: Cart bottom-sheet drawer ── */}
      {cartDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setCartDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden bg-slate-900 shadow-2xl"
               style={{ maxHeight: '85vh' }}>
            {/* Drag handle row */}
            <div className="relative flex items-center justify-center px-4 pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-slate-600 rounded-full" />
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white active:bg-slate-700"
              >✕</button>
            </div>
            {/* Cart content — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Cart onClose={() => setCartDrawerOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
