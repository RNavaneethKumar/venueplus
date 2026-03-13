// ============================================================================
// VenuePlus — Shared Enum Types
// Mirrors the PostgreSQL ENUM definitions exactly.
// ============================================================================

// ── Platform Governance ──────────────────────────────────────────────────────

export type ScopeType = 'venue' | 'global'
export type VenueStatus = 'active' | 'inactive' | 'closed'
export type DeviceType = 'pos' | 'gate' | 'kiosk' | 'kds' | 'arcade_reader'
export type DeviceStatus = 'active' | 'inactive' | 'maintenance'
export type NotificationChannel = 'email' | 'sms' | 'whatsapp'
export type ApiKeyStatus = 'active' | 'revoked' | 'expired'
export type AlertComparisonOperator = '>' | '<' | '=' | '>=' | '<='
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

// ── Customer Identity ────────────────────────────────────────────────────────

export type AuthProvider = 'email' | 'mobile' | 'google' | 'apple'
export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type PersonRelationship = 'self' | 'child' | 'spouse' | 'guardian' | 'other'
export type OtpChannel = 'sms' | 'email' | 'whatsapp'
export type OtpPurpose = 'login' | 'registration' | 'waiver' | 'password_reset'

// ── Resources & Capacity ─────────────────────────────────────────────────────

export type AdmissionMode = 'slot_based' | 'rolling_duration' | 'open_access'
export type CapacityEnforcementType = 'hard' | 'soft'
export type SlotRecurrenceType = 'daily' | 'weekly'
export type CapacityHoldStatus = 'active' | 'converted' | 'released' | 'expired'
export type ReservationType = 'slot_bound' | 'duration_bound' | 'access_bound' | 'multi_day'
export type UsageType = 'single_use' | 'multi_entry' | 'time_limited' | 'per_day'
export type ReservationStatus = 'confirmed' | 'consumed' | 'cancelled' | 'expired'
export type ScanUsageType = 'entry' | 'exit'

// ── Products ─────────────────────────────────────────────────────────────────

export type ProductType =
  | 'ticket'
  | 'membership'
  | 'retail'
  | 'wallet_load'
  | 'gift_card'
  | 'event_package'
  | 'food_beverage'
  | 'donation'
  | 'adoption'

export type SalesChannel = 'online' | 'pos' | 'kiosk'

// ── Orders & Payments ────────────────────────────────────────────────────────

export type OrderType = 'sale' | 'refund'
export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet' | 'gift_card' | 'redemption_card'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type GatewayTxStatus = 'success' | 'failed' | 'pending' | 'refunded'
export type PriceComponentType =
  | 'base_price'
  | 'dynamic_pricing'
  | 'visitor_modifier'
  | 'channel_modifier'
export type AdjustmentSource = 'pricing_rule' | 'promo_code' | 'bundle' | 'manual'
export type AdjustmentType = 'discount' | 'surcharge'

// ── Pricing Engine ───────────────────────────────────────────────────────────

export type PricingRuleType = 'discount' | 'surcharge' | 'set_price' | 'bogo' | 'bundle'
export type PricingConditionType =
  | 'product'
  | 'visitor_type'
  | 'channel'
  | 'day_of_week'
  | 'date_range'
  | 'time_of_day'
  | 'quantity'
  | 'booking_lead_time'
export type PricingConditionOperator = '=' | '>' | '<' | '>=' | '<=' | 'IN'
export type PricingActionType =
  | 'flat_discount'
  | 'percent_discount'
  | 'flat_surcharge'
  | 'percent_surcharge'
  | 'set_price'
  | 'free_item'
export type DiscountType = 'flat' | 'percent'
export type PromoUsageStatus = 'applied' | 'reversed'
export type BundleType = 'bogo' | 'combo_discount' | 'set_price' | 'included_items'
export type BundleItemRole = 'qualifier' | 'reward'

// ── Membership ───────────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'annual' | 'one_time'
export type MembershipBenefitType = 'discount' | 'allowance'
export type AllowanceUnit = 'visits' | 'hours' | 'credits'
export type AllowanceResetCycle = 'monthly' | 'annual'
export type MembershipStatus = 'active' | 'past_due' | 'cancelled' | 'expired'
export type AllowanceTxType = 'deduction' | 'reversal' | 'reset'

// ── Wallet ───────────────────────────────────────────────────────────────────

export type WalletTxType = 'credit' | 'debit' | 'refund' | 'expiry' | 'adjustment'
export type WalletBalanceType = 'real_cash' | 'bonus_cash' | 'redemption_points'

// ── Gift Cards ───────────────────────────────────────────────────────────────

export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'cancelled'
export type GiftCardTxType = 'issue' | 'redemption' | 'refund' | 'expiry' | 'adjustment'

// ── Redemption Cards ─────────────────────────────────────────────────────────

export type RedemptionCardType = 'visit_based' | 'credit_based'
export type RedemptionCardStatus = 'active' | 'exhausted' | 'expired' | 'cancelled'
export type RedemptionCardTxType = 'issue' | 'redemption' | 'top_up' | 'expiry'

// ── Donations & Adoptions ────────────────────────────────────────────────────

export type DonationType = 'one_time' | 'recurring'
export type DonationRecurrence = 'monthly' | 'annual'
export type AdopteeType = 'animal' | 'exhibit' | 'project'
export type AdoptionStatus = 'active' | 'expired' | 'cancelled'

// ── F&B ──────────────────────────────────────────────────────────────────────

export type KitchenOrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
export type KitchenItemStatus = 'pending' | 'preparing' | 'ready' | 'served'
export type FnbAdjustmentType = 'sale' | 'manual_add' | 'manual_remove' | 'waste' | 'receive'

// ── Retail ───────────────────────────────────────────────────────────────────

export type RetailTxType = 'sale' | 'refund' | 'adjustment' | 'receive' | 'waste'

// ── CRM & Marketing ──────────────────────────────────────────────────────────

export type CustomerActivityType =
  | 'purchase'
  | 'entry_scan'
  | 'waiver_signed'
  | 'membership_activated'
  | 'membership_cancelled'
  | 'refund'
  | 'gift_card_redeemed'
  | 'donation'
export type SegmentType = 'static' | 'dynamic'
export type TagSource = 'system' | 'staff'
export type CampaignChannel = 'email' | 'sms' | 'whatsapp' | 'push'
export type CampaignTriggerType = 'scheduled' | 'event_based'
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled'
export type CampaignSendStatus = 'pending' | 'sent' | 'failed' | 'bounced'
