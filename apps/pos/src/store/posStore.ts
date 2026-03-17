import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  productName: string
  productType: string
  quantity: number
  unitPrice: number
  originalUnitPrice?: number   // set when price is overridden
  discountAmount: number
  lineTotal: number
  visitorTypeId?: string
  visitorTypeName?: string
  resourceSlotId?: string
  resourceId?: string
  holdId?: string
}

export interface StaffInfo {
  id: string
  name: string
  venueId: string
  roles: string[]
  permissions: string[]
}

export interface PromoResult {
  code: string
  discountType: 'percent' | 'flat'
  discountValue: number
  description?: string
}

export interface VenueTabs {
  tickets:     boolean
  fnb:         boolean
  retail:      boolean
  wallet:      boolean
  memberships: boolean
}

export interface PrintSettings {
  receiptWidth:  number   // mm — default 80
  ticketWidth:   number   // mm — default 210
  ticketHeight:  number   // mm — default 99
}

export interface EnabledPayments {
  cash:      boolean
  card:      boolean
  upi:       boolean
  wallet:    boolean
  gift_card: boolean
}

export interface VenueConfig {
  venueName:       string
  requireCustomer: boolean
  tabs: VenueTabs
  /** 'counter' = one till per device/drawer; 'user' = each user has their own float */
  tillMode: 'counter' | 'user'
  /** Print layout dimensions — defined in back office, shared across all POS terminals */
  printSettings: PrintSettings
  /** Which payment methods are available at the POS (all default to true) */
  enabledPayments: EnabledPayments
}

export interface TillSession {
  id: string
  drawerId: string | null
  openedBy: string
  status: 'open' | 'closed' | 'blind_closed' | 'forced' | 'auto'
  openTime: string
  openingAmount: number
  movements: Array<{
    id: string
    movementType: 'drop' | 'paid_in' | 'paid_out'
    amount: number
    reason: string
    createdAt: string
  }>
}

export interface PosState {
  // Auth
  token: string | null
  staff: StaffInfo | null
  // Venue config (loaded after login, not persisted)
  venueConfig: VenueConfig
  // Cart
  cart: CartItem[]
  accountId: string | null
  accountName: string | null   // display name of the selected customer
  promoCode: string | null
  appliedPromo: PromoResult | null
  visitDate: string          // ISO date string YYYY-MM-DD, defaults to today
  // UI state
  activeTab: 'tickets' | 'fnb' | 'retail' | 'wallet' | 'membership'
  // Till session (loaded after login or drawer selection, not persisted)
  tillSession: TillSession | null
  // Actions
  setAuth: (token: string, staff: StaffInfo) => void
  setVenueConfig: (cfg: VenueConfig) => void
  setTillSession: (session: TillSession | null) => void
  logout: () => void
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, visitorTypeId?: string) => void
  updateQuantity: (productId: string, quantity: number, visitorTypeId?: string) => void
  overridePrice: (productId: string, newPrice: number, visitorTypeId?: string) => void
  clearCart: () => void
  setAccountId: (id: string | null, name?: string | null) => void
  setAccountName: (name: string | null) => void
  setPromoCode: (code: string | null) => void
  applyPromo: (promo: PromoResult | null) => void
  setVisitDate: (date: string) => void
  setActiveTab: (tab: PosState['activeTab']) => void
  // Helpers
  hasPermission: (perm: string) => boolean
  hasRole: (...roleNames: string[]) => boolean
  // Computed
  cartSubtotal: () => number
  promoDiscount: () => number
  cartTotal: () => number
}

// ─── Store ────────────────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().slice(0, 10)

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      token: null,
      staff: null,
      venueConfig: {
        venueName:       '',
        requireCustomer: false,
        tabs: { tickets: true, fnb: false, retail: false, wallet: false, memberships: false },
        tillMode:        'counter',
        printSettings:   { receiptWidth: 80, ticketWidth: 210, ticketHeight: 99 },
        enabledPayments: { cash: true, card: true, upi: true, wallet: true, gift_card: true },
      },
      tillSession: null,
      cart: [],
      accountId: null,
      accountName: null,
      promoCode: null,
      appliedPromo: null,
      visitDate: todayIso(),
      activeTab: 'tickets',

      setAuth: (token, staff) => set({ token, staff }),
      setVenueConfig: (cfg) => set((state) => {
        // Merge enabledPayments with defaults so a missing field never wipes out
        // a known-good value (e.g. if an older API response omits the field).
        const merged = {
          ...state.venueConfig.enabledPayments,
          ...(cfg.enabledPayments ?? {}),
        }
        // CRITICAL: preserve the same object reference when values haven't changed.
        // Cart.tsx has a useEffect([venueConfig.enabledPayments]) that syncs local
        // state from the store. If setVenueConfig always creates a new object, that
        // effect fires even when nothing changed — overwriting the correct values
        // that Cart already fetched directly from getVenueInfo().
        const prev = state.venueConfig.enabledPayments
        const unchanged =
          prev.cash      === merged.cash      &&
          prev.card      === merged.card      &&
          prev.upi       === merged.upi       &&
          prev.wallet    === merged.wallet    &&
          prev.gift_card === merged.gift_card
        return {
          venueConfig: {
            ...cfg,
            enabledPayments: unchanged ? prev : merged,
          },
        }
      }),
      setTillSession: (session) => set({ tillSession: session }),
      logout: () =>
        set({ token: null, staff: null, cart: [], accountId: null, accountName: null, promoCode: null, appliedPromo: null }),

      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find(
            (c) => c.productId === item.productId && c.visitorTypeId === item.visitorTypeId
          )
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.productId === item.productId && c.visitorTypeId === item.visitorTypeId
                  ? {
                      ...c,
                      quantity: c.quantity + item.quantity,
                      lineTotal: (c.quantity + item.quantity) * c.unitPrice - c.discountAmount,
                    }
                  : c
              ),
            }
          }
          return { cart: [...state.cart, item] }
        }),

      removeFromCart: (productId, visitorTypeId) =>
        set((state) => ({
          cart: state.cart.filter(
            (c) => !(c.productId === productId && c.visitorTypeId === visitorTypeId)
          ),
        })),

      updateQuantity: (productId, quantity, visitorTypeId) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter(
                  (c) => !(c.productId === productId && c.visitorTypeId === visitorTypeId)
                )
              : state.cart.map((c) =>
                  c.productId === productId && c.visitorTypeId === visitorTypeId
                    ? { ...c, quantity, lineTotal: quantity * c.unitPrice - c.discountAmount }
                    : c
                ),
        })),

      overridePrice: (productId, newPrice, visitorTypeId) =>
        set((state) => ({
          cart: state.cart.map((c) =>
            c.productId === productId && c.visitorTypeId === visitorTypeId
              ? {
                  ...c,
                  originalUnitPrice: c.originalUnitPrice ?? c.unitPrice,
                  unitPrice: newPrice,
                  lineTotal: c.quantity * newPrice - c.discountAmount,
                }
              : c
          ),
        })),

      clearCart: () =>
        set({ cart: [], accountId: null, accountName: null, promoCode: null, appliedPromo: null, visitDate: todayIso() }),

      setAccountId: (id, name) => set({ accountId: id, accountName: name ?? null }),
      setAccountName: (name) => set({ accountName: name }),
      setPromoCode: (code) => set({ promoCode: code }),
      applyPromo: (promo) => set({ appliedPromo: promo }),
      setVisitDate: (date) => set({ visitDate: date }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      hasPermission: (perm) => get().staff?.permissions?.includes(perm) ?? false,
      hasRole: (...roleNames) =>
        get().staff?.roles?.some((r) => roleNames.includes(r)) ?? false,

      cartSubtotal: () => get().cart.reduce((sum, item) => sum + item.lineTotal, 0),

      promoDiscount: () => {
        const { appliedPromo, cartSubtotal } = get()
        if (!appliedPromo) return 0
        const subtotal = cartSubtotal()
        if (appliedPromo.discountType === 'percent') {
          return subtotal * (appliedPromo.discountValue / 100)
        }
        return Math.min(appliedPromo.discountValue, subtotal)
      },

      cartTotal: () => {
        const subtotal = get().cartSubtotal()
        const discount = get().promoDiscount()
        return (subtotal - discount) * 1.18 // 18% GST on discounted amount
      },
    }),
    {
      name: 'venueplus-pos',
      partialize: (state) => ({ token: state.token, staff: state.staff }),
    }
  )
)
