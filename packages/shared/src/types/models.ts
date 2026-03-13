// ============================================================================
// VenuePlus — Shared Model Types
// TypeScript interfaces mirroring database table shapes.
// ============================================================================

import type {
  AdmissionMode,
  AdopteeType,
  AdoptionStatus,
  AdjustmentSource,
  AdjustmentType,
  AlertComparisonOperator,
  AlertStatus,
  AllowanceResetCycle,
  AllowanceTxType,
  AllowanceUnit,
  ApiKeyStatus,
  AuthProvider,
  BillingCycle,
  BundleItemRole,
  BundleType,
  CampaignChannel,
  CampaignSendStatus,
  CampaignStatus,
  CampaignTriggerType,
  CapacityEnforcementType,
  CapacityHoldStatus,
  CustomerActivityType,
  DeviceStatus,
  DeviceType,
  DiscountType,
  DonationRecurrence,
  DonationType,
  FnbAdjustmentType,
  GatewayTxStatus,
  GenderType,
  GiftCardStatus,
  GiftCardTxType,
  KitchenItemStatus,
  KitchenOrderStatus,
  MembershipBenefitType,
  MembershipStatus,
  NotificationChannel,
  OrderStatus,
  OrderType,
  OtpChannel,
  OtpPurpose,
  PaymentMethod,
  PaymentStatus,
  PersonRelationship,
  PriceComponentType,
  PricingActionType,
  PricingConditionOperator,
  PricingConditionType,
  PricingRuleType,
  ProductType,
  PromoUsageStatus,
  RedemptionCardStatus,
  RedemptionCardTxType,
  RedemptionCardType,
  ReservationStatus,
  ReservationType,
  RetailTxType,
  SalesChannel,
  ScanUsageType,
  ScopeType,
  SegmentType,
  TagSource,
  UsageType,
  VenueStatus,
  WalletBalanceType,
  WalletTxType,
} from './enums.js'

// ── Governance ───────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  displayName: string
  pinHash: string
  mobileNumber: string | null
  email: string | null
  isActive: boolean
  isLocked: boolean
  lastLoginAt: Date | null
  createdAt: Date
  createdBy: string | null
}

export interface Role {
  id: string
  name: string
  description: string | null
  scopeType: ScopeType
  isActive: boolean
  createdAt: Date
}

export interface Permission {
  id: string
  key: string
  module: string
  description: string | null
  isSensitive: boolean
  createdAt: Date
}

export interface Venue {
  id: string
  name: string
  legalName: string | null
  timezone: string
  currencyCode: string
  countryCode: string
  taxRegime: string | null
  taxRegistrationNumber: string | null
  registeredAddress: string | null
  status: VenueStatus
  createdAt: Date
  createdBy: string | null
}

export interface Device {
  id: string
  venueId: string
  name: string
  deviceType: DeviceType
  identifier: string | null
  authTokenHash: string | null
  status: DeviceStatus
  lastHeartbeatAt: Date | null
  lastIpAddress: string | null
  createdAt: Date
  createdBy: string | null
}

// ── Customer Identity ────────────────────────────────────────────────────────

export interface Account {
  id: string
  venueId: string
  email: string | null
  mobileNumber: string | null
  displayName: string
  passwordHash: string | null
  authProvider: AuthProvider
  isVerified: boolean
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  createdBy: string | null
}

export interface Person {
  id: string
  venueId: string
  firstName: string
  lastName: string | null
  dateOfBirth: string | null // DATE as ISO string
  isMinor: boolean
  gender: GenderType | null
  notes: string | null
  createdAt: Date
  createdBy: string | null
}

export interface AccountPerson {
  id: string
  accountId: string
  personId: string
  relationship: PersonRelationship
  isPrimary: boolean
  canManage: boolean
  createdAt: Date
}

// ── Resources ────────────────────────────────────────────────────────────────

export interface Resource {
  id: string
  venueId: string
  name: string
  description: string | null
  admissionMode: AdmissionMode
  capacityEnforcementType: CapacityEnforcementType
  capacity: number | null
  isActive: boolean
  createdAt: Date
  createdBy: string | null
}

export interface ResourceSlot {
  id: string
  resourceId: string
  slotTemplateId: string | null
  slotTemplateVersion: number | null
  slotDate: string // DATE as ISO string
  startTime: string // TIME as HH:mm
  endTime: string
  capacity: number | null
  isActive: boolean
  createdAt: Date
  createdBy: string | null
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  venueId: string | null
  name: string
  code: string | null
  productType: ProductType
  isActive: boolean
  createdAt: Date
  createdBy: string | null
}

export interface ProductPrice {
  id: string
  productId: string
  visitorTypeId: string | null
  basePrice: number
  currencyCode: string
  salesChannel: SalesChannel | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  isActive: boolean
  createdAt: Date
  createdBy: string | null
}

export interface VisitorType {
  id: string
  venueId: string | null
  name: string
  code: string
  description: string | null
  isMinor: boolean
  requiresWaiver: boolean
  isActive: boolean
  createdAt: Date
  createdBy: string | null
}

// ── Orders ───────────────────────────────────────────────────────────────────

export interface Order {
  id: string
  orderNumber: string
  venueId: string
  accountId: string | null
  orderType: OrderType
  status: OrderStatus
  currencyCode: string
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  sourceChannel: SalesChannel
  parentOrderId: string | null
  notes: string | null
  createdAt: Date
  createdBy: string | null
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  visitorTypeId: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  priceOverridden: boolean
  createdAt: Date
}

export interface OrderPayment {
  id: string
  orderId: string
  paymentMethod: PaymentMethod
  amount: number
  referenceId: string | null
  status: PaymentStatus
  createdAt: Date
}

// ── Reservations ─────────────────────────────────────────────────────────────

export interface Reservation {
  id: string
  orderItemId: string
  productId: string
  resourceId: string
  resourceSlotId: string | null
  visitorTypeId: string
  personId: string | null
  reservationType: ReservationType
  reservationGroupId: string | null
  usageType: UsageType
  durationMinutes: number | null
  validFrom: Date | null
  validUntil: Date | null
  actualEntryTime: Date | null
  actualExpiryTime: Date | null
  entryLimitPerDay: number | null
  entriesUsed: number
  status: ReservationStatus
  createdAt: Date
}

export interface CapacityHold {
  id: string
  venueId: string
  resourceId: string
  resourceSlotId: string | null
  sessionToken: string
  accountId: string | null
  visitorTypeId: string
  quantity: number
  holdFrom: Date
  holdUntil: Date
  expiresAt: Date
  status: CapacityHoldStatus
  orderId: string | null
  createdAt: Date
  releasedAt: Date | null
}

// ── Memberships ──────────────────────────────────────────────────────────────

export interface Membership {
  id: string
  orderItemId: string
  membershipPlanId: string
  accountId: string
  status: MembershipStatus
  startedAt: Date
  currentPeriodStart: string
  currentPeriodEnd: string
  nextBillingDate: string | null
  cancelledAt: Date | null
  createdAt: Date
}

// ── Wallet ───────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string
  accountId: string
  venueId: string
  realCashBalance: number
  bonusCashBalance: number
  redemptionPointsBalance: number
  isActive: boolean
  createdAt: Date
}

// ── Gift Cards ───────────────────────────────────────────────────────────────

export interface GiftCard {
  id: string
  venueId: string
  code: string
  orderItemId: string
  issuedToAccountId: string | null
  faceValue: number
  currentBalance: number
  currencyCode: string
  status: GiftCardStatus
  expiresAt: string | null
  createdAt: Date
}

// ── F&B ──────────────────────────────────────────────────────────────────────

export interface KitchenOrder {
  id: string
  orderId: string
  preparationStationId: string
  status: KitchenOrderStatus
  createdAt: Date
  startedAt: Date | null
  readyAt: Date | null
  servedAt: Date | null
}

// ── Waivers ──────────────────────────────────────────────────────────────────

export interface WaiverSignature {
  id: string
  waiverTemplateId: string
  waiverTemplateVersion: number
  signedByAccountId: string
  signatureData: string
  signedAt: Date
  ipAddress: string
  userAgent: string
  pdfUrl: string | null
  pdfHash: string | null
  otp_verified: boolean
  createdAt: Date
}
