import { relations } from 'drizzle-orm'
import {
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const pricingRuleTypeEnum = pgEnum('pricing_rule_type', [
  'surcharge',
  'discount',
  'override',
])

export const pricingConditionTypeEnum = pgEnum('pricing_condition_type', [
  'day_of_week',
  'time_of_day',
  'date_range',
  'booking_lead_time',
  'quantity',
  'channel',
  'visitor_type',
  'product_category',
])

export const pricingActionTypeEnum = pgEnum('pricing_action_type', [
  'percent_surcharge',
  'percent_discount',
  'flat_surcharge',
  'flat_discount',
  'fixed_price',
])

export const discountTypeEnum = pgEnum('discount_type', ['percent', 'flat'])

export const bundleTypeEnum = pgEnum('bundle_type', [
  'bogo',
  'combo',
  'included_items',
  'package',
])

export const bundleItemRoleEnum = pgEnum('bundle_item_role', ['qualifier', 'reward'])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const pricingRules = pgTable('pricing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  ruleType: pricingRuleTypeEnum('rule_type').notNull(),
  priority: integer('priority').notNull().default(1),
  isStackable: boolean('is_stackable').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveUntil: timestamp('effective_until', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const pricingRuleConditions = pgTable('pricing_rule_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pricingRuleId: uuid('pricing_rule_id')
    .notNull()
    .references(() => pricingRules.id, { onDelete: 'cascade' }),
  conditionType: pricingConditionTypeEnum('condition_type').notNull(),
  operator: text('operator').notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const pricingRuleActions = pgTable('pricing_rule_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pricingRuleId: uuid('pricing_rule_id')
    .notNull()
    .references(() => pricingRules.id, { onDelete: 'cascade' }),
  actionType: pricingActionTypeEnum('action_type').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const promoCodes = pgTable('promo_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minimumOrderAmount: decimal('minimum_order_amount', { precision: 10, scale: 2 }),
  maxUses: integer('max_uses'),
  maxUsesPerCustomer: integer('max_uses_per_customer').notNull().default(1),
  currentUses: integer('current_uses').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveUntil: timestamp('effective_until', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const promoCodeApplicability = pgTable('promo_code_applicability', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoCodeId: uuid('promo_code_id')
    .notNull()
    .references(() => promoCodes.id, { onDelete: 'cascade' }),
  salesChannel: text('sales_channel'),
  productCategory: text('product_category'),
  productId: uuid('product_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const promoCodeUsages = pgTable('promo_code_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  promoCodeId: uuid('promo_code_id')
    .notNull()
    .references(() => promoCodes.id),
  orderId: uuid('order_id').notNull(),
  accountId: uuid('account_id'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bundlePromotions = pgTable('bundle_promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  bundleType: bundleTypeEnum('bundle_type').notNull(),
  maxApplicationsPerOrder: integer('max_applications_per_order'),
  isActive: boolean('is_active').notNull().default(true),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveUntil: timestamp('effective_until', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bundlePromotionItems = pgTable('bundle_promotion_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  bundlePromotionId: uuid('bundle_promotion_id')
    .notNull()
    .references(() => bundlePromotions.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(),
  role: bundleItemRoleEnum('role').notNull(),
  requiredQuantity: integer('required_quantity'),
  rewardQuantity: integer('reward_quantity'),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
  isAutoAdded: boolean('is_auto_added').notNull().default(false),
  isRemovable: boolean('is_removable').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const pricingRulesRelations = relations(pricingRules, ({ many }) => ({
  conditions: many(pricingRuleConditions),
  actions: many(pricingRuleActions),
}))

export const promoCodesRelations = relations(promoCodes, ({ many }) => ({
  applicability: many(promoCodeApplicability),
  usages: many(promoCodeUsages),
}))

export const bundlePromotionsRelations = relations(bundlePromotions, ({ many }) => ({
  items: many(bundlePromotionItems),
}))
