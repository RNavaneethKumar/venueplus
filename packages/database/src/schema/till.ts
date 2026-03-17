// ============================================================================
// Drizzle Schema — Till Management
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  jsonb,
  pgEnum,
  unique,
  check,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { venues, users } from './governance.js'
import { orders } from './ticketing.js'

// ── Enums ────────────────────────────────────────────────────────────────────

export const cashSessionStatusEnum = pgEnum('cash_session_status', [
  'open',
  'closed',       // normal or blind close — cash count provided
  'blind_closed', // blind close procedure used
  'forced',       // manager force-closed without cash count
  'auto',         // system auto-closed at midnight
])

export const cashCloseTypeEnum = pgEnum('cash_close_type', [
  'normal',
  'blind',
  'forced',
  'auto',
])

export const cashMovementTypeEnum = pgEnum('cash_movement_type', [
  'drop',     // cash removed to safe — reduces expected cash
  'paid_in',  // cash added (e.g. petty cash reimbursement) — increases expected cash
  'paid_out', // cash removed for an expense — reduces expected cash
])

// ── Cash Drawers ─────────────────────────────────────────────────────────────
// Named physical or logical tills. Used in counter mode (pos.till_mode = 'counter').
// In user mode, sessions are scoped directly to the opened_by user and
// drawer_id is left NULL.

export const cashDrawers = pgTable('cash_drawers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  venueId:     uuid('venue_id').notNull().references(() => venues.id),
  name:        text('name').notNull(),          // e.g. "Counter 1", "Main Desk"
  description: text('description'),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy:   uuid('created_by').references(() => users.id),
  // Linked POS terminal (set via Admin → Devices). Enables auto-selection in TillOpenScreen.
  deviceId:    uuid('device_id'),  // FK added by migration add_drawer_device_link.sql
})

// ── Cash Sessions ─────────────────────────────────────────────────────────────
// One row per open-to-close cycle. A counter or user may have at most one
// 'open' session at a time (enforced via partial unique index below).
//
// expected_amount is ALWAYS computed server-side at close time from the ledger
// (opening_amount + cash-method order payments + paid_in − paid_out − drops).
// It is never accepted from the client.

export const cashSessions = pgTable('cash_sessions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  venueId:   uuid('venue_id').notNull().references(() => venues.id),

  // NULL when pos.till_mode = 'user'; set when pos.till_mode = 'counter'
  drawerId:  uuid('drawer_id').references(() => cashDrawers.id),

  openedBy:  uuid('opened_by').notNull().references(() => users.id),
  closedBy:  uuid('closed_by').references(() => users.id),  // NULL for auto/forced

  status:    cashSessionStatusEnum('status').notNull().default('open'),
  openTime:  timestamp('open_time',  { withTimezone: true }).notNull().defaultNow(),
  closeTime: timestamp('close_time', { withTimezone: true }),

  // Cash at open
  openingAmount:        numeric('opening_amount', { precision: 12, scale: 2 }).notNull(),
  openingDenominations: jsonb('opening_denominations'),  // { "500": 3, "100": 5, ... }

  // Cash at close (populated when session is sealed)
  actualAmount:        numeric('actual_amount', { precision: 12, scale: 2 }),
  actualDenominations: jsonb('actual_denominations'),

  // Computed server-side at close; never trusted from client
  expectedAmount: numeric('expected_amount', { precision: 12, scale: 2 }),

  // actual_amount - expected_amount (positive = overage, negative = shortage)
  variance:  numeric('variance', { precision: 12, scale: 2 }),

  // How the session was closed
  closeType: cashCloseTypeEnum('close_type'),

  // Manager variance approval (required when variance != 0 and threshold = 0)
  varianceApprovedBy: uuid('variance_approved_by').references(() => users.id),
  varianceApprovedAt: timestamp('variance_approved_at', { withTimezone: true }),
  varianceNote:       text('variance_note'),

  // Immutable Z-Report snapshot — written once at close, never mutated
  zReportData: jsonb('z_report_data'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Cash Movements ───────────────────────────────────────────────────────────
// Cash in / out events during an open session. Each movement adjusts the
// expected closing balance.

export const cashMovements = pgTable('cash_movements', {
  id:           uuid('id').primaryKey().defaultRandom(),
  venueId:      uuid('venue_id').notNull().references(() => venues.id),
  sessionId:    uuid('session_id').notNull().references(() => cashSessions.id),
  movementType: cashMovementTypeEnum('movement_type').notNull(),
  amount:       numeric('amount', { precision: 12, scale: 2 }).notNull(), // always positive
  reason:       text('reason').notNull(),   // mandatory; max 100 chars enforced in app layer
  recordedBy:   uuid('recorded_by').notNull().references(() => users.id),
  // Set when amount exceeds pos.cash_movement_approval_threshold
  approvedBy:   uuid('approved_by').references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Relations ────────────────────────────────────────────────────────────────

export const cashDrawersRelations = relations(cashDrawers, ({ one, many }) => ({
  venue:    one(venues,  { fields: [cashDrawers.venueId],   references: [venues.id] }),
  creator:  one(users,   { fields: [cashDrawers.createdBy], references: [users.id] }),
  sessions: many(cashSessions),
}))

export const cashSessionsRelations = relations(cashSessions, ({ one, many }) => ({
  venue:              one(venues,       { fields: [cashSessions.venueId],             references: [venues.id] }),
  drawer:             one(cashDrawers,  { fields: [cashSessions.drawerId],            references: [cashDrawers.id] }),
  openedByUser:       one(users,        { fields: [cashSessions.openedBy],            references: [users.id] }),
  closedByUser:       one(users,        { fields: [cashSessions.closedBy],            references: [users.id] }),
  approvedByUser:     one(users,        { fields: [cashSessions.varianceApprovedBy],  references: [users.id] }),
  movements:          many(cashMovements),
  // All orders placed during this session — used to compute expected cash at close
  orders:             many(orders),
}))

export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  venue:       one(venues,        { fields: [cashMovements.venueId],     references: [venues.id] }),
  session:     one(cashSessions,  { fields: [cashMovements.sessionId],   references: [cashSessions.id] }),
  recordedBy:  one(users,         { fields: [cashMovements.recordedBy],  references: [users.id] }),
  approvedBy:  one(users,         { fields: [cashMovements.approvedBy],  references: [users.id] }),
}))
