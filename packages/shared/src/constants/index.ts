// ============================================================================
// VenuePlus — Shared Constants
// ============================================================================

// ── Venue Settings Keys (dot-notation) ───────────────────────────────────────

export const SETTING_KEYS = {
  // Auth
  AUTH_OTP_REQUIRED: 'auth.otp_required_for_login',
  AUTH_ALLOW_PASSWORD: 'auth.allow_password_login',
  AUTH_OTP_EXPIRY_MIN: 'auth.otp_expiry_minutes',
  AUTH_MAX_OTP_ATTEMPTS: 'auth.max_otp_attempts',
  AUTH_OTP_CHANNELS: 'auth.otp_channels',
  AUTH_SESSION_TTL: 'auth.session_ttl_hours',

  // Accounts
  ACCOUNT_ALLOW_ANONYMOUS_OTC: 'account.allow_anonymous_otc_orders',
  ACCOUNT_REQUIRE_PERSON_BEFORE_ENTRY: 'account.require_person_assignment_before_entry',
  ACCOUNT_MINOR_AGE_THRESHOLD: 'account.minor_age_threshold',

  // Waivers
  WAIVER_OTP_REQUIRED: 'waiver.otp_required_for_signing',
  WAIVER_REQUIRED_WALKIN: 'waiver.required_for_walkin',
  WAIVER_EXPIRY_MONTHS: 'waiver.expiry_months',

  // Ticketing
  TICKETING_MAX_ADVANCE_DAYS: 'ticketing.max_advance_booking_days',
  TICKETING_LATE_ENTRY_GRACE: 'ticketing.late_entry_grace_period_minutes',
  TICKETING_MAX_TICKETS_ONLINE: 'ticketing.max_tickets_per_online_order',
  TICKETING_CANCELLATION_POLICY: 'ticketing.cancellation_policy',
  TICKETING_CANCELLATION_CUTOFF: 'ticketing.cancellation_cutoff_hours',

  // Gate
  GATE_STRICT_MODE: 'gate.strict_mode_enabled',
  GATE_ALLOW_OVERRIDE: 'gate.allow_manual_override',
  GATE_EXIT_SCAN: 'gate.exit_scan_enabled',
  GATE_OFFLINE_GRACE: 'gate.offline_grace_minutes',

  // Checkout
  CHECKOUT_ONLINE_HOLD_TTL: 'checkout.online_hold_ttl_minutes',
  CHECKOUT_OTC_HOLD_TTL: 'checkout.otc_hold_ttl_minutes',
  CHECKOUT_ALLOW_SPLIT: 'checkout.allow_split_payment',
  CHECKOUT_MAX_METHODS: 'checkout.max_payment_methods_per_order',

  // Payments
  PAYMENT_CASH: 'payment.cash_enabled',
  PAYMENT_CARD: 'payment.card_enabled',
  PAYMENT_UPI: 'payment.upi_enabled',
  PAYMENT_WALLET: 'payment.wallet_enabled',
  PAYMENT_GIFT_CARD: 'payment.gift_card_enabled',

  // Reporting
  REPORTING_ROLLUP_TIME: 'reporting.daily_rollup_time',
  REPORTING_LIVE_HEADCOUNT: 'reporting.live_headcount_enabled',
} as const

// ── Setting Defaults ─────────────────────────────────────────────────────────

export const SETTING_DEFAULTS: Record<string, unknown> = {
  [SETTING_KEYS.AUTH_OTP_REQUIRED]: true,
  [SETTING_KEYS.AUTH_ALLOW_PASSWORD]: false,
  [SETTING_KEYS.AUTH_OTP_EXPIRY_MIN]: 10,
  [SETTING_KEYS.AUTH_MAX_OTP_ATTEMPTS]: 3,
  [SETTING_KEYS.AUTH_OTP_CHANNELS]: ['sms'],
  [SETTING_KEYS.AUTH_SESSION_TTL]: 24,
  [SETTING_KEYS.ACCOUNT_ALLOW_ANONYMOUS_OTC]: true,
  [SETTING_KEYS.ACCOUNT_REQUIRE_PERSON_BEFORE_ENTRY]: true,
  [SETTING_KEYS.ACCOUNT_MINOR_AGE_THRESHOLD]: 18,
  [SETTING_KEYS.WAIVER_OTP_REQUIRED]: true,
  [SETTING_KEYS.WAIVER_REQUIRED_WALKIN]: true,
  [SETTING_KEYS.WAIVER_EXPIRY_MONTHS]: 12,
  [SETTING_KEYS.TICKETING_MAX_ADVANCE_DAYS]: 90,
  [SETTING_KEYS.TICKETING_LATE_ENTRY_GRACE]: 15,
  [SETTING_KEYS.TICKETING_MAX_TICKETS_ONLINE]: 20,
  [SETTING_KEYS.TICKETING_CANCELLATION_POLICY]: 'no_refund',
  [SETTING_KEYS.TICKETING_CANCELLATION_CUTOFF]: 24,
  [SETTING_KEYS.GATE_STRICT_MODE]: true,
  [SETTING_KEYS.GATE_ALLOW_OVERRIDE]: true,
  [SETTING_KEYS.GATE_EXIT_SCAN]: false,
  [SETTING_KEYS.GATE_OFFLINE_GRACE]: 30,
  [SETTING_KEYS.CHECKOUT_ONLINE_HOLD_TTL]: 10,
  [SETTING_KEYS.CHECKOUT_OTC_HOLD_TTL]: 5,
  [SETTING_KEYS.CHECKOUT_ALLOW_SPLIT]: true,
  [SETTING_KEYS.CHECKOUT_MAX_METHODS]: 3,
  [SETTING_KEYS.PAYMENT_CASH]: true,
  [SETTING_KEYS.PAYMENT_CARD]: true,
  [SETTING_KEYS.PAYMENT_UPI]: true,
  [SETTING_KEYS.PAYMENT_WALLET]: false,
  [SETTING_KEYS.PAYMENT_GIFT_CARD]: false,
  [SETTING_KEYS.REPORTING_ROLLUP_TIME]: '02:00',
  [SETTING_KEYS.REPORTING_LIVE_HEADCOUNT]: true,
}

// ── Feature Flags ────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  TICKETING: 'module.ticketing',
  MEMBERSHIP: 'module.membership',
  WALLET: 'module.wallet',
  GIFT_CARD: 'module.gift_card',
  REDEMPTION: 'module.redemption',
  DONATIONS: 'module.donations',
  ADOPTIONS: 'module.adoptions',
  FNB: 'module.fnb',
  RETAIL: 'module.retail',
  CRM: 'module.crm',
  WAIVERS: 'module.waivers',
} as const

// ── Standard Roles ───────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  VENUE_ADMIN: 'venue_admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  GATE_OPERATOR: 'gate_operator',
  REPORTING_VIEWER: 'reporting_viewer',
} as const

// ── Permission Keys ──────────────────────────────────────────────────────────

export const PERMISSIONS = {
  ORDER_CREATE: 'order.create',
  ORDER_REFUND: 'order.refund',
  ORDER_PRICE_OVERRIDE: 'order.price_override',
  ORDER_VOID: 'order.void',
  GATE_SCAN: 'gate.scan',
  GATE_MANUAL_OVERRIDE: 'gate.manual_override',
  WAIVER_VIEW: 'waiver.view',
  WAIVER_EDIT: 'waiver.edit',
  REPORT_FINANCIAL: 'report.financial',
  REPORT_OPERATIONAL: 'report.operational',
  PRODUCT_MANAGE: 'product.manage',
  INVENTORY_MANAGE: 'inventory.manage',
  INVENTORY_MANUAL_ADJUST: 'inventory.manual_adjust',
  MEMBERSHIP_MANAGE: 'membership.manage',
  CUSTOMER_MANAGE: 'customer.manage',
  CAMPAIGN_MANAGE: 'campaign.manage',
} as const

// ── HTTP Status Codes ────────────────────────────────────────────────────────

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL: 500,
} as const

// ── Error Codes ──────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Auth
  INVALID_OTP: 'AUTH_001',
  OTP_EXPIRED: 'AUTH_002',
  OTP_MAX_ATTEMPTS: 'AUTH_003',
  INVALID_CREDENTIALS: 'AUTH_004',
  TOKEN_EXPIRED: 'AUTH_005',
  INSUFFICIENT_PERMISSIONS: 'AUTH_006',
  SUPERVISOR_REQUIRED: 'AUTH_007',

  // Capacity
  NO_CAPACITY: 'CAP_001',
  HOLD_EXPIRED: 'CAP_002',
  SLOT_NOT_AVAILABLE: 'CAP_003',

  // Orders
  ORDER_NOT_FOUND: 'ORD_001',
  ORDER_NOT_REFUNDABLE: 'ORD_002',
  PAYMENT_FAILED: 'ORD_003',
  INSUFFICIENT_BALANCE: 'ORD_004',

  // Gate
  TICKET_EXPIRED: 'GATE_001',
  TICKET_ALREADY_USED: 'GATE_002',
  WAIVER_MISSING: 'GATE_003',
  PERSON_NOT_ASSIGNED: 'GATE_004',
  TICKET_NOT_YET_VALID: 'GATE_005',

  // Validation
  VALIDATION_ERROR: 'VAL_001',
  NOT_FOUND: 'NOT_FOUND',
} as const

// ── Pagination Defaults ──────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const
