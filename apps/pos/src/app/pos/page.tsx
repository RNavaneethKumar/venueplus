'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePosStore } from '@/store/posStore'
import { type TillSession } from '@/store/posStore'
import { posApi } from '@/lib/api'
import { getCompanionDevice, getDeviceToken, getDrawerId } from '@/lib/companionApi'
import ProductGrid from '@/components/pos/ProductGrid'
import Cart from '@/components/pos/Cart'
import Topbar from '@/components/pos/Topbar'
import Tabs from '@/components/pos/Tabs'
import QuickActionBar from '@/components/pos/QuickActionBar'
import TillMenuSheet from '@/components/pos/TillMenuSheet'

const HEARTBEAT_INTERVAL_MS = 60_000 // 1 minute

export default function PosPage() {
  const router = useRouter()
  const { token, activeTab, setVenueConfig, setTillSession, tillSession, cart, cartTotal, hasRole } = usePosStore()
  const [products, setProducts]             = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [mounted, setMounted]               = useState(false)
  const [tillLoading, setTillLoading]       = useState(true)
  const [tillSheetOpen, setTillSheetOpen]   = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Periodic heartbeat — keeps device lastHeartbeatAt fresh in admin panel
  useEffect(() => {
    if (!token) return
    let intervalId: ReturnType<typeof setInterval> | null = null

    getDeviceToken().then((deviceToken) => {
      if (!deviceToken) return
      const sendHeartbeat = () => { posApi.device.heartbeat(deviceToken).catch(() => {}) }
      sendHeartbeat()
      intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    })

    return () => { if (intervalId) clearInterval(intervalId) }
  }, [token])

  // Guard: POS terminal must be licensed.
  // Admin roles bypass device licensing — they can run reports/back-office
  // tasks on any machine without activating a POS device token.
  useEffect(() => {
    getDeviceToken().then((deviceToken) => {
      if (!deviceToken) {
        const exempt = hasRole('super_admin', 'venue_admin', 'manager')
        router.replace(exempt ? '/' : '/activate')
      }
    })
  }, [router, hasRole])

  // Runs once on login: fetch venue config + check for an existing till session.
  // Separated from the products effect so tab switches don't re-check the session.
  // Fetch venue config on mount AND whenever the page becomes visible again
  // (e.g. after switching tabs, or navigating back from the back office).
  // This ensures payment methods and module flags are always up to date.
  useEffect(() => {
    if (!token) return

    const fetchConfig = async () => {
      // Fetch pos-config (tabs, tillMode, etc.) and raw venue settings in parallel.
      // Payment method availability is derived from venue settings directly so it
      // works regardless of whether the API server has the newer pos-config response.
      const [configResult, venueResult] = await Promise.allSettled([
        posApi.venue.getPosConfig(),
        posApi.venue.getVenueInfo(),
      ])

      if (configResult.status === 'rejected') {
        console.warn('[POS] pos-config fetch failed:', configResult.reason?.response?.status, configResult.reason?.message)
        return
      }

      const cfg: Record<string, any> = { ...configResult.value.data.data }

      // If venue settings are available, derive enabledPayments directly from the
      // raw settings map — this is always correct regardless of API server version.
      if (venueResult.status === 'fulfilled') {
        const settingsMap: Record<string, string> = venueResult.value.data.data.settings ?? {}
        const payEnabled = (key: string) => String(settingsMap[key]) !== 'false'
        cfg.enabledPayments = {
          cash:      payEnabled('payment.cash_enabled'),
          card:      payEnabled('payment.card_enabled'),
          upi:       payEnabled('payment.upi_enabled'),
          wallet:    payEnabled('payment.wallet_enabled'),
          gift_card: payEnabled('payment.gift_card_enabled'),
        }
      } else {
        console.warn('[POS] venue info fetch failed:', venueResult.reason?.response?.status, venueResult.reason?.message)
      }

      setVenueConfig(cfg as any)
    }

    fetchConfig()

    // Re-fetch when tab becomes visible again (switching browser tabs)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchConfig() }
    document.addEventListener('visibilitychange', onVisible)

    // Re-fetch when the browser window gains focus (covers Alt+Tab back,
    // returning from a separate admin window, etc.)
    const onFocus = () => fetchConfig()
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Check for an existing till session once per login (token change only).
  useEffect(() => {
    if (!token) { router.push('/login'); return }

    Promise.all([getDrawerId(), getCompanionDevice()]).then(([drawerId, device]) => {
      const deviceId = device?.id ?? null
      const params = drawerId ? { drawerId } : (deviceId ? { deviceId } : undefined)
      return posApi.till.getActiveSession(params)
    })
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
      .finally(() => setTillLoading(false))
  }, [token])

  // Runs on mount and whenever the active tab changes: reload products for that tab.
  useEffect(() => {
    if (!token) return
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

        <div className="flex-1 overflow-y-auto p-3 xl:p-4 pb-[136px] sm:pb-3">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>

        <QuickActionBar />
      </div>

      {/* ── Right: cart — desktop only ── */}
      <div className="hidden sm:flex w-80 xl:w-96 flex-col shrink-0">
        <Cart />
      </div>

      {/* ── Till-not-open gate ────────────────────────────────────────────────
          Rendered after hydration so we don't flash on SSR.
          Covers the product + cart areas but stops above the QuickActionBar
          (bottom-[68px]) so the cashier can still tap "Till" to open it.
      */}
      {mounted && !tillLoading && !tillSession && (
        <div className="fixed inset-x-0 top-0 bottom-[68px] z-40 flex items-center justify-center bg-gray-950/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 px-8 text-center max-w-xs">
            {/* Lock icon */}
            <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-xl">Till Not Open</p>
              <p className="text-slate-400 text-sm mt-1 leading-snug">
                Open a till session before processing sales.
              </p>
            </div>
            <button
              onClick={() => setTillSheetOpen(true)}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-base transition-colors"
            >
              Open Till
            </button>
          </div>
        </div>
      )}

      {/* TillMenuSheet launched from the gate overlay */}
      {tillSheetOpen && (
        <TillMenuSheet onClose={() => setTillSheetOpen(false)} />
      )}

      {/* ── Mobile: floating "View Cart" pill ── */}
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
          <div
            className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setCartDrawerOpen(false)}
          />
          <div
            className="sm:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden bg-slate-900 shadow-2xl"
            style={{ maxHeight: '85vh' }}
          >
            <div className="relative flex items-center justify-center px-4 pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-slate-600 rounded-full" />
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white active:bg-slate-700"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <Cart onClose={() => setCartDrawerOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
