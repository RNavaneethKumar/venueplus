import { relations } from 'drizzle-orm'
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { accounts } from './ticketing.js'

// ─── Tables ───────────────────────────────────────────────────────────────────

export const waiverTemplates = pgTable('waiver_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  version: text('version').notNull().default('1.0'),
  contentHtml: text('content_html').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const productWaiverMapping = pgTable('product_waiver_mapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull(),
  waiverTemplateId: uuid('waiver_template_id')
    .notNull()
    .references(() => waiverTemplates.id),
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const waiverSignatures = pgTable('waiver_signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  waiverTemplateId: uuid('waiver_template_id')
    .notNull()
    .references(() => waiverTemplates.id),
  orderId: uuid('order_id').notNull(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  signedAt: timestamp('signed_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  signatureData: text('signature_data'),
})

export const waiverSignaturePersons = pgTable('waiver_signature_persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  waiverSignatureId: uuid('waiver_signature_id')
    .notNull()
    .references(() => waiverSignatures.id),
  personId: uuid('person_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const waiverTemplatesRelations = relations(waiverTemplates, ({ many }) => ({
  productMappings: many(productWaiverMapping),
  signatures: many(waiverSignatures),
}))

export const waiverSignaturesRelations = relations(waiverSignatures, ({ one, many }) => ({
  template: one(waiverTemplates, {
    fields: [waiverSignatures.waiverTemplateId],
    references: [waiverTemplates.id],
  }),
  account: one(accounts, {
    fields: [waiverSignatures.accountId],
    references: [accounts.id],
  }),
  persons: many(waiverSignaturePersons),
}))
