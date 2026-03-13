// ============================================================================
// Drizzle Schema — Ticketing, Resources, Orders, Reservations
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  date,
  time,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users, venues, devices } from './governance.js'

// ── Enums ────────────────────────────────────────────────────────────────────

export const admissionModeEnum = pgEnum('admission_mode', ['slot_based', 'rolling_duration', 'open_access'])
export const capacityEnforcementEnum = pgEnum('capacity_enforcement_type', ['hard', 'soft'])
export const slotRecurrenceEnum = pgEnum('slot_recurrence_type', ['daily', 'weekly'])
export const capacityHoldStatusEnum = pgEnum('capacity_hold_status', ['active', 'converted', 'released', 'expired'])
export const reservationTypeEnum = pgEnum('reservation_type', ['slot_bound', 'duration_bound', 'access_bound', 'multi_day'])
export const usageTypeEnum = pgEnum('usage_type', ['single_use', 'multi_entry', 'time_limited', 'per_day'])
export const reservationStatusEnum = pgEnum('reservation_status', ['confirmed', 'consumed', 'cancelled', 'expired'])
export const scanUsageTypeEnum = pgEnum('scan_usage_type', ['entry', 'exit'])
export const productTypeEnum = pgEnum('product_type', ['ticket', 'membership', 'retail', 'wallet_load', 'gift_card', 'event_package', 'food_beverage', 'donation', 'adoption'])
export const salesChannelEnum = pgEnum('sales_channel', ['online', 'pos', 'kiosk'])
export const orderTypeEnum = pgEnum('order_type', ['sale', 'refund'])
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'refunded', 'cancelled'])
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'upi', 'wallet', 'gift_card', 'redemption_card'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded'])
export const genderTypeEnum = pgEnum('gender_type', ['male', 'female', 'other', 'prefer_not_to_say'])
export const authProviderEnum = pgEnum('auth_provider', ['email', 'mobile', 'google', 'apple'])
export const personRelationshipEnum = pgEnum('person_relationship', ['self', 'child', 'spouse', 'guardian', 'other'])
export const otpChannelEnum = pgEnum('otp_channel', ['sms', 'email', 'whatsapp'])
export const otpPurposeEnum = pgEnum('otp_purpose', ['login', 'registration', 'waiver', 'password_reset'])

// ── Visitor Types ────────────────────────────────────────────────────────────

export const visitorTypes = pgTable('visitor_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  isMinor: boolean('is_minor').notNull().default(false),
  requiresWaiver: boolean('requires_waiver').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

// ── Tax ──────────────────────────────────────────────────────────────────────

export const taxComponents = pgTable('tax_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const taxStructures = pgTable('tax_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id),
  name: text('name').notNull(),
  code: text('code'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const taxStructureComponents = pgTable('tax_structure_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  taxStructureId: uuid('tax_structure_id').notNull().references(() => taxStructures.id),
  taxComponentId: uuid('tax_component_id').notNull().references(() => taxComponents.id),
  taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Resources ────────────────────────────────────────────────────────────────

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  name: text('name').notNull(),
  description: text('description'),
  admissionMode: admissionModeEnum('admission_mode').notNull(),
  capacityEnforcementType: capacityEnforcementEnum('capacity_enforcement_type').notNull().default('hard'),
  capacity: integer('capacity'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const resourceSlotTemplates = pgTable('resource_slot_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  version: integer('version').notNull(),
  name: text('name'),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  slotDurationMinutes: integer('slot_duration_minutes').notNull(),
  recurrenceType: slotRecurrenceEnum('recurrence_type').notNull().default('daily'),
  daysOfWeek: integer('days_of_week').array(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveUntil: date('effective_until'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const resourceSlots = pgTable('resource_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  slotTemplateId: uuid('slot_template_id').references(() => resourceSlotTemplates.id),
  slotTemplateVersion: integer('slot_template_version'),
  slotDate: date('slot_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  capacity: integer('capacity'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

// ── Accounts & Persons ───────────────────────────────────────────────────────

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  email: text('email'),
  mobileNumber: text('mobile_number'),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash'),
  authProvider: authProviderEnum('auth_provider').notNull().default('mobile'),
  isVerified: boolean('is_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  dateOfBirth: date('date_of_birth'),
  isMinor: boolean('is_minor').notNull().default(false),
  gender: genderTypeEnum('gender'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const accountPersons = pgTable('account_persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  personId: uuid('person_id').notNull().references(() => persons.id),
  relationship: personRelationshipEnum('relationship').notNull().default('self'),
  isPrimary: boolean('is_primary').notNull().default(false),
  canManage: boolean('can_manage').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const accountOtpLog = pgTable('account_otp_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  channel: otpChannelEnum('channel').notNull(),
  recipient: text('recipient').notNull(),
  purpose: otpPurposeEnum('purpose').notNull(),
  otpHash: text('otp_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  attemptCount: integer('attempt_count').notNull().default(0),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id),
  name: text('name').notNull(),
  code: text('code'),
  productType: productTypeEnum('product_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const productPrices = pgTable('product_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  visitorTypeId: uuid('visitor_type_id').references(() => visitorTypes.id),
  basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(),
  currencyCode: text('currency_code').notNull(),
  salesChannel: salesChannelEnum('sales_channel'),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveUntil: timestamp('effective_until', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const productReservationConfig = pgTable('product_reservation_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  reservationType: reservationTypeEnum('reservation_type').notNull(),
  usageType: usageTypeEnum('usage_type').notNull(),
  durationMinutes: integer('duration_minutes'),
  requiresWaiver: boolean('requires_waiver').notNull().default(true),
  allowsReentry: boolean('allows_reentry').notNull().default(false),
  entryLimitPerDay: integer('entry_limit_per_day'),
  validDays: integer('valid_days'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const productTaxStructures = pgTable('product_tax_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  taxStructureId: uuid('tax_structure_id').notNull().references(() => taxStructures.id),
  effectiveFrom: date('effective_from'),
  effectiveUntil: date('effective_until'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const productResourceMapping = pgTable('product_resource_mapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const deviceResourceMapping = pgTable('device_resource_mapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  isEntryPoint: boolean('is_entry_point').notNull().default(true),
  isExitPoint: boolean('is_exit_point').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

// ── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  accountId: uuid('account_id').references(() => accounts.id),
  orderType: orderTypeEnum('order_type').notNull().default('sale'),
  status: orderStatusEnum('status').notNull().default('pending'),
  currencyCode: text('currency_code').notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  sourceChannel: salesChannelEnum('source_channel').notNull(),
  parentOrderId: uuid('parent_order_id').references((): any => orders.id),
  // NULL for online / kiosk orders. Set to the open till session at the POS
  // counter that processed the order. Required for accurate cash reconciliation.
  cashSessionId: uuid('cash_session_id'),  // FK added via migration; FK reference kept here as comment to avoid circular import with till.ts
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  visitorTypeId: uuid('visitor_type_id').references(() => visitorTypes.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  priceOverridden: boolean('price_overridden').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orderPayments = pgTable('order_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  referenceId: uuid('reference_id'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  previousStatus: text('previous_status').notNull(),
  newStatus: text('new_status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  reason: text('reason'),
})

// ── Capacity Holds ───────────────────────────────────────────────────────────

export const capacityHolds = pgTable('capacity_holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  resourceSlotId: uuid('resource_slot_id').references(() => resourceSlots.id),
  sessionToken: text('session_token').notNull(),
  accountId: uuid('account_id').references(() => accounts.id),
  visitorTypeId: uuid('visitor_type_id').notNull().references(() => visitorTypes.id),
  quantity: integer('quantity').notNull(),
  holdFrom: timestamp('hold_from', { withTimezone: true }).notNull(),
  holdUntil: timestamp('hold_until', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  status: capacityHoldStatusEnum('status').notNull().default('active'),
  orderId: uuid('order_id').references(() => orders.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
})

// ── Reservations ─────────────────────────────────────────────────────────────

export const reservationGroups = pgTable('reservation_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').references(() => orderItems.id),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  resourceSlotId: uuid('resource_slot_id').references(() => resourceSlots.id),
  visitorTypeId: uuid('visitor_type_id').notNull().references(() => visitorTypes.id),
  personId: uuid('person_id').references(() => persons.id),
  reservationType: reservationTypeEnum('reservation_type').notNull(),
  reservationGroupId: uuid('reservation_group_id').references(() => reservationGroups.id),
  usageType: usageTypeEnum('usage_type').notNull(),
  durationMinutes: integer('duration_minutes'),
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  actualEntryTime: timestamp('actual_entry_time', { withTimezone: true }),
  actualExpiryTime: timestamp('actual_expiry_time', { withTimezone: true }),
  entryLimitPerDay: integer('entry_limit_per_day'),
  entriesUsed: integer('entries_used').notNull().default(0),
  status: reservationStatusEnum('status').notNull().default('confirmed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reservationUsageLogs = pgTable('reservation_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  deviceId: uuid('device_id').references(() => devices.id),
  usageType: scanUsageTypeEnum('usage_type').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Relations ────────────────────────────────────────────────────────────────

export const ordersRelations = relations(orders, ({ one, many }) => ({
  venue: one(venues, { fields: [orders.venueId], references: [venues.id] }),
  account: one(accounts, { fields: [orders.accountId], references: [accounts.id] }),
  items: many(orderItems),
  payments: many(orderPayments),
  statusHistory: many(orderStatusHistory),
}))

export const orderPaymentsRelations = relations(orderPayments, ({ one }) => ({
  order: one(orders, { fields: [orderPayments.orderId], references: [orders.id] }),
}))

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  changedByUser: one(users, { fields: [orderStatusHistory.changedBy], references: [users.id] }),
}))

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  visitorType: one(visitorTypes, { fields: [orderItems.visitorTypeId], references: [visitorTypes.id] }),
  reservations: many(reservations),
}))

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  orderItem: one(orderItems, { fields: [reservations.orderItemId], references: [orderItems.id] }),
  resource: one(resources, { fields: [reservations.resourceId], references: [resources.id] }),
  person: one(persons, { fields: [reservations.personId], references: [persons.id] }),
  usageLogs: many(reservationUsageLogs),
}))

export const accountsRelations = relations(accounts, ({ many }) => ({
  persons: many(accountPersons),
  orders: many(orders),
}))

export const productsRelations = relations(products, ({ many }) => ({
  prices: many(productPrices),
  taxStructures: many(productTaxStructures),
  reservationConfig: many(productReservationConfig),
  resourceMappings: many(productResourceMapping),
}))

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, { fields: [productPrices.productId], references: [products.id] }),
  visitorType: one(visitorTypes, { fields: [productPrices.visitorTypeId], references: [visitorTypes.id] }),
}))

export const productTaxStructuresRelations = relations(productTaxStructures, ({ one }) => ({
  product: one(products, { fields: [productTaxStructures.productId], references: [products.id] }),
  taxStructure: one(taxStructures, { fields: [productTaxStructures.taxStructureId], references: [taxStructures.id] }),
}))

export const productReservationConfigRelations = relations(productReservationConfig, ({ one }) => ({
  product: one(products, { fields: [productReservationConfig.productId], references: [products.id] }),
}))
