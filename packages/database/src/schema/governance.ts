// ============================================================================
// Drizzle Schema — Platform Governance
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ────────────────────────────────────────────────────────────────────

export const scopeTypeEnum = pgEnum('scope_type', ['venue', 'global'])
export const venueStatusEnum = pgEnum('venue_status', ['active', 'inactive', 'closed'])
export const deviceTypeEnum = pgEnum('device_type', ['pos', 'gate', 'kiosk', 'kds', 'arcade_reader'])
export const deviceStatusEnum = pgEnum('device_status', ['active', 'inactive', 'maintenance'])
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked', 'expired'])
export const alertComparisonEnum = pgEnum('alert_comparison_operator', ['>', '<', '=', '>=', '<='])
export const alertStatusEnum = pgEnum('alert_status', ['active', 'acknowledged', 'resolved'])
// Note: notificationChannelEnum is defined in crm.ts (canonical location)

// ── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  pinHash: text('pin_hash').notNull(),
  mobileNumber: text('mobile_number'),
  email: text('email'),
  isActive: boolean('is_active').notNull().default(true),
  isLocked: boolean('is_locked').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references((): any => users.id),
})

// ── Roles ────────────────────────────────────────────────────────────────────

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  scopeType: scopeTypeEnum('scope_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Permissions ──────────────────────────────────────────────────────────────

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  module: text('module').notNull(),
  description: text('description'),
  isSensitive: boolean('is_sensitive').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Role Permissions ─────────────────────────────────────────────────────────

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id').notNull().references(() => roles.id),
    permissionId: uuid('permission_id').notNull().references(() => permissions.id),
    granted: boolean('granted').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
)

// ── Venues ───────────────────────────────────────────────────────────────────

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  timezone: text('timezone').notNull(),
  currencyCode: text('currency_code').notNull(),
  countryCode: text('country_code').notNull(),
  taxRegime: text('tax_regime'),
  taxRegistrationNumber: text('tax_registration_number'),
  registeredAddress: text('registered_address'),
  status: venueStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

// ── User Roles ───────────────────────────────────────────────────────────────

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  venueId: uuid('venue_id').references(() => venues.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  assignedBy: uuid('assigned_by').references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
})

// ── Venue Settings ───────────────────────────────────────────────────────────

export const venueSettings = pgTable('venue_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  settingKey: text('setting_key').notNull(),
  settingValue: text('setting_value').notNull(), // JSONB stored as text in Drizzle
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
})

// ── Venue Feature Flags ──────────────────────────────────────────────────────

export const venueFeatureFlags = pgTable('venue_feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  featureKey: text('feature_key').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(false),
  enabledAt: timestamp('enabled_at', { withTimezone: true }),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  updatedBy: uuid('updated_by').references(() => users.id),
})

// ── Devices ──────────────────────────────────────────────────────────────────

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  name: text('name').notNull(),
  deviceType: deviceTypeEnum('device_type').notNull(),
  identifier: text('identifier'),
  authTokenHash: text('auth_token_hash'),
  status: deviceStatusEnum('status').notNull().default('active'),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
  lastIpAddress: text('last_ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
})

// Note: notificationTemplates table is defined in crm.ts (canonical location)

// ── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  userId: uuid('user_id').references(() => users.id),
  impersonatedUserId: uuid('impersonated_user_id').references(() => users.id),
  venueId: uuid('venue_id').references(() => venues.id),
  deviceId: uuid('device_id').references(() => devices.id),
  actionType: text('action_type').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  metadata: text('metadata'), // JSONB
  ipAddress: text('ip_address'),
})

// ── Relations ────────────────────────────────────────────────────────────────

export const venuesRelations = relations(venues, ({ many }) => ({
  settings: many(venueSettings),
  featureFlags: many(venueFeatureFlags),
  devices: many(devices),
  userRoles: many(userRoles),
}))

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  auditLogs: many(auditLogs),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}))
