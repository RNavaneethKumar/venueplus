import { relations } from 'drizzle-orm'
import {
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const kitchenOrderStatusEnum = pgEnum('kitchen_order_status', [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'cancelled',
])

export const fnbInventoryTxTypeEnum = pgEnum('fnb_inventory_tx_type', [
  'purchase',
  'sale',
  'waste',
  'adjustment',
  'return',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const fnbCategories = pgTable('fnb_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const preparationStations = pgTable('preparation_stations', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  deviceId: uuid('device_id'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const fnbItems = pgTable('fnb_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull(),
  venueId: uuid('venue_id').notNull(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => fnbCategories.id),
  preparationStationId: uuid('preparation_station_id').references(() => preparationStations.id),
  preparationTimeMinutes: integer('preparation_time_minutes').notNull().default(10),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const kitchenOrders = pgTable('kitchen_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  preparationStationId: uuid('preparation_station_id').references(() => preparationStations.id),
  status: kitchenOrderStatusEnum('status').notNull().default('pending'),
  priority: integer('priority').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  readyAt: timestamp('ready_at', { withTimezone: true }),
  servedAt: timestamp('served_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
})

export const kitchenOrderItems = pgTable('kitchen_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitchenOrderId: uuid('kitchen_order_id')
    .notNull()
    .references(() => kitchenOrders.id),
  orderItemId: uuid('order_item_id').notNull(),
  fnbItemId: uuid('fnb_item_id')
    .notNull()
    .references(() => fnbItems.id),
  quantity: integer('quantity').notNull().default(1),
  specialInstructions: text('special_instructions'),
  status: kitchenOrderStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const fnbInventory = pgTable('fnb_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  fnbItemId: uuid('fnb_item_id')
    .notNull()
    .references(() => fnbItems.id),
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).notNull().default('0'),
  stockUnit: text('stock_unit').notNull().default('units'),
  lowStockThreshold: decimal('low_stock_threshold', { precision: 10, scale: 2 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const fnbInventoryAdjustments = pgTable('fnb_inventory_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  fnbInventoryId: uuid('fnb_inventory_id')
    .notNull()
    .references(() => fnbInventory.id),
  txType: fnbInventoryTxTypeEnum('tx_type').notNull(),
  quantityDelta: decimal('quantity_delta', { precision: 10, scale: 2 }).notNull(),
  stockBefore: decimal('stock_before', { precision: 10, scale: 2 }).notNull(),
  stockAfter: decimal('stock_after', { precision: 10, scale: 2 }).notNull(),
  note: text('note'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const fnbCategoriesRelations = relations(fnbCategories, ({ many }) => ({
  items: many(fnbItems),
}))

export const kitchenOrdersRelations = relations(kitchenOrders, ({ one, many }) => ({
  station: one(preparationStations, {
    fields: [kitchenOrders.preparationStationId],
    references: [preparationStations.id],
  }),
  items: many(kitchenOrderItems),
}))

export const fnbItemsRelations = relations(fnbItems, ({ one }) => ({
  category: one(fnbCategories, {
    fields: [fnbItems.categoryId],
    references: [fnbCategories.id],
  }),
  station: one(preparationStations, {
    fields: [fnbItems.preparationStationId],
    references: [preparationStations.id],
  }),
}))
