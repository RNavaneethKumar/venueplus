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

export const donationTypeEnum = pgEnum('donation_type', ['one_time', 'recurring'])

export const adopteeTypeEnum = pgEnum('adoptee_type', ['animal', 'exhibit', 'tree', 'habitat'])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const donationCauses = pgTable('donation_causes', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  totalRaised: decimal('total_raised', { precision: 12, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').notNull(),
  donationCauseId: uuid('donation_cause_id')
    .notNull()
    .references(() => donationCauses.id),
  accountId: uuid('account_id').references(() => accounts.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  donationType: donationTypeEnum('donation_type').notNull().default('one_time'),
  message: text('message'),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const adoptees = pgTable('adoptees', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  species: text('species'),
  adopteeType: adopteeTypeEnum('adoptee_type').notNull().default('animal'),
  description: text('description'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const adoptions = pgTable('adoptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id').notNull(),
  adopteeId: uuid('adoptee_id')
    .notNull()
    .references(() => adoptees.id),
  accountId: uuid('account_id').references(() => accounts.id),
  adoptorName: text('adoptor_name'),
  message: text('message'),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const donationCausesRelations = relations(donationCauses, ({ many }) => ({
  donations: many(donations),
}))

export const donationsRelations = relations(donations, ({ one }) => ({
  cause: one(donationCauses, {
    fields: [donations.donationCauseId],
    references: [donationCauses.id],
  }),
  account: one(accounts, {
    fields: [donations.accountId],
    references: [accounts.id],
  }),
}))

export const adopteesRelations = relations(adoptees, ({ many }) => ({
  adoptions: many(adoptions),
}))
