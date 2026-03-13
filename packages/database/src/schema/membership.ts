import { relations } from 'drizzle-orm'
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { accounts } from './ticketing.js'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const billingCycleEnum = pgEnum('billing_cycle', [
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
])

export const membershipStatusEnum = pgEnum('membership_status', [
  'active',
  'paused',
  'cancelled',
  'expired',
  'pending',
])

export const membershipBenefitTypeEnum = pgEnum('membership_benefit_type', [
  'discount',
  'allowance',
  'free_item',
  'priority_booking',
])

export const allowanceUnitEnum = pgEnum('allowance_unit', [
  'visits',
  'hours',
  'credits',
])

export const allowanceResetCycleEnum = pgEnum('allowance_reset_cycle', [
  'daily',
  'weekly',
  'monthly',
  'annually',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const membershipPlans = pgTable('membership_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  billingCycle: billingCycleEnum('billing_cycle').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  maxMembers: integer('max_members').notNull().default(1),
  isFamilyPlan: boolean('is_family_plan').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const membershipBenefits = pgTable('membership_benefits', {
  id: uuid('id').primaryKey().defaultRandom(),
  membershipPlanId: uuid('membership_plan_id')
    .notNull()
    .references(() => membershipPlans.id),
  benefitType: membershipBenefitTypeEnum('benefit_type').notNull(),
  productCategory: text('product_category'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }),
  allowanceQuantity: integer('allowance_quantity'),
  allowanceUnit: allowanceUnitEnum('allowance_unit'),
  allowanceResetCycle: allowanceResetCycleEnum('allowance_reset_cycle'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').notNull(),
  membershipPlanId: uuid('membership_plan_id')
    .notNull()
    .references(() => membershipPlans.id),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  status: membershipStatusEnum('status').notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  nextBillingDate: timestamp('next_billing_date', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const membershipMembers = pgTable('membership_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  membershipId: uuid('membership_id')
    .notNull()
    .references(() => memberships.id),
  personId: uuid('person_id').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
})

export const membershipAllowanceBalances = pgTable('membership_allowance_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  membershipId: uuid('membership_id')
    .notNull()
    .references(() => memberships.id),
  membershipBenefitId: uuid('membership_benefit_id')
    .notNull()
    .references(() => membershipBenefits.id),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  totalAllowance: integer('total_allowance').notNull(),
  usedAllowance: integer('used_allowance').notNull().default(0),
  remainingAllowance: integer('remaining_allowance').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const membershipAllowanceTransactions = pgTable('membership_allowance_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  membershipAllowanceBalanceId: uuid('membership_allowance_balance_id')
    .notNull()
    .references(() => membershipAllowanceBalances.id),
  orderItemId: uuid('order_item_id'),
  delta: integer('delta').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const membershipPlansRelations = relations(membershipPlans, ({ many }) => ({
  benefits: many(membershipBenefits),
  memberships: many(memberships),
}))

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  plan: one(membershipPlans, {
    fields: [memberships.membershipPlanId],
    references: [membershipPlans.id],
  }),
  account: one(accounts, {
    fields: [memberships.accountId],
    references: [accounts.id],
  }),
  members: many(membershipMembers),
  allowanceBalances: many(membershipAllowanceBalances),
}))
