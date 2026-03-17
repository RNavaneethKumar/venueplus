// ============================================================================
// VenuePlus — Shared Constants
// ============================================================================

// ── Venue Settings Keys (dot-notation) ───────────────────────────────────────

export const SETTING_KEYS = {
  // Payments
  PAYMENT_CASH: 'payment.cash_enabled',
  PAYMENT_CARD: 'payment.card_enabled',
  PAYMENT_UPI: 'payment.upi_enabled',
  PAYMENT_WALLET: 'payment.wallet_enabled',
  PAYMENT_GIFT_CARD: 'payment.gift_card_enabled',
} as const

// ── Setting Defaults ─────────────────────────────────────────────────────────

export const SETTING_DEFAULTS: Record<string, unknown> = {
  [SETTING_KEYS.PAYMENT_CASH]: true,
  [SETTING_KEYS.PAYMENT_CARD]: true,
  [SETTING_KEYS.PAYMENT_UPI]: true,
  [SETTING_KEYS.PAYMENT_WALLET]: false,
  [SETTING_KEYS.PAYMENT_GIFT_CARD]: false,
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
