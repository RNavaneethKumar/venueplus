import { relations } from 'drizzle-orm'
import {
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const retailTxTypeEnum = pgEnum('retail_tx_type', [
  'purchase',
  'sale',
  'return',
  'adjustment',
  'write_off',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const retailItems = pgTable('retail_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull(),
  venueId: uuid('venue_id').notNull(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  barcode: text('barcode'),
  variantAttributes: jsonb('variant_attributes'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const retailInventory = pgTable('retail_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  retailItemId: uuid('retail_item_id')
    .notNull()
    .references(() => retailItems.id),
  currentStock: integer('current_stock').notNull().default(0),
  reservedStock: integer('reserved_stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const retailInventoryTransactions = pgTable('retail_inventory_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  retailInventoryId: uuid('retail_inventory_id')
    .notNull()
    .references(() => retailInventory.id),
  orderItemId: uuid('order_item_id'),
  txType: retailTxTypeEnum('transaction_type').notNull(),
  quantityDelta: integer('quantity_delta').notNull(),
  stockBefore: integer('stock_before'),
  stockAfter: integer('stock_after'),
  note: text('note'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const retailItemsRelations = relations(retailItems, ({ one }) => ({
  inventory: one(retailInventory, {
    fields: [retailItems.id],
    references: [retailInventory.retailItemId],
  }),
}))

export const retailInventoryRelations = relations(retailInventory, ({ one, many }) => ({
  item: one(retailItems, {
    fields: [retailInventory.retailItemId],
    references: [retailItems.id],
  }),
  transactions: many(retailInventoryTransactions),
}))
