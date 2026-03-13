// ============================================================================
// VenuePlus — API Request/Response Types (shared across channels)
// ============================================================================

import type { SalesChannel } from './enums.js'

// ── Generic API Shapes ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginationQuery {
  page?: number
  pageSize?: number
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface RequestOtpBody {
  mobile?: string
  email?: string
  purpose: 'login' | 'registration' | 'waiver' | 'password_reset'
}

export interface VerifyOtpBody {
  mobile?: string
  email?: string
  otp: string
  purpose: 'login' | 'registration' | 'waiver' | 'password_reset'
}

export interface StaffLoginBody {
  username: string
  pin: string
  venueId: string
  deviceId?: string
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

export interface AuthUser {
  id: string
  username?: string
  displayName: string
  venueId?: string
  staffId?: string    // present on staff JWT tokens
  accountId?: string  // present on customer JWT tokens
  roles: string[]
  permissions: string[]
  channel: 'staff' | 'customer'
}

// ── Checkout ─────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  visitorTypeId?: string
  quantity: number
  resourceSlotId?: string
  visitDate?: string // ISO date for access_bound tickets
}

export interface CreateHoldBody {
  venueId: string
  sessionToken: string
  accountId?: string
  items: CartItem[]
  channel: SalesChannel
}

export interface HoldResult {
  holdIds: string[]
  expiresAt: string
  sessionToken: string
}

export interface CreateOrderBody {
  venueId: string
  accountId?: string
  sessionToken: string
  holdIds: string[]
  items: CartItem[]
  promoCode?: string
  payments: PaymentInput[]
  channel: SalesChannel
  notes?: string
  staffUserId?: string
}

export interface PaymentInput {
  method: string
  amount: number
  referenceId?: string // wallet_id, gift_card_id, etc.
}

export interface OrderSummary {
  orderId: string
  orderNumber: string
  status: string
  subtotal: number
  discount: number
  tax: number
  total: number
  currency: string
  items: OrderItemSummary[]
  payments: PaymentSummary[]
}

export interface OrderItemSummary {
  id: string
  productName: string
  productType: string
  visitorType?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  reservations?: ReservationSummary[]
}

export interface ReservationSummary {
  id: string
  resourceName: string
  validFrom?: string
  validUntil?: string
  status: string
  qrCode: string // base64 QR for the reservation
}

export interface PaymentSummary {
  method: string
  amount: number
  status: string
}

// ── Availability ─────────────────────────────────────────────────────────────

export interface AvailabilityQuery {
  venueId: string
  productId: string
  date: string // ISO date
  visitorTypeId?: string
  quantity?: number
}

export interface SlotAvailability {
  slotId: string
  startTime: string
  endTime: string
  availableCapacity: number
  totalCapacity: number
  price: number
  isAvailable: boolean
}

// ── Gate ─────────────────────────────────────────────────────────────────────

export interface ScanBody {
  deviceId: string
  qrCode: string
  scanType: 'entry' | 'exit'
  staffUserId?: string
}

export interface ScanResult {
  allowed: boolean
  reservationId?: string
  personName?: string
  productName?: string
  message: string
  requiresSupervisor?: boolean
  denialReason?: string
}

// ── Venue Settings ───────────────────────────────────────────────────────────

export interface VenueSettingUpdate {
  key: string
  value: unknown
}

// ── Pricing ──────────────────────────────────────────────────────────────────

export interface PriceCalculationInput {
  venueId: string
  items: CartItem[]
  channel: SalesChannel
  accountId?: string
  promoCode?: string
  bookingDate?: string
}

export interface PriceCalculationResult {
  items: PricedItem[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  currency: string
  appliedPromo?: {
    code: string
    discount: number
  }
}

export interface PricedItem {
  productId: string
  visitorTypeId?: string
  quantity: number
  unitPrice: number
  adjustments: PriceAdjustment[]
  taxAmount: number
  totalAmount: number
}

export interface PriceAdjustment {
  source: string
  type: 'discount' | 'surcharge'
  label: string
  amount: number
}
