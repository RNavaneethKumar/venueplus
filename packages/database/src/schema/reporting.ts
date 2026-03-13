import {
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Tables ───────────────────────────────────────────────────────────────────

export const dailyRevenueStats = pgTable('daily_revenue_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  statDate: timestamp('stat_date', { withTimezone: true }).notNull(),
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  ticketRevenue: decimal('ticket_revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  fnbRevenue: decimal('fnb_revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  retailRevenue: decimal('retail_revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  membershipRevenue: decimal('membership_revenue', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  walletRevenue: decimal('wallet_revenue', { precision: 12, scale: 2 }).notNull().default('0'),
  giftCardRevenue: decimal('gift_card_revenue', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  donationRevenue: decimal('donation_revenue', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  totalOrders: integer('total_orders').notNull().default(0),
  totalVisitors: integer('total_visitors').notNull().default(0),
  avgOrderValue: decimal('avg_order_value', { precision: 10, scale: 2 }),
  onlineOrders: integer('online_orders').notNull().default(0),
  posOrders: integer('pos_orders').notNull().default(0),
  kioskOrders: integer('kiosk_orders').notNull().default(0),
  mobileOrders: integer('mobile_orders').notNull().default(0),
  totalTaxCollected: decimal('total_tax_collected', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  totalDiscountsGiven: decimal('total_discounts_given', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  totalRefunds: decimal('total_refunds', { precision: 12, scale: 2 }).notNull().default('0'),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
})

export const hourlyOccupancyStats = pgTable('hourly_occupancy_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  resourceId: uuid('resource_id').notNull(),
  statHour: timestamp('stat_hour', { withTimezone: true }).notNull(),
  peakOccupancy: integer('peak_occupancy').notNull().default(0),
  avgOccupancy: decimal('avg_occupancy', { precision: 5, scale: 2 }),
  capacity: integer('capacity'),
  occupancyPercent: decimal('occupancy_percent', { precision: 5, scale: 2 }),
  totalEntries: integer('total_entries').notNull().default(0),
  totalExits: integer('total_exits').notNull().default(0),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
})

export const paymentSummaryStats = pgTable('payment_summary_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  statDate: timestamp('stat_date', { withTimezone: true }).notNull(),
  paymentMethod: text('payment_method').notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  transactionCount: integer('transaction_count').notNull().default(0),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
})
