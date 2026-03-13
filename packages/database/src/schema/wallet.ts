import { relations } from 'drizzle-orm'
import {
  boolean,
  decimal,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { accounts } from './ticketing.js'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const walletTxTypeEnum = pgEnum('wallet_tx_type', [
  'credit_real',
  'credit_bonus',
  'debit_real',
  'debit_bonus',
  'expiry',
  'refund',
  'adjustment',
])

export const walletBalanceTypeEnum = pgEnum('wallet_balance_type', [
  'real_cash',
  'bonus_cash',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .unique()
    .references(() => accounts.id),
  venueId: uuid('venue_id').notNull(),
  realBalance: decimal('real_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  bonusBalance: decimal('bonus_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  totalBalance: decimal('total_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => wallets.id),
  orderItemId: uuid('order_item_id'),
  txType: walletTxTypeEnum('tx_type').notNull(),
  balanceType: walletBalanceTypeEnum('balance_type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Gift Cards ────────────────────────────────────────────────────────────────

export const giftCardStatusEnum = pgEnum('gift_card_status', [
  'active',
  'redeemed',
  'expired',
  'cancelled',
])

export const giftCards = pgTable('gift_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  orderItemId: uuid('order_item_id').notNull(),
  code: text('code').notNull().unique(),
  initialValue: decimal('initial_value', { precision: 10, scale: 2 }).notNull(),
  currentBalance: decimal('current_balance', { precision: 10, scale: 2 }).notNull(),
  status: giftCardStatusEnum('status').notNull().default('active'),
  purchaserAccountId: uuid('purchaser_account_id').references(() => accounts.id),
  recipientEmail: text('recipient_email'),
  recipientName: text('recipient_name'),
  message: text('message'),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const giftCardTxTypeEnum = pgEnum('gift_card_tx_type', [
  'issue',
  'redemption',
  'refund',
  'expiry',
  'adjustment',
])

export const giftCardTransactions = pgTable('gift_card_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  giftCardId: uuid('gift_card_id')
    .notNull()
    .references(() => giftCards.id),
  orderItemId: uuid('order_item_id'),
  txType: giftCardTxTypeEnum('tx_type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 10, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Redemption Cards ──────────────────────────────────────────────────────────

export const redemptionCardTypeEnum = pgEnum('redemption_card_type', [
  'visit_based',
  'credit_based',
])

export const redemptionCards = pgTable('redemption_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  accountId: uuid('account_id').references(() => accounts.id),
  cardType: redemptionCardTypeEnum('card_type').notNull(),
  code: text('code').notNull().unique(),
  totalVisits: decimal('total_visits', { precision: 6, scale: 0 }),
  remainingVisits: decimal('remaining_visits', { precision: 6, scale: 0 }),
  creditBalance: decimal('credit_balance', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const redemptionCardTxTypeEnum = pgEnum('redemption_card_tx_type', [
  'issue',
  'redemption',
  'refund',
  'adjustment',
  'expiry',
])

export const redemptionCardTransactions = pgTable('redemption_card_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  redemptionCardId: uuid('redemption_card_id')
    .notNull()
    .references(() => redemptionCards.id),
  orderItemId: uuid('order_item_id'),
  txType: redemptionCardTxTypeEnum('tx_type').notNull(),
  visitsDelta: decimal('visits_delta', { precision: 6, scale: 0 }),
  creditDelta: decimal('credit_delta', { precision: 10, scale: 2 }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  account: one(accounts, {
    fields: [wallets.accountId],
    references: [accounts.id],
  }),
  transactions: many(walletTransactions),
}))

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  purchaser: one(accounts, {
    fields: [giftCards.purchaserAccountId],
    references: [accounts.id],
  }),
  transactions: many(giftCardTransactions),
}))
